/**
 * 瀹夊叏浣跨敤 Object URL 鐨?Hook
 * 
 * 鑱岃矗锛氳嚜鍔ㄧ鐞?URL.createObjectURL 鍜?URL.revokeObjectURL
 * 闃叉鍐呭瓨娉勬紡
 */

import { useEffect, useRef, useCallback } from 'react';

interface ObjectURLManager {
  create: (blob: Blob) => string;
  revoke: (url: string) => void;
  revokeAll: () => void;
}

/**
 * 瀹夊叏浣跨敤 Object URL
 * 缁勪欢鍗歌浇鏃惰嚜鍔ㄩ噴鏀炬墍鏈夊垱寤虹殑 URL
 */
export function useObjectURL(): ObjectURLManager {
  const urlsRef = useRef<Set<string>>(new Set());

  // 鍒涘缓 Object URL
  const create = useCallback((blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  }, []);

  // 閲婃斁鎸囧畾 URL
  const revoke = useCallback((url: string): void => {
    if (urlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      urlsRef.current.delete(url);
    }
  }, []);

  // 閲婃斁鎵€鏈?URL
  const revokeAll = useCallback((): void => {
    urlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    urlsRef.current.clear();
  }, []);

  // 缁勪欢鍗歌浇鏃惰嚜鍔ㄩ噴鏀炬墍鏈?URL
  useEffect(() => {
    return () => {
      revokeAll();
    };
  }, [revokeAll]);

  return { create, revoke, revokeAll };
}

/**
 * 涓哄崟涓枃浠跺垱寤?Object URL
 * 缁勪欢鍗歌浇鏃惰嚜鍔ㄩ噴鏀? */
export function useFileObjectURL(file: File | null | undefined): string | null {
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (file) {
      // 鍒涘缓鏂扮殑 URL
      urlRef.current = URL.createObjectURL(file);
    }

    // 娓呯悊鍑芥暟
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [file]);

  return urlRef.current;
}

