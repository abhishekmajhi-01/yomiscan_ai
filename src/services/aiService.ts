export interface PrivacyStatus {
  inProgress: boolean;
  task?: string;
  timestamp?: number;
}

type PrivacyListener = (status: PrivacyStatus) => void;

class PrivacyEventBus {
  private listeners: Set<PrivacyListener> = new Set();
  private currentStatus: PrivacyStatus = { inProgress: false };

  subscribe(listener: PrivacyListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);
    return () => this.listeners.delete(listener);
  }

  notify(status: PrivacyStatus) {
    this.currentStatus = { ...status, timestamp: Date.now() };
    this.listeners.forEach((fn) => fn(this.currentStatus));
  }
}

export const privacyBus = new PrivacyEventBus();

export class AIService {
  private static async requestWithPrivacy<T>(
    endpoint: string,
    body: any,
    taskDescription: string
  ): Promise<T> {
    privacyBus.notify({ inProgress: true, task: taskDescription });
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `AI Request failed with status ${res.status}`);
      }

      const data = await res.json();
      return data as T;
    } finally {
      privacyBus.notify({ inProgress: false });
    }
  }

  // 1. OCR (Multimodal AI extraction with structure)
  static async performOcr(image: string, language = 'English') {
    return this.requestWithPrivacy<{
      fullText: string;
      headings: string[];
      lists: string[];
      numbers: string[];
      dates: string[];
      names: string[];
      detectedLanguages: string[];
    }>('/api/gemini/ocr', { image, language }, 'Extracting document text with AI OCR...');
  }

  // 2. Document Classification & Filename Suggestion
  static async classifyDocument(image?: string, text?: string) {
    return this.requestWithPrivacy<{
      category: any;
      confidence: number;
      suggestedFileName: string;
      tags: string[];
      reasoning?: string;
    }>('/api/gemini/classify', { image, text }, 'Classifying document & tagging...');
  }

  // 3. Document Assistant (Q&A, Summarize, Translate, Key Info)
  static async askAssistant(params: {
    query: string;
    documentText?: string;
    image?: string;
    action?: 'summarize' | 'translate' | 'extract-entities' | 'qa';
  }) {
    return this.requestWithPrivacy<{ answer: string }>(
      '/api/gemini/assistant',
      params,
      params.action === 'summarize'
        ? 'Summarizing document with AI...'
        : params.action === 'translate'
        ? 'Translating document...'
        : 'Querying Document Assistant...'
    );
  }

  // 4. Structured Information Extraction
  static async extractStructuredInfo(type: string, image?: string, text?: string) {
    return this.requestWithPrivacy<{
      documentType: string;
      fields: Array<{ label: string; key: string; value: string; confidence?: number }>;
      structuredData?: Record<string, any>;
    }>('/api/gemini/extract-info', { type, image, text }, `Extracting ${type} structured data...`);
  }

  // 5. Table Extraction
  static async extractTable(image?: string, text?: string) {
    return this.requestWithPrivacy<{
      hasTable: boolean;
      tableName?: string;
      headers: string[];
      rows: string[][];
      summary?: string;
    }>('/api/gemini/extract-table', { image, text }, 'Extracting tabular data & rows...');
  }

  // 6. AI Auto-Enhance recommendation
  static async getAutoEnhanceRecommendation(image: string) {
    return this.requestWithPrivacy<{
      recommendedFilter: 'original' | 'auto' | 'bw' | 'grayscale' | 'color' | 'high-contrast';
      brightness: number;
      contrast: number;
      sharpness: number;
      shadowRemoval: boolean;
      noiseReduction: boolean;
      reasoning?: string;
    }>('/api/gemini/auto-enhance', { image }, 'Analyzing scan quality for enhancement...');
  }

  // 7. Duplicate Check
  static async checkDuplicate(
    newDocText: string,
    existingDocs: Array<{ id: string; title: string; ocrText: string }>
  ) {
    if (!newDocText || existingDocs.length === 0) {
      return { isDuplicate: false };
    }
    return this.requestWithPrivacy<{
      isDuplicate: boolean;
      matchedDocId?: string;
      matchedTitle?: string;
      confidence?: number;
      explanation?: string;
    }>('/api/gemini/duplicate-check', { newDocText, existingDocs }, 'Checking for duplicate documents...');
  }

  // 8. Suggest Filename
  static async suggestFileName(category: string, ocrText?: string) {
    try {
      const res = await this.classifyDocument(undefined, ocrText);
      return res.suggestedFileName;
    } catch {
      const now = new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const m = monthNames[now.getMonth()];
      const y = now.getFullYear();
      return `${category.replace(/\s+/g, '_')}_${m}_${y}.pdf`;
    }
  }
}
