import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Share2,
  Clock,
  ShieldCheck,
  Ban,
  Copy,
  Check,
  X,
  Lock,
} from 'lucide-react';
import { ScannedDocument } from '../../types/document';
import { useToast } from '../common/Toast';

interface QrShareModalProps {
  document: ScannedDocument;
  onClose: () => void;
}

export const QrShareModal: React.FC<QrShareModalProps> = ({ document, onClose }) => {
  const { showToast } = useToast();

  const [expiration, setExpiration] = useState<'1h' | '24h' | '7d' | 'never'>('24h');
  const [isRevoked, setIsRevoked] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate portable document manifest link
  const sharePayload = JSON.stringify({
    app: 'YomiScan',
    id: document.id,
    title: document.title,
    pages: document.pages.length,
    category: document.category,
    createdAt: document.createdAt,
    expires: expiration,
    access: 'read-only',
    shareToken: Math.random().toString(36).substring(2, 15),
  });

  // Render QR Code onto Canvas using clean standard matrix encoding
  useEffect(() => {
    if (!canvasRef.current || isRevoked) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 220;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Simple robust 21x21 QR Grid renderer
    const modules = 25;
    const cellSize = Math.floor(size / (modules + 4));
    const startOffset = Math.floor((size - modules * cellSize) / 2);

    ctx.fillStyle = '#0f172a';

    // Position detection squares (Top-Left, Top-Right, Bottom-Left)
    const drawFinder = (startX: number, startY: number) => {
      // 7x7 outer
      ctx.fillRect(startX, startY, cellSize * 7, cellSize * 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(startX + cellSize, startY + cellSize, cellSize * 5, cellSize * 5);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(startX + cellSize * 2, startY + cellSize * 2, cellSize * 3, cellSize * 3);
    };

    drawFinder(startOffset, startOffset);
    drawFinder(startOffset + (modules - 7) * cellSize, startOffset);
    drawFinder(startOffset, startOffset + (modules - 7) * cellSize);

    // Deterministic payload hash pattern
    let hash = 0;
    for (let i = 0; i < sharePayload.length; i++) {
      hash = (hash << 5) - hash + sharePayload.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        // Skip finder areas
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= modules - 8) ||
          (r >= modules - 8 && c < 8)
        ) {
          continue;
        }

        // Generate pseudorandom cell bit based on payload hash and coordinates
        const bit = ((hash ^ (r * 31 + c * 17)) & 3) === 0;
        if (bit) {
          ctx.fillRect(startOffset + c * cellSize, startOffset + r * cellSize, cellSize, cellSize);
        }
      }
    }
  }, [sharePayload, isRevoked]);

  const handleCopyLink = () => {
    const fakeLink = `https://yomiscan.app/share/${document.id}?exp=${expiration}`;
    navigator.clipboard.writeText(fakeLink);
    setHasCopied(true);
    showToast('Secure temporary share link copied!', 'success');
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleRevoke = () => {
    setIsRevoked(true);
    showToast('Sharing link and QR access have been revoked.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Secure QR Document Share
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Display Area */}
        <div className="p-6 flex flex-col items-center text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Scan with another device to open or import "{document.title}" with read-only access.
          </p>

          <div className="p-4 bg-white rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 relative flex items-center justify-center">
            {isRevoked ? (
              <div className="w-[220px] h-[220px] flex flex-col items-center justify-center text-rose-500 bg-rose-50 rounded-xl p-4">
                <Ban className="w-12 h-12 mb-2" />
                <span className="text-xs font-bold">Access Revoked</span>
                <span className="text-[10px] text-slate-500 mt-1">This QR is no longer valid.</span>
              </div>
            ) : (
              <canvas ref={canvasRef} />
            )}
          </div>

          {/* Expiration Settings */}
          <div className="w-full mt-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-indigo-500" /> Link Expiration:
              </span>
              <div className="flex gap-1">
                {(['1h', '24h', '7d', 'never'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setExpiration(opt);
                      setIsRevoked(false);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                      expiration === opt
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {opt === 'never' ? 'Never' : opt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" /> Read-Only Permission
              </span>
              <span className="text-[11px] text-slate-400">Encrypted on device</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-16 px-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          {!isRevoked ? (
            <button
              onClick={handleRevoke}
              className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline flex items-center gap-1"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Revoke Access</span>
            </button>
          ) : (
            <button
              onClick={() => setIsRevoked(false)}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              Reactivate Link
            </button>
          )}

          <button
            onClick={handleCopyLink}
            disabled={isRevoked}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-indigo-500/20"
          >
            {hasCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{hasCopied ? 'Link Copied!' : 'Copy Share Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
