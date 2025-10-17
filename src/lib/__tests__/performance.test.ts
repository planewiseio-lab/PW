/**
 * Tests unitaires pour le système de performance
 */

import { performanceMonitor, measureApiCall } from "../performance";

// Mock de performance.now
const mockPerformance = {
  now: jest.fn(() => 1000),
};

Object.defineProperty(global, "performance", {
  value: mockPerformance,
  writable: true,
});

describe("PerformanceMonitor", () => {
  beforeEach(() => {
    performanceMonitor.clear();
    jest.clearAllMocks();
  });

  test("should record metrics correctly", () => {
    performanceMonitor.recordMetric("test_metric", 150.5, { test: true });

    const stats = performanceMonitor.getStats();
    expect(stats.test_metric).toEqual({
      count: 1,
      avg: 150.5,
      min: 150.5,
      max: 150.5,
      last: 150.5,
    });
  });

  test("should measure function execution time", () => {
    const mockFn = jest.fn(() => "result");
    mockPerformance.now
      .mockReturnValueOnce(1000) // start
      .mockReturnValueOnce(1150); // end

    const result = performanceMonitor.measureFunction("test_function", mockFn);

    expect(result).toBe("result");
    expect(mockFn).toHaveBeenCalledTimes(1);

    const stats = performanceMonitor.getStats();
    expect(stats.test_function.value).toBe(150);
  });

  test("should measure promise execution time", async () => {
    const mockPromise = Promise.resolve("async_result");
    mockPerformance.now
      .mockReturnValueOnce(1000) // start
      .mockReturnValueOnce(1200); // end

    const result = await performanceMonitor.measurePromise(
      "test_promise",
      mockPromise
    );

    expect(result).toBe("async_result");

    const stats = performanceMonitor.getStats();
    expect(stats.test_promise.value).toBe(200);
  });

  test("should handle promise errors", async () => {
    const mockPromise = Promise.reject(new Error("Test error"));
    mockPerformance.now
      .mockReturnValueOnce(1000) // start
      .mockReturnValueOnce(1100); // end

    await expect(
      performanceMonitor.measurePromise("test_error", mockPromise)
    ).rejects.toThrow("Test error");

    const stats = performanceMonitor.getStats();
    expect(stats.test_error_error.value).toBe(100);
  });

  test("should limit metrics to maxMetrics", () => {
    // Ajouter plus de métriques que la limite
    for (let i = 0; i < 150; i++) {
      performanceMonitor.recordMetric(`metric_${i}`, i);
    }

    const exported = performanceMonitor.exportMetrics();
    expect(exported.metrics.length).toBe(100); // maxMetrics
  });
});

describe("measureApiCall", () => {
  test("should measure API call correctly", async () => {
    const mockApiCall = jest.fn(() => Promise.resolve({ data: "test" }));
    mockPerformance.now
      .mockReturnValueOnce(1000) // start
      .mockReturnValueOnce(1250); // end

    const result = await measureApiCall("test_endpoint", mockApiCall);

    expect(result).toEqual({ data: "test" });
    expect(mockApiCall).toHaveBeenCalledTimes(1);

    const stats = performanceMonitor.getStats();
    expect(stats.api_test_endpoint.value).toBe(250);
  });
});



