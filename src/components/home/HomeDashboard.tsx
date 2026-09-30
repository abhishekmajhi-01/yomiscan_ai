import React, { useRef } from 'react';
import {
  Camera,
  CreditCard,
  Receipt,
  Contact,
  Upload,
  Wrench,
  Files,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Star,
  MoreVertical,
  Plus,
  Check,
} from 'lucide-react';
import { ScannedDocument, ScanMode } from '../../types/document';

interface HomeDashboardProps {
  documents: ScannedDocument[];
  onStartScan: (mode: ScanMode) => void;
  onImportFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenPdfTools: () => void;
  onOpenAiTools: () => void;
  onSelectDocument: (doc: ScannedDocument) => void;
  onViewAllDocuments: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  documents,
  onStartScan,
  onImportFiles,
  onOpenPdfTools,
  onOpenAiTools,
  onSelectDocument,
  onViewAllDocuments,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recentDocs = documents.slice(0, 6);

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-8 animate-in fade-in duration-300">
      {/* Hidden gallery file import input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={onImportFiles}
        className="hidden"
      />

      {/* Greeting and Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            {getGreeting()}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Ready to scan your documents?
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Images</span>
          </button>
        </div>
      </div>

      {/* Primary Hero Action: Large Central Scan Document */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 text-white p-6 sm:p-8 shadow-xl shadow-indigo-600/15">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-sky-100 border border-white/20 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-200" />
              <span>Local-First Private Architecture</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              High-Speed Document Scanner
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/90 mt-1.5 leading-relaxed">
              Auto edge detection, perspective correction, multilingual OCR, and standardized PDF generation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onStartScan('document')}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white text-indigo-700 font-bold text-sm shadow-xl shadow-black/10 hover:bg-indigo-50 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5 text-indigo-600 stroke-[3]" />
              <span>Scan Document</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-white/15 hover:bg-white/20 text-white font-semibold text-xs backdrop-blur-md border border-white/20 active:scale-95 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Import Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Scan Modes */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Quick Scan Modes
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              id: 'document' as const,
              label: 'Document',
              sub: 'Auto-crop & enhance',
              icon: Camera,
              action: () => onStartScan('document'),
              color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
            },
            {
              id: 'idcard' as const,
              label: 'ID Card Mode',
              sub: 'Front & back on 1 page',
              icon: CreditCard,
              action: () => onStartScan('idcard'),
              color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60',
            },
            {
              id: 'receipt' as const,
              label: 'Receipt Scanner',
              sub: 'Structured totals & tax',
              icon: Receipt,
              action: () => onStartScan('receipt'),
              color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
            },
            {
              id: 'businesscard' as const,
              label: 'Business Card',
              sub: 'Extract .vcf contact',
              icon: Contact,
              action: () => onStartScan('businesscard'),
              color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 shadow-xs hover:shadow-md transition-all text-left group flex flex-col justify-between"
              >
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.label}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.sub}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Unlocked Features & Local-First Privacy Hero Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-900 text-white border border-indigo-800/60 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Private & Unrestricted AI Document Scanner
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Free
              </span>
            </div>

            <p className="text-xs text-indigo-200/80 leading-relaxed">
              All scans, multi-page PDFs, high-accuracy OCR, and extracted data stay directly on your device. Enjoy full local privacy with zero paywalls.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex flex-col items-end pr-3 border-r border-indigo-800/60">
              <span className="text-[11px] text-indigo-300">Total Scans</span>
              <span className="text-base font-extrabold text-white">{documents.length}</span>
            </div>
            <button
              onClick={onOpenAiTools}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Intelligence Hub</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Documents Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Recent Documents
            </h2>
          </div>

          {documents.length > 0 && (
            <button
              onClick={onViewAllDocuments}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View All ({documents.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentDocs.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No scanned documents yet
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">
              Tap "Scan Document" or "Import" to capture your first document.
            </p>
            <button
              onClick={() => onStartScan('document')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20"
            >
              Start First Scan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/60 overflow-hidden cursor-pointer shadow-xs hover:shadow-md transition-all flex flex-col"
              >
                <div className="aspect-[1/1.3] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                  <img
                    src={doc.thumbnail || doc.pages[0]?.thumbnail || doc.pages[0]?.processedImage}
                    alt={doc.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                  />
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-bold text-white backdrop-blur-xs">
                    {doc.pages.length}p
                  </span>

                  {doc.isFavorite && (
                    <div className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-amber-400">
                      <Star className="w-3 h-3 fill-current" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {doc.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>{doc.category}</span>
                    <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
