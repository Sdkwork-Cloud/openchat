import { PerformanceMonitor, createPerformanceMonitor, getPerformanceMonitor, setGlobalPerformanceMonitor } from '../../src/core/performance';

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基本功能测试', () => {
    it('应该能够创建PerformanceMonitor实例', () => {
      const monitor = new PerformanceMonitor();
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
    });

    it('应该能够启用和禁用监控', () => {
      const monitor = new PerformanceMonitor({ enabled: false });
      expect(monitor.isEnabled()).toBe(false);
      
      monitor.enable();
      expect(monitor.isEnabled()).toBe(true);
      
      monitor.disable();
      expect(monitor.isEnabled()).toBe(false);
    });
  });

  describe('计时器测试', () => {
    it('应该能够记录计时', () => {
      const monitor = new PerformanceMonitor();
      const stopTimer = monitor.startTimer('test_operation');
      
      jest.advanceTimersByTime(100);
      
      const duration = stopTimer();
      
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('指标记录测试', () => {
    it('应该能够记录指标', () => {
      const monitor = new PerformanceMonitor();
      
      monitor.record('test_metric', 100);
      monitor.record('test_metric', 200);
      monitor.record('test_metric', 300);
      
      const stats = monitor.getStats('test_metric');
      
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(3);
      expect(stats!.total).toBe(600);
      expect(stats!.min).toBe(100);
      expect(stats!.max).toBe(300);
      expect(stats!.avg).toBe(200);
    });

    it('禁用时应该不记录指标', () => {
      const monitor = new PerformanceMonitor({ enabled: false });
      
      monitor.record('test_metric', 100);
      
      const stats = monitor.getStats('test_metric');
      expect(stats).toBeNull();
    });
  });

  describe('统计计算测试', () => {
    it('应该正确计算百分位数', () => {
      const monitor = new PerformanceMonitor();
      
      for (let i = 1; i <= 100; i++) {
        monitor.record('latency', i);
      }
      
      const stats = monitor.getStats('latency');
      
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(100);
      expect(stats!.p50).toBeGreaterThanOrEqual(50);
      expect(stats!.p50).toBeLessThanOrEqual(51);
      expect(stats!.p95).toBeGreaterThanOrEqual(95);
      expect(stats!.p99).toBeGreaterThanOrEqual(99);
    });

    it('应该限制最大样本数', () => {
      const monitor = new PerformanceMonitor({ maxSamples: 10 });
      
      for (let i = 1; i <= 20; i++) {
        monitor.record('test_metric', i);
      }
      
      const stats = monitor.getStats('test_metric');
      
      expect(stats!.count).toBe(10);
      expect(stats!.min).toBe(11);
      expect(stats!.max).toBe(20);
    });
  });

  describe('计数器测试', () => {
    it('应该能够递增计数', () => {
      const monitor = new PerformanceMonitor();
      
      monitor.increment('counter');
      monitor.increment('counter');
      monitor.increment('counter', 5);
      
      const latest = monitor.getLatest('counter');
      expect(latest).toBe(7);
    });

    it('应该能够递减计数', () => {
      const monitor = new PerformanceMonitor();
      
      monitor.increment('counter', 10);
      monitor.decrement('counter', 3);
      
      const latest = monitor.getLatest('counter');
      expect(latest).toBe(7);
    });
  });

  describe('仪表盘测试', () => {
    it('应该能够设置仪表盘值', () => {
      const monitor = new PerformanceMonitor();
      
      monitor.gauge('memory', 1024);
      monitor.gauge('memory', 2048);
      
      const latest = monitor.getLatest('memory');
      expect(latest).toBe(2048);
    });
  });

  describe('清除测试', () => {
    it('应该能够清除单个指标', () => {
      const monitor = new PerformanceMonitor();
      
      monitor.record('metric1', 100);
      monitor.record('metric2', 200);
      
      monitor.clear('metric1');
      
      expect(monitor.getStats('metric1')).toBeNull();
      expect(monitor.getStats('metric2')).not.toBeNull();
    });

    it('应该能够清除所有指标', () => {
      const monitor = new PerformanceMonitor();
      
      monitor.record('metric1', 100);
      monitor.record('metric2', 200);
      
      monitor.clear();
      
      expect(monitor.getStats('metric1')).toBeNull();
      expect(monitor.getStats('metric2')).toBeNull();
    });
  });

  describe('导出测试', () => {
    it('应该能够导出指标', () => {
      const monitor = new PerformanceMonitor();
      
      monitor.record('metric1', 100);
      monitor.record('metric2', 200);
      
      const exported = monitor.export();
      
      expect(exported.length).toBe(2);
      expect(exported.find(m => m.name === 'metric1')).toBeDefined();
      expect(exported.find(m => m.name === 'metric2')).toBeDefined();
    });
  });

  describe('工厂函数测试', () => {
    it('createPerformanceMonitor应该创建实例', () => {
      const monitor = createPerformanceMonitor();
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
    });

    it('getPerformanceMonitor应该返回全局实例', () => {
      const monitor1 = getPerformanceMonitor();
      const monitor2 = getPerformanceMonitor();
      expect(monitor1).toBe(monitor2);
    });

    it('setGlobalPerformanceMonitor应该设置全局实例', () => {
      const customMonitor = new PerformanceMonitor();
      setGlobalPerformanceMonitor(customMonitor);
      
      const monitor = getPerformanceMonitor();
      expect(monitor).toBe(customMonitor);
    });
  });
});
