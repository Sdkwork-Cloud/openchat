/**
 * 安全使用 Object URL 的 Hook
 * 
 * 职责：自动管理 URL.createObjectURL 和 URL.revokeObjectURL
 * 防止内存泄漏
 */

import { useEffect, useRef, useCallback } from 'react';

interface ObjectURLManager {
  create: (blob: Blob) => string;
  revoke: (url: string) => void;
  revokeAll: () => void;
}

/**
 * 安全使用 Object URL
 * 组件卸载时自动释放所有创建的 URL
 */
export function useObjectURL(): ObjectURLManager {
  const urlsRef = useRef<Set<string>>(new Set());

  // 创建 Object URL
  const create = useCallback((blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  }, []);

  // 释放指定 URL
  const revoke = useCallback((url: string): void => {
    if (urlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      urlsRef.current.delete(url);
    }
  }, []);

  // 释放所有 URL
  const revokeAll = useCallback((): void => {
    urlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    urlsRef.current.clear();
  }, []);

  // 组件卸载时自动释放所有 URL
  useEffect(() => {
    return () => {
      revokeAll();
    };
  }, [revokeAll]);

  return { create, revoke, revokeAll };
}

/**
 * 为单个文件创建 Object URL
 * 组件卸载时自动释放
 */
export function useFileObjectURL(file: File | null | undefined): string | null {
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (file) {
      // 创建新的 URL
      urlRef.current = URL.createObjectURL(file);
    }

    // 清理函数
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [file]);

  return urlRef.current;
}
