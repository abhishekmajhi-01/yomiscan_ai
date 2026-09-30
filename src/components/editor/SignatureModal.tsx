import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool,
  Type,
  Upload,
  Bookmark,
  Trash2,
  Check,
  X,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { SavedSignature } from '../../types/document';
import { storageService } from '../../services/storage';
import { ImageProcessor } from '../../services/imageProcessing';

interface SignatureModalProps {
  onSelectSignature: (dataUrl: string) => void;
  onClose: () => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  onSelectSignature,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload' | 'saved'>('draw');
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [inkColor, setInkColor] = useState<string>('#0f172a'); // default black/slate
  const [penWidth, setPenWidth] = useState<number>(3);
  const [typedName, setTypedName] = useState<string>('John Doe');
  const [selectedFontIndex, setSelectedFontIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef<boolean>(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved signatures
  useEffect(() => {
    storageService.getSignatures().then(setSavedSignatures);
  }, []);

  // Initialize Canvas
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = inkColor;
        ctx.lineWidth = penWidth;
      }
    }
  }, [activeTab, inkColor, penWidth]);

  // Drawing handlers
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawing.current = true;
    lastPoint.current = { x, y };

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !canvasRef.current || !lastPoint.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = penWidth;
    ctx.lineTo(x, y);
    ctx.stroke();

    lastPoint.current = { x, y };
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing.current) {
      isDrawing.current = false;
      lastPoint.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  // Convert Drawn canvas to transparent PNG & apply
  const handleApplyDrawn = async (saveToLibrary = false) => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');

    if (saveToLibrary) {
      const newSig: SavedSignature = {
        id: Math.random().toString(36).substring(2, 9),
        title: `Signature ${savedSignatures.length + 1}`,
        dataUrl,
        createdAt: new Date().toISOString(),
        type: 'draw',
      };
      await storageService.saveSignature(newSig);
    }

    onSelectSignature(dataUrl);
  };

  // Type signature fonts
  const fonts = [
    { name: 'Elegant Calligraphy', style: "italic 36px 'Great Vibes', cursive, 'Brush Script MT', serif" },
    { name: 'Modern Script', style: "italic 34px 'Dancing Script', 'Caveat', cursive, sans-serif" },
    { name: 'Formal Signature', style: "italic 32px 'Times New Roman', serif, Georgia" },
    { name: 'Casual Hand', style: "30px 'Comic Sans MS', cursive, sans-serif" },
  ];

  const handleApplyTyped = async (saveToLibrary = false) => {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = inkColor;
    ctx.font = fonts[selectedFontIndex].style;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);

    const dataUrl = canvas.toDataURL('image/png');

    if (saveToLibrary) {
      const newSig: SavedSignature = {
        id: Math.random().toString(36).substring(2, 9),
        title: typedName,
        dataUrl,
        createdAt: new Date().toISOString(),
        type: 'type',
      };
      await storageService.saveSignature(newSig);
    }

    onSelectSignature(dataUrl);
  };

  // Upload signature with background removal
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const rawDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Remove background so signature is transparent
      const transparentSig = await ImageProcessor.removeSignatureBackground(rawDataUrl);

      // Auto save to library
      const newSig: SavedSignature = {
        id: Math.random().toString(36).substring(2, 9),
        title: file.name.replace(/\.[^/.]+$/, ''),
        dataUrl: transparentSig,
        createdAt: new Date().toISOString(),
        type: 'upload',
      };
      await storageService.saveSignature(newSig);
      setSavedSignatures((prev) => [...prev, newSig]);

      onSelectSignature(transparentSig);
    } catch (err) {
      console.error('Signature upload error', err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteSaved = async (id: string) => {
    await storageService.deleteSignature(id);
    setSavedSignatures((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PenTool className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Digital Signature</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-1 gap-1">
          <button
            onClick={() => setActiveTab('draw')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'draw'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>

          <button
            onClick={() => setActiveTab('type')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'type'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'saved'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved ({savedSignatures.length})</span>
          </button>
        </div>

        {/* Ink Color Selector (Shared for Draw and Type) */}
        {(activeTab === 'draw' || activeTab === 'type') && (
          <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">Ink Color:</span>
            <div className="flex items-center gap-2">
              {[
                { label: 'Black', color: '#0f172a' },
                { label: 'Navy Blue', color: '#1e3a8a' },
                { label: 'Crimson Red', color: '#b91c1c' },
              ].map((c) => (
                <button
                  key={c.color}
                  onClick={() => setInkColor(c.color)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    inkColor === c.color ? 'scale-115 border-indigo-500 shadow-xs' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: Draw Signature */}
        {activeTab === 'draw' && (
          <div className="p-5 flex flex-col items-center">
            <div className="w-full h-44 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 relative overflow-hidden flex items-center justify-center shadow-inner">
              <canvas
                ref={canvasRef}
                width={460}
                height={176}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                className="w-full h-full cursor-crosshair touch-none"
              />
              <span className="absolute bottom-2 left-3 text-[10px] text-slate-400 pointer-events-none select-none">
                Sign here with finger or mouse
              </span>
            </div>

            <div className="w-full flex items-center justify-between mt-4">
              <button
                onClick={clearCanvas}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleApplyDrawn(true)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Save & Apply
                </button>
                <button
                  onClick={() => handleApplyDrawn(false)}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Type Signature */}
        {activeTab === 'type' && (
          <div className="p-5 flex flex-col gap-4">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Your Name / Title</label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your name"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Choose Font Style:</span>
              <div className="grid grid-cols-2 gap-2">
                {fonts.map((f, idx) => (
                  <button
                    key={f.name}
                    onClick={() => setSelectedFontIndex(idx)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedFontIndex === idx
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <p
                      className="text-base truncate"
                      style={{ color: inkColor, fontStyle: 'italic', fontFamily: 'serif' }}
                    >
                      {typedName || 'Signature'}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-1">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handleApplyTyped(true)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Save & Apply
              </button>
              <button
                onClick={() => handleApplyTyped(false)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Upload Signature */}
        {activeTab === 'upload' && (
          <div className="p-6 flex flex-col items-center text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadFile}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-10 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/60 dark:bg-slate-800/40 cursor-pointer flex flex-col items-center justify-center gap-2 group transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Upload image of your signature
              </h4>
              <p className="text-xs text-slate-400 max-w-xs">
                Supports PNG, JPG. White and light paper backgrounds are automatically removed!
              </p>
            </div>

            {isProcessing && (
              <p className="text-xs text-indigo-500 mt-3 animate-pulse">
                Removing background and vectorizing ink...
              </p>
            )}
          </div>
        )}

        {/* Tab 4: Saved Signatures */}
        {activeTab === 'saved' && (
          <div className="p-5 max-h-72 overflow-y-auto">
            {savedSignatures.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No saved signatures yet.</p>
                <p className="text-[11px] text-slate-500">Draw or upload a signature and save it for one-tap reuse.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {savedSignatures.map((sig) => (
                  <div
                    key={sig.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex flex-col justify-between group hover:border-indigo-500 transition-all"
                  >
                    <div
                      onClick={() => onSelectSignature(sig.dataUrl)}
                      className="h-20 flex items-center justify-center cursor-pointer p-1"
                    >
                      <img src={sig.dataUrl} alt={sig.title} className="max-h-full max-w-full object-contain" />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                      <span className="text-[11px] text-slate-500 truncate max-w-[90px]">{sig.title}</span>
                      <button
                        onClick={() => handleDeleteSaved(sig.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
