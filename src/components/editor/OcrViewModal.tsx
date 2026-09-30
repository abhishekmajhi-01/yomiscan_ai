import React, { useState, useEffect } from 'react';
import {
  FileText,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Copy,
  Download,
  Search,
  Languages,
  Check,
  X,
  Sparkles,
  RefreshCw,
  FileCode,
} from 'lucide-react';
import { OcrEngine, SUPPORTED_OCR_LANGUAGES, OcrResult } from '../../services/ocrEngine';
import { TtsService, TtsState } from '../../services/ttsService';
import { PdfService } from '../../services/pdfService';
import { useToast } from '../common/Toast';

interface OcrViewModalProps {
  imageSrc: string;
  initialText?: string;
  initialEntities?: any;
  documentTitle?: string;
  onSaveText: (updatedText: string, entities?: any) => void;
  onClose: () => void;
}

export const OcrViewModal: React.FC<OcrViewModalProps> = ({
  imageSrc,
  initialText = '',
  initialEntities,
  documentTitle = 'Scanned_Document',
  onSaveText,
  onClose,
}) => {
  const { showToast } = useToast();

  const [ocrText, setOcrText] = useState<string>(initialText);
  const [entities, setEntities] = useState<any>(initialEntities || null);
  const [activeTab, setActiveTab] = useState<'text' | 'entities'>('text');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [isLoading, setIsLoading] = useState<boolean>(!initialText);
  const [searchText, setSearchText] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [ttsState, setTtsState] = useState<TtsState>({
    isPlaying: false,
    isPaused: false,
    rate: 1.0,
    pitch: 1.0,
  });

  // Subscribe to TTS state
  useEffect(() => {
    return TtsService.subscribe(setTtsState);
  }, []);

  // Stop TTS when modal unmounts
  useEffect(() => {
    return () => {
      TtsService.stop();
    };
  }, []);

  // Auto trigger OCR on mount if no initial text
  useEffect(() => {
    if (!initialText) {
      handleRunOcr(selectedLanguage);
    }
  }, [initialText]);

  const handleRunOcr = async (lang: string) => {
    setIsLoading(true);
    try {
      const res = await OcrEngine.recognizeText(imageSrc, lang);
      setOcrText(res.fullText);
      setEntities({
        headings: res.headings,
        lists: res.lists,
        numbers: res.numbers,
        dates: res.dates,
        names: res.names,
        languages: res.detectedLanguages,
      });
      showToast('Text recognized successfully!', 'success');
    } catch (err: any) {
      showToast('OCR failed. Falling back to local pattern detection.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy text to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(ocrText);
    showToast('Extracted text copied to clipboard!', 'success');
  };

  // Text to Speech actions
  const handlePlayTts = () => {
    if (ttsState.isPaused) {
      TtsService.resume();
    } else {
      TtsService.speak(ocrText, speechRate, selectedLanguage === 'Hindi' ? 'hi-IN' : selectedLanguage === 'Telugu' ? 'te-IN' : 'en-US');
    }
  };

  const handlePauseTts = () => {
    TtsService.pause();
  };

  const handleStopTts = () => {
    TtsService.stop();
  };

  const handleSpeedChange = (rate: number) => {
    setSpeechRate(rate);
    if (ttsState.isPlaying) {
      TtsService.speak(ocrText, rate, selectedLanguage === 'Hindi' ? 'hi-IN' : selectedLanguage === 'Telugu' ? 'te-IN' : 'en-US');
    }
  };

  // Export OCR to PDF
  const handleExportPdf = async () => {
    try {
      const { blob, url } = await PdfService.createPdfFromOcrText(
        documentTitle,
        ocrText,
        entities?.headings || []
      );
      PdfService.downloadPdf(blob, `${documentTitle}_OCR.pdf`);
      showToast('Exported OCR PDF successfully!', 'success');
    } catch (err) {
      showToast('Failed to export PDF', 'error');
    }
  };

  // Export Word Doc
  const handleExportWord = () => {
    OcrEngine.downloadWordDoc(ocrText, documentTitle);
    showToast('Exported Word document (.doc)!', 'success');
  };

  // Save changes
  const handleSave = () => {
    onSaveText(ocrText, entities);
    onClose();
  };

  // Highlight search text matches
  const renderHighlightedText = () => {
    if (!searchText.trim()) {
      return (
        <textarea
          value={ocrText}
          onChange={(e) => setOcrText(e.target.value)}
          placeholder="Extracted text will appear here. You can freely edit this text."
          className="w-full h-full p-4 font-mono text-sm leading-relaxed bg-transparent text-slate-800 dark:text-slate-100 resize-none focus:outline-none"
        />
      );
    }

    const regex = new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = ocrText.split(regex);

    return (
      <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap select-text text-slate-800 dark:text-slate-100">
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-amber-300 dark:bg-amber-500/50 text-slate-900 rounded px-0.5 font-bold">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                OCR - Text Recognition
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Multi-language, structured detection & text-to-speech
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <Languages className="w-3.5 h-3.5 text-indigo-500" />
              <select
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  handleRunOcr(e.target.value);
                }}
                className="bg-transparent text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                {SUPPORTED_OCR_LANGUAGES.map((lang) => (
                  <option key={lang.name} value={lang.name} className="dark:bg-slate-800">
                    {lang.name} ({lang.native})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar (Search & Tab Switches) */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg">
              <button
                onClick={() => setActiveTab('text')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === 'text'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Editable Text
              </button>
              <button
                onClick={() => setActiveTab('entities')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === 'entities'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Entities & Stats
              </button>
            </div>

            <button
              onClick={() => handleRunOcr(selectedLanguage)}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
              title="Re-run OCR"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Re-scan</span>
            </button>
          </div>

          {/* Search inside OCR */}
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search extracted text..."
              className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Read Aloud Text-to-Speech Control Strip */}
        <div className="px-5 py-2 bg-indigo-50/60 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Read Aloud:
            </span>

            {!ttsState.isPlaying ? (
              <button
                onClick={handlePlayTts}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700"
              >
                <Play className="w-3 h-3" />
                <span>Play</span>
              </button>
            ) : ttsState.isPaused ? (
              <button
                onClick={handlePlayTts}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700"
              >
                <Play className="w-3 h-3" />
                <span>Resume</span>
              </button>
            ) : (
              <button
                onClick={handlePauseTts}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700"
              >
                <Pause className="w-3 h-3" />
                <span>Pause</span>
              </button>
            )}

            {ttsState.isPlaying && (
              <button
                onClick={handleStopTts}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-600 text-white font-medium hover:bg-rose-700"
              >
                <Square className="w-3 h-3" />
                <span>Stop</span>
              </button>
            )}
          </div>

          {/* Speed selector */}
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <span>Speed:</span>
            {[0.75, 1.0, 1.25, 1.5].map((spd) => (
              <button
                key={spd}
                onClick={() => handleSpeedChange(spd)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                  speechRate === spd
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Extracting text & formatting structure...</p>
            </div>
          ) : activeTab === 'text' ? (
            <div className="h-full">{renderHighlightedText()}</div>
          ) : (
            /* Entities & Structure Breakdown */
            <div className="p-6 space-y-5">
              {/* Headings */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Detected Headings
                </h4>
                <div className="flex flex-wrap gap-2">
                  {entities?.headings?.length ? (
                    entities.headings.map((h: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold"
                      >
                        {h}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No major headings detected.</span>
                  )}
                </div>
              </div>

              {/* Numbers & Codes */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Key Numbers, Codes & Amounts
                </h4>
                <div className="flex flex-wrap gap-2">
                  {entities?.numbers?.length ? (
                    entities.numbers.map((n: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-mono font-semibold"
                      >
                        {n}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No specific numbers identified.</span>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Dates Detected
                </h4>
                <div className="flex flex-wrap gap-2">
                  {entities?.dates?.length ? (
                    entities.dates.map((d: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold"
                      >
                        {d}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No dates detected.</span>
                  )}
                </div>
              </div>

              {/* Names / Entities */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  People, Companies & Institutions
                </h4>
                <div className="flex flex-wrap gap-2">
                  {entities?.names?.length ? (
                    entities.names.map((name: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-semibold"
                      >
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No specific names extracted.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Export Actions */}
        <div className="h-16 px-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>

            <button
              onClick={() => OcrEngine.downloadText(ocrText, `${documentTitle}.txt`)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.TXT</span>
            </button>

            <button
              onClick={handleExportWord}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-500" />
              <span>.DOC (Word)</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>OCR to PDF</span>
            </button>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Text</span>
          </button>
        </div>
      </div>
    </div>
  );
};
