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
  onPerformanceThresholdExceeded(callback: (metrics: PerformanceMetrics) => void): void;
  offPerformanceThresholdExceeded(callback: (metrics: PerformanceMetrics) => void): void;
}

export class PerformanceServiceImpl implements PerformanceService {
  private isMonitoring: boolean = false;
  private metricsHistory: PerformanceMetrics[] = [];
  private maxHistorySize: number = 100;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private thresholdCallbacks: Array<(metrics: PerformanceMetrics) => void> = [];
  private fpsHistory: number[] = [];
  private lastFrameTime: number = 0;

  initialize(): void {
    this.startMonitoring();
    this.setupFrameRateMonitoring();
  }

  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      const metrics = this.collectMetrics();
      this.addMetricsToHistory(metrics);
      this.checkPerformanceThresholds(metrics);
    }, 1000);
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

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
      insights.push('No performance data available');
      return { insights, recommendations };
    }

    // 分析内存使用情况
    const avgMemoryUsage = this.metricsHistory.reduce((sum, metrics) => sum + metrics.memory.percentage, 0) / this.metricsHistory.length;
    if (avgMemoryUsage > 80) {
      insights.push(`High average memory usage: ${avgMemoryUsage.toFixed(2)}%`);
      recommendations.push('Consider optimizing memory usage by reducing unnecessary state or using virtualization for large lists');
    } else if (avgMemoryUsage > 60) {
      insights.push(`Moderate average memory usage: ${avgMemoryUsage.toFixed(2)}%`);
      recommendations.push('Review memory-intensive operations and consider optimization');
    }

    // 分析响应时间
    const avgResponseTime = this.metricsHistory.reduce((sum, metrics) => sum + metrics.responseTime, 0) / this.metricsHistory.length;
    if (avgResponseTime > 1000) {
      insights.push(`High average response time: ${avgResponseTime.toFixed(2)}ms`);
      recommendations.push('Optimize API calls and consider implementing caching strategies');
    } else if (avgResponseTime > 500) {
      insights.push(`Moderate average response time: ${avgResponseTime.toFixed(2)}ms`);
      recommendations.push('Review network requests and consider optimization');
    }

    // 分析帧率
    const avgFps = this.fpsHistory.length > 0 ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length : 60;
    if (avgFps < 30) {
      insights.push(`Low average frame rate: ${avgFps.toFixed(2)}fps`);
      recommendations.push('Optimize render performance by reducing unnecessary re-renders and using React.memo where appropriate');
    } else if (avgFps < 50) {
      insights.push(`Moderate average frame rate: ${avgFps.toFixed(2)}fps`);
      recommendations.push('Review complex components and consider performance optimizations');
    }

    return { insights, recommendations };
  }

  onPerformanceThresholdExceeded(callback: (metrics: PerformanceMetrics) => void): void {
    this.thresholdCallbacks.push(callback);
  }

  offPerformanceThresholdExceeded(callback: (metrics: PerformanceMetrics) => void): void {
    this.thresholdCallbacks = this.thresholdCallbacks.filter(cb => cb !== callback);
  }

  private collectMetrics(): PerformanceMetrics {
    const memory = this.collectMemoryMetrics();
    const cpu = this.collectCpuMetrics();
    const network = this.collectNetworkMetrics();
    const render = this.collectRenderMetrics();
    const responseTime = this.collectResponseTime();

    return {
      timestamp: Date.now(),
      memory,
      cpu,
      network,
      render,
      responseTime
    };
  }

  private collectMemoryMetrics(): PerformanceMetrics['memory'] {
    if (typeof performance !== 'undefined' && performance.memory) {
      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
      const used = usedJSHeapSize;
      const total = jsHeapSizeLimit;
      const percentage = (used / total) * 100;

      return {
        used,
        total,
        percentage
      };
    }

    return {
      used: 0,
      total: 0,
      percentage: 0
    };
  }

  private collectCpuMetrics(): PerformanceMetrics['cpu'] {
    // 简化的CPU使用情况收集
    // 在浏览器环境中，精确的CPU使用率收集比较复杂
    return {
      usage: 0
    };
  }

  private collectNetworkMetrics(): PerformanceMetrics['network'] {
    // 简化的网络指标收集
    return {
      download: 0,
      upload: 0
    };
  }

  private collectRenderMetrics(): PerformanceMetrics['render'] {
    const avgFps = this.fpsHistory.length > 0 ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length : 60;
    return {
      fps: avgFps,
      frameTime: 1000 / avgFps
    };
  }

  private collectResponseTime(): number {
    // 简化的响应时间收集
    return 0;
  }

  private addMetricsToHistory(metrics: PerformanceMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    const thresholds = {
      memory: 80,
      responseTime: 1000,
      fps: 30
    };

    let thresholdExceeded = false;

    if (metrics.memory.percentage > thresholds.memory) {
      thresholdExceeded = true;
    }

    if (metrics.responseTime > thresholds.responseTime) {
      thresholdExceeded = true;
    }

    if (metrics.render.fps < thresholds.fps) {
      thresholdExceeded = true;
    }

    if (thresholdExceeded) {
      this.thresholdCallbacks.forEach(callback => callback(metrics));
    }
  }

  private setupFrameRateMonitoring(): void {
    const updateFrameRate = (timestamp: number) => {
      if (this.lastFrameTime > 0) {
        const deltaTime = timestamp - this.lastFrameTime;
        const fps = 1000 / deltaTime;
        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > 10) {
          this.fpsHistory.shift();
        }
      }
      this.lastFrameTime = timestamp;
      requestAnimationFrame(updateFrameRate);
    };

    requestAnimationFrame(updateFrameRate);
  }
}

// 导出单例实例
export const performanceService = new PerformanceServiceImpl();
