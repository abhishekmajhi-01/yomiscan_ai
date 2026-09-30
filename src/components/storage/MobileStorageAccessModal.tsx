import React, { useState } from 'react';
import {
  Smartphone,
  ShieldCheck,
  HardDrive,
  Database,
  CheckCircle2,
  Lock,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react';
import { PermissionService } from '../../services/permissionService';

interface MobileStorageAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGranted: () => void;
  isMandatoryPrompt?: boolean;
}

export const MobileStorageAccessModal: React.FC<MobileStorageAccessModalProps> = ({
  isOpen,
  onClose,
  onGranted,
  isMandatoryPrompt = false,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleGrantAccess = async () => {
    setIsRequesting(true);
    try {
      const res = await PermissionService.requestFullStorageAccess();
      setIsSuccess(true);
      setTimeout(() => {
        setIsRequesting(false);
        onGranted();
        onClose();
      }, 900);
    } catch (err) {
      console.error('Storage access grant error:', err);
      setIsRequesting(false);
      onClose();
    }
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem('yomiscan_storage_prompt_dismissed', 'true');
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 text-center">
        {/* Close button if not strictly blocking */}
        {!isMandatoryPrompt && (
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Top Badges & Icon */}
        <div className="relative mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <Smartphone className="w-8 h-8" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
            <HardDrive className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 mb-3">
          <Sparkles className="w-3 h-3" />
          <span>Mobile Device Installation</span>
        </div>

        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          Grant Full Storage Access
        </h2>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
          To safely save your high-resolution scanned documents, multi-page PDFs, and OCR databases directly on your phone without risk of eviction, YomiScan requests full local storage access.
        </p>

        {/* Key Features List */}
        <div className="space-y-2.5 text-left mb-6">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Permanent Document Protection
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                Prevents Android & iOS cleanup tools from clearing your scans when device storage runs low.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Unrestricted Offline Vault
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                Stores multi-page PDFs, OCR search index, and original images with persistent quota.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                100% Local Device Privacy
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                Your data stays in hardware sandboxed storage on your device, private and secure.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleGrantAccess}
            disabled={isRequesting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-sm shadow-md shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Full Storage Access Granted!</span>
              </>
            ) : isRequesting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Enabling Persistent Storage...</span>
              </span>
            ) : (
              <>
                <span>Grant Full Storage Access</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {!isMandatoryPrompt && (
            <button
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              Continue with Standard Storage
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
