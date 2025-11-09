/**
 * Performance monitoring utilities for the Decision Matrix Flow Editor
 * Tracks render times, interaction response times, and performance budgets
 */
import { useEffect, useRef } from 'react';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

interface PerformanceBudget {
  name: string;
  budget: number; // in milliseconds
  actual: number;
  passed: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Start measuring a performance metric
   */
  startMeasure(name: string): void {
    if (!this.isDevelopment) return;
    
    this.marks.set(name, performance.now());
  }

  /**
   * End measuring a performance metric and log it
   */
  endMeasure(name: string): number | null {
    if (!this.isDevelopment) return null;
    
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`[Performance] No start mark found for: ${name}`);
      return null;
    }

    const duration = performance.now() - startTime;
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);
    this.marks.delete(name);

    // Log the metric
    this.logMetric(metric);

    return duration;
  }

  /**
   * Measure a function execution time
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasure(name);
    try {
      const result = await fn();
      this.endMeasure(name);
      return result;
    } catch (error) {
      this.endMeasure(name);
      throw error;
    }
  }

  /**
   * Measure a synchronous function execution time
   */
  measure<T>(name: string, fn: () => T): T {
    this.startMeasure(name);
    try {
      const result = fn();
      this.endMeasure(name);
      return result;
    } catch (error) {
      this.endMeasure(name);
      throw error;
    }
  }

  /**
   * Log a performance metric
   */
  private logMetric(metric: PerformanceMetric): void {
    if (!this.isDevelopment) return;

    const color = this.getColorForDuration(metric.duration);
    console.log(
      `%c[Performance] ${metric.name}: ${metric.duration.toFixed(2)}ms`,
      `color: ${color}; font-weight: bold;`
    );
  }

  /**
   * Get color based on duration (green for fast, yellow for medium, red for slow)
   */
  private getColorForDuration(duration: number): string {
    if (duration < 100) return '#10b981'; // green
    if (duration < 500) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  }

  /**
   * Check performance budgets
   */
  checkBudgets(budgets: { name: string; budget: number }[]): PerformanceBudget[] {
    if (!this.isDevelopment) return [];

    const results: PerformanceBudget[] = [];

    for (const { name, budget } of budgets) {
      // Find the most recent metric with this name
      const metric = [...this.metrics]
        .reverse()
        .find((m) => m.name === name);

      if (metric) {
        const passed = metric.duration <= budget;
        results.push({
          name,
          budget,
          actual: metric.duration,
          passed,
        });

        if (!passed) {
          console.warn(
            `%c[Performance Budget] ${name} exceeded budget: ${metric.duration.toFixed(2)}ms > ${budget}ms`,
            'color: #ef4444; font-weight: bold;'
          );
        }
      }
    }

    return results;
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get average duration for a metric name
   */
  getAverageDuration(name: string): number | null {
    const relevantMetrics = this.metrics.filter((m) => m.name === name);
    if (relevantMetrics.length === 0) return null;

    const sum = relevantMetrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / relevantMetrics.length;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }

  /**
   * Log a summary of all metrics
   */
  logSummary(): void {
    if (!this.isDevelopment || this.metrics.length === 0) return;

    console.group('%c[Performance Summary]', 'color: #3b82f6; font-weight: bold; font-size: 14px;');

    // Group metrics by name
    const groupedMetrics = new Map<string, number[]>();
    for (const metric of this.metrics) {
      if (!groupedMetrics.has(metric.name)) {
        groupedMetrics.set(metric.name, []);
      }
      groupedMetrics.get(metric.name)!.push(metric.duration);
    }

    // Log statistics for each metric
    for (const [name, durations] of groupedMetrics) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);

      console.log(
        `${name}:\n` +
        `  Count: ${durations.length}\n` +
        `  Avg: ${avg.toFixed(2)}ms\n` +
        `  Min: ${min.toFixed(2)}ms\n` +
        `  Max: ${max.toFixed(2)}ms`
      );
    }

    console.groupEnd();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for measuring component render time
 */
export function usePerformanceMonitor(componentName: string): void {
  const renderCount = useRef(0);
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (!isDevelopment) return;

    renderCount.current += 1;
    const measureName = `${componentName}-render-${renderCount.current}`;

    performanceMonitor.startMeasure(measureName);

    return () => {
      performanceMonitor.endMeasure(measureName);
    };
  });
}

/**
 * React hook for measuring interaction response time
 */
export function useMeasureInteraction() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (interactionName: string, callback: () => void) => {
    if (!isDevelopment) {
      callback();
      return;
    }

    performanceMonitor.startMeasure(interactionName);
    callback();
    performanceMonitor.endMeasure(interactionName);
  };
}
