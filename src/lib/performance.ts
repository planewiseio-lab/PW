/**
 * Système de monitoring de performance simple et léger
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // Limite pour éviter la surcharge mémoire

  // Mesurer le temps d'exécution d'une fonction
  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    this.recordMetric(name, end - start);
    return result;
  }

  // Mesurer une promesse
  async measurePromise<T>(name: string, promise: Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await promise;
      const end = performance.now();
      this.recordMetric(name, end - start);
      return result;
    } catch (error) {
      const end = performance.now();
      this.recordMetric(`${name}_error`, end - start, {
        error: (error as Error)?.message || String(error),
      });
      throw error;
    }
  }

  // Enregistrer une métrique personnalisée
  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      metadata,
    });

    // Nettoyer les anciennes métriques
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log en développement
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Performance] ${name}: ${value.toFixed(2)}ms`,
        metadata || ""
      );
    }
  }

  // Obtenir les statistiques
  getStats() {
    const stats: Record<
      string,
      {
        count: number;
        avg: number;
        min: number;
        max: number;
        last: number;
      }
    > = {};

    this.metrics.forEach((metric) => {
      if (!stats[metric.name]) {
        stats[metric.name] = {
          count: 0,
          avg: 0,
          min: Infinity,
          max: -Infinity,
          last: 0,
        };
      }

      const stat = stats[metric.name];
      stat.count++;
      stat.min = Math.min(stat.min, metric.value);
      stat.max = Math.max(stat.max, metric.value);
      stat.last = metric.value;
    });

    // Calculer les moyennes
    Object.keys(stats).forEach((name) => {
      const values = this.metrics
        .filter((m) => m.name === name)
        .map((m) => m.value);
      stats[name].avg = values.reduce((a, b) => a + b, 0) / values.length;
    });

    return stats;
  }

  // Exporter les métriques (pour analytics)
  exportMetrics() {
    return {
      timestamp: Date.now(),
      userAgent:
        typeof window !== "undefined" ? window.navigator.userAgent : "",
      metrics: this.metrics,
      stats: this.getStats(),
    };
  }

  // Nettoyer les métriques
  clear() {
    this.metrics = [];
  }
}

// Instance globale
export const performanceMonitor = new PerformanceMonitor();

// Hook React pour mesurer les composants
export function usePerformanceMeasurement(name: string) {
  const start = performance.now();

  return () => {
    const end = performance.now();
    performanceMonitor.recordMetric(`component_${name}`, end - start);
  };
}

// Wrapper pour mesurer les API calls
export function measureApiCall<T>(
  endpoint: string,
  apiCall: () => Promise<T>
): Promise<T> {
  return performanceMonitor.measurePromise(`api_${endpoint}`, apiCall());
}

// Mesurer le temps de chargement des pages
export function measurePageLoad(pageName: string) {
  if (typeof window !== "undefined") {
    window.addEventListener("load", () => {
      const loadTime = performance.now();
      performanceMonitor.recordMetric(`page_load_${pageName}`, loadTime);
    });
  }
}
