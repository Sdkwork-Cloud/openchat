/**
 * Service Worker Hook
 *
 * 鑱岃矗锛氱鐞?Service Worker 娉ㄥ唽銆佹洿鏂板拰娑堟伅閫氫俊
 */

import { useEffect, useState, useCallback, useRef } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdating: boolean;
  hasUpdate: boolean;
  offlineReady: boolean;
}

/**
 * Service Worker Hook
 */
export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isUpdating: false,
    hasUpdate: false,
    offlineReady: false,
  });

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 娉ㄥ唽 Service Worker
  useEffect(() => {
    if (!state.isSupported) {
      console.log('[SW] Service Worker not supported');
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        registrationRef.current = registration;

        console.log('[SW] Registered:', registration.scope);

        setState((prev) => ({ ...prev, isRegistered: true }));

        // 鐩戝惉鏇存柊
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] New version available');
                setState((prev) => ({ ...prev, hasUpdate: true }));
              }
            });
          }
        });

        // 妫€鏌ユ槸鍚﹀凡婵€娲?        if (registration.active) {
          setState((prev) => ({ ...prev, offlineReady: true }));
        }
      } catch (error) {
        console.error('[SW] Registration failed:', error);
      }
    };

    registerSW();

    // 瀹氭湡妫€鏌ユ洿鏂帮紙姣?1 灏忔椂锛?    updateIntervalRef.current = setInterval(() => {
      registrationRef.current?.update();
    }, 60 * 60 * 1000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [state.isSupported]);

  /**
   * 鏇存柊 Service Worker
   */
  const updateServiceWorker = useCallback(async () => {
    if (!registrationRef.current) return;

    setState((prev) => ({ ...prev, isUpdating: true }));

    try {
      await registrationRef.current.update();

      // 濡傛灉鏈夌瓑寰呬腑鐨?worker锛岃Е鍙?skipWaiting
      if (registrationRef.current.waiting) {
        registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      setState((prev) => ({
        ...prev,
        isUpdating: false,
        hasUpdate: false,
      }));
    } catch (error) {
      console.error('[SW] Update failed:', error);
      setState((prev) => ({ ...prev, isUpdating: false }));
    }
  }, []);

  /**
   * 璺宠繃绛夊緟骞跺埛鏂?   */
  const skipWaitingAndReload = useCallback(() => {
    if (!registrationRef.current?.waiting) return;

    registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });

    // 鐩戝惉 controllerchange 鍚庡埛鏂?    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, []);

  /**
   * 鍚庡彴鍚屾
   */
  const sync = useCallback(async (tag: string = 'sync-messages') => {
    if (!registrationRef.current) return false;

    try {
      // @ts-ignore - sync may not be available in all browsers
      if (registrationRef.current.sync) {
        // @ts-ignore
        await registrationRef.current.sync.register(tag);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[SW] Sync registration failed:', error);
      return false;
    }
  }, []);

  /**
   * 鍙戦€佹秷鎭埌 Service Worker
   */
  const postMessage = useCallback((message: unknown) => {
    if (!registrationRef.current?.active) return;

    registrationRef.current.active?.postMessage(message);
  }, []);

  /**
   * 鑾峰彇缂撳瓨鐗堟湰
   */
  const getCacheVersion = useCallback(async (): Promise<string | null> => {
    if (!registrationRef.current?.active) return null;

    return new Promise((resolve) => {
      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        resolve(event.data?.version || null);
      };

      const activeWorker = registrationRef.current?.active;
      if (activeWorker) {
        activeWorker.postMessage(
          { type: 'GET_VERSION' },
          [channel.port2]
        );
      }
    });
  }, []);

  /**
   * 娓呯悊缂撳瓨
   */
  const clearCache = useCallback(async () => {
    postMessage({ type: 'CLEAR_CACHE' });
  }, [postMessage]);

  return {
    ...state,
    updateServiceWorker,
    skipWaitingAndReload,
    sync,
    postMessage,
    getCacheVersion,
    clearCache,
  };
}

/**
 * 浣跨敤缃戠粶鐘舵€? */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 鑾峰彇杩炴帴绫诲瀷
    const connection = (navigator as any).connection;
    if (connection) {
      setConnectionType(connection.effectiveType || 'unknown');

      connection.addEventListener('change', () => {
        setConnectionType(connection.effectiveType || 'unknown');
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionType };
}

/**
 * 浣跨敤鍚庡彴鍚屾
 */
export function useBackgroundSync() {
  const { sync } = useServiceWorker();

  const scheduleSync = useCallback(
    async (tag: string = 'sync-messages') => {
      return sync(tag);
    },
    [sync]
  );

  return { scheduleSync };
}

