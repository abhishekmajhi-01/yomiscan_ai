import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Lock,
  Cloud,
  Database,
  Languages,
  Sliders,
  Trash2,
  X,
  Check,
  RefreshCw,
  AlertTriangle,
  Fingerprint,
  ShieldCheck,
} from 'lucide-react';
import { AppSettings, ScanMode } from '../../types/document';
import { storageService } from '../../services/storage';
import { SUPPORTED_OCR_LANGUAGES } from '../../services/ocrEngine';
import { PermissionsTab } from './PermissionsTab';
import { useToast } from '../common/Toast';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClearCache: () => void;
  onEmptyTrash: () => void;
  onWipeData: () => void;
  onClose: () => void;
  onOpenMobileStorageModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClearCache,
  onEmptyTrash,
  onWipeData,
  onClose,
  onOpenMobileStorageModal,
}) => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    'general' | 'ocr' | 'privacy' | 'security' | 'permissions' | 'storage' | 'backup'
  >('general');

  const [pinInput, setPinInput] = useState<string>(settings.pinCode || '1234');
  const [showPinPrompt, setShowPinPrompt] = useState<boolean>(false);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '12.4 MB';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSavePin = () => {
    if (pinInput.length === 4) {
      onUpdateSettings({ pinCode: pinInput, pinLockEnabled: true });
      setShowPinPrompt(false);
      showToast('PIN code updated and enabled!', 'success');
    } else {
      showToast('PIN must be exactly 4 digits.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full h-[85vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Settings & Preferences
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector Nav */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-1.5 gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'general', label: 'General', icon: Sliders },
            { id: 'ocr', label: 'OCR', icon: Languages },
            { id: 'privacy', label: 'Privacy', icon: Shield },
            { id: 'security', label: 'Security', icon: Lock },
            { id: 'permissions', label: 'Permissions', icon: ShieldCheck },
            { id: 'storage', label: 'Data', icon: Database },
            { id: 'backup', label: 'Cloud Backup', icon: Cloud },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              {/* Theme */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Theme Appearance
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => onUpdateSettings({ theme: t })}
                      className={`py-2 rounded-xl border text-xs font-semibold capitalize transition-all ${
                        settings.theme === t
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Scan Mode */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Default Camera Scan Mode
                </label>
                <select
                  value={settings.defaultScanMode}
                  onChange={(e) => onUpdateSettings({ defaultScanMode: e.target.value as ScanMode })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="document">Document (General)</option>
                  <option value="idcard">ID Card (Dual-Sided)</option>
                  <option value="receipt">Receipt (Structured Amounts)</option>
                  <option value="businesscard">Business Card (Contact)</option>
                </select>
              </div>

              {/* Default PDF Quality */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  Default PDF Export Quality
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['high', 'medium', 'small'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => onUpdateSettings({ defaultPdfQuality: q })}
                      className={`py-2 rounded-xl border text-xs font-semibold capitalize transition-all ${
                        settings.defaultPdfQuality === q
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {q === 'high' ? 'High (Crisp)' : q === 'medium' ? 'Medium' : 'Small (Fast)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto File Naming */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Smart Semantic File Naming
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Automatically suggests names like "Electricity_Bill_Sep_2026.pdf" based on content.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoSuggestFilename}
                  onChange={(e) => onUpdateSettings({ autoSuggestFilename: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-0"
                />
              </div>
            </div>
          )}

          {/* 2. OCR Languages */}
          {activeTab === 'ocr' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Target OCR Languages
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Select default languages for optical character recognition. Hindi and Telugu dictionaries are fully supported.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {SUPPORTED_OCR_LANGUAGES.map((lang) => {
                    const isChecked = settings.ocrLanguages.includes(lang.name);
                    return (
                      <label
                        key={lang.code}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let next = [...settings.ocrLanguages];
                            if (e.target.checked) next.push(lang.name);
                            else next = next.filter((l) => l !== lang.name);
                            onUpdateSettings({ ocrLanguages: next });
                          }}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span className="text-xs font-semibold">
                          {lang.name} ({lang.native})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3. Privacy Settings */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <div className="flex items-center gap-2 mb-2 text-emerald-800 dark:text-emerald-300">
                  <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-sm font-bold">Local-First Architecture</h4>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400/90 leading-relaxed">
                  Your scanned documents, images, signatures, and personal information are stored exclusively inside your browser's private database. No documents are uploaded silently.
                </p>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Local Processing Only Mode
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Disables all external AI features completely. Only offline algorithms will run.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.localProcessingOnly}
                  onChange={(e) => onUpdateSettings({ localProcessingOnly: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-0"
                />
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Privacy Indicator
                </span>
                Whenever an operation requires calling Gemini AI for multimodal OCR, classification, or entity extraction, a prominent badge lights up in the navigation bar to keep you informed.
              </div>
            </div>
          )}

          {/* 4. Security & App Lock */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Require 4-Digit PIN to Open App
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Locks the application screen whenever it is launched or reopened.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.pinLockEnabled}
                  onChange={(e) => onUpdateSettings({ pinLockEnabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-0"
                />
              </div>

              {settings.pinLockEnabled && (
                <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Current PIN: ****
                    </span>
                    <p className="text-[11px] text-slate-500">Click to change 4-digit passcode</p>
                  </div>
                  <button
                    onClick={() => setShowPinPrompt(true)}
                    className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                  >
                    Change PIN
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-indigo-500" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Allow Biometric Unlock (Touch / Face ID)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Use device fingerprint sensor to bypass PIN entry.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.biometricsEnabled}
                  onChange={(e) => onUpdateSettings({ biometricsEnabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-0"
                />
              </div>

              {showPinPrompt && (
                <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Enter New 4-Digit PIN:
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="4 digits"
                    className="w-full px-3 py-2 text-center tracking-widest text-base font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 mb-3"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowPinPrompt(false)}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePin}
                      className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                    >
                      Save PIN
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Permissions Center (Section 54) */}
          {activeTab === 'permissions' && (
            <PermissionsTab
              isCloudConnected={settings.cloudBackupEnabled}
              onOpenMobileStorageModal={onOpenMobileStorageModal}
            />
          )}

          {/* 5. Data Management */}
          {activeTab === 'storage' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Data & Cache Maintenance
                </h3>
                <p className="text-[11px] text-slate-500">
                  Manage local document databases, thumbnails, and cache files.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={onClearCache}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 flex items-center justify-between text-xs text-left"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Clear Temporary Files & Cache
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Releases transient processing canvases and optimizes thumbnail sizes.
                    </span>
                  </div>
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={onEmptyTrash}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-300 flex items-center justify-between text-xs text-left text-rose-600"
                >
                  <div>
                    <span className="font-bold block">Empty Trash</span>
                    <span className="text-[11px] text-slate-400">
                      Permanently wipes all deleted documents from trash.
                    </span>
                  </div>
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  onClick={onWipeData}
                  className="w-full p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 flex items-center justify-between text-xs text-left"
                >
                  <div>
                    <span className="font-bold block">Wipe All App Data</span>
                    <span className="text-[11px] text-rose-600/80">
                      Factory reset: erases all documents, folders, signatures, and settings.
                    </span>
                  </div>
                  <AlertTriangle className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 6. Cloud Backup (OFF by default) */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300">
                <span className="font-bold block mb-1">Cloud Backup is OFF by default.</span>
                You must explicitly enable cloud synchronization. When disabled, zero documents ever leave your browser database.
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Enable Cloud Sync
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Synchronize documents, signatures, and folders.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.cloudBackupEnabled}
                  onChange={(e) => onUpdateSettings({ cloudBackupEnabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-0"
                />
              </div>

              {settings.cloudBackupEnabled && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      Cloud Provider:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'google_drive', name: 'Google Drive' },
                        { id: 'onedrive', name: 'OneDrive' },
                        { id: 'dropbox', name: 'Dropbox' },
                      ].map((cp) => (
                        <button
                          key={cp.id}
                          onClick={() => onUpdateSettings({ cloudProvider: cp.id as any })}
                          className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                            settings.cloudProvider === cp.id
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {cp.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Automatic Sync on Scan
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.autoCloudBackup}
                      onChange={(e) => onUpdateSettings({ autoCloudBackup: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                  </div>

                  <button
                    onClick={() => showToast('Cloud sync completed! All documents are up to date.', 'success')}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync All Documents Now</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
