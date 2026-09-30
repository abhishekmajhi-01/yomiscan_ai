import React, { useState } from 'react';
import {
  Camera,
  Wand2,
  FileText,
  FileCheck,
  FolderTree,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
} from 'lucide-react';

interface OnboardingModalProps {
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);

  const steps = [
    {
      title: 'Scan Any Document',
      description:
        'Point your camera at any receipt, contract, ID card, or book page. YomiScan detects the paper boundaries in real-time.',
      icon: Camera,
      color: 'from-blue-600 to-indigo-600',
    },
    {
      title: 'Perspective Correction & Enhance',
      description:
        'Automatic 4-corner perspective warp converts skewed photos into flat top-down scans. Enhance contrast, remove shadows, and binarize text.',
      icon: Wand2,
      color: 'from-indigo-600 to-purple-600',
    },
    {
      title: 'Multilingual OCR Recognition',
      description:
        'Extract text with paragraph formatting, detected headings, lists, tables, numbers, and names. Supports English, Hindi, and Telugu.',
      icon: FileText,
      color: 'from-purple-600 to-pink-600',
    },
    {
      title: 'Professional PDF Studio',
      description:
        'Export single or multi-page documents to standardized A4, Letter, or Legal PDFs. Compress file size while preserving high text legibility.',
      icon: FileCheck,
      color: 'from-pink-600 to-rose-600',
    },
    {
      title: 'Digital Signatures & Annotations',
      description:
        'Draw, type, or upload transparent signatures. Annotate with pens, highlighters, arrows, and shapes directly on document pages.',
      icon: FolderTree,
      color: 'from-amber-500 to-orange-600',
    },
    {
      title: 'AI Document Assistant',
      description:
        'Summarize, translate, extract structured invoice numbers, or ask questions grounded strictly inside your scanned document.',
      icon: Sparkles,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Local-First Privacy Architecture',
      description:
        'Your sensitive documents stay private on your device. Cloud backup is OFF by default. Optional 4-digit PIN and biometric app lock.',
      icon: ShieldCheck,
      color: 'from-cyan-600 to-blue-600',
    },
  ];

  const stepData = steps[currentStep];
  const Icon = stepData.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Top Skip Bar */}
        <div className="h-12 px-6 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={onComplete}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
          >
            Skip Tour
          </button>
        </div>

        {/* Visual Card */}
        <div className="p-8 flex flex-col items-center text-center">
          <div
            className={`w-20 h-20 rounded-3xl bg-gradient-to-tr ${stepData.color} text-white flex items-center justify-center shadow-xl mb-6`}
          >
            <Icon className="w-10 h-10" />
          </div>

          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {stepData.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2 max-w-xs">
            {stepData.description}
          </p>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5 mt-8">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-6 bg-indigo-600'
                    : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="h-18 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-20"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 hover:opacity-95 active:scale-95 transition-all"
          >
            <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
