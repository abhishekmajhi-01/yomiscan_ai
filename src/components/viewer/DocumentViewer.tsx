import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Share2,
  Download,
  Edit2,
  Trash2,
  Star,
  PenTool,
  Highlighter,
  Sparkles,
  Printer,
  History,
  Lock,
  Layers,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  Move,
  QrCode,
  Table,
} from 'lucide-react';
import { ScannedDocument, DocumentPage, PlacedSignature } from '../../types/document';
import { PdfService } from '../../services/pdfService';
import { AnnotationCanvas } from '../editor/AnnotationCanvas';
import { SignatureModal } from '../editor/SignatureModal';
import { OcrViewModal } from '../editor/OcrViewModal';
import { TableExtractModal } from '../editor/TableExtractModal';
import { AiAssistantDrawer } from '../ai/AiAssistantDrawer';
import { QrShareModal } from '../sharing/QrShareModal';
import { PdfCreationWizardModal } from '../pdf/PdfCreationWizardModal';
import { useToast } from '../common/Toast';

interface DocumentViewerProps {
  document: ScannedDocument;
  onUpdateDocument: (doc: ScannedDocument) => void;
  onDeleteDocument: (id: string) => void;
  onBack: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document: doc,
  onUpdateDocument,
  onDeleteDocument,
  onBack,
}) => {
  const { showToast } = useToast();

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [titleInput, setTitleInput] = useState<string>(doc.title);

  // Modals & Panels
  const [showAnnotationCanvas, setShowAnnotationCanvas] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPdfWizard, setShowPdfWizard] = useState(false);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);

  const currentPage = doc.pages[currentPageIndex] || doc.pages[0];

  // Pan state
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const startPanPoint = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Zoom controls
  const handleZoomIn = () => setZoomLevel((z) => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.5, z - 0.25));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoomLevel <= 1) return;
    isPanning.current = true;
    startPanPoint.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning.current) return;
    setPanOffset({
      x: e.clientX - startPanPoint.current.x,
      y: e.clientY - startPanPoint.current.y,
    });
  };

  const handlePointerUp = () => {
    isPanning.current = false;
  };

  // Toggle favorite
  const handleToggleFavorite = () => {
    const updated = { ...doc, isFavorite: !doc.isFavorite };
    onUpdateDocument(updated);
    showToast(updated.isFavorite ? 'Added to Favorites!' : 'Removed from Favorites', 'info');
  };

  // Save renamed title
  const handleSaveTitle = () => {
    if (!titleInput.trim()) return;
    const updated = { ...doc, title: titleInput.trim() };
    onUpdateDocument(updated);
    setIsEditingTitle(false);
    showToast('Document renamed!', 'success');
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    try {
      const { blob } = await PdfService.createPdfFromPages(doc.pages, {
        title: doc.title,
        pageSize: 'A4',
        includePageNumbers: true,
        quality: 'high',
      });
      PdfService.downloadPdf(blob, `${doc.title}.pdf`);
      showToast('PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to create PDF', 'error');
    }
  };

  // Print Document
  const handlePrint = () => {
    window.print();
  };

  // Signature placement callback
  const handleAddSignature = (sigDataUrl: string) => {
    setShowSignatureModal(false);

    const newSig: PlacedSignature = {
      id: Math.random().toString(36).substring(2, 9),
      signatureId: Math.random().toString(36).substring(2, 9),
      dataUrl: sigDataUrl,
      x: 65, // bottom-right percentage
      y: 75,
      width: 25,
      height: 12,
      rotation: 0,
    };

    const updatedPages = [...doc.pages];
    const pageToUpdate = { ...updatedPages[currentPageIndex] };
    pageToUpdate.signatures = [...(pageToUpdate.signatures || []), newSig];
    updatedPages[currentPageIndex] = pageToUpdate;

    onUpdateDocument({ ...doc, pages: updatedPages });
    showToast('Signature placed on document! You can drag and position it.', 'success');
  };

  // Update signature position or rotation
  const handleDragSignature = (sigId: string, deltaX: number, deltaY: number) => {
    const updatedPages = [...doc.pages];
    const pageToUpdate = { ...updatedPages[currentPageIndex] };
    if (!pageToUpdate.signatures) return;

    pageToUpdate.signatures = pageToUpdate.signatures.map((s) => {
      if (s.id === sigId) {
        return {
          ...s,
          x: Math.max(0, Math.min(100 - s.width, s.x + deltaX)),
          y: Math.max(0, Math.min(100 - s.height, s.y + deltaY)),
        };
      }
      return s;
    });

    updatedPages[currentPageIndex] = pageToUpdate;
    onUpdateDocument({ ...doc, pages: updatedPages });
  };

  // Remove signature
  const handleRemoveSignature = (sigId: string) => {
    const updatedPages = [...doc.pages];
    const pageToUpdate = { ...updatedPages[currentPageIndex] };
    if (!pageToUpdate.signatures) return;
    pageToUpdate.signatures = pageToUpdate.signatures.filter((s) => s.id !== sigId);
    updatedPages[currentPageIndex] = pageToUpdate;
    onUpdateDocument({ ...doc, pages: updatedPages });
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 flex flex-col text-white select-none">
      {/* Top Header Bar */}
      <div className="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Title Editor */}
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                }}
                className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 rounded bg-indigo-600 text-white"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-1.5 cursor-pointer group"
            >
              <h2 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
                {doc.title}
              </h2>
              <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400" />
            </div>
          )}
        </div>

        {/* Top Right Action Icons */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={handleToggleFavorite}
            className={`p-1.5 rounded-lg transition-colors ${
              doc.isFavorite ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-white'
            }`}
            title="Favorite"
          >
            <Star className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={() => setShowQrModal(true)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            title="QR Code Share"
          >
            <QrCode className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrint}
            className="hidden sm:block p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowAiDrawer((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-colors ${
              showAiDrawer
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Viewport + Optional AI Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Document Viewer Canvas */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex-1 relative overflow-hidden flex items-center justify-center p-4 bg-slate-950"
        >
          {/* Printable Area Wrapper */}
          <div
            className="print-area relative max-w-full max-h-full transition-transform duration-75 origin-center"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              cursor: zoomLevel > 1 ? 'grab' : 'default',
            }}
          >
            <img
              src={currentPage.processedImage || currentPage.originalImage}
              alt={`Page ${currentPage.pageNumber}`}
              className="max-h-[72vh] w-auto object-contain rounded-lg shadow-2xl border border-slate-800 pointer-events-none"
            />

            {/* Placed Signatures Overlay */}
            {currentPage.signatures &&
              currentPage.signatures.map((sig) => (
                <div
                  key={sig.id}
                  onClick={() => setSelectedSignatureId(sig.id)}
                  className={`absolute border-2 rounded p-1 group cursor-move select-none ${
                    selectedSignatureId === sig.id
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-transparent hover:border-indigo-400/50'
                  }`}
                  style={{
                    left: `${sig.x}%`,
                    top: `${sig.y}%`,
                    width: `${sig.width}%`,
                    height: `${sig.height}%`,
                    transform: sig.rotation ? `rotate(${sig.rotation}deg)` : undefined,
                  }}
                >
                  <img src={sig.dataUrl} alt="Signature" className="w-full h-full object-contain" />

                  {/* Signature delete button */}
                  {selectedSignatureId === sig.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSignature(sig.id);
                      }}
                      className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
          </div>

          {/* Floating Zoom Controls */}
          <div className="absolute bottom-6 right-6 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-lg z-20">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 px-1">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white border-l border-slate-800"
              title="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Left/Right Page Flippers for Multi-Page */}
          {doc.pages.length > 1 && (
            <>
              <button
                onClick={() => setCurrentPageIndex((idx) => Math.max(0, idx - 1))}
                disabled={currentPageIndex === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 disabled:opacity-30 z-20"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentPageIndex((idx) => Math.min(doc.pages.length - 1, idx + 1))}
                disabled={currentPageIndex === doc.pages.length - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 disabled:opacity-30 z-20"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* AI Assistant Drawer (Side Panel on Desktop / Sheet on Mobile) */}
        {showAiDrawer && (
          <div className="w-full sm:w-96 h-full z-30 shadow-2xl">
            <AiAssistantDrawer
              document={doc}
              onUpdateDocument={onUpdateDocument}
              onClose={() => setShowAiDrawer(false)}
            />
          </div>
        )}
      </div>

      {/* Bottom Tool Bar */}
      <div className="h-16 px-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between z-20 pb-safe">
        {/* Page Thumbnail Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-xs sm:max-w-sm">
          {doc.pages.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => setCurrentPageIndex(idx)}
              className={`w-9 h-11 rounded border overflow-hidden shrink-0 transition-transform ${
                currentPageIndex === idx
                  ? 'border-indigo-500 scale-105 ring-2 ring-indigo-500/30'
                  : 'border-slate-700 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={p.thumbnail || p.processedImage} alt="Thumb" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowAnnotationCanvas(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-400" />
            <span>Annotate</span>
          </button>

          <button
            onClick={() => setShowSignatureModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
          >
            <PenTool className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sign</span>
          </button>

          <button
            onClick={() => setShowOcrModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>OCR Text</span>
          </button>

          <button
            onClick={() => setShowTableModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
          >
            <Table className="w-3.5 h-3.5 text-emerald-400" />
            <span>Table</span>
          </button>

          <button
            onClick={() => onDeleteDocument(doc.id)}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-800"
            title="Move to Trash"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {showAnnotationCanvas && (
        <AnnotationCanvas
          imageSrc={currentPage.processedImage}
          initialAnnotations={currentPage.annotations || []}
          onSave={(updatedAnnotations) => {
            const updatedPages = [...doc.pages];
            updatedPages[currentPageIndex].annotations = updatedAnnotations;
            onUpdateDocument({ ...doc, pages: updatedPages });
            setShowAnnotationCanvas(false);
            showToast('Annotations saved!', 'success');
          }}
          onClose={() => setShowAnnotationCanvas(false)}
        />
      )}

      {showSignatureModal && (
        <SignatureModal
          onSelectSignature={handleAddSignature}
          onClose={() => setShowSignatureModal(false)}
        />
      )}

      {showOcrModal && (
        <OcrViewModal
          imageSrc={currentPage.processedImage}
          initialText={doc.ocrText}
          initialEntities={doc.ocrEntities}
          documentTitle={doc.title}
          onSaveText={(newText, newEntities) => {
            onUpdateDocument({
              ...doc,
              ocrText: newText,
              ocrEntities: newEntities,
            });
          }}
          onClose={() => setShowOcrModal(false)}
        />
      )}

      {showTableModal && (
        <TableExtractModal
          imageSrc={currentPage.processedImage}
          documentText={doc.ocrText}
          initialTable={doc.tables?.[0]}
          onSaveTable={(table) => {
            onUpdateDocument({
              ...doc,
              tables: [table],
            });
            showToast('Table saved with document!', 'success');
          }}
          onClose={() => setShowTableModal(false)}
        />
      )}

      {showQrModal && (
        <QrShareModal document={doc} onClose={() => setShowQrModal(false)} />
      )}
    </div>
  );
};
