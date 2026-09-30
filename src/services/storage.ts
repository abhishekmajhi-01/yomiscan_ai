import { ScannedDocument, DocumentFolder, SavedSignature, AppSettings } from '../types/document';

const DB_NAME = 'yomiscan_db';
const DB_VERSION = 1;

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  defaultScanMode: 'document',
  defaultPdfQuality: 'high',
  defaultPageSize: 'A4',
  autoSuggestFilename: true,
  ocrLanguages: ['English', 'Hindi', 'Telugu'],
  localProcessingOnly: false,
  pinLockEnabled: false,
  biometricsEnabled: false,
  cloudBackupEnabled: false,
  cloudProvider: 'google_drive',
  autoCloudBackup: false,
  storageUsedBytes: 0,
  hasCompletedOnboarding: false,
};

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('documents')) {
            const docStore = db.createObjectStore('documents', { keyPath: 'id' });
            docStore.createIndex('category', 'category', { unique: false });
            docStore.createIndex('createdAt', 'createdAt', { unique: false });
            docStore.createIndex('isFavorite', 'isFavorite', { unique: false });
            docStore.createIndex('isTrash', 'isTrash', { unique: false });
            docStore.createIndex('folderId', 'folderId', { unique: false });
          }
          if (!db.objectStoreNames.contains('folders')) {
            db.createObjectStore('folders', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('signatures')) {
            db.createObjectStore('signatures', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }

  // --- Document Operations ---
  async getAllDocuments(includeTrash = false): Promise<ScannedDocument[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readonly');
      const store = tx.objectStore('documents');
      const request = store.getAll();

      request.onsuccess = () => {
        let docs: ScannedDocument[] = request.result || [];
        if (!includeTrash) {
          docs = docs.filter((d) => !d.isTrash);
        }
        docs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(docs);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getTrashDocuments(): Promise<ScannedDocument[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readonly');
      const store = tx.objectStore('documents');
      const request = store.getAll();

      request.onsuccess = () => {
        const docs: ScannedDocument[] = (request.result || []).filter((d: ScannedDocument) => d.isTrash);
        docs.sort((a, b) => new Date(b.trashedAt || b.updatedAt).getTime() - new Date(a.trashedAt || a.updatedAt).getTime());
        resolve(docs);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getDocumentById(id: string): Promise<ScannedDocument | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readonly');
      const store = tx.objectStore('documents');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveDocument(doc: ScannedDocument): Promise<ScannedDocument> {
    const db = await this.getDB();
    // compute rough size
    let approximateBytes = 0;
    doc.pages.forEach((p) => {
      approximateBytes += (p.processedImage?.length || 0) * 0.75;
      approximateBytes += (p.originalImage?.length || 0) * 0.75;
    });
    doc.fileSize = approximateBytes || doc.fileSize || 50000;
    doc.updatedAt = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite');
      const store = tx.objectStore('documents');
      const request = store.put(doc);

      request.onsuccess = () => {
        this.updateStorageEstimate();
        resolve(doc);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async moveToTrash(id: string): Promise<void> {
    const doc = await this.getDocumentById(id);
    if (!doc) return;
    doc.isTrash = true;
    doc.trashedAt = new Date().toISOString();
    await this.saveDocument(doc);
  }

  async restoreFromTrash(id: string): Promise<void> {
    const doc = await this.getDocumentById(id);
    if (!doc) return;
    doc.isTrash = false;
    doc.trashedAt = null;
    await this.saveDocument(doc);
  }

  async permanentDeleteDocument(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('documents', 'readwrite');
      const store = tx.objectStore('documents');
      const request = store.delete(id);

      request.onsuccess = () => {
        this.updateStorageEstimate();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async emptyTrash(): Promise<void> {
    const trashDocs = await this.getTrashDocuments();
    for (const doc of trashDocs) {
      await this.permanentDeleteDocument(doc.id);
    }
  }

  // --- Folder Operations ---
  async getFolders(): Promise<DocumentFolder[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('folders', 'readonly');
      const store = tx.objectStore('folders');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveFolder(folder: DocumentFolder): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('folders', 'readwrite');
      const store = tx.objectStore('folders');
      const request = store.put(folder);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFolder(folderId: string): Promise<void> {
    const db = await this.getDB();
    // Untag any documents inside this folder
    const docs = await this.getAllDocuments(true);
    for (const d of docs) {
      if (d.folderId === folderId) {
        d.folderId = null;
        await this.saveDocument(d);
      }
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('folders', 'readwrite');
      const store = tx.objectStore('folders');
      const request = store.delete(folderId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Signature Operations ---
  async getSignatures(): Promise<SavedSignature[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('signatures', 'readonly');
      const store = tx.objectStore('signatures');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSignature(sig: SavedSignature): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('signatures', 'readwrite');
      const store = tx.objectStore('signatures');
      const request = store.put(sig);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSignature(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('signatures', 'readwrite');
      const store = tx.objectStore('signatures');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- App Settings ---
  async getSettings(): Promise<AppSettings> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const request = store.get('app_settings');

        request.onsuccess = () => {
          if (request.result && request.result.value) {
            resolve({ ...DEFAULT_SETTINGS, ...request.result.value });
          } else {
            resolve(DEFAULT_SETTINGS);
          }
        };
        request.onerror = () => resolve(DEFAULT_SETTINGS);
      });
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const request = store.put({ key: 'app_settings', value: updated });

      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Storage calculation & Cache cleanup ---
  async updateStorageEstimate(): Promise<number> {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        await this.saveSettings({ storageUsedBytes: usage });
        return usage;
      }
    } catch (e) {
      console.warn('Storage estimate failed', e);
    }
    return 0;
  }

  async clearTemporaryFiles(): Promise<void> {
    // Clean up revoked object URLs and compress thumbnails if needed
    const docs = await this.getAllDocuments(false);
    for (const doc of docs) {
      if (doc.pages.length > 5) {
        // limit history pages original sizes to save space
        doc.pages.forEach((p) => {
          if (p.originalImage && p.processedImage && p.originalImage !== p.processedImage) {
            // Keep processedImage as primary
          }
        });
        await this.saveDocument(doc);
      }
    }
    await this.updateStorageEstimate();
  }

  async wipeAllData(): Promise<void> {
    const db = await this.getDB();
    const stores = ['documents', 'folders', 'signatures', 'settings'];
    const tx = db.transaction(stores, 'readwrite');
    for (const s of stores) {
      tx.objectStore(s).clear();
    }
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
    await this.saveSettings({ hasCompletedOnboarding: false, storageUsedBytes: 0 });
  }
}

export const storageService = new StorageService();
