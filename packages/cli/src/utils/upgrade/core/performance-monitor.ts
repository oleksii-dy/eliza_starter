/**
 * PERFORMANCE MONITOR
 *
 * Tracks performance metrics for AI strategies and transformations.
 * Provides insights for optimization and cost management.
 */

import { logger } from '@elizaos/core';

export interface PerformanceMetrics {
  totalTransformations: number;
  successRate: number;
  avgCost: number;
  avgDuration: number;
  strategyCounts: Map<string, number>;
  costByStrategy: Map<string, number>;
  durationByStrategy: Map<string, number>;
  successByStrategy: Map<string, number>;
}

export interface StrategyMetrics {
  name: string;
  executions: number;
  successes: number;
  failures: number;
  totalCost: number;
  totalDuration: number;
  avgCost: number;
  avgDuration: number;
  successRate: number;
}

export class PerformanceMonitor {
  private strategyCounts = new Map<string, number>();
  private strategySuccesses = new Map<string, number>();
  private strategyFailures = new Map<string, number>();
  private strategyCosts = new Map<string, number>();
  private strategyDurations = new Map<string, number>();
  private transformationHistory: Array<{
    timestamp: number;
    strategy: string;
    success: boolean;
    cost: number;
    duration: number;
    file?: string;
  }> = [];

  private currentStrategy: string | null = null;
  private currentStartTime: number = 0;

  /**
   * Start tracking a strategy execution
   */
  startStrategy(strategyName: string): void {
    this.currentStrategy = strategyName;
    this.currentStartTime = Date.now();

    // Increment execution count
    const currentCount = this.strategyCounts.get(strategyName) || 0;
    this.strategyCounts.set(strategyName, currentCount + 1);

    logger.debug(`📊 Started tracking strategy: ${strategyName}`);
  }

  /**
   * End tracking a strategy execution
   */
  endStrategy(strategyName: string, success: boolean, duration: number, cost: number = 0): void {
    if (this.currentStrategy !== strategyName) {
      logger.warn(`⚠️ Strategy mismatch: expected ${this.currentStrategy}, got ${strategyName}`);
    }

    // Record success/failure
    if (success) {
      const currentSuccesses = this.strategySuccesses.get(strategyName) || 0;
      this.strategySuccesses.set(strategyName, currentSuccesses + 1);
    } else {
      const currentFailures = this.strategyFailures.get(strategyName) || 0;
      this.strategyFailures.set(strategyName, currentFailures + 1);
    }

    // Record cost and duration
    const currentCost = this.strategyCosts.get(strategyName) || 0;
    this.strategyCosts.set(strategyName, currentCost + cost);

    const currentDuration = this.strategyDurations.get(strategyName) || 0;
    this.strategyDurations.set(strategyName, currentDuration + duration);

    // Add to history
    this.transformationHistory.push({
      timestamp: Date.now(),
      strategy: strategyName,
      success,
      cost,
      duration,
    });

    // Clear current tracking
    this.currentStrategy = null;
    this.currentStartTime = 0;

    logger.debug(
      `📊 Ended tracking strategy: ${strategyName} (${success ? 'success' : 'failure'})`
    );
  }

  /**
   * Record a successful transformation
   */
  recordSuccess(file: string, level: number, duration: number): void {
    logger.info(
      `📈 Recorded successful transformation: ${file} at level ${level} in ${duration}ms`
    );
  }

  /**
   * Get comprehensive performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const totalTransformations = this.transformationHistory.length;
    const successes = this.transformationHistory.filter((t) => t.success).length;
    const successRate = totalTransformations > 0 ? successes / totalTransformations : 0;

    const totalCost = this.transformationHistory.reduce((sum, t) => sum + t.cost, 0);
    const avgCost = totalTransformations > 0 ? totalCost / totalTransformations : 0;

    const totalDuration = this.transformationHistory.reduce((sum, t) => sum + t.duration, 0);
    const avgDuration = totalTransformations > 0 ? totalDuration / totalTransformations : 0;

    return {
      totalTransformations,
      successRate,
      avgCost,
      avgDuration,
      strategyCounts: new Map(this.strategyCounts),
      costByStrategy: new Map(this.strategyCosts),
      durationByStrategy: new Map(this.strategyDurations),
      successByStrategy: new Map(this.strategySuccesses),
    };
  }

  /**
   * Get metrics for a specific strategy
   */
  getStrategyMetrics(strategyName: string): StrategyMetrics {
    const executions = this.strategyCounts.get(strategyName) || 0;
    const successes = this.strategySuccesses.get(strategyName) || 0;
    const failures = this.strategyFailures.get(strategyName) || 0;
    const totalCost = this.strategyCosts.get(strategyName) || 0;
    const totalDuration = this.strategyDurations.get(strategyName) || 0;

    return {
      name: strategyName,
      executions,
      successes,
      failures,
      totalCost,
      totalDuration,
      avgCost: executions > 0 ? totalCost / executions : 0,
      avgDuration: executions > 0 ? totalDuration / executions : 0,
      successRate: executions > 0 ? successes / executions : 0,
    };
  }

  /**
   * Get the most efficient strategy
   */
  getMostEfficientStrategy(): {
    name: string;
    efficiency: number;
    metrics: StrategyMetrics;
  } | null {
    const strategies = Array.from(this.strategyCounts.keys());

    if (strategies.length === 0) {
      return null;
    }

    let bestStrategy = strategies[0];
    let bestEfficiency = 0;

    for (const strategy of strategies) {
      const metrics = this.getStrategyMetrics(strategy);

      // Efficiency = success rate / (cost + duration factor)
      const costFactor = metrics.avgCost * 100; // Scale cost
      const durationFactor = metrics.avgDuration / 1000; // Convert ms to seconds
      const efficiency = metrics.successRate / (1 + costFactor + durationFactor);

      if (efficiency > bestEfficiency) {
        bestEfficiency = efficiency;
        bestStrategy = strategy;
      }
    }

    return {
      name: bestStrategy,
      efficiency: bestEfficiency,
      metrics: this.getStrategyMetrics(bestStrategy),
    };
  }

  /**
   * Get cost analysis
   */
  getCostAnalysis(): {
    totalCost: number;
    avgCostPerTransformation: number;
    costByStrategy: Array<{ strategy: string; cost: number; percentage: number }>;
    mostExpensiveStrategy: string;
    cheapestStrategy: string;
  } {
    const totalCost = Array.from(this.strategyCosts.values()).reduce((sum, cost) => sum + cost, 0);
    const avgCost =
      this.transformationHistory.length > 0 ? totalCost / this.transformationHistory.length : 0;

    const costByStrategy = Array.from(this.strategyCosts.entries()).map(([strategy, cost]) => ({
      strategy,
      cost,
      percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
    }));

    costByStrategy.sort((a, b) => b.cost - a.cost);

    return {
      totalCost,
      avgCostPerTransformation: avgCost,
      costByStrategy,
      mostExpensiveStrategy: costByStrategy[0]?.strategy || 'none',
      cheapestStrategy: costByStrategy[costByStrategy.length - 1]?.strategy || 'none',
    };
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(timeRangeMs: number = 24 * 60 * 60 * 1000): {
    successRateTrend: number;
    costTrend: number;
    durationTrend: number;
    recentTransformations: number;
  } {
    const cutoffTime = Date.now() - timeRangeMs;
    const recentHistory = this.transformationHistory.filter((t) => t.timestamp >= cutoffTime);

    if (recentHistory.length === 0) {
      return {
        successRateTrend: 0,
        costTrend: 0,
        durationTrend: 0,
        recentTransformations: 0,
      };
    }

    // Calculate trends (simplified - just comparing first half vs second half)
    const midPoint = Math.floor(recentHistory.length / 2);
    const firstHalf = recentHistory.slice(0, midPoint);
    const secondHalf = recentHistory.slice(midPoint);

    const firstHalfSuccessRate =
      firstHalf.length > 0 ? firstHalf.filter((t) => t.success).length / firstHalf.length : 0;
    const secondHalfSuccessRate =
      secondHalf.length > 0 ? secondHalf.filter((t) => t.success).length / secondHalf.length : 0;

    const firstHalfAvgCost =
      firstHalf.length > 0 ? firstHalf.reduce((sum, t) => sum + t.cost, 0) / firstHalf.length : 0;
    const secondHalfAvgCost =
      secondHalf.length > 0
        ? secondHalf.reduce((sum, t) => sum + t.cost, 0) / secondHalf.length
        : 0;

    const firstHalfAvgDuration =
      firstHalf.length > 0
        ? firstHalf.reduce((sum, t) => sum + t.duration, 0) / firstHalf.length
        : 0;
    const secondHalfAvgDuration =
      secondHalf.length > 0
        ? secondHalf.reduce((sum, t) => sum + t.duration, 0) / secondHalf.length
        : 0;

    return {
      successRateTrend: secondHalfSuccessRate - firstHalfSuccessRate,
      costTrend: secondHalfAvgCost - firstHalfAvgCost,
      durationTrend: secondHalfAvgDuration - firstHalfAvgDuration,
      recentTransformations: recentHistory.length,
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const costAnalysis = this.getCostAnalysis();
    const trends = this.getPerformanceTrends();
    const mostEfficient = this.getMostEfficientStrategy();

    let report = `# AI Strategy Performance Report\n\n`;

    report += `## Overall Metrics\n`;
    report += `- Total Transformations: ${metrics.totalTransformations}\n`;
    report += `- Success Rate: ${(metrics.successRate * 100).toFixed(1)}%\n`;
    report += `- Average Cost: $${metrics.avgCost.toFixed(4)}\n`;
    report += `- Average Duration: ${metrics.avgDuration.toFixed(0)}ms\n\n`;

    report += `## Cost Analysis\n`;
    report += `- Total Cost: $${costAnalysis.totalCost.toFixed(4)}\n`;
    report += `- Most Expensive Strategy: ${costAnalysis.mostExpensiveStrategy}\n`;
    report += `- Cheapest Strategy: ${costAnalysis.cheapestStrategy}\n\n`;

    if (mostEfficient) {
      report += `## Most Efficient Strategy\n`;
      report += `- Strategy: ${mostEfficient.name}\n`;
      report += `- Efficiency Score: ${mostEfficient.efficiency.toFixed(3)}\n`;
      report += `- Success Rate: ${(mostEfficient.metrics.successRate * 100).toFixed(1)}%\n`;
      report += `- Average Cost: $${mostEfficient.metrics.avgCost.toFixed(4)}\n\n`;
    }

    report += `## Performance Trends (24h)\n`;
    report += `- Success Rate Trend: ${trends.successRateTrend >= 0 ? '+' : ''}${(trends.successRateTrend * 100).toFixed(1)}%\n`;
    report += `- Cost Trend: ${trends.costTrend >= 0 ? '+' : ''}$${trends.costTrend.toFixed(4)}\n`;
    report += `- Duration Trend: ${trends.durationTrend >= 0 ? '+' : ''}${trends.durationTrend.toFixed(0)}ms\n`;
    report += `- Recent Transformations: ${trends.recentTransformations}\n\n`;

    report += `## Strategy Breakdown\n`;
    for (const [strategy, count] of metrics.strategyCounts.entries()) {
      const strategyMetrics = this.getStrategyMetrics(strategy);
      report += `### ${strategy}\n`;
      report += `- Executions: ${count}\n`;
      report += `- Success Rate: ${(strategyMetrics.successRate * 100).toFixed(1)}%\n`;
      report += `- Average Cost: $${strategyMetrics.avgCost.toFixed(4)}\n`;
      report += `- Average Duration: ${strategyMetrics.avgDuration.toFixed(0)}ms\n\n`;
    }

    return report;
  }

  /**
   * Export performance data
   */
  exportData(): string {
    return JSON.stringify(
      {
        metrics: this.getMetrics(),
        strategyCounts: Array.from(this.strategyCounts.entries()),
        strategySuccesses: Array.from(this.strategySuccesses.entries()),
        strategyFailures: Array.from(this.strategyFailures.entries()),
        strategyCosts: Array.from(this.strategyCosts.entries()),
        strategyDurations: Array.from(this.strategyDurations.entries()),
        transformationHistory: this.transformationHistory,
        timestamp: Date.now(),
      },
      null,
      2
    );
  }

  /**
   * Import performance data
   */
  importData(data: string): void {
    try {
      const parsed = JSON.parse(data);

      this.strategyCounts = new Map(parsed.strategyCounts || []);
      this.strategySuccesses = new Map(parsed.strategySuccesses || []);
      this.strategyFailures = new Map(parsed.strategyFailures || []);
      this.strategyCosts = new Map(parsed.strategyCosts || []);
      this.strategyDurations = new Map(parsed.strategyDurations || []);
      this.transformationHistory = parsed.transformationHistory || [];

      logger.info(
        `📊 Imported performance data with ${this.transformationHistory.length} transformations`
      );
    } catch (error) {
      logger.error('❌ Failed to import performance data:', error);
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.strategyCounts.clear();
    this.strategySuccesses.clear();
    this.strategyFailures.clear();
    this.strategyCosts.clear();
    this.strategyDurations.clear();
    this.transformationHistory = [];
    this.currentStrategy = null;
    this.currentStartTime = 0;

    logger.info('📊 Performance metrics reset');
  }
}
