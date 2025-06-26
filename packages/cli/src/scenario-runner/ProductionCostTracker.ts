/**
 * Production Cost Tracker for Real-World Benchmarking
 * Tracks actual API costs, service costs, and real-world expenses for agent benchmarks
 */

// IMPLEMENTED: Real cost calculation with actual API usage tracking and comprehensive cost analysis

import { logger } from '@elizaos/core';

export interface BenchmarkCost {
  id: string;
  benchmarkId: string;
  agentId: string;
  provider: string;
  service: string;
  operation: string;
  cost: number;
  currency: 'USD';
  timestamp: number;
  metadata: Record<string, any>;
}

export interface CostReport {
  benchmarkId: string;
  totalCost: number;
  currency: 'USD';
  breakdown: {
    provider: string;
    service: string;
    cost: number;
    percentage: number;
  }[];
  recommendations: string[];
  budgetStatus: {
    used: number;
    remaining: number;
    percentage: number;
    exceeded: boolean;
  };
}

export interface BenchmarkBudget {
  benchmarkId: string;
  maxTotalCost: number;
  maxPerAgent: number;
  maxPerTask: number;
  currency: 'USD';
  emergencyStop: boolean;
  approvalRequired: boolean;
  warningThreshold: number; // 0.0 to 1.0 (percentage of budget)
}

export class ProductionCostTracker {
  private costs: Map<string, BenchmarkCost[]> = new Map();
  private budgets: Map<string, BenchmarkBudget> = new Map();
  private emergencyStops: Set<string> = new Set();

  constructor() {
    logger.info('ProductionCostTracker initialized for real-world benchmarking');
  }

  /**
   * Set budget for a benchmark
   */
  setBenchmarkBudget(budget: BenchmarkBudget): void {
    this.budgets.set(budget.benchmarkId, budget);
    logger.info(`Budget set for benchmark ${budget.benchmarkId}: $${budget.maxTotalCost}`);
  }

  /**
   * Track OpenAI API costs
   */
  async trackOpenAICall(
    benchmarkId: string,
    agentId: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<void> {
    const cost = this.calculateOpenAICost(model, inputTokens, outputTokens);

    await this.recordCost({
      id: `openai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      benchmarkId,
      agentId,
      provider: 'openai',
      service: 'llm',
      operation: model,
      cost,
      currency: 'USD',
      timestamp: Date.now(),
      metadata: {
        model,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    });
  }

  /**
   * Track Anthropic API costs
   */
  async trackAnthropicCall(
    benchmarkId: string,
    agentId: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<void> {
    const cost = this.calculateAnthropicCost(model, inputTokens, outputTokens);

    await this.recordCost({
      id: `anthropic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      benchmarkId,
      agentId,
      provider: 'anthropic',
      service: 'llm',
      operation: model,
      cost,
      currency: 'USD',
      timestamp: Date.now(),
      metadata: {
        model,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    });
  }

  /**
   * Track blockchain transaction costs
   */
  async trackBlockchainTransaction(
    benchmarkId: string,
    agentId: string,
    network: string,
    transactionType: string,
    gasCost: number,
    transactionValue?: number
  ): Promise<void> {
    const cost = gasCost + (transactionValue || 0);

    await this.recordCost({
      id: `blockchain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      benchmarkId,
      agentId,
      provider: 'blockchain',
      service: network,
      operation: transactionType,
      cost,
      currency: 'USD',
      timestamp: Date.now(),
      metadata: {
        network,
        transactionType,
        gasCost,
        transactionValue: transactionValue || 0,
      },
    });
  }

  /**
   * Track e-commerce purchases
   */
  async trackEcommercePurchase(
    benchmarkId: string,
    agentId: string,
    platform: string,
    productId: string,
    purchaseAmount: number,
    fees: number = 0
  ): Promise<void> {
    const cost = purchaseAmount + fees;

    await this.recordCost({
      id: `ecommerce-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      benchmarkId,
      agentId,
      provider: 'ecommerce',
      service: platform,
      operation: 'purchase',
      cost,
      currency: 'USD',
      timestamp: Date.now(),
      metadata: {
        platform,
        productId,
        purchaseAmount,
        fees,
      },
    });
  }

  /**
   * Track advertising costs
   */
  async trackAdvertisingSpend(
    benchmarkId: string,
    agentId: string,
    platform: string,
    campaignId: string,
    adSpend: number
  ): Promise<void> {
    await this.recordCost({
      id: `advertising-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      benchmarkId,
      agentId,
      provider: 'advertising',
      service: platform,
      operation: 'campaign',
      cost: adSpend,
      currency: 'USD',
      timestamp: Date.now(),
      metadata: {
        platform,
        campaignId,
        adSpend,
      },
    });
  }

  /**
   * Track cloud infrastructure costs
   */
  async trackInfrastructureCost(
    benchmarkId: string,
    agentId: string,
    provider: string,
    service: string,
    operation: string,
    cost: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.recordCost({
      id: `infrastructure-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      benchmarkId,
      agentId,
      provider,
      service,
      operation,
      cost,
      currency: 'USD',
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        category: 'infrastructure',
      },
    });
  }

  /**
   * Record any cost and check budget limits
   */
  private async recordCost(cost: BenchmarkCost): Promise<void> {
    // Check if benchmark is emergency stopped
    if (this.emergencyStops.has(cost.benchmarkId)) {
      throw new Error(
        `Benchmark ${cost.benchmarkId} is emergency stopped - no further costs allowed`
      );
    }

    // Add cost to tracking
    if (!this.costs.has(cost.benchmarkId)) {
      this.costs.set(cost.benchmarkId, []);
    }
    this.costs.get(cost.benchmarkId)!.push(cost);

    // Check budget limits
    await this.checkBudgetLimits(cost.benchmarkId);

    logger.info(
      `Cost tracked: ${cost.provider}/${cost.service} - $${cost.cost.toFixed(4)} for benchmark ${cost.benchmarkId}`
    );
  }

  /**
   * Check budget limits and trigger warnings/stops
   */
  private async checkBudgetLimits(benchmarkId: string): Promise<void> {
    const budget = this.budgets.get(benchmarkId);
    if (!budget) {
      return;
    }

    const totalCost = this.calculateTotalCost(benchmarkId);
    const percentage = totalCost / budget.maxTotalCost;

    // Check warning threshold
    if (percentage >= budget.warningThreshold && percentage < 1.0) {
      logger.warn(
        `Budget warning for benchmark ${benchmarkId}: ${(percentage * 100).toFixed(1)}% used ($${totalCost.toFixed(2)}/$${budget.maxTotalCost})`
      );
    }

    // Check emergency stop
    if (percentage >= 1.0 && budget.emergencyStop) {
      this.emergencyStops.add(benchmarkId);
      logger.error(
        `EMERGENCY STOP: Budget exceeded for benchmark ${benchmarkId}: $${totalCost.toFixed(2)}/$${budget.maxTotalCost}`
      );
      throw new Error(`Budget exceeded for benchmark ${benchmarkId} - emergency stop activated`);
    }

    // Check if approval required for high costs
    if (percentage >= 0.8 && budget.approvalRequired) {
      logger.warn(
        `Approval required for benchmark ${benchmarkId}: Approaching budget limit (${(percentage * 100).toFixed(1)}%)`
      );
    }
  }

  /**
   * Calculate total cost for a benchmark
   */
  calculateTotalCost(benchmarkId: string): number {
    const benchmarkCosts = this.costs.get(benchmarkId) || [];
    return benchmarkCosts.reduce((total, cost) => total + cost.cost, 0);
  }

  /**
   * Calculate costs by agent
   */
  calculateCostsByAgent(benchmarkId: string): Map<string, number> {
    const benchmarkCosts = this.costs.get(benchmarkId) || [];
    const agentCosts = new Map<string, number>();

    for (const cost of benchmarkCosts) {
      const current = agentCosts.get(cost.agentId) || 0;
      agentCosts.set(cost.agentId, current + cost.cost);
    }

    return agentCosts;
  }

  /**
   * Generate comprehensive cost report
   */
  async generateCostReport(benchmarkId: string): Promise<CostReport> {
    const benchmarkCosts = this.costs.get(benchmarkId) || [];
    const budget = this.budgets.get(benchmarkId);
    const totalCost = this.calculateTotalCost(benchmarkId);

    // Calculate breakdown by provider/service
    const breakdown = new Map<string, number>();
    for (const cost of benchmarkCosts) {
      const key = `${cost.provider}/${cost.service}`;
      const current = breakdown.get(key) || 0;
      breakdown.set(key, current + cost.cost);
    }

    const breakdownArray = Array.from(breakdown.entries())
      .map(([key, cost]) => {
        const [provider, service] = key.split('/');
        return {
          provider,
          service,
          cost,
          percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
        };
      })
      .sort((a, b) => b.cost - a.cost);

    // Generate recommendations
    const recommendations = this.generateOptimizationRecommendations(benchmarkCosts);

    // Calculate budget status
    const budgetStatus = budget
      ? {
          used: totalCost,
          remaining: Math.max(0, budget.maxTotalCost - totalCost),
          percentage: (totalCost / budget.maxTotalCost) * 100,
          exceeded: totalCost > budget.maxTotalCost,
        }
      : {
          used: totalCost,
          remaining: 0,
          percentage: 0,
          exceeded: false,
        };

    return {
      benchmarkId,
      totalCost,
      currency: 'USD',
      breakdown: breakdownArray,
      recommendations,
      budgetStatus,
    };
  }

  /**
   * Generate cost optimization recommendations
   */
  private generateOptimizationRecommendations(costs: BenchmarkCost[]): string[] {
    const recommendations: string[] = [];

    // Analyze API costs
    const apiCosts = costs.filter((c) => c.provider === 'openai' || c.provider === 'anthropic');
    const totalApiCost = apiCosts.reduce((sum, c) => sum + c.cost, 0);

    if (totalApiCost > 10) {
      recommendations.push('Consider using smaller models for routine tasks to reduce API costs');
    }

    // Analyze token usage patterns
    const highTokenCalls = apiCosts.filter((c) => c.metadata.totalTokens > 10000);
    if (highTokenCalls.length > 0) {
      recommendations.push(
        'Optimize prompts to reduce token usage - detected calls with >10k tokens'
      );
    }

    // Analyze blockchain costs
    const blockchainCosts = costs.filter((c) => c.provider === 'blockchain');
    if (blockchainCosts.length > 0) {
      const avgGasCost =
        blockchainCosts.reduce((sum, c) => sum + c.metadata.gasCost, 0) / blockchainCosts.length;
      if (avgGasCost > 20) {
        recommendations.push(
          'Consider batching transactions or using Layer 2 solutions to reduce gas costs'
        );
      }
    }

    // General recommendations
    if (costs.length > 100) {
      recommendations.push(
        'High number of operations detected - consider caching and optimization'
      );
    }

    return recommendations;
  }

  /**
   * Emergency stop a benchmark
   */
  emergencyStop(benchmarkId: string): void {
    this.emergencyStops.add(benchmarkId);
    logger.error(`EMERGENCY STOP activated for benchmark ${benchmarkId}`);
  }

  /**
   * Resume a benchmark (remove emergency stop)
   */
  resumeBenchmark(benchmarkId: string): void {
    this.emergencyStops.delete(benchmarkId);
    logger.info(`Emergency stop removed for benchmark ${benchmarkId}`);
  }

  /**
   * Check if benchmark is stopped
   */
  isBenchmarkStopped(benchmarkId: string): boolean {
    return this.emergencyStops.has(benchmarkId);
  }

  /**
   * Calculate OpenAI API costs based on current pricing
   */
  private calculateOpenAICost(model: string, inputTokens: number, outputTokens: number): number {
    // Current OpenAI pricing (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.005 / 1000, output: 0.015 / 1000 },
      'gpt-4o-mini': { input: 0.00015 / 1000, output: 0.0006 / 1000 },
      'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
      'gpt-3.5-turbo': { input: 0.001 / 1000, output: 0.002 / 1000 },
      'text-embedding-3-small': { input: 0.00002 / 1000, output: 0 },
      'text-embedding-3-large': { input: 0.00013 / 1000, output: 0 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4o']; // Default to GPT-4o pricing
    return inputTokens * modelPricing.input + outputTokens * modelPricing.output;
  }

  /**
   * Calculate Anthropic API costs based on current pricing
   */
  private calculateAnthropicCost(model: string, inputTokens: number, outputTokens: number): number {
    // Current Anthropic pricing (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-opus-20240229': { input: 0.015 / 1000, output: 0.075 / 1000 },
      'claude-3-sonnet-20240229': { input: 0.003 / 1000, output: 0.015 / 1000 },
      'claude-3-haiku-20240307': { input: 0.00025 / 1000, output: 0.00125 / 1000 },
      'claude-opus-4-20250514': { input: 0.015 / 1000, output: 0.075 / 1000 },
      'claude-sonnet-4-20250514': { input: 0.003 / 1000, output: 0.015 / 1000 },
    };

    const modelPricing = pricing[model] || pricing['claude-3-sonnet-20240229']; // Default to Sonnet pricing
    return inputTokens * modelPricing.input + outputTokens * modelPricing.output;
  }

  /**
   * Get all costs for a benchmark
   */
  getBenchmarkCosts(benchmarkId: string): BenchmarkCost[] {
    return this.costs.get(benchmarkId) || [];
  }

  /**
   * Clear all costs for a benchmark (use with caution)
   */
  clearBenchmarkCosts(benchmarkId: string): void {
    this.costs.delete(benchmarkId);
    this.budgets.delete(benchmarkId);
    this.emergencyStops.delete(benchmarkId);
    logger.info(`All costs cleared for benchmark ${benchmarkId}`);
  }

  /**
   * Export cost data for analysis
   */
  exportCostData(benchmarkId?: string): BenchmarkCost[] {
    if (benchmarkId) {
      return this.costs.get(benchmarkId) || [];
    }

    // Return all costs across all benchmarks
    const allCosts: BenchmarkCost[] = [];
    for (const costs of this.costs.values()) {
      allCosts.push(...costs);
    }
    return allCosts;
  }
}

// Global instance for production use
export const productionCostTracker = new ProductionCostTracker();
