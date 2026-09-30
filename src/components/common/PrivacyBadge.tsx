import React, { useEffect, useState } from 'react';
import { ShieldCheck, Cloud, RefreshCw } from 'lucide-react';
import { privacyBus, PrivacyStatus } from '../../services/aiService';

export const PrivacyBadge: React.FC = () => {
  const [status, setStatus] = useState<PrivacyStatus>({ inProgress: false });

  useEffect(() => {
    return privacyBus.subscribe(setStatus);
  }, []);

  if (status.inProgress) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse shadow-sm"
        title="External AI operation in progress (secure transmission upon user request)"
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span className="truncate max-w-[130px]">{status.task || 'AI Processing...'}</span>
      </div>
    );
  }

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
      title="Local-first architecture: documents stay private on your device"
    >
      <ShieldCheck className="w-3.5 h-3.5" />
      <span>Local-First Private</span>
    </div>
  );
};
