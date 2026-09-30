import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Zap,
  ZapOff,
  SwitchCamera,
  X,
  Check,
  CreditCard,
  Receipt,
  Contact,
  FileText,
  Layers,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { ScanMode, DocumentPage, FilterSettings, QuadCorners } from '../../types/document';
import { ImageProcessor } from '../../services/imageProcessing';
import { CornerAdjuster } from './CornerAdjuster';
import { EnhancePreview } from './EnhancePreview';
import { IDCardScanner } from './IDCardScanner';
import { ScanProcessingOverlay } from './ScanProcessingOverlay';
import { useToast } from '../common/Toast';

interface CameraScannerProps {
  initialMode?: ScanMode;
  onFinishScan: (pages: DocumentPage[], mode: ScanMode) => void;
  onClose: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  initialMode = 'document',
  onFinishScan,
  onClose,
}) => {
  const { showToast } = useToast();

  const [mode, setMode] = useState<ScanMode>(initialMode);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isMultiPage, setIsMultiPage] = useState(true);
  const [capturedPages, setCapturedPages] = useState<DocumentPage[]>([]);
  const [isAutoCapture, setIsAutoCapture] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Live detection status
  const [documentDetected, setDocumentDetected] = useState<boolean>(true);
  const [detectionHintIndex, setDetectionHintIndex] = useState<number>(0);

  const detectionHints = [
    'Document detected',
    'Move closer for sharper text',
    'Hold steady and improve lighting',
    'Place document on a flat surface',
  ];

  // Intermediate states for Corner Adjuster and Enhance Preview
  const [currentRawCapture, setCurrentRawCapture] = useState<string | null>(null);
  const [detectedCorners, setDetectedCorners] = useState<QuadCorners | null>(null);
  const [warpedImage, setWarpedImage] = useState<string | null>(null);
  const [isAdjustingCorners, setIsAdjustingCorners] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showProcessingOverlay, setShowProcessingOverlay] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cycle hints periodically
  useEffect(() => {
    const hintInterval = setInterval(() => {
      setDetectionHintIndex((idx) => (idx + 1) % detectionHints.length);
    }, 3200);
    return () => clearInterval(hintInterval);
  }, []);

  // Initialize Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check for torch capability
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities ? (videoTrack.getCapabilities() as any) : {};
      setHasTorch(!!capabilities.torch);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError('Camera permission denied or camera unavailable. Please check your browser permissions.');
    }
  }, [facingMode]);

  useEffect(() => {
    if (mode !== 'idcard' && !isAdjustingCorners && !isEnhancing) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera, mode, isAdjustingCorners, isEnhancing]);

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track.getCapabilities as any)?.torch) {
      try {
        const nextTorch = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextTorch } as any],
        });
        setTorchOn(nextTorch);
      } catch (err) {
        console.warn('Torch toggle failed', err);
      }
    }
  };

  // Switch between Rear and Front camera
  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture Photo
  const handleCapture = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    setShowProcessingOverlay(true);
    setCurrentRawCapture(dataUrl);

    try {
      const corners = await ImageProcessor.detectDocumentCorners(dataUrl);
      setDetectedCorners(corners);
    } catch {
      setDetectedCorners(null);
    }
  };

  // Callback once ScanProcessingOverlay finishes its steps
  const handleProcessingComplete = () => {
    setShowProcessingOverlay(false);
    setIsAdjustingCorners(true);
  };

  // Gallery File Import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      const newPages: DocumentPage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Detect corners & auto-enhance
        const corners = await ImageProcessor.detectDocumentCorners(dataUrl);
        const warped = await ImageProcessor.warpPerspective(dataUrl, corners);
        const defaultFilters: FilterSettings = {
          filter: 'auto',
          brightness: 5,
          contrast: 15,
          saturation: 5,
          sharpness: 10,
          shadowRemoval: true,
          noiseReduction: false,
          backgroundCleanup: true,
        };
        const enhanced = await ImageProcessor.applyFilters(warped, defaultFilters);
        const thumb = await ImageProcessor.createThumbnail(enhanced);

        newPages.push({
          id: Math.random().toString(36).substring(2, 9),
          pageNumber: capturedPages.length + i + 1,
          originalImage: dataUrl,
          processedImage: enhanced,
          thumbnail: thumb,
          width: 800,
          height: 1100,
          rotation: 0,
          filters: defaultFilters,
        });
      }

      setCapturedPages((prev) => [...prev, ...newPages]);
      showToast(`Imported ${newPages.length} image(s) successfully!`, 'success');

      if (!isMultiPage && newPages.length > 0) {
        onFinishScan(newPages, mode);
      }
    } catch (err) {
      console.error('File import error', err);
      showToast('Failed to import one or more images.', 'error');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Step 2: From Corner Adjuster -> Go to Enhance Preview
  const handleCornerCropComplete = (warpedSrc: string, corners: QuadCorners) => {
    setWarpedImage(warpedSrc);
    setDetectedCorners(corners);
    setIsAdjustingCorners(false);
    setIsEnhancing(true);
  };

  // Step 3: From Enhance Preview -> Add to Captured Pages
  const handleEnhanceComplete = async (enhancedSrc: string, filters: FilterSettings) => {
    if (!currentRawCapture || !warpedImage) return;

    setIsProcessing(true);
    try {
      const thumb = await ImageProcessor.createThumbnail(enhancedSrc);
      const newPage: DocumentPage = {
        id: Math.random().toString(36).substring(2, 9),
        pageNumber: capturedPages.length + 1,
        originalImage: currentRawCapture,
        processedImage: enhancedSrc,
        thumbnail: thumb,
        width: 800,
        height: 1100,
        rotation: 0,
        corners: detectedCorners || undefined,
        filters,
      };

      const updatedPages = [...capturedPages, newPage];
      setCapturedPages(updatedPages);

      setIsEnhancing(false);
      setCurrentRawCapture(null);
      setWarpedImage(null);

      showToast(`Page ${updatedPages.length} captured!`, 'success');

      if (!isMultiPage) {
        onFinishScan(updatedPages, mode);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // If ID Card Mode is selected, render IDCardScanner flow
  if (mode === 'idcard') {
    return (
      <IDCardScanner
        onComplete={(pages) => onFinishScan(pages, 'idcard')}
        onCancel={() => setMode('document')}
      />
    );
  }

  // If showing 4-step ScanProcessingOverlay
  if (showProcessingOverlay) {
    return <ScanProcessingOverlay onComplete={handleProcessingComplete} />;
  }

  // If in Corner Adjuster screen
  if (isAdjustingCorners && currentRawCapture) {
    return (
      <CornerAdjuster
        imageSrc={currentRawCapture}
        initialCorners={detectedCorners || undefined}
        onApplyCrop={handleCornerCropComplete}
        onCancel={() => {
          setIsAdjustingCorners(false);
          setCurrentRawCapture(null);
        }}
      />
    );
  }

  // If in Enhance Preview screen
  if (isEnhancing && warpedImage) {
    return (
      <EnhancePreview
        imageSrc={warpedImage}
        onApplyFilters={handleEnhanceComplete}
        onBack={() => {
          setIsEnhancing(false);
          setIsAdjustingCorners(true);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col text-white select-none">
      {/* Hidden file input for gallery import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Top Header Bar */}
      <div className="h-14 px-4 flex items-center justify-between bg-black/40 backdrop-blur-md absolute top-0 left-0 right-0 z-20">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-slate-900/60 text-white hover:bg-slate-800"
          title="Close Camera"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Auto / Manual Mode Pill */}
        <div className="flex items-center bg-black/60 backdrop-blur-md border border-slate-700/80 rounded-full p-0.5">
          <button
            onClick={() => setIsAutoCapture(false)}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
              !isAutoCapture ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setIsAutoCapture(true)}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
              isAutoCapture ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'
            }`}
          >
            Auto
          </button>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                torchOn ? 'bg-amber-500 text-white' : 'bg-slate-900/60 text-slate-300'
              }`}
              title="Toggle Flashlight"
            >
              {torchOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={handleSwitchCamera}
            className="p-2 rounded-full bg-slate-900/60 text-slate-300 hover:text-white"
            title="Switch Camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Camera Video Viewport */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {cameraError ? (
          <div className="p-8 text-center max-w-sm flex flex-col items-center">
            <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Camera Access Required</h3>
            <p className="text-xs text-slate-400 mb-4">{cameraError}</p>
            <div className="flex gap-2">
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Retry Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
              >
                Import from Gallery
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />

            {/* Live Document Framing Overlay & Scan Line */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
              <div className="w-full max-w-sm aspect-[1/1.38] border-2 border-dashed border-indigo-400/80 rounded-2xl relative shadow-2xl flex flex-col items-center justify-between p-4">
                {/* 4 Corner Markers */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-indigo-400 rounded-tl-md shadow-[0_0_8px_#818cf8]" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-indigo-400 rounded-tr-md shadow-[0_0_8px_#818cf8]" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-indigo-400 rounded-bl-md shadow-[0_0_8px_#818cf8]" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-indigo-400 rounded-br-md shadow-[0_0_8px_#818cf8]" />

                {/* Live Detection Status Indicator */}
                <div className="px-3.5 py-1 rounded-full bg-black/75 border border-indigo-500/40 text-[11px] font-semibold text-emerald-400 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{detectionHints[detectionHintIndex]}</span>
                </div>

                {/* Radar laser line */}
                <div className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#38bdf8] animate-radar" />

                <div className="text-[10px] text-slate-300 bg-black/60 px-2.5 py-0.5 rounded backdrop-blur-xs">
                  {isAutoCapture ? 'Auto-capture ready' : 'Tap shutter to capture'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mode Selector Carousel */}
      <div className="h-10 bg-black/60 flex items-center justify-center gap-4 text-xs font-medium z-20">
        <button
          onClick={() => setMode('document')}
          className={`px-3 py-1 rounded-full transition-all ${
            mode === 'document' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Document
        </button>

        <button
          onClick={() => setMode('idcard')}
          className={`px-3 py-1 rounded-full transition-all ${
            (mode as string) === 'idcard' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          ID Card
        </button>

        <button
          onClick={() => setMode('receipt')}
          className={`px-3 py-1 rounded-full transition-all ${
            mode === 'receipt' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Receipt
        </button>

        <button
          onClick={() => setMode('businesscard')}
          className={`px-3 py-1 rounded-full transition-all ${
            mode === 'businesscard' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Business Card
        </button>
      </div>

      {/* Bottom Controls Bar */}
      <div className="h-24 px-6 bg-slate-950 flex items-center justify-between z-20 pb-safe">
        {/* Gallery Import Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-white"
        >
          <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
            <ImageIcon className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-[10px]">Import</span>
        </button>

        {/* Shutter Button */}
        <button
          onClick={handleCapture}
          disabled={isProcessing}
          className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:scale-95 transition-transform shadow-xl disabled:opacity-50"
        >
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center" />
        </button>

        {/* Multi-page Thumbnail Queue / Finish Button */}
        {capturedPages.length > 0 ? (
          <button
            onClick={() => onFinishScan(capturedPages, mode)}
            className="flex flex-col items-center gap-1 text-white relative group"
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center relative overflow-hidden border border-indigo-400 shadow-md">
              <img
                src={capturedPages[capturedPages.length - 1].thumbnail}
                alt="Latest"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 rounded-bl text-[9px] font-bold flex items-center justify-center text-white">
                {capturedPages.length}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-indigo-400 flex items-center">
              Finish <ChevronRight className="w-3 h-3" />
            </span>
          </button>
        ) : (
          <button
            onClick={() => setIsMultiPage((prev) => !prev)}
            className={`flex flex-col items-center gap-1 ${
              isMultiPage ? 'text-indigo-400' : 'text-slate-400'
            }`}
          >
            <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[10px]">{isMultiPage ? 'Multi-Page' : 'Single'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
