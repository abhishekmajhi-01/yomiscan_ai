import React, { useState, useMemo } from 'react';
import {
  Folder,
  Tag,
  Star,
  Clock,
  Trash2,
  Filter,
  ArrowUpDown,
  Grid,
  List,
  Search,
  CheckSquare,
  Square,
  MoreVertical,
  Plus,
  FileText,
  Lock,
  Download,
  Share2,
  RotateCcw,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { ScannedDocument, DocumentFolder, DocumentCategory } from '../../types/document';
import { PdfService } from '../../services/pdfService';
import { useToast } from '../common/Toast';

interface DocumentLibraryProps {
  documents: ScannedDocument[];
  folders: DocumentFolder[];
  trashDocuments: ScannedDocument[];
  onSelectDocument: (doc: ScannedDocument) => void;
  onUpdateDocument: (doc: ScannedDocument) => void;
  onDeleteDocument: (id: string) => void;
  onRestoreDocument: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onEmptyTrash: () => void;
  onCreateFolder: (name: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  documents,
  folders,
  trashDocuments,
  onSelectDocument,
  onUpdateDocument,
  onDeleteDocument,
  onRestoreDocument,
  onPermanentDelete,
  onEmptyTrash,
  onCreateFolder,
  searchQuery,
  onSearchChange,
}) => {
  const { showToast } = useToast();

  const [activeFilter, setActiveFilter] = useState<'all' | 'folders' | 'favorites' | 'recent' | 'trash'>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isBulkSelecting, setIsBulkSelecting] = useState<boolean>(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

  // Filter & Search Documents
  const displayedDocuments = useMemo(() => {
    let list = activeFilter === 'trash' ? [...trashDocuments] : [...documents];

    // Filter tab
    if (activeFilter === 'favorites') {
      list = list.filter((d) => d.isFavorite);
    } else if (activeFilter === 'folders' && selectedFolderId) {
      list = list.filter((d) => d.folderId === selectedFolderId);
    } else if (activeFilter === 'recent') {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      list = list.filter((d) => new Date(d.createdAt).getTime() > oneWeekAgo);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((d) => d.category === selectedCategory);
    }

    // Global Search (file name, OCR text, names, dates, tags, fields)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d) => {
        const titleMatch = d.title.toLowerCase().includes(q);
        const ocrMatch = (d.ocrText || '').toLowerCase().includes(q);
        const tagMatch = d.tags.some((t) => t.toLowerCase().includes(q));
        const categoryMatch = d.category.toLowerCase().includes(q);
        const namesMatch = d.ocrEntities?.names?.some((n) => n.toLowerCase().includes(q));
        const datesMatch = d.ocrEntities?.dates?.some((dt) => dt.toLowerCase().includes(q));
        return titleMatch || ocrMatch || tagMatch || categoryMatch || namesMatch || datesMatch;
      });
    }

    // Sorting
    list.sort((a, b) => {
      let comp = 0;
      if (sortBy === 'date') {
        comp = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else if (sortBy === 'name') {
        comp = a.title.localeCompare(b.title);
      } else if (sortBy === 'type') {
        comp = a.category.localeCompare(b.category);
      } else if (sortBy === 'size') {
        comp = (b.fileSize || 0) - (a.fileSize || 0);
      }
      return sortOrder === 'asc' ? -comp : comp;
    });

    return list;
  }, [documents, trashDocuments, activeFilter, selectedFolderId, selectedCategory, searchQuery, sortBy, sortOrder]);

  // Bulk selection toggles
  const toggleSelectDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedDocIds.size === displayedDocuments.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(displayedDocuments.map((d) => d.id)));
    }
  };

  // Bulk delete
  const handleBulkDelete = () => {
    if (activeFilter === 'trash') {
      selectedDocIds.forEach((id) => onPermanentDelete(id));
      showToast(`Permanently deleted ${selectedDocIds.size} documents`, 'info');
    } else {
      selectedDocIds.forEach((id) => onDeleteDocument(id));
      showToast(`Moved ${selectedDocIds.size} documents to Trash`, 'info');
    }
    setSelectedDocIds(new Set());
    setIsBulkSelecting(false);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '45 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Top Filter Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Documents', count: documents.length },
            { id: 'favorites', label: 'Favorites', count: documents.filter((d) => d.isFavorite).length },
            { id: 'folders', label: 'Folders', count: folders.length },
            { id: 'recent', label: 'Recent (7d)' },
            { id: 'trash', label: 'Trash', count: trashDocuments.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveFilter(tab.id as any);
                setSelectedDocIds(new Set());
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                activeFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* View mode & Sort controls */}
        <div className="flex items-center gap-2">
          {/* Bulk select toggle */}
          <button
            onClick={() => {
              setIsBulkSelecting(!isBulkSelecting);
              setSelectedDocIds(new Set());
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isBulkSelecting
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {isBulkSelecting ? 'Cancel Select' : 'Select'}
          </button>

          {/* Sort dropdown */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent focus:outline-none pr-1"
            >
              <option value="date" className="dark:bg-slate-800">Date</option>
              <option value="name" className="dark:bg-slate-800">Name</option>
              <option value="type" className="dark:bg-slate-800">Category</option>
              <option value="size" className="dark:bg-slate-800">File Size</option>
            </select>
            <button
              onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
              className="ml-1 text-[10px] font-bold text-indigo-500"
            >
              {sortOrder === 'asc' ? '▲' : '▼'}
            </button>
          </div>

          {/* Grid / List switch */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-400'}`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-400'}`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Folders Sub-Bar (when in Folders view) */}
      {activeFilter === 'folders' && (
        <div className="mb-6 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Your Folders
            </h3>
            <button
              onClick={() => setShowCreateFolderModal(true)}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Folder</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFolderId(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                selectedFolderId === null
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              All Folders
            </button>

            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFolderId(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  selectedFolderId === f.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Folder className="w-3.5 h-3.5 text-amber-500" />
                <span>{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trash Header Controls */}
      {activeFilter === 'trash' && trashDocuments.length > 0 && (
        <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-center justify-between text-xs">
          <span className="text-rose-800 dark:text-rose-300 font-medium">
            Items in trash are stored safely and can be restored anytime.
          </span>
          <button
            onClick={onEmptyTrash}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Empty Trash</span>
          </button>
        </div>
      )}

      {/* Bulk Action Strip */}
      {isBulkSelecting && (
        <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300"
            >
              {selectedDocIds.size === displayedDocuments.length ? (
                <CheckSquare className="w-4 h-4 text-indigo-600" />
              ) : (
                <Square className="w-4 h-4 text-indigo-600" />
              )}
              <span>Select All ({selectedDocIds.size} of {displayedDocuments.length})</span>
            </button>
          </div>

          {selectedDocIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
          )}
        </div>
      )}

      {/* Documents Grid / List */}
      {displayedDocuments.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-slate-800/60 text-indigo-500 flex items-center justify-center mb-3">
            <FileText className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {searchQuery ? 'No documents match your search' : 'No documents found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {searchQuery
              ? 'Try searching by a different name, date, tag, or extracted keyword.'
              : 'Scan a document or import images to get started.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayedDocuments.map((doc) => {
            const isSelected = selectedDocIds.has(doc.id);
            return (
              <div
                key={doc.id}
                onClick={() => {
                  if (activeFilter === 'trash') return;
                  if (isBulkSelecting) {
                    toggleSelectDoc(doc.id, { stopPropagation: () => {} } as any);
                  } else {
                    onSelectDocument(doc);
                  }
                }}
                className={`group relative rounded-2xl bg-white dark:bg-slate-900 border transition-all overflow-hidden flex flex-col cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-500/30'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md'
                }`}
              >
                {/* Thumbnail Container */}
                <div className="aspect-[1/1.35] w-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden relative flex items-center justify-center">
                  <img
                    src={doc.thumbnail || doc.pages[0]?.thumbnail || doc.pages[0]?.processedImage}
                    alt={doc.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Bulk Select Checkbox */}
                  {isBulkSelecting && (
                    <div
                      onClick={(e) => toggleSelectDoc(doc.id, e)}
                      className="absolute top-2 left-2 z-10"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-600 bg-white rounded" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600 bg-white/80 rounded" />
                      )}
                    </div>
                  )}

                  {/* Favorite indicator */}
                  {doc.isFavorite && (
                    <div className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-amber-400 backdrop-blur-xs">
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </div>
                  )}

                  {/* Page Count Pill */}
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/65 text-[10px] font-bold text-white backdrop-blur-xs">
                    {doc.pages.length} {doc.pages.length === 1 ? 'page' : 'pages'}
                  </span>
                </div>

                {/* Metadata Details */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {doc.title}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {doc.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatSize(doc.fileSize)}
                      </span>
                    </div>
                  </div>

                  {/* Trash Actions */}
                  {activeFilter === 'trash' ? (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestoreDocument(doc.id);
                        }}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPermanentDelete(doc.id);
                        }}
                        className="text-[11px] text-rose-600 font-semibold hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 pt-1.5 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {displayedDocuments.map((doc) => {
            const isSelected = selectedDocIds.has(doc.id);
            return (
              <div
                key={doc.id}
                onClick={() => {
                  if (activeFilter === 'trash') return;
                  if (isBulkSelecting) {
                    toggleSelectDoc(doc.id, { stopPropagation: () => {} } as any);
                  } else {
                    onSelectDocument(doc);
                  }
                }}
                className={`p-3 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/20'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isBulkSelecting && (
                    <div onClick={(e) => toggleSelectDoc(doc.id, e)}>
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  )}

                  <div className="w-12 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                    <img
                      src={doc.thumbnail || doc.pages[0]?.thumbnail}
                      alt={doc.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {doc.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {doc.category}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {doc.pages.length} {doc.pages.length === 1 ? 'page' : 'pages'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatSize(doc.fileSize)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 hidden sm:block">
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </span>
                  {activeFilter === 'trash' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestoreDocument(doc.id);
                        }}
                        className="p-1.5 text-xs text-indigo-600 hover:underline"
                      >
                        Restore
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPermanentDelete(doc.id);
                        }}
                        className="p-1.5 text-xs text-rose-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
              Create New Folder
            </h3>
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Invoices 2026"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateFolderModal(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newFolderName.trim()) {
                    onCreateFolder(newFolderName.trim());
                    setNewFolderName('');
                    setShowCreateFolderModal(false);
                  }
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
