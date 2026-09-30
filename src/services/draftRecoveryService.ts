import { DocumentPage, ScanMode } from '../types/document';

const DRAFT_KEY = 'yomiscan_scan_draft';

export interface ScanDraft {
  id: string;
  timestamp: string;
  pages: DocumentPage[];
  scanMode: ScanMode;
}

export class DraftRecoveryService {
  static saveDraft(pages: DocumentPage[], scanMode: ScanMode = 'document') {
    if (!pages || pages.length === 0) {
      this.clearDraft();
      return;
    }
    try {
      const draft: ScanDraft = {
        id: 'active_draft',
        timestamp: new Date().toISOString(),
        pages,
        scanMode,
      };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Draft save error (quota exceeded or private browsing)', e);
    }
  }

  static getDraft(): ScanDraft | null {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return null;
  }

  static clearDraft() {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
  }
}
