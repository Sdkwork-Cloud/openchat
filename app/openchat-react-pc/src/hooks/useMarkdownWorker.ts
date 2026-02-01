/**
 * Markdown Worker Hook
 *
 * 职责：管理 Web Worker 实例，提供异步 Markdown 解析
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
 * 使用 Markdown Worker 解析内容
 */
export function useMarkdownWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, (result: ParseResult) => void>>(new Map());
  const [isReady, setIsReady] = useState(false);

  // 初始化 Worker
  useEffect(() => {
    try {
      // 创建 Worker
      workerRef.current = new Worker(
        new URL('../workers/markdown.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // 处理 Worker 消息
      workerRef.current.onmessage = (event: MessageEvent) => {
        const { id, result, error, success } = event.data;
        const resolver = pendingRef.current.get(id);

        if (resolver) {
          resolver({ result, error, success });
          pendingRef.current.delete(id);
        }
      };

      // 处理 Worker 错误
      workerRef.current.onerror = (error) => {
        console.error('Markdown Worker error:', error);
      };

      setIsReady(true);

      // 清理
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
   * 解析 Markdown
   */
  const parseMarkdown = useCallback(
    async (content: string, type: 'full' | 'chunks' = 'full'): Promise<ParseResult> => {
      if (!workerRef.current || !isReady) {
        // Worker 未就绪，返回原始内容
        return {
          result: content,
          success: true,
        };
      }

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return new Promise((resolve) => {
        // 存储 resolver
        pendingRef.current.set(id, resolve);

        // 发送解析请求
        workerRef.current?.postMessage({
          id,
          content,
          type,
        });

        // 超时处理
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
 * 使用缓存的 Markdown 解析
 */
export function useCachedMarkdownWorker() {
  const { parseMarkdown, isReady } = useMarkdownWorker();
  const cacheRef = useRef<Map<string, string | string[]>>(new Map());

  const parseMarkdownCached = useCallback(
    async (content: string, type: 'full' | 'chunks' = 'full'): Promise<ParseResult> => {
      // 检查缓存
      const cached = cacheRef.current.get(content);
      if (cached) {
        return {
          result: cached,
          success: true,
        };
      }

      // 解析并缓存
      const result = await parseMarkdown(content, type);
      if (result.success && result.result) {
        cacheRef.current.set(content, result.result);

        // LRU 清理：最多缓存 100 条
        if (cacheRef.current.size > 100) {
          const firstKey = cacheRef.current.keys().next().value;
          cacheRef.current.delete(firstKey);
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
