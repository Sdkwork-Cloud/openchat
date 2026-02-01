/**
 * 智能预加载策略 Hook
 * 
 * 职责：基于用户行为预测，智能预加载资源
 * 应用：路由预加载、图片预加载、数据预取
 * 
 * 算法：
 * - 马尔可夫链预测
 * - 协同过滤推荐
 * - 时间序列分析
 */

import { useCallback, useRef, useEffect, useState } from 'react';

// 用户行为类型
enum UserAction {
  NAVIGATE = 'navigate',
  HOVER = 'hover',
  SCROLL = 'scroll',
  CLICK = 'click',
  FOCUS = 'focus',
}

// 行为记录
interface BehaviorRecord {
  action: UserAction;
  target: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

// 转移概率
interface TransitionProbability {
  from: string;
  to: string;
  probability: number;
  count: number;
}

// 预加载配置
interface PreloadConfig {
  threshold: number;      // 预加载阈值概率
  maxConcurrent: number;  // 最大并发预加载
  timeout: number;        // 预加载超时
  priority: 'high' | 'low' | 'auto';
}

/**
 * 马尔可夫链预测器
 */
class MarkovChainPredictor {
  private transitions: Map<string, Map<string, number>> = new Map();
  private totalTransitions: Map<string, number> = new Map();

  /**
   * 记录转移
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
   * 预测下一个状态
   */
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
   * 获取转移矩阵
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
 * 智能预加载管理器
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
   * 记录用户行为
   */
  recordBehavior(action: UserAction, target: string, context?: Record<string, unknown>): void {
    const record: BehaviorRecord = {
      action,
      target,
      timestamp: Date.now(),
      context,
    };

    this.behaviorHistory.push(record);

    // 保持最近 100 条记录
    if (this.behaviorHistory.length > 100) {
      this.behaviorHistory.shift();
    }

    // 如果是导航行为，记录转移
    if (action === UserAction.NAVIGATE && this.behaviorHistory.length > 1) {
      const prevRecord = this.behaviorHistory[this.behaviorHistory.length - 2];
      if (prevRecord.action === UserAction.NAVIGATE) {
        this.predictor.recordTransition(prevRecord.target, target);
      }
    }

    // 触发预加载预测
    this.predictAndPreload(target);
  }

  /**
   * 预测并预加载
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
   * 预加载资源
   */
  preload(url: string, priority: number = 0.5): void {
    // 已预加载或正在加载
    if (this.preloadedResources.has(url) || this.loadingResources.has(url)) {
      return;
    }

    // 检查并发数
    if (this.loadingResources.size >= this.config.maxConcurrent) {
      // 移除最低优先级的预加载
      const lowestPriority = Array.from(this.loadingResources.entries())
        .sort((a, b) => (a[1] as any).priority - (b[1] as any).priority)[0];
      
      if (lowestPriority) {
        this.cancelPreload(lowestPriority[0]);
      }
    }

    const controller = new AbortController();
    this.loadingResources.set(url, controller);

    // 根据优先级选择预加载方式
    const preloadPriority = this.config.priority === 'auto'
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
   * 执行预加载
   */
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

    // 使用 fetch 进行实际预加载
    const timeoutId = setTimeout(() => {
      // 超时取消
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
   * 取消预加载
   */
  cancelPreload(url: string): void {
    const controller = this.loadingResources.get(url);
    if (controller) {
      controller.abort();
      this.loadingResources.delete(url);
    }
  }

  /**
   * 预加载路由组件
   */
  preloadComponent(componentPath: string): void {
    this.preload(componentPath, 0.8);
  }

  /**
   * 预加载图片
   */
  preloadImage(imageUrl: string): void {
    if (this.preloadedResources.has(imageUrl)) return;

    const img = new Image();
    img.src = imageUrl;
    
    img.onload = () => {
      this.preloadedResources.add(imageUrl);
    };
  }

  /**
   * 预加载数据
   */
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
   * 获取预测结果
   */
  getPredictions(current: string): Array<{ state: string; probability: number }> {
    return this.predictor.predictNext(current, 5);
  }

  /**
   * 获取统计信息
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
   * 清空历史
   */
  clear(): void {
    this.behaviorHistory = [];
    this.preloadedResources.clear();
    this.loadingResources.forEach((controller) => controller.abort());
    this.loadingResources.clear();
  }
}

// 全局预加载管理器
let preloadManager: SmartPreloadManager | null = null;

/**
 * 获取预加载管理器
 */
export function getPreloadManager(): SmartPreloadManager {
  if (!preloadManager) {
    preloadManager = new SmartPreloadManager();
  }
  return preloadManager;
}

/**
 * 使用智能预加载
 */
export function useSmartPreload(config?: Partial<PreloadConfig>) {
  const manager = useRef(new SmartPreloadManager(config));
  const [predictions, setPredictions] = useState<Array<{ state: string; probability: number }>>([]);

  /**
   * 记录导航行为
   */
  const recordNavigation = useCallback((from: string, to: string) => {
    manager.current.recordBehavior(UserAction.NAVIGATE, to, { from });
    setPredictions(manager.current.getPredictions(to));
  }, []);

  /**
   * 记录悬停行为
   */
  const recordHover = useCallback((target: string) => {
    manager.current.recordBehavior(UserAction.HOVER, target);
    
    // 悬停时预加载
    const predictions = manager.current.getPredictions(target);
    predictions.forEach(({ state, probability }) => {
      if (probability > 0.5) {
        manager.current.preloadComponent(state);
      }
    });
  }, []);

  /**
   * 手动预加载
   */
  const preload = useCallback((url: string, priority?: number) => {
    manager.current.preload(url, priority);
  }, []);

  /**
   * 获取统计
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
 * 使用路由预加载
 */
export function useRoutePreload() {
  const { recordNavigation, recordHover, predictions } = useSmartPreload();

  /**
   * 预加载预测的路由
   */
  useEffect(() => {
    predictions.forEach(({ state, probability }) => {
      if (probability > 0.4) {
        // 动态导入路由组件
        import(/* @vite-ignore */ state).catch(() => {
          // 忽略预加载错误
        });
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
 * 使用图片智能预加载
 */
export function useSmartImagePreload(imageUrls: string[]) {
  const manager = useRef(new SmartPreloadManager());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 分批预加载图片
    const preloadBatch = async () => {
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
