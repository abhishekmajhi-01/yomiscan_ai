import React from 'react';
import { AlertTriangle, Copy, Replace, Eye, X } from 'lucide-react';
import { ScannedDocument } from '../../types/document';

interface DuplicatePromptModalProps {
  existingDoc: { id: string; title: string; ocrText?: string; thumbnail?: string };
  newDocTitle: string;
  newDocThumbnail?: string;
  onKeepBoth: () => void;
  onReplaceExisting: () => void;
  onCancel: () => void;
}

export const DuplicatePromptModal: React.FC<DuplicatePromptModalProps> = ({
  existingDoc,
  newDocTitle,
  newDocThumbnail,
  onKeepBoth,
  onReplaceExisting,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-300 dark:border-amber-700/60 overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-3 flex items-start gap-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              This document may already exist
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              The content matches an existing document in your library:
              <span className="font-semibold text-slate-800 dark:text-slate-200"> "{existingDoc.title}"</span>.
            </p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comparison Thumbnails */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800/40 grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Existing Document</span>
            <div className="w-24 h-32 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs flex items-center justify-center">
              {existingDoc.thumbnail ? (
                <img src={existingDoc.thumbnail} alt="Existing" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-slate-400">Preview</span>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px] mt-2">
              {existingDoc.title}
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="text-[10px] uppercase font-bold text-indigo-500 mb-1.5">New Scan</span>
            <div className="w-24 h-32 rounded-lg bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-600 overflow-hidden shadow-xs flex items-center justify-center">
              {newDocThumbnail ? (
                <img src={newDocThumbnail} alt="New" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-indigo-400">New Scan</span>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px] mt-2">
              {newDocTitle}
            </span>
          </div>
        </div>

        {/* Options */}
        <div className="p-5 space-y-2">
          <button
            onClick={onKeepBoth}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            <span>Keep Both (Save as New)</span>
          </button>

          <button
            onClick={onReplaceExisting}
            className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2"
          >
            <Replace className="w-4 h-4" />
            <span>Replace Existing Document</span>
          </button>

          <button
            onClick={onCancel}
            className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
