/**
 * WebAssembly Hook
 *
 * 职责：加载和管理 WebAssembly 模块，提供高性能计算能力
 */

import { useEffect, useState, useCallback, useRef } from 'react';

// WASM 模块类型
interface WasmModule {
  parse_markdown: (markdown: string) => ParseResult;
  parse_markdown_with_options: (
    markdown: string,
    enableTables: boolean,
    enableStrikethrough: boolean,
    enableTasklists: boolean
  ) => ParseResult;
  batch_parse_markdown: (markdowns: string[]) => Promise<ParseResult[]>;
  get_word_count: (markdown: string) => number;
  get_reading_time: (markdown: string, wordsPerMinute?: number) => number;
  extract_headings: (markdown: string) => Promise<Array<[number, string]>>;
}

interface ParseResult {
  html: string;
  success: boolean;
  error: string;
}

interface WasmState {
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
  module: WasmModule | null;
}

/**
 * WebAssembly Hook
 */
export function useWasm(): WasmState & {
  parseMarkdown: (markdown: string) => ParseResult | null;
  parseMarkdownAsync: (markdown: string) => Promise<ParseResult | null>;
  getWordCount: (markdown: string) => number | null;
  getReadingTime: (markdown: string, wordsPerMinute?: number) => number | null;
} {
  const [state, setState] = useState<WasmState>({
    isLoading: false,
    isReady: false,
    error: null,
    module: null,
  });

  const moduleRef = useRef<WasmModule | null>(null);

  // 加载 WASM 模块
  useEffect(() => {
    let isMounted = true;

    const loadWasm = async () => {
      // 检查是否支持 WebAssembly
      if (!WebAssembly.supported) {
        setState({
          isLoading: false,
          isReady: false,
          error: new Error('WebAssembly is not supported in this browser'),
          module: null,
        });
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        // 动态导入 WASM 模块
        const wasmModule = await import('../../wasm/markdown-parser/pkg');

        if (!isMounted) return;

        moduleRef.current = wasmModule as unknown as WasmModule;

        setState({
          isLoading: false,
          isReady: true,
          error: null,
          module: moduleRef.current,
        });

        console.log('[WASM] Module loaded successfully');
      } catch (error) {
        console.error('[WASM] Failed to load module:', error);

        if (!isMounted) return;

        setState({
          isLoading: false,
          isReady: false,
          error: error instanceof Error ? error : new Error('Failed to load WASM module'),
          module: null,
        });
      }
    };

    loadWasm();

    return () => {
      isMounted = false;
    };
  }, []);

  // 解析 Markdown
  const parseMarkdown = useCallback((markdown: string): ParseResult | null => {
    if (!moduleRef.current) {
      return null;
    }

    try {
      const result = moduleRef.current.parse_markdown(markdown);
      return {
        html: result.html,
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      console.error('[WASM] Parse error:', error);
      return null;
    }
  }, []);

  // 异步解析 Markdown
  const parseMarkdownAsync = useCallback(
    async (markdown: string): Promise<ParseResult | null> => {
      if (!moduleRef.current) {
        return null;
      }

      try {
        // 使用 setTimeout 避免阻塞主线程
        return await new Promise((resolve) => {
          setTimeout(() => {
            const result = moduleRef.current?.parse_markdown(markdown);
            resolve(
              result
                ? {
                    html: result.html,
                    success: result.success,
                    error: result.error,
                  }
                : null
            );
          }, 0);
        });
      } catch (error) {
        console.error('[WASM] Parse error:', error);
        return null;
      }
    },
    []
  );

  // 获取字数
  const getWordCount = useCallback((markdown: string): number | null => {
    if (!moduleRef.current) {
      return null;
    }

    try {
      return moduleRef.current.get_word_count(markdown);
    } catch (error) {
      console.error('[WASM] Word count error:', error);
      return null;
    }
  }, []);

  // 获取阅读时间
  const getReadingTime = useCallback(
    (markdown: string, wordsPerMinute?: number): number | null => {
      if (!moduleRef.current) {
        return null;
      }

      try {
        return moduleRef.current.get_reading_time(markdown, wordsPerMinute);
      } catch (error) {
        console.error('[WASM] Reading time error:', error);
        return null;
      }
    },
    []
  );

  return {
    ...state,
    parseMarkdown,
    parseMarkdownAsync,
    getWordCount,
    getReadingTime,
  };
}

/**
 * 使用 WASM Markdown 解析器（带缓存）
 */
export function useWasmMarkdownParser() {
  const wasm = useWasm();
  const cacheRef = useRef<Map<string, string>>(new Map());

  const parseMarkdown = useCallback(
    async (markdown: string): Promise<string> => {
      // 检查缓存
      const cached = cacheRef.current.get(markdown);
      if (cached) {
        return cached;
      }

      // WASM 可用时使用 WASM
      if (wasm.isReady) {
        const result = await wasm.parseMarkdownAsync(markdown);
        if (result?.success) {
          cacheRef.current.set(markdown, result.html);
          return result.html;
        }
      }

      // 降级到 JS 解析
      // 这里可以调用 JS 的 markdown 解析器
      console.warn('[WASM] Falling back to JS parser');
      return markdown;
    },
    [wasm]
  );

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    parseMarkdown,
    clearCache,
    isReady: wasm.isReady,
    isLoading: wasm.isLoading,
  };
}

export default useWasm;
