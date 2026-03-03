import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { performanceService } from "@sdkwork/openchat-pc-kernel";

describe("PerformanceService", () => {
  beforeEach(() => {
    performanceService.stopMonitoring();
  });

  afterEach(() => {
    performanceService.stopMonitoring();
  });

  it("should initialize without errors", () => {
    expect(() => {
      performanceService.initialize();
    }).not.toThrow();
  });

  it("should start and stop monitoring", () => {
    expect(() => {
      performanceService.startMonitoring();
      performanceService.stopMonitoring();
    }).not.toThrow();
  });

  it("should get current metrics", () => {
    const metrics = performanceService.getCurrentMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.timestamp).toBe("number");
    expect(metrics.memory).toBeDefined();
    expect(metrics.cpu).toBeDefined();
    expect(metrics.network).toBeDefined();
    expect(metrics.render).toBeDefined();
    expect(typeof metrics.responseTime).toBe("number");
  });

  it("should take performance snapshot", () => {
    const snapshot = performanceService.takePerformanceSnapshot();
    expect(snapshot).toBeDefined();
    expect(typeof snapshot.timestamp).toBe("number");
  });

  it("should analyze performance", () => {
    const analysis = performanceService.analyzePerformance();
    expect(analysis).toBeDefined();
    expect(Array.isArray(analysis.insights)).toBe(true);
    expect(Array.isArray(analysis.recommendations)).toBe(true);
  });

  it("should handle performance threshold callbacks", () => {
    let callbackCalled = false;
    const testCallback = () => {
      callbackCalled = true;
    };

    performanceService.onPerformanceThresholdExceeded(testCallback);
    performanceService.offPerformanceThresholdExceeded(testCallback);

    expect(callbackCalled).toBe(false);
  });

  it("should collect memory metrics", () => {
    const metrics = performanceService.getCurrentMetrics();
    expect(metrics.memory).toBeDefined();
    expect(typeof metrics.memory.used).toBe("number");
    expect(typeof metrics.memory.total).toBe("number");
    expect(typeof metrics.memory.percentage).toBe("number");
  });

  it("should collect render metrics", () => {
    const metrics = performanceService.getCurrentMetrics();
    expect(metrics.render).toBeDefined();
    expect(typeof metrics.render.fps).toBe("number");
    expect(typeof metrics.render.frameTime).toBe("number");
  });

  it("should maintain performance history", async () => {
    performanceService.startMonitoring();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const history = performanceService.getPerformanceHistory();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
  });
});
