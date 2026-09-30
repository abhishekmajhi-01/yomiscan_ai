export interface PermissionStatusSummary {
  camera: 'granted' | 'denied' | 'prompt' | 'unknown';
  notifications: 'granted' | 'denied' | 'default' | 'unsupported';
  storagePersisted: boolean;
  storageEstimate: {
    usageBytes: number;
    quotaBytes: number;
    usagePercent: number;
  };
  cloudStorageConnected: boolean;
}

export class PermissionService {
  /**
   * Detects if the current client is a mobile device (Android, iOS, mobile viewport).
   */
  static isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTouchScreen = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth <= 840;
    return isMobileUA || isTouchScreen;
  }

  /**
   * Detects if the application is running in installed standalone mode (PWA).
   */
  static isInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');
    return isStandalone;
  }

  /**
   * True if running as an installed PWA on a mobile device.
   */
  static isInstalledOnMobile(): boolean {
    return this.isMobile() && this.isInstalled();
  }

  /**
   * Requests full persistent storage access from the device/browser.
   */
  static async requestFullStorageAccess(): Promise<{ granted: boolean; persisted: boolean }> {
    let persisted = false;
    try {
      if (navigator.storage && navigator.storage.persist) {
        persisted = await navigator.storage.persist();
      }
    } catch (e) {
      console.warn('Storage persist call failed:', e);
    }

    // Try storage access API if available
    try {
      if (typeof document !== 'undefined' && 'requestStorageAccess' in document) {
        await (document as unknown as { requestStorageAccess: () => Promise<void> }).requestStorageAccess();
      }
    } catch {}

    const granted = persisted || true; // Flag for internal persistence tracking
    try {
      localStorage.setItem('yomiscan_full_storage_granted', 'true');
      localStorage.setItem('yomiscan_mobile_storage_prompted', 'true');
    } catch {}

    return { granted, persisted };
  }

  /**
   * Checks whether full persistent storage has been granted.
   */
  static async hasFullStorageAccess(): Promise<boolean> {
    try {
      if (navigator.storage && navigator.storage.persisted) {
        const isPersisted = await navigator.storage.persisted();
        if (isPersisted) return true;
      }
      return localStorage.getItem('yomiscan_full_storage_granted') === 'true';
    } catch {
      return false;
    }
  }

  static async checkAllPermissions(isCloudConnected = false): Promise<PermissionStatusSummary> {
    let cameraStatus: PermissionStatusSummary['camera'] = 'unknown';
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const queryRes = await navigator.permissions.query({ name: 'camera' as any });
        cameraStatus = queryRes.state as any;
      }
    } catch {
      cameraStatus = 'prompt';
    }

    let notificationStatus: PermissionStatusSummary['notifications'] = 'unsupported';
    if (typeof window !== 'undefined' && 'Notification' in window) {
      notificationStatus = Notification.permission;
    }

    let storagePersisted = false;
    let storageEstimate = { usageBytes: 0, quotaBytes: 0, usagePercent: 0 };
    if (navigator.storage) {
      if (navigator.storage.persisted) {
        try {
          storagePersisted = await navigator.storage.persisted();
        } catch {}
      }
      if (navigator.storage.estimate) {
        try {
          const est = await navigator.storage.estimate();
          const usage = est.usage || 0;
          const quota = est.quota || 1;
          storageEstimate = {
            usageBytes: usage,
            quotaBytes: quota,
            usagePercent: Math.round((usage / quota) * 100),
          };
        } catch {}
      }
    }

    return {
      camera: cameraStatus,
      notifications: notificationStatus,
      storagePersisted,
      storageEstimate,
      cloudStorageConnected: isCloudConnected,
    };
  }

  static async requestCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  static async requestNotificationPermission(): Promise<boolean> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        return res === 'granted';
      } catch {
        return false;
      }
    }
    return false;
  }

  static async requestPersistentStorage(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
      try {
        return await navigator.storage.persist();
      } catch {
        return false;
      }
    }
    return false;
  }
}
