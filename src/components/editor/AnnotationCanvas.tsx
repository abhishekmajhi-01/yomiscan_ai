import React, { useRef, useState, useEffect } from 'react';
import {
  Pen,
  Highlighter,
  Type,
  Square,
  Circle,
  ArrowRight,
  Minus,
  Strikethrough,
  Eraser,
  Undo2,
  Redo2,
  Check,
  X,
  Palette,
} from 'lucide-react';
import { AnnotationItem, Point } from '../../types/document';

interface AnnotationCanvasProps {
  imageSrc: string;
  initialAnnotations?: AnnotationItem[];
  onSave: (annotations: AnnotationItem[]) => void;
  onClose: () => void;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  imageSrc,
  initialAnnotations = [],
  onSave,
  onClose,
}) => {
  const [annotations, setAnnotations] = useState<AnnotationItem[]>(initialAnnotations);
  const [undoStack, setUndoStack] = useState<AnnotationItem[][]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationItem[][]>([]);

  const [activeTool, setActiveTool] = useState<
    | 'pen'
    | 'highlighter'
    | 'text'
    | 'rectangle'
    | 'circle'
    | 'arrow'
    | 'underline'
    | 'strikethrough'
    | 'eraser'
  >('pen');

  const [color, setColor] = useState<string>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [textInput, setTextInput] = useState<{ open: boolean; point: Point; text: string }>({
    open: false,
    point: { x: 0, y: 0 },
    text: '',
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef<boolean>(false);
  const currentPoints = useRef<Point[]>([]);
  const startPoint = useRef<Point | null>(null);

  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#0f172a', '#ffffff'];

  // Record undo state before modifying
  const recordHistory = () => {
    setUndoStack((prev) => [...prev, [...annotations]]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, [...annotations]]);
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setAnnotations(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, [...annotations]]);
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setAnnotations(next);
  };

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    annotations.forEach((ann) => {
      ctx.save();
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = ann.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (ann.type === 'highlighter') {
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = ann.strokeWidth * 2;
      }

      if (ann.type === 'pen' || ann.type === 'highlighter') {
        if (ann.points && ann.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          for (let i = 1; i < ann.points.length; i++) {
            ctx.lineTo(ann.points[i].x, ann.points[i].y);
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
        const headlen = 16;
        const fromX = ann.startPoint.x;
        const fromY = ann.startPoint.y;
        const toX = ann.endPoint.x;
        const toY = ann.endPoint.y;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (ann.type === 'text' && ann.startPoint && ann.text) {
        ctx.font = `${ann.fontSize || 20}px sans-serif`;
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
    });
  }, [annotations]);

  // Adjust canvas dimensions to match image natural size
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      if (canvasRef.current) {
        canvasRef.current.width = img.naturalWidth || img.width;
        canvasRef.current.height = img.naturalHeight || img.height;
      }
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Pointer Handlers
  const getCanvasCoords = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const pt = getCanvasCoords(e);

    // Eraser Tool
    if (activeTool === 'eraser') {
      recordHistory();
      // Remove clicked annotation
      setAnnotations((prev) =>
        prev.filter((ann) => {
          if (ann.startPoint && Math.hypot(ann.startPoint.x - pt.x, ann.startPoint.y - pt.y) < 30) {
            return false;
          }
          if (ann.points) {
            return !ann.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 25);
          }
          return true;
        })
      );
      return;
    }

    // Text Tool
    if (activeTool === 'text') {
      setTextInput({ open: true, point: pt, text: '' });
      return;
    }

    recordHistory();
    isDrawing.current = true;
    startPoint.current = pt;
    currentPoints.current = [pt];
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current || !startPoint.current) return;
    const pt = getCanvasCoords(e);
    currentPoints.current.push(pt);

    // Live preview
    if (activeTool === 'pen' || activeTool === 'highlighter') {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        if (activeTool === 'highlighter') {
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = strokeWidth * 2;
        }
        ctx.beginPath();
        const prev = currentPoints.current[currentPoints.current.length - 2];
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing.current || !startPoint.current) return;
    isDrawing.current = false;
    const endPt = getCanvasCoords(e);

    const newAnn: AnnotationItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: activeTool as any,
      color,
      strokeWidth,
      startPoint: startPoint.current,
      endPoint: endPt,
      points: [...currentPoints.current],
    };

    setAnnotations((prev) => [...prev, newAnn]);
    currentPoints.current = [];
    startPoint.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Confirm Text annotation
  const handleAddText = () => {
    if (!textInput.text.trim()) {
      setTextInput({ open: false, point: { x: 0, y: 0 }, text: '' });
      return;
    }
    recordHistory();
    const newAnn: AnnotationItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'text',
      color,
      strokeWidth,
      startPoint: textInput.point,
      text: textInput.text,
      fontSize: Math.max(16, strokeWidth * 4),
    };
    setAnnotations((prev) => [...prev, newAnn]);
    setTextInput({ open: false, point: { x: 0, y: 0 }, text: '' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col select-none touch-none">
      {/* Top Header */}
      <div className="h-14 px-4 flex items-center justify-between bg-slate-900 border-b border-slate-800 text-white z-20">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white"
        >
          <X className="w-4 h-4" />
          <span>Cancel</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => onSave(annotations)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-500/30"
        >
          <Check className="w-4 h-4" />
          <span>Save</span>
        </button>
      </div>

      {/* Main Annotation Viewport */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-auto flex items-center justify-center p-4 bg-slate-950"
      >
        <div className="relative inline-block shadow-2xl rounded-lg overflow-hidden border border-slate-800">
          <img
            src={imageSrc}
            alt="Base Scan"
            className="max-h-[68vh] w-auto object-contain block pointer-events-none select-none"
          />
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          />
        </div>

        {/* Text Input Prompt Floating Box */}
        {textInput.open && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl z-30 max-w-xs w-full">
            <h4 className="text-xs font-semibold text-white mb-2">Add Text Annotation</h4>
            <input
              type="text"
              autoFocus
              value={textInput.text}
              onChange={(e) => setTextInput((prev) => ({ ...prev, text: e.target.value }))}
              placeholder="Enter text..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setTextInput({ open: false, point: { x: 0, y: 0 }, text: '' })}
                className="px-3 py-1 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddText}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
              >
                Insert
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Annotation Tools Bottom Toolbar */}
      <div className="bg-slate-900 border-t border-slate-800 text-white p-3 z-20 pb-safe">
        {/* Tool Selector Bar */}
        <div className="flex items-center justify-around gap-1 overflow-x-auto pb-2 mb-2 border-b border-slate-800">
          {[
            { id: 'pen', icon: Pen, label: 'Pen' },
            { id: 'highlighter', icon: Highlighter, label: 'Highlighter' },
            { id: 'text', icon: Type, label: 'Text' },
            { id: 'rectangle', icon: Square, label: 'Rectangle' },
            { id: 'circle', icon: Circle, label: 'Circle' },
            { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
            { id: 'underline', icon: Minus, label: 'Underline' },
            { id: 'strikethrough', icon: Strikethrough, label: 'Strike' },
            { id: 'eraser', icon: Eraser, label: 'Eraser' },
          ].map((t) => {
            const Icon = t.icon;
            const isSelected = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id as any)}
                className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={t.label}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[9px]">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Color Palette & Stroke Width */}
        <div className="flex items-center justify-between px-2">
          {/* Colors */}
          <div className="flex items-center gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  color === c ? 'scale-120 border-white shadow-xs' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Stroke slider */}
          <div className="flex items-center gap-2 max-w-[120px] w-full">
            <span className="text-[10px] text-slate-400">Size:</span>
            <input
              type="range"
              min="2"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
