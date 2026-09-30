import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  FileText,
  Tag,
  HelpCircle,
  X,
  Languages,
  DollarSign,
  Calendar,
  Building,
  CheckCircle,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { ScannedDocument, DocumentCategory } from '../../types/document';
import { AIService } from '../../services/aiService';
import { useToast } from '../common/Toast';

interface AiAssistantDrawerProps {
  document: ScannedDocument;
  onUpdateDocument?: (doc: ScannedDocument) => void;
  onClose?: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  document,
  onUpdateDocument,
  onClose,
}) => {
  const { showToast } = useToast();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Hello! I have analyzed "${document.title}". Ask me any questions, or click a quick action below to summarize, translate, or extract key figures.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>(document.category);

  const categories: DocumentCategory[] = [
    'ID',
    'Receipt',
    'Invoice',
    'Certificate',
    'Assignment',
    'Notes',
    'Book page',
    'Bill',
    'Bank document',
    'Business card',
    'Legal document',
    'Personal document',
    'Other',
  ];

  const quickPrompts = [
    { label: 'Summarize document', action: 'summarize', query: 'Summarize this document in 3-4 bullet points.' },
    { label: 'What is the total amount?', action: 'qa', query: 'What is the total amount and currency on this document?' },
    { label: 'What is the due date?', action: 'qa', query: 'What is the due date or transaction date?' },
    { label: 'Who issued this document?', action: 'qa', query: 'Who is the issuer, organization, or vendor of this document?' },
    { label: 'Extract all names', action: 'extract-entities', query: 'Extract all people, company, and institution names.' },
    { label: 'Extract all dates', action: 'extract-entities', query: 'Extract all dates mentioned in this document.' },
    { label: 'Translate to Spanish', action: 'translate', query: 'Spanish' },
    { label: 'Translate to Hindi', action: 'translate', query: 'Hindi' },
    { label: 'Translate to Telugu', action: 'translate', query: 'Telugu' },
  ];

  const handleSendMessage = async (queryText: string, actionType?: any) => {
    if (!queryText.trim() || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await AIService.askAssistant({
        query: queryText,
        documentText: document.ocrText,
        image: document.pages[0]?.processedImage,
        action: actionType || 'qa',
      });

      const assistantMsg: Message = {
        role: 'assistant',
        text: response.answer || 'Information not found in the provided document.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        role: 'assistant',
        text: 'Sorry, I was unable to process this request. Ensure you have an active network connection for external AI queries.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-classify document
  const handleReclassify = async () => {
    setIsLoading(true);
    try {
      const res = await AIService.classifyDocument(
        document.pages[0]?.processedImage,
        document.ocrText
      );
      if (res && res.category) {
        setSelectedCategory(res.category);
        if (onUpdateDocument) {
          onUpdateDocument({
            ...document,
            category: res.category,
            tags: Array.from(new Set([...document.tags, ...(res.tags || [])])),
            aiClassification: {
              confidence: res.confidence,
              reasoning: res.reasoning,
            },
          });
        }
        showToast(`Classified as ${res.category}!`, 'success');
      }
    } catch {
      showToast('Classification failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Change category manually
  const handleChangeCategory = (newCat: DocumentCategory) => {
    setSelectedCategory(newCat);
    if (onUpdateDocument) {
      onUpdateDocument({
        ...document,
        category: newCat,
      });
      showToast(`Category updated to ${newCat}`, 'info');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              AI Document Assistant
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
              Grounded in {document.title}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Tag Strip */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => handleChangeCategory(e.target.value as DocumentCategory)}
            className="bg-transparent text-xs font-semibold text-indigo-600 dark:text-indigo-400 focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c} className="dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleReclassify}
          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Auto-Classify</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-tl-xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>
              <span
                className={`text-[9px] block mt-1 ${
                  m.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                }`}
              >
                {m.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 pl-9">
            <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Analyzing document content...</span>
          </div>
        )}
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 overflow-x-auto flex gap-1.5 scrollbar-none">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p.query, p.action)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 hover:border-indigo-500 shrink-0 shadow-xs transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage(inputQuery);
          }}
          placeholder="Ask a question about this document..."
          className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-slate-200 dark:border-slate-700"
        />

        <button
          onClick={() => handleSendMessage(inputQuery)}
          disabled={!inputQuery.trim() || isLoading}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
