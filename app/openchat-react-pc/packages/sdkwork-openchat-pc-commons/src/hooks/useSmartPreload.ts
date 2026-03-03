/**
 * 鏅鸿兘棰勫姞杞界瓥鐣?Hook
 * 
 * 鑱岃矗锛氬熀浜庣敤鎴疯涓洪娴嬶紝鏅鸿兘棰勫姞杞借祫婧? * 搴旂敤锛氳矾鐢遍鍔犺浇銆佸浘鐗囬鍔犺浇銆佹暟鎹鍙? * 
 * 绠楁硶锛? * - 椹皵鍙か閾鹃娴? * - 鍗忓悓杩囨护鎺ㄨ崘
 * - 鏃堕棿搴忓垪鍒嗘瀽
 */

import { useCallback, useRef, useEffect, useState } from 'react';

// 鐢ㄦ埛琛屼负绫诲瀷
enum UserAction {
  NAVIGATE = 'navigate',
  HOVER = 'hover',
  SCROLL = 'scroll',
  CLICK = 'click',
  FOCUS = 'focus',
}

// 琛屼负璁板綍
interface BehaviorRecord {
  action: UserAction;
  target: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

// 杞Щ姒傜巼
interface TransitionProbability {
  from: string;
  to: string;
  probability: number;
  count: number;
}

// 棰勫姞杞介厤缃?interface PreloadConfig {
  threshold: number;      // 棰勫姞杞介槇鍊兼鐜?  maxConcurrent: number;  // 鏈€澶у苟鍙戦鍔犺浇
  timeout: number;        // 棰勫姞杞借秴鏃?  priority: 'high' | 'low' | 'auto';
}

/**
 * 椹皵鍙か閾鹃娴嬪櫒
 */
class MarkovChainPredictor {
  private transitions: Map<string, Map<string, number>> = new Map();
  private totalTransitions: Map<string, number> = new Map();

  /**
   * 璁板綍杞Щ
   */
  recordTransition(from: string, to: string): void {
    if (!this.transitions.has(from)) {
      this.transitions.set(from, new Map());
      this.totalTransitions.set(from, 0);
    }

    const fromMap = this.transitions.get(from)!;
    fromMap.set(to, (fromMap.get(to) || 0) + 1);
    this.totalTransitions.set(from, (this.totalTransitions.get(from) || 0) + 1);
  }

  /**
   * 棰勬祴涓嬩竴涓姸鎬?   */
  predictNext(current: string, topN: number = 3): Array<{ state: string; probability: number }> {
    const fromMap = this.transitions.get(current);
    const total = this.totalTransitions.get(current) || 0;

    if (!fromMap || total === 0) {
      return [];
    }

    const probabilities: Array<{ state: string; probability: number }> = [];

    fromMap.forEach((count, state) => {
      probabilities.push({
        state,
        probability: count / total,
      });
    });

    return probabilities
      .sort((a, b) => b.probability - a.probability)
      .slice(0, topN);
  }

  /**
   * 鑾峰彇杞Щ鐭╅樀
   */
  getTransitionMatrix(): Record<string, Record<string, number>> {
    const matrix: Record<string, Record<string, number>> = {};

    this.transitions.forEach((toMap, from) => {
      matrix[from] = {};
      const total = this.totalTransitions.get(from) || 1;
      toMap.forEach((count, to) => {
        matrix[from][to] = count / total;
      });
    });

    return matrix;
  }
}

/**
 * 鏅鸿兘棰勫姞杞界鐞嗗櫒
 */
class SmartPreloadManager {
  private predictor = new MarkovChainPredictor();
  private behaviorHistory: BehaviorRecord[] = [];
  private preloadedResources = new Set<string>();
  private loadingResources = new Map<string, AbortController>();
  private config: PreloadConfig;

  constructor(config: Partial<PreloadConfig> = {}) {
    this.config = {
      threshold: 0.3,
      maxConcurrent: 3,
      timeout: 5000,
      priority: 'auto',
      ...config,
    };
  }

  /**
   * 璁板綍鐢ㄦ埛琛屼负
   */
  recordBehavior(action: UserAction, target: string, context?: Record<string, unknown>): void {
    const record: BehaviorRecord = {
      action,
      target,
      timestamp: Date.now(),
      context,
    };

    this.behaviorHistory.push(record);

    // 淇濇寔鏈€杩?100 鏉¤褰?    if (this.behaviorHistory.length > 100) {
      this.behaviorHistory.shift();
    }

    // 濡傛灉鏄鑸涓猴紝璁板綍杞Щ
    if (action === UserAction.NAVIGATE && this.behaviorHistory.length > 1) {
      const prevRecord = this.behaviorHistory[this.behaviorHistory.length - 2];
      if (prevRecord.action === UserAction.NAVIGATE) {
        this.predictor.recordTransition(prevRecord.target, target);
      }
    }

    // 瑙﹀彂棰勫姞杞介娴?    this.predictAndPreload(target);
  }

  /**
   * 棰勬祴骞堕鍔犺浇
   */
  private predictAndPreload(current: string): void {
    const predictions = this.predictor.predictNext(current, 3);

    predictions.forEach(({ state, probability }) => {
      if (probability >= this.config.threshold) {
        this.preload(state, probability);
      }
    });
  }

  /**
   * 棰勫姞杞借祫婧?   */
  preload(url: string, priority: number = 0.5): void {
    // 宸查鍔犺浇鎴栨鍦ㄥ姞杞?    if (this.preloadedResources.has(url) || this.loadingResources.has(url)) {
      return;
    }

    // 妫€鏌ュ苟鍙戞暟
    if (this.loadingResources.size >= this.config.maxConcurrent) {
      // 绉婚櫎鏈€浣庝紭鍏堢骇鐨勯鍔犺浇
      const lowestPriority = Array.from(this.loadingResources.entries())
        .sort((a, b) => (a[1] as any).priority - (b[1] as any).priority)[0];
      
      if (lowestPriority) {
        this.cancelPreload(lowestPriority[0]);
      }
    }

    const controller = new AbortController();
    this.loadingResources.set(url, controller);

    // 鏍规嵁浼樺厛绾ч€夋嫨棰勫姞杞芥柟寮?    const preloadPriority = this.config.priority === 'auto'
      ? (priority > 0.7 ? 'high' : 'low')
      : this.config.priority;

    this.executePreload(url, controller.signal, preloadPriority)
      .then(() => {
        this.preloadedResources.add(url);
        console.log(`[SmartPreload] Preloaded: ${url}`);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.warn(`[SmartPreload] Failed to preload: ${url}`, error);
        }
      })
      .finally(() => {
        this.loadingResources.delete(url);
      });
  }

  /**
   * 鎵ц棰勫姞杞?   */
  private async executePreload(
    url: string,
    signal: AbortSignal,
    priority: 'high' | 'low'
  ): Promise<void> {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    
    if ('fetchPriority' in link) {
      (link as any).fetchPriority = priority;
    }

    document.head.appendChild(link);

    // 浣跨敤 fetch 杩涜瀹為檯棰勫姞杞?    const timeoutId = setTimeout(() => {
      // 瓒呮椂鍙栨秷
    }, this.config.timeout);

    try {
      await fetch(url, {
        signal,
        priority: priority === 'high' ? 'high' : 'low',
      });
    } finally {
      clearTimeout(timeoutId);
      link.remove();
    }
  }

  /**
   * 鍙栨秷棰勫姞杞?   */
  cancelPreload(url: string): void {
    const controller = this.loadingResources.get(url);
    if (controller) {
      controller.abort();
      this.loadingResources.delete(url);
    }
  }

  /**
   * 棰勫姞杞借矾鐢辩粍浠?   */
  preloadComponent(componentPath: string): void {
    this.preload(componentPath, 0.8);
  }

  /**
   * 棰勫姞杞藉浘鐗?   */
  preloadImage(imageUrl: string): void {
    if (this.preloadedResources.has(imageUrl)) return;

    const img = new Image();
    img.src = imageUrl;
    
    img.onload = () => {
      this.preloadedResources.add(imageUrl);
    };
  }

  /**
   * 棰勫姞杞芥暟鎹?   */
  async preloadData<T>(
    key: string,
    fetcher: () => Promise<T>,
    cache: Map<string, T>
  ): Promise<void> {
    if (cache.has(key)) return;

    try {
      const data = await fetcher();
      cache.set(key, data);
      this.preloadedResources.add(key);
    } catch (error) {
      console.warn(`[SmartPreload] Failed to preload data: ${key}`, error);
    }
  }

  /**
   * 鑾峰彇棰勬祴缁撴灉
   */
  getPredictions(current: string): Array<{ state: string; probability: number }> {
    return this.predictor.predictNext(current, 5);
  }

  /**
   * 鑾峰彇缁熻淇℃伅
   */
  getStats() {
    return {
      behaviorCount: this.behaviorHistory.length,
      preloadedCount: this.preloadedResources.size,
      loadingCount: this.loadingResources.size,
      transitionMatrix: this.predictor.getTransitionMatrix(),
    };
  }

  /**
   * 娓呯┖鍘嗗彶
   */
  clear(): void {
    this.behaviorHistory = [];
    this.preloadedResources.clear();
    this.loadingResources.forEach((controller) => controller.abort());
    this.loadingResources.clear();
  }
}

// 鍏ㄥ眬棰勫姞杞界鐞嗗櫒
let preloadManager: SmartPreloadManager | null = null;

/**
 * 鑾峰彇棰勫姞杞界鐞嗗櫒
 */
export function getPreloadManager(): SmartPreloadManager {
  if (!preloadManager) {
    preloadManager = new SmartPreloadManager();
  }
  return preloadManager;
}

/**
 * 浣跨敤鏅鸿兘棰勫姞杞? */
export function useSmartPreload(config?: Partial<PreloadConfig>) {
  const manager = useRef(new SmartPreloadManager(config));
  const [predictions, setPredictions] = useState<Array<{ state: string; probability: number }>>([]);

  /**
   * 璁板綍瀵艰埅琛屼负
   */
  const recordNavigation = useCallback((from: string, to: string) => {
    manager.current.recordBehavior(UserAction.NAVIGATE, to, { from });
    setPredictions(manager.current.getPredictions(to));
  }, []);

  /**
   * 璁板綍鎮仠琛屼负
   */
  const recordHover = useCallback((target: string) => {
    manager.current.recordBehavior(UserAction.HOVER, target);
    
    // 鎮仠鏃堕鍔犺浇
    const predictions = manager.current.getPredictions(target);
    predictions.forEach(({ state, probability }) => {
      if (probability > 0.5) {
        manager.current.preloadComponent(state);
      }
    });
  }, []);

  /**
   * 鎵嬪姩棰勫姞杞?   */
  const preload = useCallback((url: string, priority?: number) => {
    manager.current.preload(url, priority);
  }, []);

  /**
   * 鑾峰彇缁熻
   */
  const getStats = useCallback(() => {
    return manager.current.getStats();
  }, []);

  return {
    recordNavigation,
    recordHover,
    preload,
    predictions,
    getStats,
  };
}

/**
 * 浣跨敤璺敱棰勫姞杞? */
export function useRoutePreload() {
  const { recordNavigation, recordHover, predictions } = useSmartPreload();

  /**
   * 棰勫姞杞介娴嬬殑璺敱
   */
  useEffect(() => {
    predictions.forEach(({ state, probability }) => {
      if (probability > 0.4) {
        // 鍔ㄦ€佸鍏ヨ矾鐢辩粍浠?        import(/* @vite-ignore */ state).catch(() => {
          // 蹇界暐棰勫姞杞介敊璇?        });
      }
    });
  }, [predictions]);

  return {
    recordNavigation,
    recordHover,
    predictions,
  };
}

/**
 * 浣跨敤鍥剧墖鏅鸿兘棰勫姞杞? */
export function useSmartImagePreload(imageUrls: string[]) {
  const manager = useRef(new SmartPreloadManager());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 鍒嗘壒棰勫姞杞藉浘鐗?    const preloadBatch = async () => {
      for (const url of imageUrls) {
        if (!loadedImages.has(url)) {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              setLoadedImages((prev) => new Set([...prev, url]));
              resolve();
            };
            img.onerror = () => resolve();
            img.src = url;
          });
        }
      }
    };

    preloadBatch();
  }, [imageUrls]);

  return { loadedImages };
}

export default useSmartPreload;

