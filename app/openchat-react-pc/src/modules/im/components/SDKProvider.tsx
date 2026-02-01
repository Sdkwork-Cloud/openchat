/**
 * SDK Provider组件
 *
 * 职责：
 * 1. 初始化OpenChat SDK
 * 2. 提供SDK上下文
 * 3. 管理连接状态
 * 4. 处理全局SDK事件
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { OpenChatClient } from '@openchat/typescript-sdk';
import { initializeSDK, destroySDK, isSDKInitialized, SDKAdapterConfig } from '../adapters/sdk-adapter';

// SDK上下文类型
interface SDKContextType {
  client: OpenChatClient | null;
  isInitialized: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  reconnect: () => Promise<void>;
}

// 创建上下文
const SDKContext = createContext<SDKContextType | undefined>(undefined);

// Provider Props
interface SDKProviderProps {
  children: ReactNode;
  config: SDKAdapterConfig;
  onInitialized?: () => void;
  onError?: (error: Error) => void;
}

/**
 * SDK Provider组件
 */
export function SDKProvider({
  children,
  config,
  onInitialized,
  onError,
}: SDKProviderProps) {
  const [client, setClient] = useState<OpenChatClient | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 初始化SDK
  const initSDK = useCallback(async () => {
    if (isSDKInitialized()) {
      console.log('SDK already initialized');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const sdkClient = await initializeSDK(config);
      setClient(sdkClient);
      setIsInitialized(true);
      setIsConnected(true);
      onInitialized?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('SDK初始化失败');
      setError(error);
      onError?.(error);
      console.error('SDK初始化失败:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [config, onInitialized, onError]);

  // 重连
  const reconnect = useCallback(async () => {
    if (isConnecting) return;

    // 先销毁旧的
    destroySDK();
    setClient(null);
    setIsInitialized(false);
    setIsConnected(false);

    // 重新初始化
    await initSDK();
  }, [initSDK, isConnecting]);

  // 组件挂载时初始化
  useEffect(() => {
    initSDK();

    // 组件卸载时清理
    return () => {
      destroySDK();
    };
  }, [initSDK]);

  // 监听连接状态变化
  useEffect(() => {
    if (!client) return;

    // 监听连接状态
    const checkConnection = setInterval(() => {
      const connected = client.isConnected();
      setIsConnected(connected);
    }, 5000);

    return () => {
      clearInterval(checkConnection);
    };
  }, [client]);

  const value: SDKContextType = {
    client,
    isInitialized,
    isConnected,
    isConnecting,
    error,
    reconnect,
  };

  return <SDKContext.Provider value={value}>{children}</SDKContext.Provider>;
}

/**
 * 使用SDK上下文的Hook
 */
export function useSDK(): SDKContextType {
  const context = useContext(SDKContext);
  if (context === undefined) {
    throw new Error('useSDK must be used within a SDKProvider');
  }
  return context;
}

/**
 * 检查SDK是否已初始化的Hook
 */
export function useSDKReady(): boolean {
  const context = useContext(SDKContext);
  return context?.isInitialized ?? false;
}

export default SDKProvider;
