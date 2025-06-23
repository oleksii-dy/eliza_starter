import { Service } from '@elizaos/core';
import type { IAgentRuntime, ServiceTypeName } from '@elizaos/core';

export interface Recommender {
  id: string;
  address: string;
  solanaPubkey?: string;
  telegramId?: string;
  discordId?: string;
  twitterId?: string;
  ip?: string;
}

export interface RecommenderMetrics {
  recommenderId: string;
  trustScore: number;
  totalRecommendations: number;
  successfulRecs: number;
  avgTokenPerformance: number;
  riskScore: number;
  consistencyScore: number;
  virtualConfidence: number;
  lastActiveDate: Date;
}

export interface TokenRecommendation {
  tokenAddress: string;
  recommenderId: string;
  confidence: number;
  timestamp: Date;
}

export interface TokenPerformance {
  tokenAddress: string;
  priceChange24h: number;
  volumeChange24h: number;
  trade_24h_change: number;
  liquidity: number;
  liquidityChange24h: number;
  holderChange24h: number;
  rugPull: boolean;
  isScam: boolean;
  marketCapChange24h: number;
  sustainedGrowth: boolean;
  rapidDump: boolean;
  suspiciousVolume: boolean;
  validationTrust: number;
  lastUpdated: Date;
}

export function calculateTrustScore(metrics: RecommenderMetrics): number {
  const weights = {
    successRate: 0.3,
    avgPerformance: 0.2,
    consistency: 0.2,
    riskMetric: 0.15,
    timeDecay: 0.15,
  } as const;

  const successRate =
    metrics.totalRecommendations > 0
      ? metrics.successfulRecs / metrics.totalRecommendations
      : 0;
  const normalizedPerformance = metrics.avgTokenPerformance / 100;
  const timeSinceActive = Date.now() - metrics.lastActiveDate.getTime();
  const days = timeSinceActive / (1000 * 60 * 60 * 24);
  const timeDecayFactor = Math.max(0, 1 - days / 30);

  return (
    (successRate * weights.successRate +
      normalizedPerformance * weights.avgPerformance +
      metrics.consistencyScore * weights.consistency +
      (1 - metrics.riskScore) * weights.riskMetric +
      timeDecayFactor * weights.timeDecay) *
    100
  );
}

export class TrustService extends Service {
  static serviceType: ServiceTypeName = 'trust';
  capabilityDescription = 'Tracks reputation scores for recommenders';

  private recommenders = new Map<string, Recommender>();
  private metrics = new Map<string, RecommenderMetrics>();

  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<TrustService> {
    return new TrustService(runtime);
  }

  addRecommender(rec: Recommender) {
    if (!this.recommenders.has(rec.id)) {
      this.recommenders.set(rec.id, rec);
      this.metrics.set(rec.id, {
        recommenderId: rec.id,
        trustScore: 0,
        totalRecommendations: 0,
        successfulRecs: 0,
        avgTokenPerformance: 0,
        riskScore: 0,
        consistencyScore: 0,
        virtualConfidence: 0,
        lastActiveDate: new Date(),
      });
    }
  }

  recordOutcome(recId: string, success: boolean, performance: number) {
    const metrics = this.metrics.get(recId);
    if (!metrics) return;
    metrics.totalRecommendations += 1;
    if (success) metrics.successfulRecs += 1;
    metrics.avgTokenPerformance =
      (metrics.avgTokenPerformance * (metrics.totalRecommendations - 1) + performance) /
      metrics.totalRecommendations;
    metrics.lastActiveDate = new Date();
    metrics.trustScore = calculateTrustScore(metrics);
  }

  getTrustScore(recId: string): number {
    const metrics = this.metrics.get(recId);
    return metrics ? metrics.trustScore : 0;
  }

  enforceMinimumTrust(recId: string, threshold: number) {
    const score = this.getTrustScore(recId);
    if (score < threshold) {
      throw new Error(`Trust score ${score.toFixed(2)} below required ${threshold}`);
    }
  }
}
