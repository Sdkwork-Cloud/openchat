/**
 * Service Worker Hook
 *
 * 职责：管理 Service Worker 注册、更新和消息通信
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

  // 注册 Service Worker
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

        // 监听更新
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

        // 检查是否已激活
        if (registration.active) {
          setState((prev) => ({ ...prev, offlineReady: true }));
        }
      } catch (error) {
        console.error('[SW] Registration failed:', error);
      }
    };

    registerSW();

    // 定期检查更新（每 1 小时）
    updateIntervalRef.current = setInterval(() => {
      registrationRef.current?.update();
    }, 60 * 60 * 1000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [state.isSupported]);

  /**
   * 更新 Service Worker
   */
  const updateServiceWorker = useCallback(async () => {
    if (!registrationRef.current) return;

    setState((prev) => ({ ...prev, isUpdating: true }));

    try {
      await registrationRef.current.update();

      // 如果有等待中的 worker，触发 skipWaiting
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
   * 跳过等待并刷新
   */
  const skipWaitingAndReload = useCallback(() => {
    if (!registrationRef.current?.waiting) return;

    registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });

    // 监听 controllerchange 后刷新
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, []);

  /**
   * 后台同步
   */
  const sync = useCallback(async (tag: string = 'sync-messages') => {
    if (!registrationRef.current) return false;

    try {
      await registrationRef.current.sync.register(tag);
      return true;
    } catch (error) {
      console.error('[SW] Sync registration failed:', error);
      return false;
    }
  }, []);

  /**
   * 发送消息到 Service Worker
   */
  const postMessage = useCallback((message: unknown) => {
    if (!registrationRef.current?.active) return;

    registrationRef.current.active.postMessage(message);
  }, []);

  /**
   * 获取缓存版本
   */
  const getCacheVersion = useCallback(async (): Promise<string | null> => {
    if (!registrationRef.current?.active) return null;

    return new Promise((resolve) => {
      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        resolve(event.data?.version || null);
      };

      registrationRef.current?.active.postMessage(
        { type: 'GET_VERSION' },
        [channel.port2]
      );
    });
  }, []);

  /**
   * 清理缓存
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
 * 使用网络状态
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 获取连接类型
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
 * 使用后台同步
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
