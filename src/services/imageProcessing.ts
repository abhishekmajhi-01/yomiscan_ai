import { Point, QuadCorners, FilterSettings } from '../types/document';

export class ImageProcessor {
  /**
   * Safely loads an image into an HTMLImageElement.
   * Crucial: crossOrigin must NOT be set for data: or blob: URIs, as setting crossOrigin
   * triggers browser security violations on opaque origin URLs, causing "Failed to load image".
   */
  static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (!src || typeof src !== 'string' || src.trim().length === 0) {
        return reject(new Error('Image source is empty'));
      }
      const img = new Image();
      if (src.startsWith('http://') || src.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = () => {
        // If remote URL with crossOrigin failed, try once without crossOrigin
        if (img.crossOrigin) {
          const fallback = new Image();
          fallback.onload = () => resolve(fallback);
          fallback.onerror = () => reject(new Error('Failed to load image from source'));
          fallback.src = src;
        } else {
          reject(new Error('Failed to load image from source'));
        }
      };
      img.src = src;
    });
  }

  // 1. Automatic Document Edge / Corner Detection
  static async detectDocumentCorners(imageSrc: string): Promise<QuadCorners> {
    try {
      const img = await this.loadImage(imageSrc);
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      if (!width || !height) {
        return this.getDefaultCorners(800, 1000);
      }

      // Downscale for fast edge analysis
      const maxDim = 400;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      const sw = Math.floor(width * scale);
      const sh = Math.floor(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        return this.getDefaultCorners(width, height);
      }

      ctx.drawImage(img, 0, 0, sw, sh);
      const imgData = ctx.getImageData(0, 0, sw, sh);
      const data = imgData.data;

      // Convert to grayscale & compute gradients
      const gray = new Uint8Array(sw * sh);
      for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      }

      // Search for document edges from boundaries inwards
      let minX = Math.floor(sw * 0.08);
      let maxX = Math.floor(sw * 0.92);
      let minY = Math.floor(sh * 0.08);
      let maxY = Math.floor(sh * 0.92);

      const threshold = 35;
      let foundLeft = minX;
      let foundRight = maxX;
      let foundTop = minY;
      let foundBottom = maxY;

      // Horizontal scan from left
      outerLeft: for (let x = 5; x < sw / 3; x += 2) {
        let edgeCount = 0;
        for (let y = Math.floor(sh * 0.2); y < Math.floor(sh * 0.8); y += 4) {
          const idx = y * sw + x;
          if (Math.abs(gray[idx] - gray[idx + 2]) > threshold) edgeCount++;
        }
        if (edgeCount > 6) {
          foundLeft = Math.max(x, Math.floor(sw * 0.04));
          break outerLeft;
        }
      }

      // Horizontal scan from right
      outerRight: for (let x = sw - 6; x > (sw * 2) / 3; x -= 2) {
        let edgeCount = 0;
        for (let y = Math.floor(sh * 0.2); y < Math.floor(sh * 0.8); y += 4) {
          const idx = y * sw + x;
          if (Math.abs(gray[idx] - gray[idx - 2]) > threshold) edgeCount++;
        }
        if (edgeCount > 6) {
          foundRight = Math.min(x, Math.floor(sw * 0.96));
          break outerRight;
        }
      }

      // Vertical scan from top
      outerTop: for (let y = 5; y < sh / 3; y += 2) {
        let edgeCount = 0;
        for (let x = Math.floor(sw * 0.2); x < Math.floor(sw * 0.8); x += 4) {
          const idx = y * sw + x;
          if (Math.abs(gray[idx] - gray[idx + sw * 2]) > threshold) edgeCount++;
        }
        if (edgeCount > 6) {
          foundTop = Math.max(y, Math.floor(sh * 0.04));
          break outerTop;
        }
      }

      // Vertical scan from bottom
      outerBottom: for (let y = sh - 6; y > (sh * 2) / 3; y -= 2) {
        let edgeCount = 0;
        for (let x = Math.floor(sw * 0.2); x < Math.floor(sw * 0.8); x += 4) {
          const idx = y * sw + x;
          if (Math.abs(gray[idx] - gray[idx - sw * 2]) > threshold) edgeCount++;
        }
        if (edgeCount > 6) {
          foundBottom = Math.min(y, Math.floor(sh * 0.96));
          break outerBottom;
        }
      }

      // Scale back to original resolution
      const invScale = 1 / scale;
      return {
        topLeft: { x: Math.round(foundLeft * invScale), y: Math.round(foundTop * invScale) },
        topRight: { x: Math.round(foundRight * invScale), y: Math.round(foundTop * invScale) },
        bottomRight: { x: Math.round(foundRight * invScale), y: Math.round(foundBottom * invScale) },
        bottomLeft: { x: Math.round(foundLeft * invScale), y: Math.round(foundBottom * invScale) },
      };
    } catch (err) {
      console.warn('Document corner detection fallback:', err);
      return this.getDefaultCorners(800, 1000);
    }
  }

  static getDefaultCorners(width: number, height: number): QuadCorners {
    const padX = Math.round(width * 0.06);
    const padY = Math.round(height * 0.06);
    return {
      topLeft: { x: padX, y: padY },
      topRight: { x: Math.max(padX * 2, width - padX), y: padY },
      bottomRight: { x: Math.max(padX * 2, width - padX), y: Math.max(padY * 2, height - padY) },
      bottomLeft: { x: padX, y: Math.max(padY * 2, height - padY) },
    };
  }

  // 2. Perspective Warp / Quadrilateral Rectification
  static async warpPerspective(imageSrc: string, corners?: QuadCorners | null): Promise<string> {
    if (!imageSrc) return imageSrc;

    try {
      const img = await this.loadImage(imageSrc);
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      if (!width || !height) {
        return imageSrc;
      }

      const activeCorners = corners || this.getDefaultCorners(width, height);
      const { topLeft, topRight, bottomRight, bottomLeft } = activeCorners;

      // Determine destination width & height based on Euclidean distances
      const widthTop = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
      const widthBottom = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y);
      const destWidth = Math.max(100, Math.round(Math.max(widthTop, widthBottom)));

      const heightLeft = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
      const heightRight = Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y);
      const destHeight = Math.max(100, Math.round(Math.max(heightLeft, heightRight)));

      // Source canvas
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = width;
      srcCanvas.height = height;
      const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
      if (!srcCtx) return imageSrc;

      srcCtx.drawImage(img, 0, 0);

      // Destination canvas
      const destCanvas = document.createElement('canvas');
      destCanvas.width = destWidth;
      destCanvas.height = destHeight;
      const destCtx = destCanvas.getContext('2d', { willReadFrequently: true });
      if (!destCtx) return imageSrc;

      // Bilinear forward warp with triangular mesh
      // We split the quad into 2 triangles: (TL, TR, BL) and (TR, BR, BL)
      this.warpTriangle(
        srcCtx,
        destCtx,
        topLeft,
        topRight,
        bottomLeft,
        { x: 0, y: 0 },
        { x: destWidth, y: 0 },
        { x: 0, y: destHeight }
      );

      this.warpTriangle(
        srcCtx,
        destCtx,
        topRight,
        bottomRight,
        bottomLeft,
        { x: destWidth, y: 0 },
        { x: destWidth, y: destHeight },
        { x: 0, y: destHeight }
      );

      return destCanvas.toDataURL('image/jpeg', 0.95);
    } catch (err) {
      console.warn('Warp perspective fallback to original image:', err);
      return imageSrc;
    }
  }

  // Exact Affine triangle warp
  private static warpTriangle(
    srcCtx: CanvasRenderingContext2D,
    destCtx: CanvasRenderingContext2D,
    p0: Point,
    p1: Point,
    p2: Point,
    d0: Point,
    d1: Point,
    d2: Point
  ) {
    destCtx.save();
    destCtx.beginPath();
    destCtx.moveTo(d0.x, d0.y);
    destCtx.lineTo(d1.x, d1.y);
    destCtx.lineTo(d2.x, d2.y);
    destCtx.closePath();
    destCtx.clip();

    // Map source coordinates (p0, p1, p2) to destination (d0, d1, d2)
    // Formula:
    // d.x = a * p.x + c * p.y + e
    // d.y = b * p.x + d * p.y + f
    const dx0 = p0.x - p2.x;
    const dy0 = p0.y - p2.y;
    const dx1 = p1.x - p2.x;
    const dy1 = p1.y - p2.y;

    const den = dx0 * dy1 - dx1 * dy0;
    if (Math.abs(den) < 1e-6) {
      destCtx.restore();
      return;
    }

    const u0 = d0.x - d2.x;
    const u1 = d1.x - d2.x;
    const v0 = d0.y - d2.y;
    const v1 = d1.y - d2.y;

    const a = (u0 * dy1 - u1 * dy0) / den;
    const c = (dx0 * u1 - dx1 * u0) / den;
    const e = d0.x - a * p0.x - c * p0.y;

    const b = (v0 * dy1 - v1 * dy0) / den;
    const d = (dx0 * v1 - dx1 * v0) / den;
    const f = d0.y - b * p0.x - d * p0.y;

    destCtx.transform(a, b, c, d, e, f);
    destCtx.drawImage(srcCtx.canvas, 0, 0);
    destCtx.restore();
  }

  // 3. Apply Image Enhancements & Filters
  static async applyFilters(imageSrc: string, settings: FilterSettings): Promise<string> {
    try {
      const img = await this.loadImage(imageSrc);
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      if (!width || !height) return imageSrc;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return imageSrc;

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      const {
        filter,
        brightness = 0,
        contrast = 0,
        saturation = 0,
        sharpness = 0,
        shadowRemoval = false,
        noiseReduction = false,
        backgroundCleanup = false,
      } = settings;

      let bVal = brightness;
      let cVal = contrast;
      let sVal = saturation;

      if (filter === 'auto') {
        bVal += 10;
        cVal += 15;
        sVal += 5;
      } else if (filter === 'color') {
        bVal += 8;
        cVal += 18;
        sVal += 25;
      } else if (filter === 'high-contrast') {
        cVal += 35;
        bVal += 5;
      }

      const contrastFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));
      const isBw = filter === 'bw';
      const isGrayscale = filter === 'grayscale';

      // 1st pass: Pixel processing
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Shadow removal compensation
        if (shadowRemoval) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum > 75 && lum < 220) {
            const boost = (220 - lum) * 0.15;
            r = Math.min(255, r + boost);
            g = Math.min(255, g + boost);
            b = Math.min(255, b + boost);
          }
        }

        // Brightness & Contrast
        r = contrastFactor * (r + bVal - 128) + 128;
        g = contrastFactor * (g + bVal - 128) + 128;
        b = contrastFactor * (b + bVal - 128) + 128;

        // Saturation
        if (sVal !== 0 && !isGrayscale && !isBw) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const satMul = 1 + sVal / 50;
          r = gray + (r - gray) * satMul;
          g = gray + (g - gray) * satMul;
          b = gray + (b - gray) * satMul;
        }

        // Clamp
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        // Grayscale or BW
        if (isBw) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const val = lum < 140 ? 0 : 255;
          r = val;
          g = val;
          b = val;
        } else if (isGrayscale) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          r = lum;
          g = lum;
          b = lum;
        }

        // Background cleanup: Whiten off-white paper
        if (backgroundCleanup && !isBw) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum > 195) {
            r = Math.min(255, r + 25);
            g = Math.min(255, g + 25);
            b = Math.min(255, b + 25);
          }
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }

      ctx.putImageData(imgData, 0, 0);

      // 2nd pass: Sharpen convolution kernel
      if (sharpness > 0) {
        const strength = sharpness / 40;
        this.applyConvolution(ctx, width, height, [
          0,
          -strength,
          0,
          -strength,
          1 + 4 * strength,
          -strength,
          0,
          -strength,
          0,
        ]);
      }

      // 3rd pass: Noise reduction (3x3 low-pass gentle blur)
      if (noiseReduction) {
        this.applyConvolution(ctx, width, height, [
          1 / 16,
          2 / 16,
          1 / 16,
          2 / 16,
          4 / 16,
          2 / 16,
          1 / 16,
          2 / 16,
          1 / 16,
        ]);
      }

      return canvas.toDataURL('image/jpeg', 0.92);
    } catch (err) {
      console.warn('Apply filters fallback:', err);
      return imageSrc;
    }
  }

  // 3x3 Convolution filter
  private static applyConvolution(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    weights: number[]
  ) {
    const input = ctx.getImageData(0, 0, w, h);
    const output = ctx.createImageData(w, h);
    const src = input.data;
    const dst = output.data;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let r = 0;
        let g = 0;
        let b = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const weight = weights[(ky + 1) * 3 + (kx + 1)];
            const idx = ((y + ky) * w + (x + kx)) * 4;
            r += src[idx] * weight;
            g += src[idx + 1] * weight;
            b += src[idx + 2] * weight;
          }
        }
        const outIdx = (y * w + x) * 4;
        dst[outIdx] = Math.max(0, Math.min(255, r));
        dst[outIdx + 1] = Math.max(0, Math.min(255, g));
        dst[outIdx + 2] = Math.max(0, Math.min(255, b));
        dst[outIdx + 3] = 255;
      }
    }
    ctx.putImageData(output, 0, 0);
  }

  // Rotate image by 90, 180, 270 degrees
  static async rotateImage(imageSrc: string, degrees: number): Promise<string> {
    if (degrees % 360 === 0) return imageSrc;
    try {
      const img = await this.loadImage(imageSrc);
      const rad = (degrees * Math.PI) / 180;
      const isOrthogonal = Math.abs(degrees % 180) === 90;
      const nw = isOrthogonal ? img.height : img.width;
      const nh = isOrthogonal ? img.width : img.height;

      const canvas = document.createElement('canvas');
      canvas.width = nw;
      canvas.height = nh;
      const ctx = canvas.getContext('2d');
      if (!ctx) return imageSrc;

      ctx.translate(nw / 2, nh / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      return canvas.toDataURL('image/jpeg', 0.92);
    } catch (err) {
      console.warn('Rotate image fallback:', err);
      return imageSrc;
    }
  }

  // Create thumbnail
  static async createThumbnail(imageSrc: string, maxDim = 240): Promise<string> {
    try {
      const img = await this.loadImage(imageSrc);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const tw = Math.max(1, Math.round(w * scale));
      const th = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext('2d');
      if (!ctx) return imageSrc;

      ctx.drawImage(img, 0, 0, tw, th);
      return canvas.toDataURL('image/jpeg', 0.75);
    } catch (err) {
      console.warn('Create thumbnail fallback:', err);
      return imageSrc;
    }
  }

  // Remove white/light background from drawn/uploaded signature
  static async removeSignatureBackground(imageSrc: string): Promise<string> {
    try {
      const img = await this.loadImage(imageSrc);
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return imageSrc;

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // If light/white background, make transparent
        if (lum > 210) {
          data[i + 3] = 0;
        } else {
          // Darken ink for crisp clarity
          data[i] = Math.min(r, 40);
          data[i + 1] = Math.min(g, 40);
          data[i + 2] = Math.min(b, 50);
          data[i + 3] = Math.min(255, Math.round((210 - lum) * 1.6));
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.warn('Signature background removal fallback:', err);
      return imageSrc;
    }
  }

  // Combine ID Front and Back
  static async combineIDCardPages(
    frontImageSrc: string,
    backImageSrc: string,
    layout: 'stacked' | 'side-by-side' = 'stacked'
  ): Promise<string> {
    try {
      const [imgFront, imgBack] = await Promise.all([
        this.loadImage(frontImageSrc),
        this.loadImage(backImageSrc),
      ]);

      const canvas = document.createElement('canvas');
      const padding = 40;
      const bgPadding = 50;

      if (layout === 'stacked') {
        const cardWidth = Math.max(imgFront.width, imgBack.width);
        const totalWidth = cardWidth + bgPadding * 2;
        const totalHeight = imgFront.height + imgBack.height + padding + bgPadding * 2;

        canvas.width = totalWidth;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return frontImageSrc;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, totalWidth, totalHeight);

        // Front
        ctx.drawImage(imgFront, bgPadding + (cardWidth - imgFront.width) / 2, bgPadding);
        // Back
        ctx.drawImage(
          imgBack,
          bgPadding + (cardWidth - imgBack.width) / 2,
          bgPadding + imgFront.height + padding
        );

        return canvas.toDataURL('image/jpeg', 0.92);
      } else {
        // Side-by-side
        const cardHeight = Math.max(imgFront.height, imgBack.height);
        const totalWidth = imgFront.width + imgBack.width + padding + bgPadding * 2;
        const totalHeight = cardHeight + bgPadding * 2;

        canvas.width = totalWidth;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return frontImageSrc;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, totalWidth, totalHeight);

        ctx.drawImage(imgFront, bgPadding, bgPadding + (cardHeight - imgFront.height) / 2);
        ctx.drawImage(
          imgBack,
          bgPadding + imgFront.width + padding,
          bgPadding + (cardHeight - imgBack.height) / 2
        );

        return canvas.toDataURL('image/jpeg', 0.92);
      }
    } catch (err) {
      console.warn('Combine ID Card fallback:', err);
      return frontImageSrc;
    }
  }
}
