import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './components/common/Toast';
import { Navbar } from './components/common/Navbar';
import { BottomNav } from './components/common/BottomNav';
import { HomeDashboard } from './components/home/HomeDashboard';
import { CameraScanner } from './components/scanner/CameraScanner';
import { DocumentLibrary } from './components/library/DocumentLibrary';
import { DocumentViewer } from './components/viewer/DocumentViewer';
import { PdfToolsSection } from './components/pdf-tools/PdfToolsSection';
import { AiAssistantDrawer } from './components/ai/AiAssistantDrawer';
import { SettingsModal } from './components/settings/SettingsModal';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { PinLockScreen } from './components/security/PinLockScreen';
import { DuplicatePromptModal } from './components/viewer/DuplicatePromptModal';
import { MobileStorageAccessModal } from './components/storage/MobileStorageAccessModal';
import { storageService } from './services/storage';
import { AIService } from './services/aiService';
import { OcrEngine } from './services/ocrEngine';
import { ImageProcessor } from './services/imageProcessing';
import { PermissionService } from './services/permissionService';
import {
  ScannedDocument,
  DocumentFolder,
  AppSettings,
  ScanMode,
  DocumentPage,
  DocumentCategory,
} from './types/document';

export function YomiScanApp() {
  const { showToast } = useToast();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [trashDocs, setTrashDocs] = useState<ScannedDocument[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedDoc, setSelectedDoc] = useState<ScannedDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Scanning state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMode, setScanMode] = useState<ScanMode>('document');

  // Modals & Protection
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showMobileStorageModal, setShowMobileStorageModal] = useState<boolean>(false);
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    existingDoc: any;
    newPages: DocumentPage[];
    newCategory: DocumentCategory;
    newTitle: string;
  } | null>(null);

  // Load Initial Data from IndexedDB
  const loadData = useCallback(async () => {
    try {
      const savedSettings = await storageService.getSettings();
      setSettings(savedSettings);

      // Apply theme
      if (savedSettings.theme === 'dark' || (savedSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Check PIN lock
      if (!savedSettings.pinLockEnabled) {
        setIsUnlocked(true);
      }

      // First time onboarding
      if (!savedSettings.hasCompletedOnboarding) {
        setShowOnboarding(true);
      }

      const allDocs = await storageService.getAllDocuments(false);
      const trash = await storageService.getTrashDocuments();
      const allFolders = await storageService.getFolders();

      // If database is completely empty on very first launch, seed a demo document
      if (allDocs.length === 0 && trash.length === 0 && !savedSettings.hasCompletedOnboarding) {
        const seedDoc = await createDemoSeedDocument();
        await storageService.saveDocument(seedDoc);
        setDocuments([seedDoc]);
      } else {
        setDocuments(allDocs);
      }

      setTrashDocs(trash);
      setFolders(allFolders);
    } catch (err) {
      console.warn('Database initialization error:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Check if the app is installed on mobile and needs full storage access
    const verifyMobileStorageAccess = async () => {
      const isMobile = PermissionService.isMobile();
      const isInstalled = PermissionService.isInstalled();
      const hasAccess = await PermissionService.hasFullStorageAccess();
      const dismissed = sessionStorage.getItem('yomiscan_storage_prompt_dismissed') === 'true';

      // If app is installed in mobile (standalone mode) or on a mobile device without granted storage
      if ((isMobile && isInstalled) || isInstalled || (isMobile && !hasAccess && !dismissed)) {
        if (!hasAccess && !dismissed) {
          // Delay briefly to allow the main interface to settle
          const timer = setTimeout(() => {
            setShowMobileStorageModal(true);
          }, 700);
          return () => clearTimeout(timer);
        }
      }
    };

    verifyMobileStorageAccess();
  }, [loadData]);

  // Demo Document Generator
  const createDemoSeedDocument = async (): Promise<ScannedDocument> => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d')!;

    // Paper background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 1100);

    // Header
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('INVOICE / RECEIPT', 60, 90);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Invoice #: INV-2026-0891', 60, 125);
    ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 60, 145);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Billed To: Abhishek Kumar', 60, 200);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Enterprise Cloud Services Inc.', 60, 225);

    // Table Lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(60, 270, 680, 240);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(61, 271, 678, 40);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Item Description', 80, 296);
    ctx.fillText('Qty', 420, 296);
    ctx.fillText('Unit Price', 510, 296);
    ctx.fillText('Total', 640, 296);

    ctx.font = '14px sans-serif';
    ctx.fillText('AI Document Processing Suite', 80, 350);
    ctx.fillText('1', 430, 350);
    ctx.fillText('$120.00', 510, 350);
    ctx.fillText('$120.00', 640, 350);

    ctx.fillText('Cloud Storage & Backup (100GB)', 80, 400);
    ctx.fillText('1', 430, 400);
    ctx.fillText('$30.00', 510, 400);
    ctx.fillText('$30.00', 640, 400);

    // Totals
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('Total Amount Paid: $150.00', 480, 560);

    const demoUri = canvas.toDataURL('image/jpeg', 0.9);
    const thumbUri = await ImageProcessor.createThumbnail(demoUri);

    return {
      id: 'demo-invoice-01',
      title: 'Cloud_Services_Invoice_2026.pdf',
      category: 'Invoice',
      tags: ['Invoice', 'Receipt', 'Business', 'Verified'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileSize: 142000,
      isFavorite: true,
      isTrash: false,
      thumbnail: thumbUri,
      ocrText: `# INVOICE / RECEIPT\nInvoice #: INV-2026-0891\nDate: ${new Date().toLocaleDateString()}\n\nBilled To: Abhishek Kumar\nEnterprise Cloud Services Inc.\n\n## Line Items\n1. AI Document Processing Suite - $120.00\n2. Cloud Storage & Backup (100GB) - $30.00\n\nTotal Amount Paid: $150.00\nStatus: Paid (Credit Card)`,
      ocrEntities: {
        headings: ['INVOICE / RECEIPT', 'Line Items'],
        lists: ['1. AI Document Processing Suite', '2. Cloud Storage & Backup'],
        numbers: ['INV-2026-0891', '$120.00', '$30.00', '$150.00'],
        dates: [new Date().toLocaleDateString()],
        names: ['Abhishek Kumar', 'Enterprise Cloud Services Inc.'],
        languages: ['English'],
      },
      pages: [
        {
          id: 'demo-p1',
          pageNumber: 1,
          originalImage: demoUri,
          processedImage: demoUri,
          thumbnail: thumbUri,
          width: 800,
          height: 1100,
          rotation: 0,
          filters: {
            filter: 'auto',
            brightness: 0,
            contrast: 10,
            saturation: 0,
            sharpness: 10,
            shadowRemoval: false,
            noiseReduction: false,
            backgroundCleanup: true,
          },
        },
      ],
      versions: [],
    };
  };

  // Update Settings
  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = await storageService.saveSettings(newSettings);
    setSettings(updated);
  };

  // Document Operations
  const handleSaveDocument = async (doc: ScannedDocument) => {
    await storageService.saveDocument(doc);
    setDocuments((prev) => {
      const idx = prev.findIndex((d) => d.id === doc.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = doc;
        return copy;
      }
      return [doc, ...prev];
    });
    if (selectedDoc && selectedDoc.id === doc.id) {
      setSelectedDoc(doc);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    await storageService.moveToTrash(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    const trash = await storageService.getTrashDocuments();
    setTrashDocs(trash);
    if (selectedDoc?.id === id) {
      setSelectedDoc(null);
    }
    showToast('Moved to Trash', 'info');
  };

  const handleRestoreDocument = async (id: string) => {
    await storageService.restoreFromTrash(id);
    const restored = await storageService.getDocumentById(id);
    setTrashDocs((prev) => prev.filter((d) => d.id !== id));
    if (restored) {
      setDocuments((prev) => [restored, ...prev]);
    }
    showToast('Document restored!', 'success');
  };

  const handlePermanentDelete = async (id: string) => {
    await storageService.permanentDeleteDocument(id);
    setTrashDocs((prev) => prev.filter((d) => d.id !== id));
    showToast('Document deleted permanently.', 'info');
  };

  const handleEmptyTrash = async () => {
    await storageService.emptyTrash();
    setTrashDocs([]);
    showToast('Trash emptied!', 'success');
  };

  const handleCreateFolder = async (name: string) => {
    const newFolder: DocumentFolder = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      createdAt: new Date().toISOString(),
    };
    await storageService.saveFolder(newFolder);
    setFolders((prev) => [...prev, newFolder]);
    showToast(`Created folder "${name}"`, 'success');
  };

  // Cache & Wipe Handlers
  const handleClearCache = async () => {
    await storageService.clearTemporaryFiles();
    const updatedSettings = await storageService.getSettings();
    setSettings(updatedSettings);
    showToast('Temporary files and cache cleared!', 'success');
  };

  const handleWipeData = async () => {
    if (window.confirm('Are you sure you want to erase all documents, folders, and signatures? This cannot be undone.')) {
      await storageService.wipeAllData();
      setDocuments([]);
      setTrashDocs([]);
      setFolders([]);
      setSelectedDoc(null);
      showToast('All app data wiped.', 'info');
    }
  };

  // Start Camera Scanning
  const handleStartScan = (mode: ScanMode = 'document') => {
    setScanMode(mode);
    setIsScanning(true);
  };

  // Process Completed Scan Workflow
  const handleFinishScan = async (pages: DocumentPage[], mode: ScanMode) => {
    setIsScanning(false);
    if (pages.length === 0) return;

    showToast('Processing scan and running OCR...', 'info');

    // 1. Initial OCR on page 1
    const p1Image = pages[0].processedImage;
    const ocrResult = await OcrEngine.recognizeText(
      p1Image,
      settings?.ocrLanguages[0] || 'English',
      settings?.localProcessingOnly
    );

    // 2. Category mapping based on scan mode
    let initialCategory: DocumentCategory = 'Personal document';
    if (mode === 'idcard') initialCategory = 'ID';
    else if (mode === 'receipt') initialCategory = 'Receipt';
    else if (mode === 'businesscard') initialCategory = 'Business card';

    // 3. Smart Filename Suggestion
    let suggestedTitle = `${initialCategory}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
    let classificationData: any = null;

    if (!settings?.localProcessingOnly && navigator.onLine) {
      try {
        const classRes = await AIService.classifyDocument(p1Image, ocrResult.fullText);
        if (classRes.category && mode === 'document') {
          initialCategory = classRes.category;
        }
        if (classRes.suggestedFileName && settings?.autoSuggestFilename) {
          suggestedTitle = classRes.suggestedFileName;
        }
        classificationData = {
          confidence: classRes.confidence,
          reasoning: classRes.reasoning,
        };
      } catch (err) {
        console.warn('AI classification skipped', err);
      }
    }

    // 4. Check for duplicate document
    if (documents.length > 0 && ocrResult.fullText.length > 30 && !settings?.localProcessingOnly) {
      try {
        const dupCheck = await AIService.checkDuplicate(
          ocrResult.fullText,
          documents.map((d) => ({ id: d.id, title: d.title, ocrText: d.ocrText }))
        );

        if (dupCheck.isDuplicate && dupCheck.matchedDocId) {
          const matched = documents.find((d) => d.id === dupCheck.matchedDocId);
          if (matched) {
            setDuplicatePrompt({
              existingDoc: matched,
              newPages: pages,
              newCategory: initialCategory,
              newTitle: suggestedTitle,
            });
            return;
          }
        }
      } catch {}
    }

    // 5. Finalize Document Save
    await finalizeAndSaveDocument(pages, initialCategory, suggestedTitle, ocrResult, classificationData);
  };

  const finalizeAndSaveDocument = async (
    pages: DocumentPage[],
    category: DocumentCategory,
    title: string,
    ocrResult: any,
    classificationData?: any,
    replaceDocId?: string
  ) => {
    const docId = replaceDocId || Math.random().toString(36).substring(2, 9);
    const thumb = pages[0]?.thumbnail || (await ImageProcessor.createThumbnail(pages[0]?.processedImage));

    const newDoc: ScannedDocument = {
      id: docId,
      title,
      category,
      tags: [category, 'Scanned'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileSize: pages.length * 85000,
      isFavorite: false,
      isTrash: false,
      thumbnail: thumb,
      ocrText: ocrResult?.fullText || '',
      ocrEntities: ocrResult
        ? {
            headings: ocrResult.headings || [],
            lists: ocrResult.lists || [],
            numbers: ocrResult.numbers || [],
            dates: ocrResult.dates || [],
            names: ocrResult.names || [],
            languages: ocrResult.detectedLanguages || ['English'],
          }
        : undefined,
      pages,
      versions: [],
      aiClassification: classificationData,
    };

    await storageService.saveDocument(newDoc);
    setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== docId)]);
    setSelectedDoc(newDoc);
    showToast(`Saved "${newDoc.title}" successfully!`, 'success');
  };

  // Gallery File Import handler
  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    showToast('Importing document image(s)...', 'info');
    try {
      const pages: DocumentPage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });

        const corners = await ImageProcessor.detectDocumentCorners(dataUrl);
        const warped = await ImageProcessor.warpPerspective(dataUrl, corners);
        const enhanced = await ImageProcessor.applyFilters(warped, {
          filter: 'auto',
          brightness: 5,
          contrast: 15,
          saturation: 5,
          sharpness: 10,
          shadowRemoval: true,
          noiseReduction: false,
          backgroundCleanup: true,
        });
        const thumb = await ImageProcessor.createThumbnail(enhanced);

        pages.push({
          id: Math.random().toString(36).substring(2, 9),
          pageNumber: i + 1,
          originalImage: dataUrl,
          processedImage: enhanced,
          thumbnail: thumb,
          width: 800,
          height: 1100,
          rotation: 0,
          filters: {
            filter: 'auto',
            brightness: 5,
            contrast: 15,
            saturation: 5,
            sharpness: 10,
            shadowRemoval: true,
            noiseReduction: false,
            backgroundCleanup: true,
          },
        });
      }

      await handleFinishScan(pages, 'document');
    } catch (err) {
      console.error(err);
      showToast('Failed to import files', 'error');
    }
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Initializing YomiScan...</span>
        </div>
      </div>
    );
  }

  // Security Screen PIN Lock
  if (settings.pinLockEnabled && !isUnlocked) {
    return (
      <PinLockScreen
        correctPin={settings.pinCode || '1234'}
        allowBiometrics={settings.biometricsEnabled}
        onUnlock={() => setIsUnlocked(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenSettings={() => setShowSettings(true)}
        onOpenOnboarding={() => setShowOnboarding(true)}
        onStartScan={() => handleStartScan('document')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onNavigate={(tab) => {
          setSelectedDoc(null);
          setActiveTab(tab);
        }}
      />

      {/* Main Content Router */}
      <main className="flex-1 flex flex-col">
        {selectedDoc ? (
          <DocumentViewer
            document={selectedDoc}
            onUpdateDocument={handleSaveDocument}
            onDeleteDocument={handleDeleteDocument}
            onBack={() => setSelectedDoc(null)}
          />
        ) : activeTab === 'home' ? (
          <HomeDashboard
            documents={documents}
            onStartScan={handleStartScan}
            onImportFiles={handleImportFiles}
            onOpenPdfTools={() => setActiveTab('tools')}
            onOpenAiTools={() => setActiveTab('ai')}
            onSelectDocument={(doc) => setSelectedDoc(doc)}
            onViewAllDocuments={() => setActiveTab('documents')}
          />
        ) : activeTab === 'documents' ? (
          <DocumentLibrary
            documents={documents}
            folders={folders}
            trashDocuments={trashDocs}
            onSelectDocument={(doc) => setSelectedDoc(doc)}
            onUpdateDocument={handleSaveDocument}
            onDeleteDocument={handleDeleteDocument}
            onRestoreDocument={handleRestoreDocument}
            onPermanentDelete={handlePermanentDelete}
            onEmptyTrash={handleEmptyTrash}
            onCreateFolder={handleCreateFolder}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        ) : activeTab === 'tools' ? (
          <PdfToolsSection />
        ) : activeTab === 'ai' ? (
          /* Global AI Hub */
          <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24 w-full">
            <h1 className="text-xl font-bold mb-2">AI Document Intelligence Hub</h1>
            <p className="text-xs text-slate-500 mb-6">
              Select any document from your library to interrogate with the grounded AI Assistant, summarize, or extract tables.
            </p>

            {documents.length > 0 ? (
              <div className="h-[600px] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <AiAssistantDrawer document={documents[0]} onUpdateDocument={handleSaveDocument} />
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">
                <p className="text-xs">No documents available to query. Please scan a document first.</p>
              </div>
            )}
          </div>
        ) : null}
      </main>

      {/* Mobile-Friendly Bottom Navigation */}
      {!selectedDoc && !isScanning && (
        <BottomNav
          activeTab={activeTab}
          onNavigate={(tab) => {
            setSelectedDoc(null);
            setActiveTab(tab);
          }}
          onStartScan={() => handleStartScan('document')}
        />
      )}

      {/* Active Camera Scanner Viewport */}
      {isScanning && (
        <CameraScanner
          initialMode={scanMode}
          onFinishScan={handleFinishScan}
          onClose={() => setIsScanning(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClearCache={handleClearCache}
          onEmptyTrash={handleEmptyTrash}
          onWipeData={handleWipeData}
          onClose={() => setShowSettings(false)}
          onOpenMobileStorageModal={() => setShowMobileStorageModal(true)}
        />
      )}

      {/* Onboarding Walkthrough */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={async () => {
            await handleUpdateSettings({ hasCompletedOnboarding: true });
            setShowOnboarding(false);
          }}
        />
      )}

      {/* Duplicate Detection Prompt Modal */}
      {duplicatePrompt && (
        <DuplicatePromptModal
          existingDoc={duplicatePrompt.existingDoc}
          newDocTitle={duplicatePrompt.newTitle}
          newDocThumbnail={duplicatePrompt.newPages[0]?.thumbnail}
          onKeepBoth={async () => {
            const promptData = duplicatePrompt;
            setDuplicatePrompt(null);
            await finalizeAndSaveDocument(
              promptData.newPages,
              promptData.newCategory,
              promptData.newTitle,
              null
            );
          }}
          onReplaceExisting={async () => {
            const promptData = duplicatePrompt;
            setDuplicatePrompt(null);
            await finalizeAndSaveDocument(
              promptData.newPages,
              promptData.newCategory,
              promptData.newTitle,
              null,
              undefined,
              promptData.existingDoc.id
            );
          }}
          onCancel={() => setDuplicatePrompt(null)}
        />
      )}

      {/* Mobile Installation Full Storage Access Prompt */}
      <MobileStorageAccessModal
        isOpen={showMobileStorageModal}
        onClose={() => setShowMobileStorageModal(false)}
        onGranted={() => {
          showToast('Full Storage Access Granted! Documents are permanently protected on device.', 'success');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <YomiScanApp />
    </ToastProvider>
  );
}
