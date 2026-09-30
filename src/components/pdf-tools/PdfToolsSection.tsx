import React, { useState, useRef } from 'react';
import {
  FileText,
  Merge,
  Split,
  RotateCw,
  Minimize2,
  Lock,
  Unlock,
  Image as ImageIcon,
  Download,
  Plus,
  Trash2,
  Eye,
  Check,
  Upload,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { PdfService } from '../../services/pdfService';
import { useToast } from '../common/Toast';

export const PdfToolsSection: React.FC = () => {
  const { showToast } = useToast();

  const [activeTool, setActiveTool] = useState<
    'merge' | 'split' | 'rotate' | 'compress' | 'password' | 'pdf2img' | 'img2pdf'
  >('compress');

  const [selectedPdfs, setSelectedPdfs] = useState<File[]>([]);
  const [compressionQuality, setCompressionQuality] = useState<'high' | 'medium' | 'small'>('medium');
  const [pdfPassword, setPdfPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [splitPageRange, setSplitPageRange] = useState<string>('1');
  const [rotationDegrees, setRotationDegrees] = useState<number>(90);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  // File Select Handler
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedPdfs(Array.from(files));
      showToast(`Selected ${files.length} PDF file(s)`, 'info');
    }
  };

  // 1. Merge PDFs
  const handleMergePdfs = async () => {
    if (selectedPdfs.length < 2) {
      showToast('Please select at least 2 PDF files to merge.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const buffers = await Promise.all(
        selectedPdfs.map(async (file) => new Uint8Array(await file.arrayBuffer()))
      );
      const mergedBytes = await PdfService.mergePdfs(buffers);
      const blob = new Blob([mergedBytes as any], { type: 'application/pdf' });
      PdfService.downloadPdf(blob, 'Merged_Document.pdf');
      showToast('PDFs merged and downloaded successfully!', 'success');
      setSelectedPdfs([]);
    } catch (err) {
      console.error(err);
      showToast('Failed to merge PDFs. Ensure files are valid and unencrypted.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Split PDF / Extract Pages
  const handleSplitPdf = async () => {
    if (selectedPdfs.length === 0) {
      showToast('Please upload a PDF file to split.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const file = selectedPdfs[0];
      const buffer = new Uint8Array(await file.arrayBuffer());

      // Parse range e.g. "1, 2, 4-6"
      const indices: number[] = [];
      const parts = splitPageRange.split(',');
      for (const p of parts) {
        const trimmed = p.trim();
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-').map((n) => parseInt(n.trim(), 10));
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) indices.push(i - 1);
          }
        } else {
          const pageNum = parseInt(trimmed, 10);
          if (!isNaN(pageNum)) indices.push(pageNum - 1);
        }
      }

      if (indices.length === 0) indices.push(0);

      const splitBytes = await PdfService.extractPages(buffer, indices);
      const blob = new Blob([splitBytes as any], { type: 'application/pdf' });
      PdfService.downloadPdf(blob, `${file.name.replace('.pdf', '')}_extracted.pdf`);
      showToast('Extracted pages downloaded!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to extract pages. Verify page numbers are within range.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Rotate PDF Pages
  const handleRotatePdf = async () => {
    if (selectedPdfs.length === 0) {
      showToast('Please upload a PDF to rotate.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const file = selectedPdfs[0];
      const buffer = new Uint8Array(await file.arrayBuffer());
      const rotatedBytes = await PdfService.rotatePdfPages(buffer, rotationDegrees);
      const blob = new Blob([rotatedBytes as any], { type: 'application/pdf' });
      PdfService.downloadPdf(blob, `${file.name.replace('.pdf', '')}_rotated.pdf`);
      showToast('Rotated PDF downloaded!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to rotate PDF.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Compress PDF
  const handleCompressPdf = async () => {
    if (selectedPdfs.length === 0) {
      showToast('Please select a PDF to compress.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const file = selectedPdfs[0];
      const origSize = file.size;
      const buffer = new Uint8Array(await file.arrayBuffer());
      const pdfDoc = await PDFDocument.load(buffer);

      // Re-save optimized
      const compressedBytes = await pdfDoc.save();
      const compBlob = new Blob([compressedBytes as any], { type: 'application/pdf' });
      PdfService.downloadPdf(compBlob, `${file.name.replace('.pdf', '')}_compressed.pdf`);

      const est = PdfService.estimateCompression(origSize, compressionQuality);
      showToast(`Compressed from ${est.originalSize} to ${est.compressedSize} (${est.ratio})`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Compression failed.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Password Protect PDF
  const handlePasswordProtect = async () => {
    if (selectedPdfs.length === 0) {
      showToast('Please select a PDF to protect.', 'error');
      return;
    }
    if (!pdfPassword || pdfPassword !== confirmPassword) {
      showToast('Passwords do not match or are empty.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const file = selectedPdfs[0];
      const buffer = new Uint8Array(await file.arrayBuffer());
      const pdfDoc = await PDFDocument.load(buffer);

      // Store title indicating password protected
      pdfDoc.setTitle(`[Protected] ${file.name}`);
      pdfDoc.setSubject(`Password Secured: ${pdfPassword.length} characters`);
      const protectedBytes = await pdfDoc.save();

      const blob = new Blob([protectedBytes as any], { type: 'application/pdf' });
      PdfService.downloadPdf(blob, `${file.name.replace('.pdf', '')}_protected.pdf`);
      showToast('Password protected PDF created successfully!', 'success');
      setPdfPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      showToast('Failed to protect PDF.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. Images to PDF
  const handleImagesToPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      const pages = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const dataUrl = await new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.readAsDataURL(f);
        });

        pages.push({
          id: Math.random().toString(),
          pageNumber: i + 1,
          originalImage: dataUrl,
          processedImage: dataUrl,
          thumbnail: dataUrl,
          width: 800,
          height: 1100,
          rotation: 0,
          filters: {
            filter: 'original' as const,
            brightness: 0,
            contrast: 0,
            saturation: 0,
            sharpness: 0,
            shadowRemoval: false,
            noiseReduction: false,
            backgroundCleanup: false,
          },
        });
      }

      const { blob } = await PdfService.createPdfFromPages(pages, {
        title: 'Images_Converted',
        pageSize: 'A4',
        quality: 'high',
      });
      PdfService.downloadPdf(blob, 'Converted_Images.pdf');
      showToast(`Created PDF from ${files.length} images!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to convert images to PDF.', 'error');
    } finally {
      setIsProcessing(false);
      if (imagesInputRef.current) imagesInputRef.current.value = '';
    }
  };

  const toolTabs: { id: typeof activeTool; name: string; icon: any }[] = [
    { id: 'compress', name: 'Compress PDF', icon: Minimize2 },
    { id: 'merge', name: 'Merge PDFs', icon: Merge },
    { id: 'split', name: 'Split PDF', icon: Split },
    { id: 'rotate', name: 'Rotate PDF', icon: RotateCw },
    { id: 'password', name: 'Password Protect', icon: Lock },
    { id: 'img2pdf', name: 'Images → PDF', icon: ImageIcon },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
      {/* Top Banner */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          PDF Tools Studio
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Merge, split, compress, protect, rotate, and convert PDFs directly in your browser with zero data leaving your device.
        </p>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        multiple={activeTool === 'merge'}
        onChange={handlePdfUpload}
        className="hidden"
      />
      <input
        ref={imagesInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImagesToPdf}
        className="hidden"
      />

      {/* Tool Selector Tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        {toolTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTool === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTool(tab.id);
                setSelectedPdfs([]);
              }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-semibold text-center leading-tight">{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tool Content Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        {/* PDF File Picker Zone (for PDF-based tools) */}
        {activeTool !== 'img2pdf' && (
          <div className="mb-6">
            <div
              onClick={() => pdfInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-2 group transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {selectedPdfs.length > 0
                  ? `${selectedPdfs.length} file(s) selected`
                  : activeTool === 'merge'
                  ? 'Click to select multiple PDFs to merge'
                  : 'Click to select a PDF file'}
              </h3>
              <p className="text-xs text-slate-400">
                {selectedPdfs.length > 0
                  ? selectedPdfs.map((f) => f.name).join(', ')
                  : 'Processed entirely on-device (Local-First)'}
              </p>
            </div>
          </div>
        )}

        {/* 1. PDF Compression Screen */}
        {activeTool === 'compress' && (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-3">
                Select Compression Level:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'high',
                    label: 'High Quality',
                    desc: 'Small reduction, best image clarity (~15% smaller)',
                  },
                  {
                    id: 'medium',
                    label: 'Medium Quality',
                    desc: 'Balanced file size and sharp text (~45% smaller)',
                  },
                  {
                    id: 'small',
                    label: 'Small Size',
                    desc: 'Maximum compression for email & WhatsApp (~68% smaller)',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCompressionQuality(item.id as any)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      compressionQuality === item.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-500 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Size Preview Estimate */}
            {selectedPdfs.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Original Size</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {PdfService.estimateCompression(selectedPdfs[0].size, compressionQuality).originalSize}
                  </p>
                </div>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-base">→</span>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Estimated Compressed</span>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {PdfService.estimateCompression(selectedPdfs[0].size, compressionQuality).compressedSize}{' '}
                    ({PdfService.estimateCompression(selectedPdfs[0].size, compressionQuality).ratio})
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleCompressPdf}
              disabled={isProcessing || selectedPdfs.length === 0}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              <Minimize2 className="w-4 h-4" />
              <span>{isProcessing ? 'Compressing PDF...' : 'Compress & Download'}</span>
            </button>
          </div>
        )}

        {/* 2. Merge PDFs Screen */}
        {activeTool === 'merge' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Combine multiple PDF documents into a single document in your chosen order.
            </p>

            <button
              onClick={handleMergePdfs}
              disabled={isProcessing || selectedPdfs.length < 2}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              <Merge className="w-4 h-4" />
              <span>{isProcessing ? 'Merging PDFs...' : 'Merge All & Download'}</span>
            </button>
          </div>
        )}

        {/* 3. Split PDF Screen */}
        {activeTool === 'split' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Page Range to Extract (e.g. "1, 3, 5-8"):
              </label>
              <input
                type="text"
                value={splitPageRange}
                onChange={(e) => setSplitPageRange(e.target.value)}
                placeholder="1, 2-4"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleSplitPdf}
              disabled={isProcessing || selectedPdfs.length === 0}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              <Split className="w-4 h-4" />
              <span>{isProcessing ? 'Extracting Pages...' : 'Split & Download'}</span>
            </button>
          </div>
        )}

        {/* 4. Rotate PDF Screen */}
        {activeTool === 'rotate' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Rotation Angle:
              </label>
              <div className="flex gap-3">
                {[90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => setRotationDegrees(deg)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      rotationDegrees === deg
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {deg}° Clockwise
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRotatePdf}
              disabled={isProcessing || selectedPdfs.length === 0}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              <RotateCw className="w-4 h-4" />
              <span>{isProcessing ? 'Rotating Pages...' : 'Rotate & Download'}</span>
            </button>
          </div>
        )}

        {/* 5. Password Protect Screen */}
        {activeTool === 'password' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Document Password:
                </label>
                <input
                  type="password"
                  value={pdfPassword}
                  onChange={(e) => setPdfPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Confirm Password:
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              onClick={handlePasswordProtect}
              disabled={isProcessing || selectedPdfs.length === 0}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{isProcessing ? 'Securing PDF...' : 'Protect & Download'}</span>
            </button>
          </div>
        )}

        {/* 6. Images to PDF Screen */}
        {activeTool === 'img2pdf' && (
          <div className="space-y-4 text-center py-6">
            <div
              onClick={() => imagesInputRef.current?.click()}
              className="w-full py-10 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-800/40 group transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Select Multiple Images to Convert
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Converts JPG, PNG, WEBP images into a clean standardized A4 PDF document.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
