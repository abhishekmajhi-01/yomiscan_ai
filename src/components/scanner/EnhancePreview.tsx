import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Sliders,
  Check,
  ArrowLeft,
  Sun,
  Contrast,
  Droplet,
  Zap,
  Eye,
  RotateCw,
} from 'lucide-react';
import { FilterSettings } from '../../types/document';
import { ImageProcessor } from '../../services/imageProcessing';
import { AIService } from '../../services/aiService';

interface EnhancePreviewProps {
  imageSrc: string;
  initialFilters?: FilterSettings;
  onApplyFilters: (enhancedImageSrc: string, filters: FilterSettings) => void;
  onBack: () => void;
}

const DEFAULT_FILTERS: FilterSettings = {
  filter: 'auto',
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 10,
  shadowRemoval: true,
  noiseReduction: false,
  backgroundCleanup: true,
};

export const EnhancePreview: React.FC<EnhancePreviewProps> = ({
  imageSrc,
  initialFilters = DEFAULT_FILTERS,
  onApplyFilters,
  onBack,
}) => {
  const [filters, setFilters] = useState<FilterSettings>(initialFilters);
  const [processedSrc, setProcessedSrc] = useState<string>(imageSrc);
  const [activeTab, setActiveTab] = useState<'presets' | 'adjust'>('presets');
  const [sliderPos, setSliderPos] = useState<number>(50); // before/after split percentage
  const [isComparing, setIsComparing] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [aiAnalyzing, setAiAnalyzing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingSplitter = useRef<boolean>(false);

  // Re-run image enhancement whenever filters change
  useEffect(() => {
    let isCurrent = true;
    const update = async () => {
      setIsProcessing(true);
      try {
        const out = await ImageProcessor.applyFilters(imageSrc, filters);
        if (isCurrent) setProcessedSrc(out);
      } catch (err) {
        console.error('Enhancement error', err);
      } finally {
        if (isCurrent) setIsProcessing(false);
      }
    };
    update();
    return () => {
      isCurrent = false;
    };
  }, [imageSrc, filters]);

  // AI Auto-Enhance recommendation
  const handleAiAutoEnhance = async () => {
    setAiAnalyzing(true);
    try {
      const rec = await AIService.getAutoEnhanceRecommendation(imageSrc);
      setFilters((prev) => ({
        ...prev,
        filter: rec.recommendedFilter || 'auto',
        brightness: rec.brightness ?? 10,
        contrast: rec.contrast ?? 15,
        sharpness: rec.sharpness ?? 15,
        shadowRemoval: rec.shadowRemoval ?? true,
        noiseReduction: rec.noiseReduction ?? false,
        backgroundCleanup: true,
      }));
    } catch {
      // Fallback
      setFilters((prev) => ({
        ...prev,
        filter: 'auto',
        brightness: 10,
        contrast: 15,
        sharpness: 15,
        shadowRemoval: true,
        backgroundCleanup: true,
      }));
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Rotate 90 degrees
  const handleRotate = async () => {
    setIsProcessing(true);
    try {
      const rotated = await ImageProcessor.rotateImage(imageSrc, 90);
      const enhanced = await ImageProcessor.applyFilters(rotated, filters);
      setProcessedSrc(enhanced);
    } finally {
      setIsProcessing(false);
    }
  };

  // Before/after split slider interactions
  const handlePointerDownSplitter = () => {
    isDraggingSplitter.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingSplitter.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  const handlePointerUp = () => {
    isDraggingSplitter.current = false;
  };

  const filterPresets: { id: FilterSettings['filter']; name: string; desc: string }[] = [
    { id: 'original', name: 'Original', desc: 'Raw camera scan' },
    { id: 'auto', name: 'Auto Enhance', desc: 'Balanced lighting' },
    { id: 'bw', name: 'Black & White', desc: 'Crisp binary text' },
    { id: 'grayscale', name: 'Grayscale', desc: 'Smooth monochrome' },
    { id: 'color', name: 'Vibrant Color', desc: 'Boost stamps/seals' },
    { id: 'high-contrast', name: 'High Contrast', desc: 'Deep blacks' },
  ];

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col select-none touch-none"
    >
      {/* Top Header */}
      <div className="h-14 px-4 flex items-center justify-between bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsComparing((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              isComparing
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Before / After</span>
          </button>

          <button
            onClick={handleRotate}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => onApplyFilters(processedSrc, filters)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition-all"
        >
          <Check className="w-4 h-4" />
          <span>Save Scan</span>
        </button>
      </div>

      {/* Main Image Comparison Area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center p-4 bg-slate-900/40"
      >
        <div className="relative max-w-full max-h-full aspect-auto flex items-center justify-center shadow-2xl rounded-lg overflow-hidden border border-slate-800">
          {/* Enhanced / Processed Image (Base) */}
          <img
            src={processedSrc}
            alt="Enhanced"
            className="max-h-[60vh] sm:max-h-[68vh] w-auto object-contain block pointer-events-none"
          />

          {/* Original Image (Clipped Left Layer when comparing) */}
          {isComparing && (
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={imageSrc}
                alt="Original"
                className="max-h-[60vh] sm:max-h-[68vh] w-auto object-contain block max-w-none"
                style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%' }}
              />
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/70 text-[10px] font-semibold text-white uppercase tracking-wider backdrop-blur-xs">
                Original
              </div>
            </div>
          )}

          {isComparing && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-indigo-600/80 text-[10px] font-semibold text-white uppercase tracking-wider backdrop-blur-xs">
              Enhanced
            </div>
          )}

          {/* Draggable Divider Bar */}
          {isComparing && (
            <div
              onPointerDown={handlePointerDownSplitter}
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 flex items-center justify-center shadow-lg"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-slate-800 text-xs font-bold -ml-0.5 select-none">
                ↔
              </div>
            </div>
          )}
        </div>

        {isProcessing && (
          <div className="absolute bottom-4 right-4 bg-slate-900/90 border border-slate-700 text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-2 shadow-lg backdrop-blur-md">
            <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span>Rendering filter...</span>
          </div>
        )}
      </div>

      {/* Enhancement Controls Panel */}
      <div className="bg-slate-900 border-t border-slate-800 text-white">
        {/* Sub-Tabs: Presets vs Manual Adjustments */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1 border-b border-slate-800/80">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'presets'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Presets
            </button>
            <button
              onClick={() => setActiveTab('adjust')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'adjust'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Adjust
            </button>
          </div>

          <button
            onClick={handleAiAutoEnhance}
            disabled={aiAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-indigo-600 text-white text-xs font-semibold shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiAnalyzing ? 'AI Analyzing...' : 'AI Auto-Enhance'}</span>
          </button>
        </div>

        {/* Tab 1: Presets */}
        {activeTab === 'presets' && (
          <div className="p-3 overflow-x-auto flex items-center gap-2">
            {filterPresets.map((p) => {
              const isSelected = filters.filter === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setFilters((prev) => ({ ...prev, filter: p.id }))}
                  className={`flex flex-col items-start px-3 py-2 rounded-xl border text-left shrink-0 transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-semibold">{p.name}</span>
                  <span className="text-[10px] text-slate-400">{p.desc}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 2: Manual Fine Tuning */}
        {activeTab === 'adjust' && (
          <div className="p-4 space-y-3 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              {/* Brightness */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-400" /> Brightness
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{filters.brightness}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={filters.brightness}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, brightness: parseInt(e.target.value, 10) }))
                  }
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Contrast */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Contrast className="w-3.5 h-3.5 text-sky-400" /> Contrast
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{filters.contrast}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={filters.contrast}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, contrast: parseInt(e.target.value, 10) }))
                  }
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Saturation */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Droplet className="w-3.5 h-3.5 text-emerald-400" /> Saturation
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{filters.saturation}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={filters.saturation}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, saturation: parseInt(e.target.value, 10) }))
                  }
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Sharpness */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-300" /> Sharpen
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{filters.sharpness}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={filters.sharpness}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, sharpness: parseInt(e.target.value, 10) }))
                  }
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="flex flex-wrap gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.shadowRemoval}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, shadowRemoval: e.target.checked }))
                  }
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-800"
                />
                <span>Shadow Removal</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.noiseReduction}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, noiseReduction: e.target.checked }))
                  }
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-800"
                />
                <span>Noise Reduction</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.backgroundCleanup}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, backgroundCleanup: e.target.checked }))
                  }
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-800"
                />
                <span>Background Cleanup</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
