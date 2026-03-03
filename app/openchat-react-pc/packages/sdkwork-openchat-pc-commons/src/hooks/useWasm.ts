/**
 * WebAssembly Hook
 *
 * 鑱岃矗锛氬姞杞藉拰绠＄悊 WebAssembly 妯″潡锛屾彁渚涢珮鎬ц兘璁＄畻鑳藉姏
 */

import { useEffect, useState, useCallback, useRef } from 'react';

// WASM 妯″潡绫诲瀷
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

  // 鍔犺浇 WASM 妯″潡
  useEffect(() => {
    let isMounted = true;

    const loadWasm = async () => {
      // 妫€鏌ユ槸鍚︽敮鎸?WebAssembly
      // @ts-ignore - WebAssembly.supported is not standard
      if (typeof WebAssembly !== 'object' || !(WebAssembly as any).supported) {
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
        // Runtime-load wasm entry. Use non-relative path to avoid package-boundary coupling.
        // @ts-ignore - WASM module may not exist in all runtimes
        const wasmModule = await import(
          /* @vite-ignore */ "/wasm/markdown-parser/pkg"
        );

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

  // 瑙ｆ瀽 Markdown
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

  // 寮傛瑙ｆ瀽 Markdown
  const parseMarkdownAsync = useCallback(
    async (markdown: string): Promise<ParseResult | null> => {
      if (!moduleRef.current) {
        return null;
      }

      try {
        // 浣跨敤 setTimeout 閬垮厤闃诲涓荤嚎绋?        return await new Promise((resolve) => {
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

  // 鑾峰彇瀛楁暟
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

  // 鑾峰彇闃呰鏃堕棿
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
 * 浣跨敤 WASM Markdown 瑙ｆ瀽鍣紙甯︾紦瀛橈級
 */
export function useWasmMarkdownParser() {
  const wasm = useWasm();
  const cacheRef = useRef<Map<string, string>>(new Map());

  const parseMarkdown = useCallback(
    async (markdown: string): Promise<string> => {
      // 妫€鏌ョ紦瀛?      const cached = cacheRef.current.get(markdown);
      if (cached) {
        return cached;
      }

      // WASM 鍙敤鏃朵娇鐢?WASM
      if (wasm.isReady) {
        const result = await wasm.parseMarkdownAsync(markdown);
        if (result?.success) {
          cacheRef.current.set(markdown, result.html);
          return result.html;
        }
      }

      // 闄嶇骇鍒?JS 瑙ｆ瀽
      // 杩欓噷鍙互璋冪敤 JS 鐨?markdown 瑙ｆ瀽鍣?      console.warn('[WASM] Falling back to JS parser');
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

