/**
 * 鎬ц兘鐩戞帶 Hook
 *
 * 鑱岃矗锛氱洃鎺?Web Vitals 鍜岃嚜瀹氫箟鎬ц兘鎸囨爣
 */

import { useEffect, useCallback, useRef } from 'react';
import { onCLS, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

// 鎬ц兘鎸囨爣绫诲瀷
interface PerformanceMetrics {
  // Web Vitals
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  fid?: number; // First Input Delay
  lcp?: number; // Largest Contentful Paint
  ttfb?: number; // Time to First Byte

  // 鑷畾涔夋寚鏍?  renderTime?: number;
  memoryUsage?: number;
  longTasks?: number;
}

// 鎬ц兘鎶ュ憡鍥炶皟
type PerformanceReporter = (metrics: PerformanceMetrics) => void;

/**
 * 鎬ц兘鐩戞帶 Hook
 */
export function usePerformanceMonitor(reporter?: PerformanceReporter) {
  const metricsRef = useRef<PerformanceMetrics>({});

  // 鎶ュ憡鎬ц兘鎸囨爣
  const reportMetrics = useCallback(() => {
    if (reporter) {
      reporter({ ...metricsRef.current });
    }

    // 寮€鍙戠幆澧冩墦鍗板埌鎺у埗鍙?    if (import.meta.env.MODE === 'development') {
      console.log('[Performance]', metricsRef.current);
    }
  }, [reporter]);

  useEffect(() => {
    // 鐩戞帶 Web Vitals
    onCLS((metric: Metric) => {
      metricsRef.current.cls = metric.value;
      reportMetrics();
    });

    onFCP((metric: Metric) => {
      metricsRef.current.fcp = metric.value;
      reportMetrics();
    });

    // onFID is deprecated in web-vitals v4, using INP instead
    // @ts-ignore - for backwards compatibility
    if (typeof onFID === 'function') {
      // @ts-ignore
      onFID((metric: Metric) => {
        metricsRef.current.fid = metric.value;
        reportMetrics();
      });
    }

    onLCP((metric: Metric) => {
      metricsRef.current.lcp = metric.value;
      reportMetrics();
    });

    onTTFB((metric: Metric) => {
      metricsRef.current.ttfb = metric.value;
      reportMetrics();
    });

    // 鐩戞帶鍐呭瓨浣跨敤
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        if (memory) {
          metricsRef.current.memoryUsage = memory.usedJSHeapSize / 1048576; // MB
        }
      }
    };

    // 瀹氭湡鐩戞帶鍐呭瓨
    const memoryInterval = setInterval(monitorMemory, 30000);

    // 鐩戞帶闀夸换鍔?    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          let longTasks = 0;
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              // 瓒呰繃 50ms 瑙嗕负闀夸换鍔?              longTasks++;
            }
          }
          metricsRef.current.longTasks = longTasks;
        });

        observer.observe({ entryTypes: ['longtask'] });

        return () => {
          observer.disconnect();
          clearInterval(memoryInterval);
        };
      } catch (e) {
        // 娴忚鍣ㄤ笉鏀寔 longtask
      }
    }

    return () => {
      clearInterval(memoryInterval);
    };
  }, [reportMetrics]);

  return metricsRef;
}

/**
 * 缁勪欢娓叉煋鎬ц兘鐩戞帶
 */
export function useRenderPerformance(componentName: string, threshold: number = 16) {
  const renderStartRef = useRef<number>(0);

  useEffect(() => {
    const renderTime = performance.now() - renderStartRef.current;

    if (renderTime > threshold) {
      console.warn(
        `[Render Performance] ${componentName} took ${renderTime.toFixed(2)}ms to render (threshold: ${threshold}ms)`
      );
    }
  });

  renderStartRef.current = performance.now();
}

/**
 * 鑾峰彇鎬ц兘鎶ュ憡
 */
export function getPerformanceReport(): PerformanceMetrics {
  const report: PerformanceMetrics = {};

  // 瀵艰埅璁℃椂
  if ('performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      report.ttfb = navigation.responseStart - navigation.startTime;
    }
  }

  // 鍐呭瓨浣跨敤
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    if (memory) {
      report.memoryUsage = memory.usedJSHeapSize / 1048576;
    }
  }

  return report;
}

/**
 * 鎬ц兘娴嬮噺宸ュ叿
 */
export class PerformanceMeasure {
  private marks: Map<string, number> = new Map();

  /**
   * 寮€濮嬫祴閲?   */
  start(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * 缁撴潫娴嬮噺
   */
  end(name: string): number | null {
    const startTime = this.marks.get(name);
    if (!startTime) return null;

    const duration = performance.now() - startTime;
    this.marks.delete(name);

    // 寮€鍙戠幆澧冩墦鍗?    if (import.meta.env.MODE === 'development') {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * 娴嬮噺鍑芥暟鎵ц鏃堕棿
   */
  measure<T>(name: string, fn: () => T): T {
    this.start(name);
    const result = fn();
    this.end(name);
    return result;
  }

  /**
   * 寮傛娴嬮噺
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    const result = await fn();
    this.end(name);
    return result;
  }
}

// 鍏ㄥ眬鎬ц兘娴嬮噺瀹炰緥
export const perf = new PerformanceMeasure();

