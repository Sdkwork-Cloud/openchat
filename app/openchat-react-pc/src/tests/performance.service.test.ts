import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { performanceService } from '../services/performance.service';

describe('PerformanceService', () => {
  beforeEach(() => {
    // 停止可能正在运行的监控，以避免测试干扰
    performanceService.stopMonitoring();
  });

  afterEach(() => {
    // 确保测试后停止监控
    performanceService.stopMonitoring();
  });

  it('should initialize without errors', () => {
    expect(() => {
      performanceService.initialize();
    }).not.toThrow();
  });

  it('should start and stop monitoring', () => {
    expect(() => {
      performanceService.startMonitoring();
      performanceService.stopMonitoring();
    }).not.toThrow();
  });

  it('should get current metrics', () => {
    const metrics = performanceService.getCurrentMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.timestamp).toBe('number');
    expect(metrics.memory).toBeDefined();
    expect(metrics.cpu).toBeDefined();
    expect(metrics.network).toBeDefined();
    expect(metrics.render).toBeDefined();
    expect(typeof metrics.responseTime).toBe('number');
  });

  it('should take performance snapshot', () => {
    const snapshot = performanceService.takePerformanceSnapshot();
    expect(snapshot).toBeDefined();
    expect(typeof snapshot.timestamp).toBe('number');
  });

  it('should analyze performance', () => {
    const analysis = performanceService.analyzePerformance();
    expect(analysis).toBeDefined();
    expect(Array.isArray(analysis.insights)).toBe(true);
    expect(Array.isArray(analysis.recommendations)).toBe(true);
  });

  it('should handle performance threshold callbacks', () => {
    let callbackCalled = false;
    const testCallback = () => {
      callbackCalled = true;
    };

    performanceService.onPerformanceThresholdExceeded(testCallback);
    performanceService.offPerformanceThresholdExceeded(testCallback);

    // 如果没有阈值超出，回调不应该被调用
    expect(callbackCalled).toBe(false);
  });

  it('should collect memory metrics', () => {
    const metrics = performanceService.getCurrentMetrics();
    expect(metrics.memory).toBeDefined();
    expect(typeof metrics.memory.used).toBe('number');
    expect(typeof metrics.memory.total).toBe('number');
    expect(typeof metrics.memory.percentage).toBe('number');
  });

  it('should collect render metrics', () => {
    const metrics = performanceService.getCurrentMetrics();
    expect(metrics.render).toBeDefined();
    expect(typeof metrics.render.fps).toBe('number');
    expect(typeof metrics.render.frameTime).toBe('number');
  });

  it('should maintain performance history', () => {
    performanceService.startMonitoring();
    
    // 等待一段时间以收集一些指标
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    return wait(1500).then(() => {
      const history = performanceService.getPerformanceHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      performanceService.stopMonitoring();
    });
  });
});
