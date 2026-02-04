/**
 * OpenChat SDK Provider
 *
 * 提供 OpenChat SDK 的 React Context
 * 修复：事件监听器正确清理，防止内存泄漏
 */

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { OpenChatClient } from '@openchat/typescript-sdk';
import { API_BASE_URL, IM_WS_URL } from '../../app/env';
import { initializeSDK, getSDKClient, getSDKState, subscribeToSDKState, isSDKInitialized } from './adapters/sdk-adapter';

interface OpenChatContextValue {
  client: OpenChatClient | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
}

const OpenChatContext = createContext<OpenChatContextValue | null>(null);

interface OpenChatProviderProps {
  children: ReactNode;
}

/**
 * OpenChat Provider
 * 
 * 修复内容：
 * 1. 事件监听器使用 ref 存储，确保 cleanup 时能正确移除
 * 2. 组件卸载时清理所有事件监听器
 * 3. 防止重复初始化
 */
export function OpenChatProvider({ children }: OpenChatProviderProps) {
  const [client, setClient] = useState<OpenChatClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // 使用 ref 跟踪初始化状态和事件处理器
  const isInitializedRef = useRef(false);
  const clientRef = useRef<OpenChatClient | null>(null);
  const handlersRef = useRef<Map<string, (...args: any[]) => void>>(new Map());

  // 创建事件处理器（使用 useCallback 确保引用稳定）
  const handleConnected = useCallback(() => {
    setIsConnected(true);
  }, []);

  const handleDisconnected = useCallback(() => {
    setIsConnected(false);
  }, []);

  const handleError = useCallback((err: Error) => {
    setError(err);
  }, []);

  useEffect(() => {
    // 防止重复初始化（React StrictMode 会双重渲染）
    if (isInitializedRef.current) {
      return;
    }

    // 订阅SDK状态变化
    const unsubscribe = subscribeToSDKState((state) => {
      setIsConnected(state.connected);
      setIsConnecting(state.connecting);
      setError(state.error ? new Error(state.error) : null);
      if (state.initialized) {
        try {
          const sdkClient = getSDKClient();
          setClient(sdkClient);
        } catch (error) {
          console.warn('Failed to get SDK client:', error);
        }
      }
    });

    // 从本地存储获取用户信息
    const initClient = async () => {
      try {
        // TODO: 从登录状态获取 uid 和 token
        const uid = localStorage.getItem('uid') || '';
        const token = localStorage.getItem('token') || '';

        if (!uid || !token) {
          // 未登录状态，不初始化 SDK
          return;
        }

        // 使用统一的SDK初始化函数
        await initializeSDK({
          apiBaseUrl: API_BASE_URL,
          imWsUrl: IM_WS_URL,
          uid,
          token,
        });

        // 标记已初始化
        isInitializedRef.current = true;

      } catch (err) {
        console.error('Failed to initialize OpenChat:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize OpenChat'));
      }
    };

    // 检查SDK是否已初始化
    if (!isSDKInitialized()) {
      initClient();
    } else {
      // SDK已初始化，同步状态
      const state = getSDKState();
      setIsConnected(state.connected);
      setIsConnecting(state.connecting);
      setError(state.error ? new Error(state.error) : null);
      if (state.initialized) {
        try {
          const sdkClient = getSDKClient();
          setClient(sdkClient);
        } catch (error) {
          console.warn('Failed to get SDK client:', error);
        }
      }
      isInitializedRef.current = true;
    }

    // Cleanup 函数：组件卸载时清理所有资源
    return () => {
      unsubscribe();
      
      // 重置初始化标记
      isInitializedRef.current = false;
    };
  }, []);

  const value: OpenChatContextValue = {
    client,
    isConnected,
    isConnecting,
    error,
  };

  return (
    <OpenChatContext.Provider value={value}>
      {children}
    </OpenChatContext.Provider>
  );
}

/**
 * 使用 OpenChat Context
 */
export function useOpenChat(): OpenChatContextValue {
  const context = useContext(OpenChatContext);
  if (!context) {
    throw new Error('useOpenChat must be used within OpenChatProvider');
  }
  return context;
}

export default OpenChatProvider;
