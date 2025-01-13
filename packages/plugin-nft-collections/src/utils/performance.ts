import { EventEmitter } from "events";

export interface PerformanceMetric {
    operation: string;
    duration: number;
    timestamp: Date;
    success: boolean;
    metadata?: Record<string, unknown>;
}

export interface PerformanceAlert {
    type: "LATENCY" | "ERROR_RATE" | "THROUGHPUT";
    threshold: number;
    current: number;
    operation: string;
    timestamp: Date;
}

export interface PerformanceConfig {
    maxMetrics?: number;
    alertThresholds?: {
        latency?: number;
        errorRate?: number;
        throughput?: number;
    };
    logFunction?: (message: string, level?: "info" | "warn" | "error") => void;
}

export class PerformanceMonitor extends EventEmitter {
    private static instance: PerformanceMonitor;
    private metrics: PerformanceMetric[] = [];
    private config: Required<PerformanceConfig> = {
        maxMetrics: 1000,
        alertThresholds: {
            latency: 2000, // 2 seconds
            errorRate: 0.1, // 10%
            throughput: 10, // requests per second
        },
        logFunction: console.log,
    };

    private constructor(config?: PerformanceConfig) {
        super();
        this.configure(config);
        this.startPeriodicCheck();
    }

    static getInstance(config?: PerformanceConfig): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor(config);
        }
        return PerformanceMonitor.instance;
    }

    // Configure performance monitor
    configure(config?: PerformanceConfig): void {
        if (config) {
            this.config = {
                maxMetrics: config.maxMetrics ?? this.config.maxMetrics,
                alertThresholds: {
                    ...this.config.alertThresholds,
                    ...config.alertThresholds,
                },
                logFunction: config.logFunction ?? this.config.logFunction,
            };
        }
    }

    // Record a performance metric with improved error handling
    recordMetric(metric: Omit<PerformanceMetric, "timestamp">): void {
        try {
            const fullMetric = {
                ...metric,
                timestamp: new Date(),
            };

            this.metrics.push(fullMetric);
            if (this.metrics.length > this.config.maxMetrics) {
                this.metrics.shift();
            }

            this.checkThresholds(fullMetric);
        } catch (error) {
            this.config.logFunction(
                `Error recording metric: ${error}`,
                "error"
            );
        }
    }

    // Start measuring operation duration with error tracking
    startOperation(
        operation: string,
        metadata?: Record<string, unknown>
    ): () => void {
        const startTime = performance.now();
        return () => {
            try {
                const duration = performance.now() - startTime;
                this.recordMetric({
                    operation,
                    duration,
                    success: true,
                    metadata,
                });
            } catch (error) {
                this.config.logFunction(
                    `Error in operation tracking: ${error}`,
                    "error"
                );
            }
        };
    }

    // Get average latency for an operation
    getAverageLatency(operation: string, timeWindowMs: number = 60000): number {
        const relevantMetrics = this.getRecentMetrics(operation, timeWindowMs);
        if (relevantMetrics.length === 0) return 0;

        const totalDuration = relevantMetrics.reduce(
            (sum, metric) => sum + metric.duration,
            0
        );
        return totalDuration / relevantMetrics.length;
    }

    // Get error rate for an operation
    getErrorRate(operation: string, timeWindowMs: number = 60000): number {
        const relevantMetrics = this.getRecentMetrics(operation, timeWindowMs);
        if (relevantMetrics.length === 0) return 0;

        const errorCount = relevantMetrics.filter(
            (metric) => !metric.success
        ).length;
        return errorCount / relevantMetrics.length;
    }

    // Get throughput (operations per second)
    getThroughput(operation: string, timeWindowMs: number = 60000): number {
        const relevantMetrics = this.getRecentMetrics(operation, timeWindowMs);
        return (relevantMetrics.length / timeWindowMs) * 1000;
    }

    // Get performance summary
    getPerformanceSummary(timeWindowMs: number = 60000): Record<
        string,
        {
            averageLatency: number;
            errorRate: number;
            throughput: number;
        }
    > {
        const operations = new Set(this.metrics.map((m) => m.operation));
        const summary: Record<string, any> = {};

        for (const operation of operations) {
            summary[operation] = {
                averageLatency: this.getAverageLatency(operation, timeWindowMs),
                errorRate: this.getErrorRate(operation, timeWindowMs),
                throughput: this.getThroughput(operation, timeWindowMs),
            };
        }

        return summary;
    }

    private getRecentMetrics(
        operation: string,
        timeWindowMs: number
    ): PerformanceMetric[] {
        const now = new Date();
        const windowStart = new Date(now.getTime() - timeWindowMs);
        return this.metrics.filter(
            (metric) =>
                metric.operation === operation &&
                metric.timestamp >= windowStart
        );
    }

    private checkThresholds(metric: PerformanceMetric): void {
        const { alertThresholds } = this.config;

        try {
            // Latency check
            if (metric.duration > alertThresholds.latency) {
                this.emitAlert({
                    type: "LATENCY",
                    threshold: alertThresholds.latency,
                    current: metric.duration,
                    operation: metric.operation,
                    timestamp: new Date(),
                });
            }

            // Error rate check
            const errorRate = this.getErrorRate(metric.operation);
            if (errorRate > alertThresholds.errorRate) {
                this.emitAlert({
                    type: "ERROR_RATE",
                    threshold: alertThresholds.errorRate,
                    current: errorRate,
                    operation: metric.operation,
                    timestamp: new Date(),
                });
            }

            // Throughput check
            const throughput = this.getThroughput(metric.operation);
            if (throughput > alertThresholds.throughput) {
                this.emitAlert({
                    type: "THROUGHPUT",
                    threshold: alertThresholds.throughput,
                    current: throughput,
                    operation: metric.operation,
                    timestamp: new Date(),
                });
            }
        } catch (error) {
            this.config.logFunction(
                `Error in threshold checking: ${error}`,
                "error"
            );
        }
    }

    private emitAlert(alert: PerformanceAlert): void {
        this.emit("alert", alert);
    }

    private startPeriodicCheck(): void {
        setInterval(() => {
            const summary = this.getPerformanceSummary();
            this.emit("performance-summary", summary);
        }, 60000); // Check every minute
    }
}

// Enhanced usage example
/*
const monitor = PerformanceMonitor.getInstance({
    maxMetrics: 500,
    alertThresholds: {
        latency: 1500, // more aggressive latency threshold
        errorRate: 0.05 // tighter error rate
    },
    logFunction: (msg, level) => {
        // Custom logging, e.g., to a file or monitoring service
        console[level ?? 'log'](msg);
    }
});
*/
