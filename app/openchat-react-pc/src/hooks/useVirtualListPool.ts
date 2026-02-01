/**
 * 虚拟列表 DOM 回收池 Hook
 *
 * 职责：实现 DOM 节点的复用，减少内存分配和 GC 压力
 * 应用：超大数据列表（10万+）的极致性能优化
 *
 * 特点：
 * - DOM 节点复用，避免频繁创建/销毁
 * - 预分配池，减少运行时分配
 * - 智能回收策略，优先复用相同类型节点
 */

import { useRef, useCallback, useEffect } from 'react';

// 池配置
interface PoolConfig {
  poolSize: number;        // 池大小
  itemHeight: number;      // 预估项高度
  overscan: number;        // 预渲染数量
}

// 池项
interface PoolItem {
  id: string;
  element: HTMLElement;
  inUse: boolean;
  lastUsed: number;
  data: unknown;
}

// 池统计
interface PoolStats {
  total: number;
  inUse: number;
  available: number;
  hitRate: number;
  missRate: number;
}

/**
 * DOM 回收池
 */
class DOMPool {
  private pool: Map<string, PoolItem> = new Map();
  private available: PoolItem[] = [];
  private inUse: Set<string> = new Set();
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(
    private container: HTMLElement,
    private config: PoolConfig
  ) {
    this.initializePool();
  }

  /**
   * 初始化池
   */
  private initializePool(): void {
    for (let i = 0; i < this.config.poolSize; i++) {
      const element = this.createElement();
      const item: PoolItem = {
        id: `pool-${i}`,
        element,
        inUse: false,
        lastUsed: 0,
        data: null,
      };

      this.pool.set(item.id, item);
      this.available.push(item);
      this.container.appendChild(element);
    }

    console.log(`[DOMPool] Initialized with ${this.config.poolSize} items`);
  }

  /**
   * 创建 DOM 元素
   */
  private createElement(): HTMLElement {
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.left = '0';
    element.style.right = '0';
    element.style.willChange = 'transform';
    element.style.contain = 'layout style paint';
    return element;
  }

  /**
   * 获取可用项
   */
  acquire(): PoolItem | null {
    // 优先复用最近使用的（LRU）
    const item = this.available.pop();

    if (item) {
      item.inUse = true;
      item.lastUsed = Date.now();
      this.inUse.add(item.id);
      this.stats.hits++;
      return item;
    }

    // 池耗尽，需要扩容或等待
    this.stats.misses++;
    return null;
  }

  /**
   * 释放项
   */
  release(item: PoolItem): void {
    if (!item.inUse) return;

    item.inUse = false;
    item.data = null;
    item.element.style.transform = 'translateY(-9999px)';
    item.element.innerHTML = '';

    this.inUse.delete(item.id);
    this.available.push(item);
  }

  /**
   * 释放所有
   */
  releaseAll(): void {
    this.inUse.forEach((id) => {
      const item = this.pool.get(id);
      if (item) {
        this.release(item);
      }
    });
  }

  /**
   * 更新项位置
   */
  updatePosition(item: PoolItem, index: number, offset: number): void {
    const y = index * this.config.itemHeight + offset;
    item.element.style.transform = `translateY(${y}px)`;
  }

  /**
   * 获取统计
   */
  getStats(): PoolStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      total: this.pool.size,
      inUse: this.inUse.size,
      available: this.available.length,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      missRate: total > 0 ? this.stats.misses / total : 0,
    };
  }

  /**
   * 扩容
   */
  expand(additionalSize: number): void {
    const currentSize = this.pool.size;

    for (let i = 0; i < additionalSize; i++) {
      const element = this.createElement();
      const item: PoolItem = {
        id: `pool-${currentSize + i}`,
        element,
        inUse: false,
        lastUsed: 0,
        data: null,
      };

      this.pool.set(item.id, item);
      this.available.push(item);
      this.container.appendChild(element);
    }

    console.log(`[DOMPool] Expanded by ${additionalSize}, total: ${this.pool.size}`);
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.pool.forEach((item) => {
      item.element.remove();
    });
    this.pool.clear();
    this.available = [];
    this.inUse.clear();
  }
}

/**
 * 使用虚拟列表 DOM 池
 */
export function useVirtualListPool(
  containerRef: React.RefObject<HTMLElement>,
  config: PoolConfig
) {
  const poolRef = useRef<DOMPool | null>(null);

  // 初始化池
  useEffect(() => {
    if (!containerRef.current) return;

    poolRef.current = new DOMPool(containerRef.current, config);

    return () => {
      poolRef.current?.destroy();
      poolRef.current = null;
    };
  }, []);

  /**
   * 获取渲染项
   */
  const getRenderItems = useCallback(
    (startIndex: number, endIndex: number, renderFn: (index: number) => string) => {
      if (!poolRef.current) return [];

      // 释放不在可视范围的项
      poolRef.current.releaseAll();

      const items: PoolItem[] = [];

      for (let i = startIndex; i <= endIndex; i++) {
        const item = poolRef.current.acquire();
        if (item) {
          item.element.innerHTML = renderFn(i);
          poolRef.current.updatePosition(item, i, 0);
          items.push(item);
        }
      }

      return items;
    },
    []
  );

  /**
   * 获取池统计
   */
  const getStats = useCallback((): PoolStats | null => {
    return poolRef.current?.getStats() || null;
  }, []);

  /**
   * 扩容
   */
  const expand = useCallback((size: number) => {
    poolRef.current?.expand(size);
  }, []);

  return {
    getRenderItems,
    getStats,
    expand,
  };
}

/**
 * 使用优化的虚拟滚动
 */
export function useOptimizedVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  overscan: number = 5
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  // 计算可视范围
  const calculateRange = useCallback(() => {
    if (!containerRef.current) return;

    const containerHeight = containerRef.current.clientHeight;
    const scrollTop = containerRef.current.scrollTop;

    scrollTopRef.current = scrollTop;

    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + overscan, items.length - 1);

    setVisibleRange({
      start: Math.max(0, start - overscan),
      end,
    });
  }, [items.length, itemHeight, overscan]);

  // 监听滚动
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      requestAnimationFrame(calculateRange);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    calculateRange();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [calculateRange]);

  // 监听尺寸变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      calculateRange();
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [calculateRange]);

  // 总高度
  const totalHeight = items.length * itemHeight;

  // 可视项
  const visibleItems = items.slice(visibleRange.start, visibleRange.end + 1);

  // 偏移量
  const offsetY = visibleRange.start * itemHeight;

  return {
    containerRef,
    visibleItems,
    visibleRange,
    totalHeight,
    offsetY,
    itemHeight,
  };
}

import { useState } from 'react';

export default useVirtualListPool;
