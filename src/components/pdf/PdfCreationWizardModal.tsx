import React, { useState } from 'react';
import {
  FileText,
  Check,
  X,
  Download,
  Share2,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Settings,
  Layers,
  Sparkles,
} from 'lucide-react';
import { DocumentPage } from '../../types/document';
import { PdfService, PdfExportOptions } from '../../services/pdfService';
import { useToast } from '../common/Toast';

interface PdfCreationWizardModalProps {
  documentTitle: string;
  pages: DocumentPage[];
  onClose: () => void;
}

export const PdfCreationWizardModal: React.FC<PdfCreationWizardModalProps> = ({
  documentTitle: initialTitle,
  pages,
  onClose,
}) => {
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(
    new Set(pages.map((p) => p.id))
  );

  // Settings
  const [title, setTitle] = useState<string>(initialTitle);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Legal' | 'Original'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [quality, setQuality] = useState<'high' | 'medium' | 'small'>('high');
  const [marginSetting, setMarginSetting] = useState<'none' | 'small' | 'medium' | 'large'>('small');
  const [includePageNumbers, setIncludePageNumbers] = useState<boolean>(true);

  // Generation status
  const [genStatusText, setGenStatusText] = useState<string>('Preparing pages...');
  const [generatedPdf, setGeneratedPdf] = useState<{ blob: Blob; url: string; sizeBytes: number } | null>(
    null
  );

  const togglePage = (id: string) => {
    setSelectedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // keep at least 1
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPageIds.size === pages.length) {
      setSelectedPageIds(new Set([pages[0].id]));
    } else {
      setSelectedPageIds(new Set(pages.map((p) => p.id)));
    }
  };

  const handleStartGeneration = async () => {
    setStep(3);
    setGenStatusText('Preparing pages and applying enhancements...');

    const chosenPages = pages.filter((p) => selectedPageIds.has(p.id));
    const marginsMap = { none: 0, small: 15, medium: 30, large: 50 };

    setTimeout(async () => {
      setGenStatusText('Generating vector PDF structure and embedding images...');
      try {
        const result = await PdfService.createPdfFromPages(chosenPages, {
          title,
          pageSize,
          orientation,
          margins: marginsMap[marginSetting],
          includePageNumbers,
          quality,
        });

        setTimeout(() => {
          setGenStatusText('Finalizing document metadata and compressing...');
          setTimeout(() => {
            setGeneratedPdf(result);
            setStep(4);
            showToast('PDF created successfully!', 'success');
          }, 350);
        }, 400);
      } catch (err) {
        console.error(err);
        showToast('PDF creation failed. Please check page memory.', 'error');
        setStep(2);
      }
    }, 400);
  };

  // Real Save to Device using File System Access API with fallback
  const handleSaveToDevice = async () => {
    if (!generatedPdf) return;

    const filename = title.endsWith('.pdf') ? title : `${title}.pdf`;

    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'PDF Document',
              accept: { 'application/pdf': ['.pdf'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(generatedPdf.blob);
        await writable.close();
        showToast('PDF saved successfully to device!', 'success');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Direct browser download fallback
    PdfService.downloadPdf(generatedPdf.blob, filename);
    showToast('PDF saved successfully to downloads!', 'success');
  };

  const handleShare = async () => {
    if (!generatedPdf) return;
    const filename = title.endsWith('.pdf') ? title : `${title}.pdf`;
    const shared = await PdfService.sharePdf(generatedPdf.blob, filename);
    if (!shared) {
      navigator.clipboard.writeText(generatedPdf.url);
      showToast('Document link copied to clipboard!', 'info');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="h-14 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {step === 1
                ? 'Step 1: Select Pages to Export'
                : step === 2
                ? 'Step 2: PDF Page & Format Settings'
                : step === 3
                ? 'Generating Document...'
                : 'PDF Created Successfully'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Page Selection */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Choose pages to compile into the final PDF document:
              </span>
              <button
                onClick={handleSelectAll}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {selectedPageIds.size === pages.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {pages.map((p) => {
                const isSelected = selectedPageIds.has(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => togglePage(p.id)}
                    className={`relative rounded-xl border-2 p-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-700 opacity-60'
                    }`}
                  >
                    <div className="aspect-[1/1.35] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img src={p.thumbnail || p.processedImage} alt={`Page ${p.pageNumber}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Page {p.pageNumber}
                      </span>
                      <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-400'}`}>
                        {isSelected && '✓'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Settings */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Document File Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Page Size
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="A4">A4 (Standard ISO)</option>
                  <option value="Letter">US Letter</option>
                  <option value="Legal">US Legal</option>
                  <option value="Original">Original Scanned Size</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Orientation
                </label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Compression / Quality
                </label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="high">High Quality (Sharper Text)</option>
                  <option value="medium">Standard (Balanced Size)</option>
                  <option value="small">Small Size (Compact Email)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Margins
                </label>
                <select
                  value={marginSetting}
                  onChange={(e) => setMarginSetting(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="small">Small (15 pt)</option>
                  <option value="none">None (Full Bleed)</option>
                  <option value="medium">Medium (30 pt)</option>
                  <option value="large">Large (50 pt)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Include Page Numbers ("Page X of Y")
              </span>
              <input
                type="checkbox"
                checked={includePageNumbers}
                onChange={(e) => setIncludePageNumbers(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0"
              />
            </div>
          </div>
        )}

        {/* Step 3: Generating Screen */}
        {step === 3 && (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Generating PDF
            </h3>
            <p className="text-xs text-slate-500 font-medium">{genStatusText}</p>
          </div>
        )}

        {/* Step 4: Result Screen */}
        {step === 4 && generatedPdf && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              PDF Created Successfully!
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {title}.pdf • {selectedPageIds.size} page(s) • {formatSize(generatedPdf.sizeBytes)}
            </p>

            {/* Embedded Live PDF Object Preview */}
            <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 mt-4 overflow-hidden relative shadow-inner">
              <iframe
                src={`${generatedPdf.url}#toolbar=0&navpanes=0`}
                className="w-full h-full border-none"
                title="PDF Preview"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 w-full mt-6">
              <button
                onClick={handleSaveToDevice}
                className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Save to Device</span>
              </button>

              <button
                onClick={() => window.open(generatedPdf.url, '_blank')}
                className="py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in Tab</span>
              </button>
            </div>

            <button
              onClick={handleShare}
              className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share via WhatsApp, Email, or Drive</span>
            </button>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="h-16 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          {step === 1 && (
            <>
              <span className="text-xs font-semibold text-slate-500">
                {selectedPageIds.size} of {pages.length} pages selected
              </span>
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleStartGeneration}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/20"
              >
                Generate PDF
              </button>
            </>
          )}

          {step === 4 && (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
