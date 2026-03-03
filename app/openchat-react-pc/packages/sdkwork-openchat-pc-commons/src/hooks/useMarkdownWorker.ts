/**
 * Markdown Worker Hook
 *
 * 鑱岃矗锛氱鐞?Web Worker 瀹炰緥锛屾彁渚涘紓姝?Markdown 瑙ｆ瀽
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface ParseRequest {
  id: string;
  content: string;
  type?: 'full' | 'chunks';
}

interface ParseResult {
  result?: string | string[];
  error?: string;
  success: boolean;
}

/**
 * 浣跨敤 Markdown Worker 瑙ｆ瀽鍐呭
 */
export function useMarkdownWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, (result: ParseResult) => void>>(new Map());
  const [isReady, setIsReady] = useState(false);

  // 鍒濆鍖?Worker
  useEffect(() => {
    try {
      // 鍒涘缓 Worker
      workerRef.current = new Worker(
        new URL('../workers/markdown.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // 澶勭悊 Worker 娑堟伅
      workerRef.current.onmessage = (event: MessageEvent) => {
        const { id, result, error, success } = event.data;
        const resolver = pendingRef.current.get(id);

        if (resolver) {
          resolver({ result, error, success });
          pendingRef.current.delete(id);
        }
      };

      // 澶勭悊 Worker 閿欒
      workerRef.current.onerror = (error) => {
        console.error('Markdown Worker error:', error);
      };

      setIsReady(true);

      // 娓呯悊
      return () => {
        workerRef.current?.terminate();
        workerRef.current = null;
        pendingRef.current.clear();
      };
    } catch (error) {
      console.error('Failed to initialize Markdown Worker:', error);
      setIsReady(false);
    }
  }, []);

  /**
   * 瑙ｆ瀽 Markdown
   */
  const parseMarkdown = useCallback(
    async (content: string, type: 'full' | 'chunks' = 'full'): Promise<ParseResult> => {
      if (!workerRef.current || !isReady) {
        // Worker 鏈氨缁紝杩斿洖鍘熷鍐呭
        return {
          result: content,
          success: true,
        };
      }

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return new Promise((resolve) => {
        // 瀛樺偍 resolver
        pendingRef.current.set(id, resolve);

        // 鍙戦€佽В鏋愯姹?        workerRef.current?.postMessage({
          id,
          content,
          type,
        });

        // 瓒呮椂澶勭悊
        setTimeout(() => {
          if (pendingRef.current.has(id)) {
            pendingRef.current.delete(id);
            resolve({
              result: content,
              error: 'Parse timeout',
              success: false,
            });
          }
        }, 5000);
      });
    },
    [isReady]
  );

  return {
    parseMarkdown,
    isReady,
  };
}

/**
 * 浣跨敤缂撳瓨鐨?Markdown 瑙ｆ瀽
 */
export function useCachedMarkdownWorker() {
  const { parseMarkdown, isReady } = useMarkdownWorker();
  const cacheRef = useRef<Map<string, string | string[]>>(new Map());

  const parseMarkdownCached = useCallback(
    async (content: string, type: 'full' | 'chunks' = 'full'): Promise<ParseResult> => {
      // 妫€鏌ョ紦瀛?      const cached = cacheRef.current.get(content);
      if (cached) {
        return {
          result: cached,
          success: true,
        };
      }

      // 瑙ｆ瀽骞剁紦瀛?      const result = await parseMarkdown(content, type);
      if (result.success && result.result) {
        cacheRef.current.set(content, result.result);

        // LRU 娓呯悊锛氭渶澶氱紦瀛?100 鏉?        if (cacheRef.current.size > 100) {
          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey) {
            cacheRef.current.delete(firstKey);
          }
        }
      }

      return result;
    },
    [parseMarkdown]
  );

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    parseMarkdown: parseMarkdownCached,
    clearCache,
    isReady,
  };
}

