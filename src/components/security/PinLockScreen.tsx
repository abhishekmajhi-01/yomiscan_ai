import React, { useState } from 'react';
import { Lock, Fingerprint, Delete, ShieldAlert } from 'lucide-react';

interface PinLockScreenProps {
  correctPin: string;
  allowBiometrics?: boolean;
  onUnlock: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  correctPin,
  allowBiometrics = true,
  onUnlock,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  const handleDigit = (d: string) => {
    if (pin.length < 4) {
      const next = pin + d;
      setPin(next);
      setError(false);

      if (next.length === 4) {
        if (next === correctPin) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 800);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError(false);
  };

  const handleBiometricUnlock = () => {
    // Simulated WebAuthn / Biometric prompt
    onUnlock();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-white select-none">
      <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/10">
        <Lock className="w-8 h-8" />
      </div>

      <h1 className="text-xl font-bold tracking-tight">YomiScan Protected</h1>
      <p className="text-xs text-slate-400 mt-1 mb-8">Enter your 4-digit PIN to access documents</p>

      {/* PIN Dots Display */}
      <div className={`flex items-center gap-4 mb-8 ${error ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              pin.length > idx
                ? 'bg-indigo-500 border-indigo-400 scale-110 shadow-xs shadow-indigo-500'
                : 'border-slate-700 bg-slate-900'
            } ${error ? 'bg-rose-500 border-rose-400' : ''}`}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs font-semibold text-rose-400 mb-6 flex items-center gap-1.5 animate-pulse">
          <ShieldAlert className="w-4 h-4" /> Incorrect PIN. Please try again.
        </p>
      )}

      {/* Number Pad Grid */}
      <div className="grid grid-cols-3 gap-4 max-w-xs w-full mb-6">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            onClick={() => handleDigit(num)}
            className="w-18 h-18 rounded-full bg-slate-900/80 hover:bg-slate-800 active:bg-indigo-600 border border-slate-800 text-xl font-semibold flex items-center justify-center mx-auto transition-transform active:scale-95 shadow-sm"
          >
            {num}
          </button>
        ))}

        {/* Biometrics */}
        {allowBiometrics ? (
          <button
            onClick={handleBiometricUnlock}
            className="w-18 h-18 rounded-full text-indigo-400 hover:text-white flex items-center justify-center mx-auto transition-colors"
            title="Biometric Unlock"
          >
            <Fingerprint className="w-7 h-7" />
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={() => handleDigit('0')}
          className="w-18 h-18 rounded-full bg-slate-900/80 hover:bg-slate-800 active:bg-indigo-600 border border-slate-800 text-xl font-semibold flex items-center justify-center mx-auto transition-transform active:scale-95 shadow-sm"
        >
          0
        </button>

        <button
          onClick={handleDelete}
          className="w-18 h-18 rounded-full text-slate-400 hover:text-white flex items-center justify-center mx-auto transition-colors"
          title="Backspace"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
