/**
 * 铏氭嫙鍒楄〃 DOM 鍥炴敹姹?Hook
 *
 * 鑱岃矗锛氬疄鐜?DOM 鑺傜偣鐨勫鐢紝鍑忓皯鍐呭瓨鍒嗛厤鍜?GC 鍘嬪姏
 * 搴旂敤锛氳秴澶ф暟鎹垪琛紙10涓?锛夌殑鏋佽嚧鎬ц兘浼樺寲
 *
 * 鐗圭偣锛? * - DOM 鑺傜偣澶嶇敤锛岄伩鍏嶉绻佸垱寤?閿€姣? * - 棰勫垎閰嶆睜锛屽噺灏戣繍琛屾椂鍒嗛厤
 * - 鏅鸿兘鍥炴敹绛栫暐锛屼紭鍏堝鐢ㄧ浉鍚岀被鍨嬭妭鐐? */

import { useRef, useCallback, useEffect } from 'react';

// 姹犻厤缃?interface PoolConfig {
  poolSize: number;        // 姹犲ぇ灏?  itemHeight: number;      // 棰勪及椤归珮搴?  overscan: number;        // 棰勬覆鏌撴暟閲?}

// 姹犻」
interface PoolItem {
  id: string;
  element: HTMLElement;
  inUse: boolean;
  lastUsed: number;
  data: unknown;
}

// 姹犵粺璁?interface PoolStats {
  total: number;
  inUse: number;
  available: number;
  hitRate: number;
  missRate: number;
}

/**
 * DOM 鍥炴敹姹? */
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
   * 鍒濆鍖栨睜
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
   * 鍒涘缓 DOM 鍏冪礌
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
   * 鑾峰彇鍙敤椤?   */
  acquire(): PoolItem | null {
    // 浼樺厛澶嶇敤鏈€杩戜娇鐢ㄧ殑锛圠RU锛?    const item = this.available.pop();

    if (item) {
      item.inUse = true;
      item.lastUsed = Date.now();
      this.inUse.add(item.id);
      this.stats.hits++;
      return item;
    }

    // 姹犺€楀敖锛岄渶瑕佹墿瀹规垨绛夊緟
    this.stats.misses++;
    return null;
  }

  /**
   * 閲婃斁椤?   */
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
   * 閲婃斁鎵€鏈?   */
  releaseAll(): void {
    this.inUse.forEach((id) => {
      const item = this.pool.get(id);
      if (item) {
        this.release(item);
      }
    });
  }

  /**
   * 鏇存柊椤逛綅缃?   */
  updatePosition(item: PoolItem, index: number, offset: number): void {
    const y = index * this.config.itemHeight + offset;
    item.element.style.transform = `translateY(${y}px)`;
  }

  /**
   * 鑾峰彇缁熻
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
   * 鎵╁
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
   * 閿€姣?   */
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
 * 浣跨敤铏氭嫙鍒楄〃 DOM 姹? */
export function useVirtualListPool(
  containerRef: React.RefObject<HTMLElement>,
  config: PoolConfig
) {
  const poolRef = useRef<DOMPool | null>(null);

  // 鍒濆鍖栨睜
  useEffect(() => {
    if (!containerRef.current) return;

    poolRef.current = new DOMPool(containerRef.current, config);

    return () => {
      poolRef.current?.destroy();
      poolRef.current = null;
    };
  }, []);

  /**
   * 鑾峰彇娓叉煋椤?   */
  const getRenderItems = useCallback(
    (startIndex: number, endIndex: number, renderFn: (index: number) => string) => {
      if (!poolRef.current) return [];

      // 閲婃斁涓嶅湪鍙鑼冨洿鐨勯」
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
   * 鑾峰彇姹犵粺璁?   */
  const getStats = useCallback((): PoolStats | null => {
    return poolRef.current?.getStats() || null;
  }, []);

  /**
   * 鎵╁
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
 * 浣跨敤浼樺寲鐨勮櫄鎷熸粴鍔? */
export function useOptimizedVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  overscan: number = 5
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });

  // 璁＄畻鍙鑼冨洿
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

  // 鐩戝惉婊氬姩
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

  // 鐩戝惉灏哄鍙樺寲
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      calculateRange();
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [calculateRange]);

  // 鎬婚珮搴?  const totalHeight = items.length * itemHeight;

  // 鍙椤?  const visibleItems = items.slice(visibleRange.start, visibleRange.end + 1);

  // 鍋忕Щ閲?  const offsetY = visibleRange.start * itemHeight;

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

