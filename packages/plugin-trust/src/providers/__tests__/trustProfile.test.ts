import { describe, it, expect, mock, beforeEach, type Mock } from 'bun:test';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import type { UUID } from '@elizaos/core';
import { trustProfileProvider } from '../trustProfile';
import type { TrustProfile } from '../../types/trust';

const createMockRuntime = (): IAgentRuntime =>
  ({
    agentId: 'test-agent' as UUID,
    getService: mock(),
  }) as any;

const createMockMemory = (text: string, entityId: UUID): Memory =>
  ({
    entityId,
    content: {
      text,
    },
    roomId: 'room-1' as UUID,
  }) as Memory;

const mockTrustProfile: TrustProfile = {
  entityId: 'entity-1' as UUID,
  evaluatorId: 'test-agent' as UUID,
  overallTrust: 75,
  confidence: 0.8,
  dimensions: {
    reliability: 80,
    competence: 75,
    integrity: 70,
    benevolence: 78,
    transparency: 72,
  },
  evidence: [],
  lastCalculated: Date.now(),
  calculationMethod: 'weighted_average',
  trend: {
    direction: 'stable',
    changeRate: 0,
    lastChangeAt: Date.now(),
  },
  interactionCount: 25,
};

describe('trustProfileProvider', () => {
  let runtime: IAgentRuntime;
  let trustEngine: any;
  const testEntityId = 'entity-1' as UUID;

  beforeEach(() => {
    runtime = createMockRuntime();
    trustEngine = {
      evaluateTrust: mock().mockResolvedValue(mockTrustProfile),
      getRecentInteractions: mock().mockResolvedValue([
        { impact: 5, type: 'HELPFUL_ACTION' },
        { impact: -2, type: 'MINOR_VIOLATION' },
        { impact: 3, type: 'COMMUNITY_CONTRIBUTION' },
      ]),
    };
    (runtime.getService as unknown as Mock<any>).mockImplementation((name: string) => {
      if (name === 'trust-engine') {
        return trustEngine;
      }
      return null;
    });
  });

  it('should provide trust profile information', async () => {
    const memory = createMockMemory('test', testEntityId);
    const state = {
      values: {},
      data: {},
      text: '',
    } as State;

    const result = await trustProfileProvider.get(runtime, memory, state);

    expect(result).toBeDefined();
    expect(result.text).toContain('The user has good trust (75/100)');
    expect(result.text).toContain('stable trust trend');
    expect(result.text).toContain('25 interactions');
    expect(result.values).toMatchObject({
      trustScore: 75,
      trustLevel: 'good trust',
      trustTrend: 'stable',
      interactionCount: 25,
      recentPositiveActions: 2,
      recentNegativeActions: 1,
    });
  });

  it('should categorize trust levels correctly', async () => {
    const testCases = [
      { score: 85, level: 'high trust' },
      { score: 65, level: 'good trust' },
      { score: 45, level: 'moderate trust' },
      { score: 25, level: 'low trust' },
      { score: 10, level: 'very low trust' },
    ];

    for (const { score, level } of testCases) {
      trustEngine.evaluateTrust.mockResolvedValue({
        ...mockTrustProfile,
        overallTrust: score,
      });

      const memory = createMockMemory('test', testEntityId);
      const state = {
        values: {},
        data: {},
        text: '',
      } as State;

      const result = await trustProfileProvider.get(runtime, memory, state);

      expect(result.values?.trustLevel).toBe(level);
    }
  });

  it('should handle missing trust engine', async () => {
    (runtime.getService as unknown as Mock<any>).mockReturnValue(null);

    const memory = createMockMemory('test', testEntityId);
    const state = {
      values: {},
      data: {},
      text: '',
    } as State;

    const result = await trustProfileProvider.get(runtime, memory, state);

    expect(result.text).toContain('Trust engine not available');
  });

  it('should handle errors gracefully', async () => {
    trustEngine.evaluateTrust.mockRejectedValue(new Error('Database error'));

    const memory = createMockMemory('test', testEntityId);
    const state = {
      values: {},
      data: {},
      text: '',
    } as State;

    const result = await trustProfileProvider.get(runtime, memory, state);

    expect(result.text).toContain('Unable to fetch trust profile');
  });
});
