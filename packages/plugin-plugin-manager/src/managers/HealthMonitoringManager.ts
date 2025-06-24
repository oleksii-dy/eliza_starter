import { elizaLogger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import type { HealthCheckResult, HealthMetrics, AlertThreshold } from '../types.ts';
import { HealthStatus } from '../types.ts';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execAsync } from '../utils/execAsync.ts';

export class HealthMonitoringManager {
  private runtime: IAgentRuntime;
  private healthChecks = new Map<string, () => Promise<HealthCheckResult>>();
  private lastCheckResults = new Map<string, HealthCheckResult>();
  private checkInterval: NodeJS.Timeout | null = null;
  private checkIntervalMs = 30000; // 30 seconds
  private metricsHistory = new Map<string, HealthMetrics[]>();
  private metricsRetentionMs = 24 * 60 * 60 * 1000; // 24 hours
  private alertCallbacks = new Map<string, ((alert: any) => void)[]>();

  // Performance tracking
  private startTime = Date.now();
  private operationCounts = new Map<string, number>();
  private errorCounts = new Map<string, number>();

  // System resource monitoring
  private cpuUsageBaseline: NodeJS.CpuUsage | null = null;

  private statusCache = new Map<string, HealthStatus>();
  private pluginMetrics = new Map<string, HealthMetrics>();
  private checkIntervals = new Map<string, NodeJS.Timeout>();

  // Add new properties for threshold management
  private alertThresholds = new Map<string, AlertThreshold>();
  private thresholdBreaches = new Map<string, { firstBreach: number; value: number }>();

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async initialize(): Promise<void> {
    // Register system health checks
    this.registerSystemHealthChecks();

    // Register plugin health checks
    this.registerPluginHealthChecks();

    // Set default alert thresholds
    this.setDefaultAlertThresholds();

    // Start monitoring
    this.startMonitoring();

    // Initialize CPU baseline
    this.cpuUsageBaseline = process.cpuUsage();

    // Start periodic health checks
    this.startPeriodicChecks();

    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      elizaLogger.info('[HealthMonitoringManager] Initialized with comprehensive monitoring');
    }
  }

  async cleanup(): Promise<void> {
    // Stop periodic checks
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Stop individual plugin checks
    for (const [key, interval] of this.checkIntervals) {
      clearInterval(interval);
    }
    this.checkIntervals.clear();

    // Clear all data
    this.healthChecks.clear();
    this.lastCheckResults.clear();
    this.metricsHistory.clear();
    this.alertCallbacks.clear();
    this.pluginMetrics.clear();
    this.operationCounts.clear();
    this.errorCounts.clear();
    this.alertThresholds.clear();
    this.thresholdBreaches.clear();

    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      elizaLogger.info('[HealthMonitoringManager] Cleaned up');
    }
  }

  async performHealthCheck(pluginId: string): Promise<HealthCheckResult> {
    const checkKey = `plugin_${pluginId}`;
    const healthCheck = this.healthChecks.get(checkKey);

    if (!healthCheck) {
      // Create dynamic health check for plugin
      return this.performPluginHealthCheck(pluginId);
    }

    try {
      const result = await healthCheck();
      this.lastCheckResults.set(checkKey, result);
      this.recordMetrics(checkKey, this.resultToMetrics(result));
      await this.checkThresholds(checkKey, result);
      return result;
    } catch (_error) {
      const errorResult: HealthCheckResult = {
        status: HealthStatus.UNHEALTHY,
        message: `Health check failed: ${_error instanceof Error ? _error.message : String(_error)}`,
        details: { error: _error instanceof Error ? _error.message : String(_error) },
        timestamp: Date.now(),
      };
      this.lastCheckResults.set(checkKey, errorResult);
      this.incrementErrorCount(checkKey);
      return errorResult;
    }
  }

  async getHealthMetrics(pluginId?: string): Promise<HealthMetrics[]> {
    if (pluginId) {
      const metrics = this.pluginMetrics.get(pluginId);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.pluginMetrics.values());
  }

  async getPluginMetrics(pluginId: string): Promise<HealthMetrics | undefined> {
    return this.pluginMetrics.get(pluginId);
  }

  recordActionExecution(pluginId: string): void {
    const metrics = this.getOrCreateMetrics(pluginId);
    metrics.actionExecutions++;
    metrics.lastActive = Date.now();
  }

  recordProviderCall(pluginId: string): void {
    const metrics = this.getOrCreateMetrics(pluginId);
    metrics.providerCalls++;
    metrics.lastActive = Date.now();
  }

  recordError(pluginId: string, error: Error): void {
    const metrics = this.getOrCreateMetrics(pluginId);
    metrics.errors++;
    metrics.lastError = error;
    metrics.lastErrorTime = Date.now();

    // Update status based on _error count
    if (metrics.errors > 10) {
      metrics.status = HealthStatus.UNHEALTHY;
    } else if (metrics.errors > 5) {
      metrics.status = HealthStatus.WARNING;
    }
  }

  async recoverPlugin(
    pluginId: string,
    options?: { force?: boolean }
  ): Promise<{ success: boolean; message: string }> {
    const metrics = this.pluginMetrics.get(pluginId);
    if (!metrics) {
      return {
        success: false,
        message: `Plugin ${pluginId} not found`,
      };
    }

    elizaLogger.info(`[HealthMonitoringManager] Attempting to recover plugin ${pluginId}`);

    try {
      // Reset metrics
      metrics.errors = 0;
      metrics.actionExecutions = 0;
      metrics.providerCalls = 0;
      metrics.status = HealthStatus.HEALTHY;
      metrics.lastError = undefined;
      metrics.lastErrorTime = undefined;

      // Clear history
      this.metricsHistory.set(pluginId, []);

      elizaLogger.info(`[HealthMonitoringManager] Successfully recovered plugin ${pluginId}`);
      return {
        success: true,
        message: `Plugin ${pluginId} has been recovered and reset to healthy state`,
      };
    } catch (_error) {
      elizaLogger.error(`[HealthMonitoringManager] Failed to recover plugin ${pluginId}`, { _error });
      return {
        success: false,
        message: `Failed to recover plugin: ${_error instanceof Error ? _error.message : String(_error)}`,
      };
    }
  }

  async executeWithHealthCheck<T>(pluginId: string, fn: () => Promise<T>): Promise<T> {
    const metrics = this.pluginMetrics.get(pluginId);

    if (!metrics) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (metrics.status === HealthStatus.UNHEALTHY) {
      throw new Error(`Plugin ${pluginId} is in unhealthy state and cannot execute`);
    }

    if (metrics.status === HealthStatus.WARNING) {
      elizaLogger.warn(`[HealthMonitoringManager] Plugin ${pluginId} is in warning state but proceeding`);
    }

    try {
      const result = await fn();
      metrics.lastActive = Date.now();
      return result;
    } catch (_error) {
      this.recordError(pluginId, _error as Error);
      throw _error;
    }
  }

  registerHealthCheck(name: string, check: () => Promise<HealthCheckResult>): void {
    this.healthChecks.set(name, check);
    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      elizaLogger.info('[HealthMonitoringManager] Registered health check', { name });
    }
  }

  setAlertThreshold(name: string, threshold: AlertThreshold): void {
    this.alertThresholds.set(name, threshold);
    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      elizaLogger.info('[HealthMonitoringManager] Set alert threshold', {
        name,
        metric: threshold.metric,
        operator: threshold.operator,
        value: threshold.value,
        duration: threshold.duration,
      });
    }
  }

  onAlert(callback: (alert: any) => void): void {
    const id = `callback_${Date.now()}_${Math.random()}`;
    if (!this.alertCallbacks.has('global')) {
      this.alertCallbacks.set('global', []);
    }
    this.alertCallbacks.get('global')!.push(callback);
  }

  recordOperation(pluginId: string, operation: string): void {
    const key = `plugin_${pluginId}_${operation}`;
    const current = this.operationCounts.get(key) || 0;
    this.operationCounts.set(key, current + 1);
  }

  getOverallHealth(): HealthStatus {
    let worstStatus = HealthStatus.HEALTHY;

    for (const result of this.lastCheckResults.values()) {
      if (result.status > worstStatus) {
        worstStatus = result.status;
      }
    }

    return worstStatus;
  }

  getAllMetrics(): Record<string, HealthMetrics[]> {
    const allMetrics: Record<string, HealthMetrics[]> = {};

    for (const [name, history] of this.metricsHistory) {
      const cutoff = Date.now() - this.metricsRetentionMs;
      allMetrics[name] = history.filter((m) => m.timestamp > cutoff);
    }

    return allMetrics;
  }

  // Private methods

  private registerSystemHealthChecks(): void {
    // Memory health check
    this.registerHealthCheck('system_memory', async () => {
      const usage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryPercentage = (usedMemory / totalMemory) * 100;
      const heapPercentage = (usage.heapUsed / usage.heapTotal) * 100;

      let status = HealthStatus.HEALTHY;
      const warnings: string[] = [];

      if (memoryPercentage > 90) {
        status = HealthStatus.UNHEALTHY;
        warnings.push(`System memory critical: ${memoryPercentage.toFixed(1)}%`);
      } else if (memoryPercentage > 80) {
        status = HealthStatus.WARNING;
        warnings.push(`System memory high: ${memoryPercentage.toFixed(1)}%`);
      }

      if (heapPercentage > 90) {
        status = Math.max(status, HealthStatus.WARNING);
        warnings.push(`Heap usage critical: ${heapPercentage.toFixed(1)}%`);
      }

      return {
        status,
        message: warnings.length > 0 ? warnings.join('; ') : 'Memory usage normal',
        details: {
          system: {
            total: totalMemory,
            free: freeMemory,
            used: usedMemory,
            percentage: memoryPercentage,
          },
          process: {
            rss: usage.rss,
            heapTotal: usage.heapTotal,
            heapUsed: usage.heapUsed,
            external: usage.external,
            arrayBuffers: usage.arrayBuffers,
            heapPercentage,
          },
        },
        timestamp: Date.now(),
      };
    });

    // CPU health check
    this.registerHealthCheck('system_cpu', async () => {
      const cpus = os.cpus();
      const loadAvg = os.loadavg();
      const cpuCount = cpus.length;

      // Calculate CPU usage since baseline
      const usage = process.cpuUsage(this.cpuUsageBaseline ?? undefined);
      const totalTime = usage.user + usage.system;
      const elapsedTime = (Date.now() - this.startTime) * 1000; // Convert to microseconds
      const cpuPercentage = (totalTime / elapsedTime) * 100;

      let status = HealthStatus.HEALTHY;
      const warnings: string[] = [];

      // Check load average (1 minute)
      const normalizedLoad = loadAvg[0] / cpuCount;
      if (normalizedLoad > 2) {
        status = HealthStatus.UNHEALTHY;
        warnings.push(`CPU load critical: ${normalizedLoad.toFixed(2)}`);
      } else if (normalizedLoad > 1) {
        status = HealthStatus.WARNING;
        warnings.push(`CPU load high: ${normalizedLoad.toFixed(2)}`);
      }

      if (cpuPercentage > 80) {
        status = Math.max(status, HealthStatus.WARNING);
        warnings.push(`Process CPU usage high: ${cpuPercentage.toFixed(1)}%`);
      }

      return {
        status,
        message: warnings.length > 0 ? warnings.join('; ') : 'CPU usage normal',
        details: {
          cores: cpuCount,
          loadAverage: {
            '1min': loadAvg[0],
            '5min': loadAvg[1],
            '15min': loadAvg[2],
          },
          processUsage: {
            user: usage.user,
            system: usage.system,
            percentage: cpuPercentage,
          },
        },
        timestamp: Date.now(),
      };
    });

    // Disk space health check
    this.registerHealthCheck('system_disk', async () => {
      try {
        // This is a simplified check - in production you'd use a proper disk space library
        const pluginDir = path.resolve(process.cwd(), '.plugin-manager');
        const stats = await fs.statfs(pluginDir).catch(() => null);

        if (!stats) {
          return {
            status: HealthStatus.WARNING,
            message: 'Unable to check disk space',
            details: {},
            timestamp: Date.now(),
          };
        }

        const totalSpace = stats.blocks * stats.bsize;
        const freeSpace = stats.bfree * stats.bsize;
        const usedSpace = totalSpace - freeSpace;
        const usagePercentage = (usedSpace / totalSpace) * 100;

        let status = HealthStatus.HEALTHY;
        let message = 'Disk space adequate';

        if (freeSpace < 100 * 1024 * 1024) {
          // Less than 100MB
          status = HealthStatus.UNHEALTHY;
          message = 'Disk space critical: Less than 100MB free';
        } else if (usagePercentage > 90) {
          status = HealthStatus.UNHEALTHY;
          message = `Disk usage critical: ${usagePercentage.toFixed(1)}%`;
        } else if (usagePercentage > 80) {
          status = HealthStatus.WARNING;
          message = `Disk usage high: ${usagePercentage.toFixed(1)}%`;
        }

        return {
          status,
          message,
          details: {
            totalSpace,
            freeSpace,
            usedSpace,
            usagePercentage,
          },
          timestamp: Date.now(),
        };
      } catch (_error) {
        return {
          status: HealthStatus.WARNING,
          message: 'Disk check failed',
          details: { error: _error instanceof Error ? _error.message : String(_error) },
          timestamp: Date.now(),
        };
      }
    });

    // Event loop health check
    this.registerHealthCheck('system_eventloop', async () => {
      const start = Date.now();

      // Measure event loop delay
      await new Promise((resolve) => setImmediate(resolve));
      const delay = Date.now() - start;

      let status = HealthStatus.HEALTHY;
      let message = 'Event loop responsive';

      if (delay > 100) {
        status = HealthStatus.UNHEALTHY;
        message = `Event loop blocked: ${delay}ms delay`;
      } else if (delay > 50) {
        status = HealthStatus.WARNING;
        message = `Event loop slow: ${delay}ms delay`;
      }

      return {
        status,
        message,
        details: {
          delay,
          activeHandles: (process as any)._getActiveHandles?.()?.length || 0,
          activeRequests: (process as any)._getActiveRequests?.()?.length || 0,
        },
        timestamp: Date.now(),
      };
    });
  }

  private registerPluginHealthChecks(): void {
    // Plugin manager service health
    this.registerHealthCheck('service_plugin_manager', async () => {
      try {
        const service = this.runtime?.getService('plugin-manager');
        if (!service) {
          return {
            status: HealthStatus.UNHEALTHY,
            message: 'Plugin manager service not available',
            details: {},
            timestamp: Date.now(),
          };
        }

        // Check if service can respond
        const plugins = await (service as any).listInstalledPlugins?.();

        return {
          status: HealthStatus.HEALTHY,
          message: 'Plugin manager service operational',
          details: {
            pluginCount: plugins?.length || 0,
          },
          timestamp: Date.now(),
        };
      } catch (_error) {
        return {
          status: HealthStatus.UNHEALTHY,
          message: `Plugin manager service error: ${_error instanceof Error ? _error.message : String(_error)}`,
          details: { error: _error instanceof Error ? _error.message : String(_error) },
          timestamp: Date.now(),
        };
      }
    });
  }

  private async performPluginHealthCheck(pluginId: string): Promise<HealthCheckResult> {
    try {
      const pluginManager = this.runtime?.getService('plugin-manager');
      if (!pluginManager) {
        return {
          status: HealthStatus.UNKNOWN,
          message: 'Plugin manager not available',
          details: {},
          timestamp: Date.now(),
        };
      }

      const pluginState = await (pluginManager as any).getPluginState?.(pluginId);
      if (!pluginState) {
        return {
          status: HealthStatus.UNKNOWN,
          message: 'Plugin not found',
          details: {},
          timestamp: Date.now(),
        };
      }

      // Check plugin status
      let status = HealthStatus.HEALTHY;
      let message = 'Plugin operational';
      const details: any = {
        pluginId,
        version: pluginState.version,
        status: pluginState.status,
      };

      // Check for errors
      const errorCount = this.errorCounts.get(`plugin_${pluginId}`) || 0;
      if (errorCount > 10) {
        status = HealthStatus.UNHEALTHY;
        message = `High error rate: ${errorCount} errors`;
        details.errorCount = errorCount;
      } else if (errorCount > 5) {
        status = HealthStatus.WARNING;
        message = `Elevated error rate: ${errorCount} errors`;
        details.errorCount = errorCount;
      }

      // Check operation count
      const opCount = this.operationCounts.get(`plugin_${pluginId}`) || 0;
      details.operationCount = opCount;

      return {
        status,
        message,
        details,
        timestamp: Date.now(),
      };
    } catch (_error) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: `Plugin health check failed: ${_error instanceof Error ? _error.message : String(_error)}`,
        details: { error: _error instanceof Error ? _error.message : String(_error) },
        timestamp: Date.now(),
      };
    }
  }

  private setDefaultAlertThresholds(): void {
    // Memory thresholds
    this.setAlertThreshold('system_memory', {
      metric: 'memory_percentage',
      operator: '>',
      value: 85,
      duration: 60000, // 1 minute
    });

    // CPU thresholds
    this.setAlertThreshold('system_cpu', {
      metric: 'cpu_percentage',
      operator: '>',
      value: 80,
      duration: 120000, // 2 minutes
    });

    // Disk thresholds
    this.setAlertThreshold('system_disk', {
      metric: 'usage_percentage',
      operator: '>',
      value: 90,
      duration: 0, // Immediate
    });

    // Event loop thresholds
    this.setAlertThreshold('system_eventloop', {
      metric: 'delay',
      operator: '>',
      value: 100,
      duration: 30000, // 30 seconds
    });

    // Error rate thresholds
    this.setAlertThreshold('error_rate', {
      metric: 'errors_per_minute',
      operator: '>',
      value: 10,
      duration: 60000, // 1 minute
    });
  }

  private startMonitoring(): void {
    // Perform initial checks
    this.performAllHealthChecks();

    // Schedule periodic checks
    this.checkInterval = setInterval(() => {
      this.performAllHealthChecks();
    }, this.checkIntervalMs);
  }

  private async performAllHealthChecks(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [name, check] of this.healthChecks) {
      promises.push(
        (async () => {
          try {
            const result = await check();
            this.lastCheckResults.set(name, result);
            this.recordMetrics(name, this.resultToMetrics(result));
            await this.checkThresholds(name, result);
          } catch (_error) {
            elizaLogger.error('[HealthMonitoringManager] Health check failed', {
              check: name,
              error: _error instanceof Error ? _error.message : String(_error),
              stack: _error instanceof Error ? _error.stack : undefined,
            });
          }
        })()
      );
    }

    await Promise.all(promises);
  }

  private resultToMetrics(result: HealthCheckResult): HealthMetrics {
    const metrics: HealthMetrics = {
      timestamp: result.timestamp,
      status: result.status,
    };

    // Extract numeric metrics from details
    if (result.details) {
      const extractMetrics = (obj: any, prefix = ''): void => {
        for (const [key, value] of Object.entries(obj)) {
          const metricKey = prefix ? `${prefix}_${key}` : key;
          if (typeof value === 'number') {
            metrics[metricKey] = value;
          } else if (typeof value === 'object' && value !== null) {
            extractMetrics(value, metricKey);
          }
        }
      };
      extractMetrics(result.details);
    }

    return metrics;
  }

  private recordMetrics(name: string, metrics: HealthMetrics): void {
    if (!this.metricsHistory.has(name)) {
      this.metricsHistory.set(name, []);
    }

    const history = this.metricsHistory.get(name)!;
    history.push(metrics);

    // Cleanup old metrics
    const cutoff = Date.now() - this.metricsRetentionMs;
    const filtered = history.filter((m) => m.timestamp > cutoff);
    this.metricsHistory.set(name, filtered);
  }

  private async checkThresholds(name: string, result: HealthCheckResult): Promise<void> {
    const threshold = this.alertThresholds.get(name);
    if (!threshold) {return;}

    // Extract the metric value from the result
    const metrics = this.resultToMetrics(result);
    const metricValue = metrics[threshold.metric];

    if (metricValue === undefined) {return;}

    // Check if threshold is breached
    let isBreached = false;
    switch (threshold.operator) {
      case '>':
        isBreached = metricValue > threshold.value;
        break;
      case '<':
        isBreached = metricValue < threshold.value;
        break;
      case '>=':
        isBreached = metricValue >= threshold.value;
        break;
      case '<=':
        isBreached = metricValue <= threshold.value;
        break;
      case '==':
        isBreached = metricValue === threshold.value;
        break;
    }

    const breachKey = `${name}_${threshold.metric}`;

    if (isBreached) {
      // Record or update breach
      const existingBreach = this.thresholdBreaches.get(breachKey);
      if (!existingBreach) {
        this.thresholdBreaches.set(breachKey, {
          firstBreach: Date.now(),
          value: metricValue,
        });
      }

      // Check if breach has persisted long enough
      const breach = this.thresholdBreaches.get(breachKey)!;
      const breachDuration = Date.now() - breach.firstBreach;

      if (breachDuration >= threshold.duration) {
        // Trigger alert
        const alert = {
          type: 'threshold-breach',
          name,
          metric: threshold.metric,
          operator: threshold.operator,
          threshold: threshold.value,
          actualValue: metricValue,
          duration: breachDuration,
          status: result.status,
          message: `${threshold.metric} ${threshold.operator} ${threshold.value} (actual: ${metricValue})`,
          timestamp: Date.now(),
        };

        // Notify all registered callbacks
        const globalCallbacks = this.alertCallbacks.get('global') || [];
        const specificCallbacks = this.alertCallbacks.get(name) || [];
        const allCallbacks = [...globalCallbacks, ...specificCallbacks];

        for (const callback of allCallbacks) {
          try {
            callback(alert);
          } catch (_error) {
            if (_error instanceof Error) {
              elizaLogger.error('[HealthMonitoringManager] Error in alert callback', { error: _error.message, name });
            }
          }
        }

        // Log the alert
        elizaLogger.warn('[HealthMonitoringManager] Threshold breach alert', alert);
      }
    } else {
      // Clear breach if it exists
      this.thresholdBreaches.delete(breachKey);
    }
  }

  private incrementErrorCount(key: string): void {
    const current = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, current + 1);
  }

  private getOrCreateMetrics(pluginId: string): HealthMetrics {
    if (!this.pluginMetrics.has(pluginId)) {
      const metrics: HealthMetrics = {
        timestamp: Date.now(),
        status: HealthStatus.HEALTHY,
        actionExecutions: 0,
        providerCalls: 0,
        errors: 0,
        lastActive: Date.now(),
        lastError: undefined,
        lastErrorTime: undefined,
      };
      this.pluginMetrics.set(pluginId, metrics);
    }
    return this.pluginMetrics.get(pluginId)!;
  }

  private startPeriodicChecks(): void {
    // Start monitoring for each registered plugin
    for (const [pluginId, metrics] of this.pluginMetrics) {
      const checkKey = `plugin_${pluginId}`;

      // Skip if already has a periodic check
      if (this.checkIntervals.has(checkKey)) {continue;}

      // Create periodic health check for this plugin
      const interval = setInterval(async () => {
        try {
          await this.performHealthCheck(pluginId);
        } catch (_error) {
          elizaLogger.error('[HealthMonitoringManager] Periodic check failed', {
            pluginId,
            error: _error instanceof Error ? _error.message : String(_error),
          });
        }
      }, this.checkIntervalMs);

      this.checkIntervals.set(checkKey, interval);
    }

    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      elizaLogger.info('[HealthMonitoringManager] Started periodic checks', {
        pluginCount: this.pluginMetrics.size,
        interval: this.checkIntervalMs,
      });
    }
  }
}
