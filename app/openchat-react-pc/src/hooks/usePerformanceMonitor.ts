/**
 * 性能监控 Hook
 *
 * 职责：监控 Web Vitals 和自定义性能指标
 */

import { useEffect, useCallback, useRef } from 'react';
import { onCLS, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

// 性能指标类型
interface PerformanceMetrics {
  // Web Vitals
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  fid?: number; // First Input Delay
  lcp?: number; // Largest Contentful Paint
  ttfb?: number; // Time to First Byte

  // 自定义指标
  renderTime?: number;
  memoryUsage?: number;
  longTasks?: number;
}

// 性能报告回调
type PerformanceReporter = (metrics: PerformanceMetrics) => void;

/**
 * 性能监控 Hook
 */
export function usePerformanceMonitor(reporter?: PerformanceReporter) {
  const metricsRef = useRef<PerformanceMetrics>({});

  // 报告性能指标
  const reportMetrics = useCallback(() => {
    if (reporter) {
      reporter({ ...metricsRef.current });
    }

    // 开发环境打印到控制台
    if (import.meta.env.MODE === 'development') {
      console.log('[Performance]', metricsRef.current);
    }
  }, [reporter]);

  useEffect(() => {
    // 监控 Web Vitals
    onCLS((metric: Metric) => {
      metricsRef.current.cls = metric.value;
      reportMetrics();
    });

    onFCP((metric: Metric) => {
      metricsRef.current.fcp = metric.value;
      reportMetrics();
    });

    onFID((metric: Metric) => {
      metricsRef.current.fid = metric.value;
      reportMetrics();
    });

    onLCP((metric: Metric) => {
      metricsRef.current.lcp = metric.value;
      reportMetrics();
    });

    onTTFB((metric: Metric) => {
      metricsRef.current.ttfb = metric.value;
      reportMetrics();
    });

    // 监控内存使用
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        if (memory) {
          metricsRef.current.memoryUsage = memory.usedJSHeapSize / 1048576; // MB
        }
      }
    };

    // 定期监控内存
    const memoryInterval = setInterval(monitorMemory, 30000);

    // 监控长任务
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          let longTasks = 0;
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              // 超过 50ms 视为长任务
              longTasks++;
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
        // 浏览器不支持 longtask
      }
    }

    return () => {
      clearInterval(memoryInterval);
    };
  }, [reportMetrics]);

  return metricsRef;
}

/**
 * 组件渲染性能监控
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
 * 获取性能报告
 */
export function getPerformanceReport(): PerformanceMetrics {
  const report: PerformanceMetrics = {};

  // 导航计时
  if ('performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      report.ttfb = navigation.responseStart - navigation.startTime;
    }
  }

  // 内存使用
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    if (memory) {
      report.memoryUsage = memory.usedJSHeapSize / 1048576;
    }
  }

  return report;
}

/**
 * 性能测量工具
 */
export class PerformanceMeasure {
  private marks: Map<string, number> = new Map();

  /**
   * 开始测量
   */
  start(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * 结束测量
   */
  end(name: string): number | null {
    const startTime = this.marks.get(name);
    if (!startTime) return null;

    const duration = performance.now() - startTime;
    this.marks.delete(name);

    // 开发环境打印
    if (import.meta.env.MODE === 'development') {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * 测量函数执行时间
   */
  measure<T>(name: string, fn: () => T): T {
    this.start(name);
    const result = fn();
    this.end(name);
    return result;
  }

  /**
   * 异步测量
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    const result = await fn();
    this.end(name);
    return result;
  }
}

// 全局性能测量实例
export const perf = new PerformanceMeasure();
