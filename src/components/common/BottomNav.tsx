import React from 'react';
import { Home, Camera, Files, Wrench, Sparkles } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onStartScan: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onNavigate,
  onStartScan,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'home'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">Home</span>
        </button>

        <button
          onClick={() => onNavigate('documents')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'documents'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <Files className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">Docs</span>
        </button>

        {/* Center Primary Action: Scan Button */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            onClick={onStartScan}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-transform border-4 border-white dark:border-slate-900"
            title="Scan Document"
          >
            <Camera className="w-6 h-6" />
          </button>
        </div>

        <button
          onClick={() => onNavigate('tools')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'tools'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <Wrench className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">Tools</span>
        </button>

        <button
          onClick={() => onNavigate('ai')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'ai'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          <Sparkles className="w-5 h-5 mb-0.5" />
          <span className="text-[11px]">AI</span>
        </button>
      </div>
    </nav>
  );
};
