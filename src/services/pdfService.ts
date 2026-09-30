import { PDFDocument, rgb, degrees } from 'pdf-lib';
import jsPDF from 'jspdf';
import { DocumentPage } from '../types/document';

export interface PdfExportOptions {
  title: string;
  pageSize?: 'A4' | 'Letter' | 'Legal' | 'Original';
  orientation?: 'portrait' | 'landscape';
  margins?: number; // points
  includePageNumbers?: boolean;
  quality?: 'high' | 'medium' | 'small';
  password?: string;
}

export class PdfService {
  // Page size dimensions in points (72 points per inch)
  private static PAGE_SIZES: Record<string, [number, number]> = {
    A4: [595.28, 841.89],
    Letter: [612.0, 792.0],
    Legal: [612.0, 1008.0],
  };

  // Convert base64 data URI to Uint8Array
  private static dataUriToUint8Array(dataUri: string): Uint8Array {
    const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Downscale image according to compression quality
  private static async compressImage(
    dataUri: string,
    quality: 'high' | 'medium' | 'small'
  ): Promise<string> {
    const qualityMap = {
      high: { maxDim: 2000, jpegQuality: 0.9 },
      medium: { maxDim: 1400, jpegQuality: 0.72 },
      small: { maxDim: 900, jpegQuality: 0.5 },
    };

    const config = qualityMap[quality] || qualityMap.high;

    return new Promise((resolve) => {
      const img = new Image();
      if (dataUri.startsWith('http://') || dataUri.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const scale = Math.min(1, config.maxDim / Math.max(w, h));
        const destW = Math.round(w * scale);
        const destH = Math.round(h * scale);

        const canvas = document.createElement('canvas');
        canvas.width = destW;
        canvas.height = destH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUri);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, destW, destH);
        ctx.drawImage(img, 0, 0, destW, destH);

        resolve(canvas.toDataURL('image/jpeg', config.jpegQuality));
      };
      img.onerror = () => resolve(dataUri);
      img.src = dataUri;
    });
  }

  // 1. Create PDF from Document Pages (Images + Annotations + Signatures)
  static async createPdfFromPages(
    pages: DocumentPage[],
    options: PdfExportOptions
  ): Promise<{ blob: Blob; url: string; sizeBytes: number }> {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(options.title);
    pdfDoc.setAuthor('YomiScan');

    const totalPages = pages.length;
    const margins = options.margins ?? 20;
    const quality = options.quality ?? 'high';

    for (let i = 0; i < pages.length; i++) {
      const pageData = pages[i];
      const pageImageSrc = pageData.processedImage || pageData.originalImage;

      // Render flattened page canvas including annotations and signatures
      const flattenedImage = await this.renderFlattenedPage(pageData, quality);
      const compressedUri = await this.compressImage(flattenedImage, quality);
      const imageBytes = this.dataUriToUint8Array(compressedUri);

      let embeddedImage;
      try {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      } catch {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      }

      // Determine dimensions
      let pageWidth = 595.28;
      let pageHeight = 841.89;

      if (options.pageSize === 'Original') {
        pageWidth = embeddedImage.width + margins * 2;
        pageHeight = embeddedImage.height + margins * 2;
      } else if (options.pageSize && this.PAGE_SIZES[options.pageSize]) {
        [pageWidth, pageHeight] = this.PAGE_SIZES[options.pageSize];
      }

      if (options.orientation === 'landscape') {
        const temp = pageWidth;
        pageWidth = pageHeight;
        pageHeight = temp;
      }

      const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);

      // Calculate fitted image dimensions maintaining aspect ratio
      const availWidth = pageWidth - margins * 2;
      const availHeight = pageHeight - margins * 2 - (options.includePageNumbers ? 20 : 0);
      const imgAspect = embeddedImage.width / embeddedImage.height;
      const boxAspect = availWidth / availHeight;

      let drawW = availWidth;
      let drawH = availHeight;
      let drawX = margins;
      let drawY = margins + (options.includePageNumbers ? 20 : 0);

      if (imgAspect > boxAspect) {
        drawH = availWidth / imgAspect;
        drawY += (availHeight - drawH) / 2;
      } else {
        drawW = availHeight * imgAspect;
        drawX += (availWidth - drawW) / 2;
      }

      pdfPage.drawImage(embeddedImage, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
      });

      // Page numbering footer
      if (options.includePageNumbers) {
        const text = `Page ${i + 1} of ${totalPages}`;
        pdfPage.drawText(text, {
          x: pageWidth / 2 - 30,
          y: margins / 2 + 5,
          size: 9,
          color: rgb(0.4, 0.4, 0.4),
        });
      }

      // Page rotation if set
      if (pageData.rotation) {
        pdfPage.setRotation(degrees(pageData.rotation));
      }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    return { blob, url, sizeBytes: pdfBytes.byteLength };
  }

  // 2. Render Page with Annotations and Signatures
  private static async renderFlattenedPage(
    page: DocumentPage,
    quality: 'high' | 'medium' | 'small'
  ): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(page.processedImage || page.originalImage);

        // Draw base scanned image
        ctx.drawImage(img, 0, 0);

        // Draw annotations
        if (page.annotations && page.annotations.length > 0) {
          for (const ann of page.annotations) {
            ctx.save();
            ctx.strokeStyle = ann.color || '#ef4444';
            ctx.fillStyle = ann.color || '#ef4444';
            ctx.lineWidth = ann.strokeWidth || 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (ann.type === 'highlighter') {
              ctx.globalAlpha = 0.35;
              ctx.lineWidth = (ann.strokeWidth || 12) * 1.5;
            }

            if (ann.type === 'pen' || ann.type === 'highlighter') {
              if (ann.points && ann.points.length > 1) {
                ctx.beginPath();
                ctx.moveTo(ann.points[0].x, ann.points[0].y);
                for (let k = 1; k < ann.points.length; k++) {
                  ctx.lineTo(ann.points[k].x, ann.points[k].y);
                }
                ctx.stroke();
              }
            } else if (ann.type === 'rectangle' && ann.startPoint && ann.endPoint) {
              const x = Math.min(ann.startPoint.x, ann.endPoint.x);
              const y = Math.min(ann.startPoint.y, ann.endPoint.y);
              const w = Math.abs(ann.endPoint.x - ann.startPoint.x);
              const h = Math.abs(ann.endPoint.y - ann.startPoint.y);
              ctx.strokeRect(x, y, w, h);
            } else if (ann.type === 'circle' && ann.startPoint && ann.endPoint) {
              const cx = (ann.startPoint.x + ann.endPoint.x) / 2;
              const cy = (ann.startPoint.y + ann.endPoint.y) / 2;
              const rx = Math.abs(ann.endPoint.x - ann.startPoint.x) / 2;
              const ry = Math.abs(ann.endPoint.y - ann.startPoint.y) / 2;
              ctx.beginPath();
              ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
              ctx.stroke();
            } else if (ann.type === 'arrow' && ann.startPoint && ann.endPoint) {
              const fromX = ann.startPoint.x;
              const fromY = ann.startPoint.y;
              const toX = ann.endPoint.x;
              const toY = ann.endPoint.y;
              const headlen = 16;
              const angle = Math.atan2(toY - fromY, toX - fromX);
              ctx.beginPath();
              ctx.moveTo(fromX, fromY);
              ctx.lineTo(toX, toY);
              ctx.stroke();
              // Arrowhead
              ctx.beginPath();
              ctx.moveTo(toX, toY);
              ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
              ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
              ctx.closePath();
              ctx.fill();
            } else if (ann.type === 'text' && ann.startPoint && ann.text) {
              ctx.font = `${ann.fontSize || 22}px sans-serif`;
              ctx.fillText(ann.text, ann.startPoint.x, ann.startPoint.y);
            } else if (ann.type === 'underline' && ann.startPoint && ann.endPoint) {
              ctx.beginPath();
              ctx.moveTo(ann.startPoint.x, ann.startPoint.y);
              ctx.lineTo(ann.endPoint.x, ann.endPoint.y);
              ctx.stroke();
            } else if (ann.type === 'strikethrough' && ann.startPoint && ann.endPoint) {
              ctx.beginPath();
              ctx.moveTo(ann.startPoint.x, ann.startPoint.y);
              ctx.lineTo(ann.endPoint.x, ann.endPoint.y);
              ctx.stroke();
            }
            ctx.restore();
          }
        }

        // Draw placed signatures
        if (page.signatures && page.signatures.length > 0) {
          for (const sig of page.signatures) {
            await new Promise<void>((sigResolve) => {
              const sigImg = new Image();
              sigImg.crossOrigin = 'anonymous';
              sigImg.onload = () => {
                ctx.save();
                const posX = (sig.x / 100) * canvas.width;
                const posY = (sig.y / 100) * canvas.height;
                const sigW = (sig.width / 100) * canvas.width;
                const sigH = (sig.height / 100) * canvas.height;

                ctx.translate(posX + sigW / 2, posY + sigH / 2);
                if (sig.rotation) {
                  ctx.rotate((sig.rotation * Math.PI) / 180);
                }
                ctx.drawImage(sigImg, -sigW / 2, -sigH / 2, sigW, sigH);
                ctx.restore();
                sigResolve();
              };
              sigImg.onerror = () => sigResolve();
              sigImg.src = sig.dataUrl;
            });
          }
        }

        const outQuality = quality === 'small' ? 0.6 : quality === 'medium' ? 0.8 : 0.92;
        resolve(canvas.toDataURL('image/jpeg', outQuality));
      };

      img.onerror = () => resolve(page.processedImage || page.originalImage);
      img.src = page.processedImage || page.originalImage;
    });
  }

  // 3. OCR Text to PDF
  static async createPdfFromOcrText(
    title: string,
    ocrText: string,
    headings: string[] = []
  ): Promise<{ blob: Blob; url: string; sizeBytes: number }> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - margin * 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138);
    doc.text(title, margin, 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated by YomiScan • ${new Date().toLocaleDateString()}`, margin, 68);

    doc.setDrawColor(220, 225, 235);
    doc.line(margin, 76, pageWidth - margin, 76);

    doc.setFontSize(11);
    doc.setTextColor(33, 37, 41);

    const lines = doc.splitTextToSize(ocrText, maxLineWidth);
    let y = 100;
    const pageHeight = doc.internal.pageSize.getHeight();

    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      // Check if line is heading
      const isHeading = headings.some((h) => line.includes(h)) || line.startsWith('#');
      if (isHeading) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(37, 99, 235);
        y += 8;
        doc.text(line.replace(/^#+\s*/, ''), margin, y);
        y += 18;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(33, 37, 41);
      } else {
        doc.text(line, margin, y);
        y += 15;
      }
    }

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    return { blob: pdfBlob, url, sizeBytes: pdfBlob.size };
  }

  // 4. Merge multiple PDFs
  static async mergePdfs(pdfBuffers: Uint8Array[]): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create();
    for (const buf of pdfBuffers) {
      const doc = await PDFDocument.load(buf);
      const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    return mergedPdf.save();
  }

  // 5. Split PDF / Extract pages
  static async extractPages(pdfBuffer: Uint8Array, pageIndices: number[]): Promise<Uint8Array> {
    const srcDoc = await PDFDocument.load(pdfBuffer);
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));
    return newDoc.save();
  }

  // 6. Rotate PDF pages
  static async rotatePdfPages(pdfBuffer: Uint8Array, rotationDegrees: number): Promise<Uint8Array> {
    const doc = await PDFDocument.load(pdfBuffer);
    const pages = doc.getPages();
    for (const page of pages) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + rotationDegrees) % 360));
    }
    return doc.save();
  }

  // 7. Compress PDF estimation
  static estimateCompression(
    originalSizeBytes: number,
    quality: 'high' | 'medium' | 'small'
  ): { originalSize: string; compressedSize: string; ratio: string } {
    const reductionMap = {
      high: 0.85,
      medium: 0.55,
      small: 0.32,
    };
    const factor = reductionMap[quality] || 0.85;
    const est = Math.round(originalSizeBytes * factor);

    const fmt = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    return {
      originalSize: fmt(originalSizeBytes),
      compressedSize: fmt(est),
      ratio: `-${Math.round((1 - factor) * 100)}%`,
    };
  }

  // 8. Download helper
  static downloadPdf(blobOrUrl: Blob | string, filename = 'document.pdf') {
    const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (typeof blobOrUrl !== 'string') {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  // 9. Web Share API for PDF
  static async sharePdf(blob: Blob, filename: string): Promise<boolean> {
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: filename,
            text: 'Scanned document from YomiScan',
            files: [file],
          });
          return true;
        } catch (e: any) {
          if (e.name !== 'AbortError') console.error('Share failed', e);
        }
      }
    }
    return false;
  }
}
