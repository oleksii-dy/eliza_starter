/**
 * Production Cost Tracker
 * Tracks real costs for benchmark operations
 */

import { logger } from '@elizaos/core';

export interface BenchmarkCost {
  id: string;
  benchmarkId: string;
  agentId: string;
  type?: 'api_call' | 'transaction' | 'storage' | 'compute';
  amount?: number;
  currency: 'USD' | 'ETH' | 'tokens';
  timestamp: number;
  provider: string;
  service: string;
  operation?: string;
  cost: number;
  metadata?: Record<string, any>;
}

export class ProductionCostTracker {
  private costs: BenchmarkCost[] = [];
  private isInitialized = false;

  constructor() {
    if (!this.isInitialized) {
      logger.info('ProductionCostTracker initialized for real-world benchmarking');
      this.isInitialized = true;
    }
  }

  trackCost(cost: Omit<BenchmarkCost, 'id' | 'timestamp'>): void {
    const fullCost: BenchmarkCost = {
      ...cost,
      id: `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.costs.push(fullCost);
    logger.debug(`Tracked cost: ${fullCost.cost} ${fullCost.currency} for ${fullCost.service}`);
  }

  getCosts(benchmarkId?: string, agentId?: string): BenchmarkCost[] {
    return this.costs.filter((cost) => {
      if (benchmarkId && cost.benchmarkId !== benchmarkId) {
        return false;
      }
      if (agentId && cost.agentId !== agentId) {
        return false;
      }
      return true;
    });
  }

  getTotalCost(benchmarkId?: string, agentId?: string): { [currency: string]: number } {
    const relevantCosts = this.getCosts(benchmarkId, agentId);
    const totals: { [currency: string]: number } = {};

    for (const cost of relevantCosts) {
      if (!totals[cost.currency]) {
        totals[cost.currency] = 0;
      }
      totals[cost.currency] += cost.cost;
    }

    return totals;
  }

  reset(): void {
    this.costs = [];
    logger.debug('ProductionCostTracker reset');
  }
}

export const productionCostTracker = new ProductionCostTracker();
