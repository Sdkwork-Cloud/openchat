export interface PerformanceMetrics {
  timestamp: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  network: {
    download: number;
    upload: number;
  };
  render: {
    fps: number;
    frameTime: number;
  };
  responseTime: number;
}

export interface PerformanceService {
  initialize(): void;
  startMonitoring(): void;
  stopMonitoring(): void;
  getCurrentMetrics(): PerformanceMetrics;
  getPerformanceHistory(): PerformanceMetrics[];
  takePerformanceSnapshot(): PerformanceMetrics;
  analyzePerformance(): { insights: string[]; recommendations: string[] };
  onPerformanceThresholdExceeded(
    callback: (metrics: PerformanceMetrics) => void,
  ): void;
  offPerformanceThresholdExceeded(
    callback: (metrics: PerformanceMetrics) => void,
  ): void;
}

export class PerformanceServiceImpl implements PerformanceService {
  private isMonitoring = false;
  private metricsHistory: PerformanceMetrics[] = [];
  private maxHistorySize = 100;
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private thresholdCallbacks: Array<(metrics: PerformanceMetrics) => void> = [];
  private fpsHistory: number[] = [];
  private lastFrameTime = 0;

  initialize(): void {
    this.startMonitoring();
    this.setupFrameRateMonitoring();
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(() => {
      const metrics = this.collectMetrics();
      this.addMetricsToHistory(metrics);
      this.checkPerformanceThresholds(metrics);
    }, 1000);
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  getCurrentMetrics(): PerformanceMetrics {
    return this.collectMetrics();
  }

  getPerformanceHistory(): PerformanceMetrics[] {
    return this.metricsHistory;
  }

  takePerformanceSnapshot(): PerformanceMetrics {
    return this.collectMetrics();
  }

  analyzePerformance(): { insights: string[]; recommendations: string[] } {
    const insights: string[] = [];
    const recommendations: string[] = [];

    if (this.metricsHistory.length === 0) {
      insights.push("No performance data available");
      return { insights, recommendations };
    }

    const avgMemoryUsage =
      this.metricsHistory.reduce((sum, m) => sum + m.memory.percentage, 0) /
      this.metricsHistory.length;
    if (avgMemoryUsage > 80) {
      insights.push(`High memory usage: ${avgMemoryUsage.toFixed(2)}%`);
      recommendations.push("Reduce retained data in memory-intensive views.");
    }

    const avgResponseTime =
      this.metricsHistory.reduce((sum, m) => sum + m.responseTime, 0) /
      this.metricsHistory.length;
    if (avgResponseTime > 1000) {
      insights.push(`High response time: ${avgResponseTime.toFixed(2)}ms`);
      recommendations.push("Use caching and reduce expensive synchronous work.");
    }

    const avgFps =
      this.fpsHistory.length > 0
        ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) /
          this.fpsHistory.length
        : 60;
    if (avgFps < 30) {
      insights.push(`Low frame rate: ${avgFps.toFixed(2)}fps`);
      recommendations.push("Reduce re-renders and heavy DOM updates.");
    }

    return { insights, recommendations };
  }

  onPerformanceThresholdExceeded(
    callback: (metrics: PerformanceMetrics) => void,
  ): void {
    this.thresholdCallbacks.push(callback);
  }

  offPerformanceThresholdExceeded(
    callback: (metrics: PerformanceMetrics) => void,
  ): void {
    this.thresholdCallbacks = this.thresholdCallbacks.filter(
      (cb) => cb !== callback,
    );
  }

  private collectMetrics(): PerformanceMetrics {
    const memory = this.collectMemoryMetrics();
    const cpu = this.collectCpuMetrics();
    const network = this.collectNetworkMetrics();
    const render = this.collectRenderMetrics();

    return {
      timestamp: Date.now(),
      memory,
      cpu,
      network,
      render,
      responseTime: 0,
    };
  }

  private collectMemoryMetrics(): PerformanceMetrics["memory"] {
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
    };

    if (perf.memory) {
      const used = perf.memory.usedJSHeapSize;
      const total = perf.memory.jsHeapSizeLimit || 1;
      return {
        used,
        total,
        percentage: (used / total) * 100,
      };
    }

    return { used: 0, total: 0, percentage: 0 };
  }

  private collectCpuMetrics(): PerformanceMetrics["cpu"] {
    return { usage: 0 };
  }

  private collectNetworkMetrics(): PerformanceMetrics["network"] {
    return { download: 0, upload: 0 };
  }

  private collectRenderMetrics(): PerformanceMetrics["render"] {
    const avgFps =
      this.fpsHistory.length > 0
        ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) /
          this.fpsHistory.length
        : 60;
    return {
      fps: avgFps,
      frameTime: avgFps > 0 ? 1000 / avgFps : 0,
    };
  }

  private addMetricsToHistory(metrics: PerformanceMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    const thresholdExceeded =
      metrics.memory.percentage > 80 ||
      metrics.responseTime > 1000 ||
      metrics.render.fps < 30;

    if (!thresholdExceeded) return;
    this.thresholdCallbacks.forEach((cb) => cb(metrics));
  }

  private setupFrameRateMonitoring(): void {
    if (typeof requestAnimationFrame === "undefined") return;

    const updateFrameRate = (timestamp: number) => {
      if (this.lastFrameTime > 0) {
        const delta = timestamp - this.lastFrameTime;
        if (delta > 0) {
          const fps = 1000 / delta;
          this.fpsHistory.push(fps);
          if (this.fpsHistory.length > 10) {
            this.fpsHistory.shift();
          }
        }
      }
      this.lastFrameTime = timestamp;
      requestAnimationFrame(updateFrameRate);
    };

    requestAnimationFrame(updateFrameRate);
  }
}

export const performanceService = new PerformanceServiceImpl();

