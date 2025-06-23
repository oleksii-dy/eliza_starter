import { describe, it, expect } from 'bun:test';
import { calculateTrustScore, TrustService } from '../service';

describe('TrustService', () => {
  it('calculates trust score based on metrics', () => {
    const metrics = {
      recommenderId: '1',
      trustScore: 0,
      totalRecommendations: 10,
      successfulRecs: 8,
      avgTokenPerformance: 20,
      riskScore: 0.2,
      consistencyScore: 0.9,
      virtualConfidence: 1,
      lastActiveDate: new Date(),
    };

    const score = calculateTrustScore(metrics);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('enforces minimum trust', () => {
    const service = new TrustService({} as any);
    service.addRecommender({ id: 'user', address: 'addr' });
    service.recordOutcome('user', true, 10);
    expect(() => service.enforceMinimumTrust('user', 0)).not.toThrow();
    expect(() => service.enforceMinimumTrust('user', 100)).toThrow();
  });
});
