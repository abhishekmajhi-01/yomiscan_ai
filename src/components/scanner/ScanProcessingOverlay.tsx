import React, { useState, useEffect } from 'react';
import { Scan, Wand2, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

interface ScanProcessingOverlayProps {
  onComplete: () => void;
  onError?: (err: Error) => void;
}

export const ScanProcessingOverlay: React.FC<ScanProcessingOverlayProps> = ({
  onComplete,
  onError,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(false);

  const steps = [
    { label: 'Detecting document boundaries...', icon: Scan },
    { label: 'Correcting perspective & flattening...', icon: Wand2 },
    { label: 'Enhancing contrast & removing shadows...', icon: Sparkles },
    { label: 'Preparing scan preview...', icon: CheckCircle },
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStep(1), 350);
    const timer2 = setTimeout(() => setCurrentStep(2), 700);
    const timer3 = setTimeout(() => setCurrentStep(3), 1050);
    const timer4 = setTimeout(() => {
      onComplete();
    }, 1400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white select-none">
      <div className="max-w-xs w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Animated Scanner Radar Icon */}
        <div className="relative w-20 h-20 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center mb-6 overflow-hidden">
          <Scan className="w-10 h-10 text-indigo-400" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent h-4 animate-radar pointer-events-none" />
        </div>

        <h3 className="text-base font-bold text-white mb-4">Processing Document</h3>

        {/* Step Progress List */}
        <div className="w-full space-y-3 text-left">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            const isDone = currentStep > idx;
            const isCurrent = currentStep === idx;
            return (
              <div
                key={idx}
                className={`flex items-center gap-2.5 text-xs transition-colors ${
                  isDone
                    ? 'text-emerald-400 font-semibold'
                    : isCurrent
                    ? 'text-indigo-400 font-semibold animate-pulse'
                    : 'text-slate-600'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : isCurrent
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isDone ? '✓' : idx + 1}
                </div>
                <span>{st.label}</span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
