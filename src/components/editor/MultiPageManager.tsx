import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  RotateCw,
  Copy,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { DocumentPage } from '../../types/document';
import { ImageProcessor } from '../../services/imageProcessing';

interface MultiPageManagerProps {
  pages: DocumentPage[];
  onUpdatePages: (updatedPages: DocumentPage[]) => void;
  onAddPage: () => void;
  onSelectPageForEdit: (pageIndex: number) => void;
  onClose: () => void;
}

export const MultiPageManager: React.FC<MultiPageManagerProps> = ({
  pages,
  onUpdatePages,
  onAddPage,
  onSelectPageForEdit,
  onClose,
}) => {
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [previewPageIndex, setPreviewPageIndex] = useState<number | null>(null);

  // Move page position
  const movePage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // re-assign page numbers
    updated.forEach((p, idx) => {
      p.pageNumber = idx + 1;
    });

    onUpdatePages(updated);
    setSelectedPageIndex(targetIndex);
  };

  // Rotate single page 90 degrees
  const rotatePage = async (index: number) => {
    const page = pages[index];
    const newRotation = (page.rotation + 90) % 360;
    const rotatedImage = await ImageProcessor.rotateImage(page.processedImage, 90);
    const newThumb = await ImageProcessor.createThumbnail(rotatedImage);

    const updated = [...pages];
    updated[index] = {
      ...page,
      rotation: newRotation,
      processedImage: rotatedImage,
      thumbnail: newThumb,
    };
    onUpdatePages(updated);
  };

  // Duplicate page
  const duplicatePage = (index: number) => {
    const pageToDup = pages[index];
    const duplicated: DocumentPage = {
      ...pageToDup,
      id: Math.random().toString(36).substring(2, 9),
      pageNumber: pages.length + 1,
    };
    const updated = [...pages.slice(0, index + 1), duplicated, ...pages.slice(index + 1)];
    updated.forEach((p, idx) => {
      p.pageNumber = idx + 1;
    });
    onUpdatePages(updated);
  };

  // Delete page
  const deletePage = (index: number) => {
    if (pages.length <= 1) return;
    const updated = pages.filter((_, idx) => idx !== index);
    updated.forEach((p, idx) => {
      p.pageNumber = idx + 1;
    });
    onUpdatePages(updated);
    setSelectedPageIndex(Math.max(0, index - 1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col p-4 sm:p-6 overflow-hidden">
      <div className="max-w-5xl mx-auto w-full flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Manage Pages ({pages.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reorder, rotate, duplicate, or delete pages before saving
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddPage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-semibold border border-indigo-200 dark:border-indigo-800"
            >
              <Plus className="w-4 h-4" />
              <span>Add Page</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Page Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pages.map((page, idx) => (
              <div
                key={page.id}
                className={`relative group flex flex-col rounded-xl border-2 transition-all p-2.5 bg-slate-50 dark:bg-slate-800/60 ${
                  selectedPageIndex === idx
                    ? 'border-indigo-600 dark:border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                }`}
              >
                {/* Page Badge */}
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    Page {page.pageNumber}
                  </span>

                  <button
                    onClick={() => setPreviewPageIndex(idx)}
                    className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    title="Preview Fullscreen"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Thumbnail */}
                <div
                  onClick={() => setSelectedPageIndex(idx)}
                  className="aspect-[1/1.35] w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer flex items-center justify-center relative shadow-xs"
                >
                  <img
                    src={page.thumbnail || page.processedImage}
                    alt={`Page ${page.pageNumber}`}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Actions Bar */}
                <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => movePage(idx, 'left')}
                      disabled={idx === 0}
                      className="p-1 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400"
                      title="Move Left"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => movePage(idx, 'right')}
                      disabled={idx === pages.length - 1}
                      className="p-1 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400"
                      title="Move Right"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => rotatePage(idx)}
                      className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => duplicatePage(idx)}
                      className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deletePage(idx)}
                      disabled={pages.length <= 1}
                      className="p-1 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Page Card */}
            <button
              onClick={onAddPage}
              className="aspect-[1/1.35] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-4 group"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold">Scan Another Page</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="h-16 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <button
            onClick={() => onSelectPageForEdit(selectedPageIndex)}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            Edit Page {selectedPageIndex + 1} Annotations / Signatures
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20"
          >
            Done
          </button>
        </div>
      </div>

      {/* Fullscreen Page Preview Modal */}
      {previewPageIndex !== null && (
        <div className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="relative max-w-2xl max-h-[85vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewPageIndex(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-slate-300"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={pages[previewPageIndex].processedImage}
              alt="Preview"
              className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl"
            />
            <p className="mt-3 text-white text-xs font-semibold">
              Page {previewPageIndex + 1} of {pages.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
