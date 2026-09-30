import React, { useState, useEffect } from 'react';
import {
  Camera,
  FolderOpen,
  Bell,
  Cloud,
  HardDrive,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { PermissionService, PermissionStatusSummary } from '../../services/permissionService';
import { useToast } from '../common/Toast';

interface PermissionsTabProps {
  isCloudConnected?: boolean;
  onOpenMobileStorageModal?: () => void;
}

export const PermissionsTab: React.FC<PermissionsTabProps> = ({
  isCloudConnected = false,
  onOpenMobileStorageModal,
}) => {
  const { showToast } = useToast();

  const [permissions, setPermissions] = useState<PermissionStatusSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshPermissions = async () => {
    setLoading(true);
    const summary = await PermissionService.checkAllPermissions(isCloudConnected);
    setPermissions(summary);
    setLoading(false);
  };

  useEffect(() => {
    refreshPermissions();
  }, [isCloudConnected]);

  const handleRequestCamera = async () => {
    const granted = await PermissionService.requestCameraPermission();
    if (granted) {
      showToast('Camera permission granted!', 'success');
    } else {
      showToast('Camera permission was denied. Please allow it in browser settings.', 'error');
    }
    refreshPermissions();
  };

  const handleRequestNotifications = async () => {
    const granted = await PermissionService.requestNotificationPermission();
    if (granted) {
      showToast('Notification permission granted!', 'success');
    } else {
      showToast('Notification permission not granted.', 'info');
    }
    refreshPermissions();
  };

  const handleRequestPersistentStorage = async () => {
    const persisted = await PermissionService.requestPersistentStorage();
    if (persisted) {
      showToast('Persistent storage granted! Browser will protect documents from eviction.', 'success');
    } else {
      showToast('Persistent storage request completed.', 'info');
    }
    refreshPermissions();
  };

  if (!permissions) return null;

  const formatMb = (bytes: number) => {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Hardware & Platform Permissions
          </h3>
          <p className="text-[11px] text-slate-500">
            Real permissions granted to YomiScan by your device and browser.
          </p>
        </div>
        <button
          onClick={refreshPermissions}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          title="Refresh Permissions"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-3">
        {/* Camera Permission */}
        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Camera Access
                </span>
                <span
                  className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                    permissions.camera === 'granted'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      : permissions.camera === 'denied'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {permissions.camera === 'granted'
                    ? 'Allowed'
                    : permissions.camera === 'denied'
                    ? 'Denied'
                    : 'Prompt / Ask'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Used strictly for document scanning on device.
              </p>
            </div>
          </div>

          {permissions.camera !== 'granted' && (
            <button
              onClick={handleRequestCamera}
              className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs"
            >
              Test Access
            </button>
          )}
        </div>

        {/* Photos & Files Permission */}
        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Photos & File Picker
                </span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  Allowed
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Scoped access via HTML5 File Picker and File System Access API.
              </p>
            </div>
          </div>
        </div>

        {/* Notifications Permission */}
        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Notifications
                </span>
                <span
                  className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                    permissions.notifications === 'granted'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {permissions.notifications === 'granted' ? 'Allowed' : 'Not Enabled'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Scan completion and cloud sync status alerts.
              </p>
            </div>
          </div>

          {permissions.notifications !== 'granted' && (
            <button
              onClick={handleRequestNotifications}
              className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs"
            >
              Enable
            </button>
          )}
        </div>

        {/* Cloud Storage Status */}
        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Cloud Storage
                </span>
                <span
                  className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                    permissions.cloudStorageConnected
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {permissions.cloudStorageConnected ? 'Connected' : 'Not Connected (Private)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Local-first privacy: cloud sync is off by default.
              </p>
            </div>
          </div>
        </div>

        {/* Persistent Storage Shield */}
        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Full Persistent Storage Access
                </span>
                <span
                  className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                    permissions.storagePersisted
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {permissions.storagePersisted ? 'Active (Protected)' : 'Standard Quota'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {permissions.storagePersisted
                  ? 'Device sandbox protects documents from eviction.'
                  : 'Allows full offline storage access for mobile & desktop scans.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!permissions.storagePersisted && (
              <button
                onClick={onOpenMobileStorageModal || handleRequestPersistentStorage}
                className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs"
              >
                Grant Full Access
              </button>
            )}
            {permissions.storagePersisted && onOpenMobileStorageModal && (
              <button
                onClick={onOpenMobileStorageModal}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                Details
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Browser Permission Help Box */}
      <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-300">
        <span className="font-bold block mb-1">To change camera permissions manually:</span>
        Click the lock icon (🔒) or tune icon in your browser URL bar, change "Camera" to "Allow", and refresh the tab.
      </div>
    </div>
  );
};
