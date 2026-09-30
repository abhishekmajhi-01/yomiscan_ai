import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, ArrowLeft, Layers, Columns, FileText } from 'lucide-react';
import { ImageProcessor } from '../../services/imageProcessing';
import { DocumentPage, FilterSettings } from '../../types/document';

interface IDCardScannerProps {
  onComplete: (pages: DocumentPage[]) => void;
  onCancel: () => void;
}

export const IDCardScanner: React.FC<IDCardScannerProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<'front' | 'back' | 'layout'>('front');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [layout, setLayout] = useState<'stacked' | 'side-by-side' | 'separate'>('stacked');
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize Camera
  useEffect(() => {
    let active = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (active) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Camera failed to start in ID mode', err);
      }
    };

    if (step !== 'layout') {
      startCamera();
    }

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [step]);

  // Capture current side
  const handleCapture = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawData = canvas.toDataURL('image/jpeg', 0.95);

    setIsProcessing(true);
    try {
      // Auto crop card region
      const corners = await ImageProcessor.detectDocumentCorners(rawData);
      const warped = await ImageProcessor.warpPerspective(rawData, corners);
      const enhanced = await ImageProcessor.applyFilters(warped, {
        filter: 'color',
        brightness: 5,
        contrast: 15,
        saturation: 10,
        sharpness: 12,
        shadowRemoval: true,
        noiseReduction: false,
        backgroundCleanup: true,
      });

      if (step === 'front') {
        setFrontImage(enhanced);
        setStep('back');
      } else if (step === 'back') {
        setBackImage(enhanced);
        setStep('layout');
      }
    } catch {
      if (step === 'front') {
        setFrontImage(rawData);
        setStep('back');
      } else {
        setBackImage(rawData);
        setStep('layout');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Build final pages
  const handleFinish = async () => {
    if (!frontImage || !backImage) return;
    setIsProcessing(true);

    try {
      const defaultFilters: FilterSettings = {
        filter: 'color',
        brightness: 5,
        contrast: 15,
        saturation: 10,
        sharpness: 10,
        shadowRemoval: true,
        noiseReduction: false,
        backgroundCleanup: true,
      };

      if (layout === 'separate') {
        const thumb1 = await ImageProcessor.createThumbnail(frontImage);
        const thumb2 = await ImageProcessor.createThumbnail(backImage);

        const page1: DocumentPage = {
          id: Math.random().toString(36).substring(2, 9),
          pageNumber: 1,
          originalImage: frontImage,
          processedImage: frontImage,
          thumbnail: thumb1,
          width: 800,
          height: 500,
          rotation: 0,
          filters: defaultFilters,
        };

        const page2: DocumentPage = {
          id: Math.random().toString(36).substring(2, 9),
          pageNumber: 2,
          originalImage: backImage,
          processedImage: backImage,
          thumbnail: thumb2,
          width: 800,
          height: 500,
          rotation: 0,
          filters: defaultFilters,
        };

        onComplete([page1, page2]);
      } else {
        // Combined into single page
        const combined = await ImageProcessor.combineIDCardPages(
          frontImage,
          backImage,
          layout === 'side-by-side' ? 'side-by-side' : 'stacked'
        );
        const thumb = await ImageProcessor.createThumbnail(combined);

        const page: DocumentPage = {
          id: Math.random().toString(36).substring(2, 9),
          pageNumber: 1,
          originalImage: combined,
          processedImage: combined,
          thumbnail: thumb,
          width: 800,
          height: 1000,
          rotation: 0,
          filters: defaultFilters,
        };

        onComplete([page]);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col text-white">
      {/* Top Bar */}
      <div className="h-14 px-4 flex items-center justify-between bg-slate-900/90 border-b border-slate-800">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel</span>
        </button>

        <div className="text-center">
          <h2 className="text-sm font-semibold">ID Card Mode</h2>
          <p className="text-[11px] text-indigo-400">
            {step === 'front'
              ? 'Step 1/2: Scan Front Side'
              : step === 'back'
              ? 'Step 2/2: Scan Back Side'
              : 'Choose Page Layout'}
          </p>
        </div>

        <div className="w-12" />
      </div>

      {/* Camera Preview with Card Guide Overlay */}
      {step !== 'layout' ? (
        <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="w-full h-full object-cover"
          />

          {/* ID Card Framing Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
            <div className="w-full max-w-sm aspect-[1.586/1] border-2 border-indigo-400/90 rounded-2xl relative shadow-2xl flex flex-col items-center justify-between p-4 bg-indigo-950/20 backdrop-contrast-125">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />

              <span className="px-3 py-1 rounded-full bg-slate-900/80 text-xs font-semibold tracking-wide text-indigo-300 backdrop-blur-md">
                Align {step === 'front' ? 'FRONT' : 'BACK'} of ID inside frame
              </span>

              {/* Scanning laser line */}
              <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#38bdf8] animate-radar pointer-events-none" />

              <span className="text-[10px] text-slate-300 bg-slate-900/60 px-2 py-0.5 rounded">
                Standard ID / Driver License
              </span>
            </div>
          </div>

          {/* Bottom Capture Controls */}
          <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6">
            <button
              onClick={handleCapture}
              disabled={isProcessing}
              className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:scale-95 transition-transform shadow-xl disabled:opacity-50"
            >
              <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center">
                <Camera className="w-7 h-7 text-white" />
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* Step 3: Layout Selection Screen */
        <div className="flex-1 p-6 flex flex-col items-center justify-center max-w-md mx-auto w-full">
          <h3 className="text-base font-bold text-white mb-2">Select ID Card Layout</h3>
          <p className="text-xs text-slate-400 text-center mb-6">
            Both sides captured. How would you like them placed in the final document?
          </p>

          <div className="grid grid-cols-1 gap-3 w-full mb-8">
            <button
              onClick={() => setLayout('stacked')}
              className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                layout === 'stacked'
                  ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/20'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Front + Back (Stacked)</h4>
                <p className="text-xs text-slate-400">Both sides on one single page, stacked vertically</p>
              </div>
            </button>

            <button
              onClick={() => setLayout('side-by-side')}
              className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                layout === 'side-by-side'
                  ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/20'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Columns className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Side-by-Side</h4>
                <p className="text-xs text-slate-400">Both sides on one single page, placed horizontally</p>
              </div>
            </button>

            <button
              onClick={() => setLayout('separate')}
              className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                layout === 'separate'
                  ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/20'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Separate Pages</h4>
                <p className="text-xs text-slate-400">Front on Page 1, Back on Page 2</p>
              </div>
            </button>
          </div>

          <button
            onClick={handleFinish}
            disabled={isProcessing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 hover:opacity-95"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Generate Document</span>
          </button>
        </div>
      )}
    </div>
  );
};
