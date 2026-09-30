import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCw, Sparkles, Check, Undo, ArrowLeft } from 'lucide-react';
import { Point, QuadCorners } from '../../types/document';
import { ImageProcessor } from '../../services/imageProcessing';

interface CornerAdjusterProps {
  imageSrc: string;
  initialCorners?: QuadCorners;
  onApplyCrop: (croppedImageSrc: string, corners: QuadCorners) => void;
  onCancel: () => void;
}

export const CornerAdjuster: React.FC<CornerAdjusterProps> = ({
  imageSrc,
  initialCorners,
  onApplyCrop,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeRef = useRef<HTMLCanvasElement>(null);

  const [corners, setCorners] = useState<QuadCorners | null>(initialCorners || null);
  const [activeCorner, setActiveCorner] = useState<keyof QuadCorners | null>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [canvasScale, setCanvasScale] = useState<{ scale: number; offsetX: number; offsetY: number }>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLoupe, setShowLoupe] = useState(false);
  const [loupePoint, setLoupePoint] = useState<Point>({ x: 0, y: 0 });

  // Load image & detect corners if none provided
  useEffect(() => {
    let active = true;

    ImageProcessor.loadImage(imageSrc)
      .then(async (img) => {
        if (!active) return;
        setImgElement(img);

        if (!initialCorners) {
          setIsProcessing(true);
          try {
            const detected = await ImageProcessor.detectDocumentCorners(imageSrc);
            if (active) setCorners(detected);
          } catch {
            if (active) setCorners(ImageProcessor.getDefaultCorners(img.naturalWidth || img.width, img.naturalHeight || img.height));
          } finally {
            if (active) setIsProcessing(false);
          }
        } else {
          setCorners(initialCorners);
        }
      })
      .catch((err) => {
        console.warn('CornerAdjuster image load failed, retrying raw decode:', err);
        const fallback = new Image();
        fallback.onload = () => {
          if (active) {
            setImgElement(fallback);
            setCorners(ImageProcessor.getDefaultCorners(fallback.width || 800, fallback.height || 1000));
          }
        };
        fallback.src = imageSrc;
      });

    return () => {
      active = false;
    };
  }, [imageSrc, initialCorners]);

  // Handle Resize & Canvas Drawing
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !imgElement || !corners || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const imgWidth = imgElement.naturalWidth || imgElement.width;
    const imgHeight = imgElement.naturalHeight || imgElement.height;

    const scale = Math.min((containerWidth - 32) / imgWidth, (containerHeight - 32) / imgHeight);
    const drawW = imgWidth * scale;
    const drawH = imgHeight * scale;
    const offsetX = (containerWidth - drawW) / 2;
    const offsetY = (containerHeight - drawH) / 2;

    canvas.width = containerWidth;
    canvas.height = containerHeight;
    setCanvasScale({ scale, offsetX, offsetY });

    ctx.clearRect(0, 0, containerWidth, containerHeight);

    // Draw background image
    ctx.drawImage(imgElement, offsetX, offsetY, drawW, drawH);

    // Helper to map image coords to screen coords
    const toScreen = (p: Point) => ({
      x: offsetX + p.x * scale,
      y: offsetY + p.y * scale,
    });

    const tl = toScreen(corners.topLeft);
    const tr = toScreen(corners.topRight);
    const br = toScreen(corners.bottomRight);
    const bl = toScreen(corners.bottomLeft);

    // Semi-transparent dark overlay outside polygon
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.fillRect(0, 0, containerWidth, containerHeight);

    // Cut out quad
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw polygon boundary lines
    ctx.save();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.stroke();

    // Draw grid lines inside quad (Rule of thirds guide)
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      const frac = i / 3;
      // Horizontal
      const pL = { x: tl.x + (bl.x - tl.x) * frac, y: tl.y + (bl.y - tl.y) * frac };
      const pR = { x: tr.x + (br.x - tr.x) * frac, y: tr.y + (br.y - tr.y) * frac };
      ctx.beginPath();
      ctx.moveTo(pL.x, pL.y);
      ctx.lineTo(pR.x, pR.y);
      ctx.stroke();

      // Vertical
      const pT = { x: tl.x + (tr.x - tl.x) * frac, y: tl.y + (tr.y - tl.y) * frac };
      const pB = { x: bl.x + (br.x - bl.x) * frac, y: bl.y + (br.y - bl.y) * frac };
      ctx.beginPath();
      ctx.moveTo(pT.x, pT.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
    }

    // Draw Corner Handles
    const cornerList: { key: keyof QuadCorners; pt: Point }[] = [
      { key: 'topLeft', pt: tl },
      { key: 'topRight', pt: tr },
      { key: 'bottomRight', pt: br },
      { key: 'bottomLeft', pt: bl },
    ];

    cornerList.forEach(({ key, pt }) => {
      const isSelected = activeCorner === key;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isSelected ? 16 : 13, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isSelected ? 16 : 13, 0, 2 * Math.PI);
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#6366f1';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#6366f1';
      ctx.fill();
    });

    ctx.restore();
  }, [imgElement, corners, activeCorner]);

  useEffect(() => {
    drawCanvas();
    const handleResize = () => drawCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas]);

  // Touch / Pointer coordinate conversion
  const getPointerPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!corners || !imgElement) return;
    const { x, y } = getPointerPos(e);
    const { scale, offsetX, offsetY } = canvasScale;

    // Detect which corner is closest within hit radius (35px)
    const hitRadius = 40;
    const cornerKeys: (keyof QuadCorners)[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
    let closestKey: keyof QuadCorners | null = null;
    let closestDist = Infinity;

    cornerKeys.forEach((key) => {
      const corner = corners[key];
      const screenX = offsetX + corner.x * scale;
      const screenY = offsetY + corner.y * scale;
      const dist = Math.hypot(screenX - x, screenY - y);
      if (dist < hitRadius && dist < closestDist) {
        closestDist = dist;
        closestKey = key;
      }
    });

    if (closestKey) {
      setActiveCorner(closestKey);
      setShowLoupe(true);
      setLoupePoint({ x, y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeCorner || !corners || !imgElement) return;
    const { x, y } = getPointerPos(e);
    const { scale, offsetX, offsetY } = canvasScale;

    // Convert screen point back to image coordinates
    const imgX = Math.max(0, Math.min(imgElement.naturalWidth, Math.round((x - offsetX) / scale)));
    const imgY = Math.max(0, Math.min(imgElement.naturalHeight, Math.round((y - offsetY) / scale)));

    setCorners((prev) => (prev ? { ...prev, [activeCorner]: { x: imgX, y: imgY } } : null));
    setLoupePoint({ x, y });
    updateLoupe(imgX, imgY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeCorner) {
      setActiveCorner(null);
      setShowLoupe(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Magnifying Loupe renderer
  const updateLoupe = (imgX: number, imgY: number) => {
    if (!loupeRef.current || !imgElement) return;
    const lCtx = loupeRef.current.getContext('2d');
    if (!lCtx) return;

    const loupeSize = 110;
    const zoom = 2.2;
    loupeRef.current.width = loupeSize;
    loupeRef.current.height = loupeSize;

    lCtx.clearRect(0, 0, loupeSize, loupeSize);
    lCtx.save();
    // Circular clip
    lCtx.beginPath();
    lCtx.arc(loupeSize / 2, loupeSize / 2, loupeSize / 2, 0, 2 * Math.PI);
    lCtx.clip();

    // Draw magnified image centered on (imgX, imgY)
    const srcW = loupeSize / zoom;
    const srcH = loupeSize / zoom;
    const srcX = imgX - srcW / 2;
    const srcY = imgY - srcH / 2;

    lCtx.drawImage(imgElement, srcX, srcY, srcW, srcH, 0, 0, loupeSize, loupeSize);

    // Crosshair target
    lCtx.strokeStyle = '#ef4444';
    lCtx.lineWidth = 1.5;
    lCtx.beginPath();
    lCtx.moveTo(loupeSize / 2 - 12, loupeSize / 2);
    lCtx.lineTo(loupeSize / 2 + 12, loupeSize / 2);
    lCtx.moveTo(loupeSize / 2, loupeSize / 2 - 12);
    lCtx.lineTo(loupeSize / 2, loupeSize / 2 + 12);
    lCtx.stroke();

    lCtx.restore();
  };

  // Re-detect Corners
  const handleAutoDetect = async () => {
    if (!imgElement) return;
    setIsProcessing(true);
    try {
      const detected = await ImageProcessor.detectDocumentCorners(imageSrc);
      setCorners(detected);
    } catch {
      setCorners(ImageProcessor.getDefaultCorners(imgElement.width, imgElement.height));
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to Full Image Rect
  const handleReset = () => {
    if (!imgElement) return;
    setCorners(ImageProcessor.getDefaultCorners(imgElement.naturalWidth, imgElement.naturalHeight));
  };

  // Apply Crop & Homography Warp
  const handleConfirmCrop = async () => {
    if (!corners) return;
    setIsProcessing(true);
    try {
      const warpedImage = await ImageProcessor.warpPerspective(imageSrc, corners);
      onApplyCrop(warpedImage, corners);
    } catch (err) {
      console.error('Warp failed', err);
      onApplyCrop(imageSrc, corners);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col select-none touch-none">
      {/* Top Header */}
      <div className="h-14 px-4 flex items-center justify-between bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white z-10">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retake</span>
        </button>

        <div className="text-center">
          <h2 className="text-sm font-semibold text-white">Adjust Boundaries</h2>
          <p className="text-[11px] text-slate-400">Drag the 4 corners to fit the document</p>
        </div>

        <button
          onClick={handleConfirmCrop}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition-all disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          <span>Next</span>
        </button>
      </div>

      {/* Main Interactive Canvas Area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full cursor-crosshair"
        />

        {/* Floating Magnifying Loupe */}
        {showLoupe && (
          <div
            className="absolute top-4 left-4 pointer-events-none rounded-full overflow-hidden border-2 border-white shadow-2xl bg-black z-20"
            style={{ width: 110, height: 110 }}
          >
            <canvas ref={loupeRef} width={110} height={110} />
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center text-white z-30">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Processing perspective warp...</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Tool Bar */}
      <div className="h-16 px-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-around text-white">
        <button
          onClick={handleAutoDetect}
          className="flex flex-col items-center gap-1 text-slate-300 hover:text-indigo-400 transition-colors"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px]">Auto Detect</span>
        </button>

        <button
          onClick={handleReset}
          className="flex flex-col items-center gap-1 text-slate-300 hover:text-indigo-400 transition-colors"
        >
          <Undo className="w-5 h-5" />
          <span className="text-[10px]">Reset Box</span>
        </button>

        <button
          onClick={handleConfirmCrop}
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/30 flex items-center gap-1.5"
        >
          <Check className="w-4 h-4" />
          <span>Perspective Warp</span>
        </button>
      </div>
    </div>
  );
};
