import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { worldProvider } from '../../worldProvider';
import {
  createMockRuntime,
  createMockMemory,
  createMockState,
  createMockService,
} from '../utils/mock-runtime';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { OODAPhase, AutonomousServiceType } from '../../types';

describe('World Provider', () => {
  let mockRuntime: IAgentRuntime;
  let mockMemory: Memory;
  let mockState: State;
  let mockOODAService: any;

  beforeEach(() => {
    mock.restore();

    // Create mock OODA service
    mockOODAService = createMockService('autonomous', {
      isRunning: mock().mockReturnValue(true),
      getCurrentPhase: mock().mockReturnValue(OODAPhase.OBSERVING),
      getContext: mock().mockReturnValue({
        phase: OODAPhase.OBSERVING,
        runId: 'test-run-123',
        startTime: Date.now() - 10000,
        endTime: null,
        observations: [
          {
            type: 'system',
            source: 'test',
            data: { test: 'observation' },
            timestamp: Date.now() - 5000,
          },
        ],
        orientation: {
          currentGoals: [
            {
              id: 'goal-1',
              description: 'Test goal',
              priority: 1,
              progress: 0.5,
              type: 'system',
              status: 'active',
              createdAt: Date.now() - 60000,
            },
          ],
          strategies: [],
          worldModel: {},
        },
        decisions: [],
        actions: [],
        reflections: [],
        errors: [],
      }),
      getMetrics: mock().mockReturnValue({
        cycleTime: 5000,
        actionSuccessRate: 0.85,
        errorRate: 0.1,
        decisionsPerCycle: 2,
        resourceEfficiency: 0.9,
        goalProgress: 0.7,
      }),
    });

    // Create mock runtime with OODA service
    mockRuntime = createMockRuntime({
      services: {
        [AutonomousServiceType.AUTONOMOUS]: mockOODAService,
      },
    });

    mockMemory = createMockMemory();
    mockState = createMockState();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('Provider Properties', () => {
    it('should have correct metadata', () => {
      expect(worldProvider.name).toBe('AUTONOMOUS_WORLD_CONTEXT');
      expect(worldProvider.description).toContain('OODA loop context');
      expect(worldProvider.position).toBe(50);
    });
  });

  describe('get() method', () => {
    it('should provide OODA context when service is running', async () => {
      const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

      expect(result).toBeDefined();
      expect(result.text).toContain('OODA Loop Context');
      expect(result.text).toContain('Phase: OBSERVING');
      expect(result.text).toContain('Run ID: test-run-123');
      expect(result.values).toBeDefined();
      expect(result.values!.autonomousActive).toBe(true);
      expect(result.values!.currentPhase).toBe('OBSERVING');
    });

    it('should handle missing OODA service', async () => {
      const runtimeWithoutService = createMockRuntime({
        services: {},
      });

      const result = await worldProvider.get(runtimeWithoutService, mockMemory, mockState);

      expect(result.text).toContain('Autonomous mode is not active');
      expect(result.values!.autonomousActive).toBe(false);
      expect(result.values!.currentPhase).toBe('IDLE');
    });

    it('should handle service not running', async () => {
      mockOODAService.isRunning.mockReturnValue(false);

      const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

      expect(result.text).toContain('Autonomous mode is not active');
      expect(result.values!.autonomousActive).toBe(false);
    });

    it('should include goals in context', async () => {
      const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

      expect(result.text).toContain('Active Goals');
      expect(result.text).toContain('Test goal');
      expect(result.text).toContain('Priority: 1');
      expect(result.text).toContain('Progress: 50%');
    });

    it('should include observations in context', async () => {
      const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

      expect(result.text).toContain('Recent Observations');
      expect(result.text).toContain('system observation');
    });

    it('should include metrics when available', async () => {
      const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

      expect(result.text).toContain('Performance Metrics');
      expect(result.text).toContain('Cycle Time: 5000ms');
      expect(result.text).toContain('Success Rate: 85%');
      expect(result.text).toContain('Error Rate: 10%');
    });

    it('should handle context without goals', async () => {
      mockOODAService.getContext.mockReturnValue({
        phase: OODAPhase.IDLE,
        runId: 'test-run',
        startTime: Date.now(),
        endTime: null,
        observations: [],
        orientation: {
          currentGoals: [],
          strategies: [],
          worldModel: {},
        },
        decisions: [],
        actions: [],
        reflections: [],
        errors: [],
      });

      const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

      expect(result.text).toContain('No active goals');
    });

    it('should handle different OODA phases', async () => {
      const phases = [
        OODAPhase.OBSERVING,
        OODAPhase.ORIENTING,
        OODAPhase.DECIDING,
        OODAPhase.ACTING,
        OODAPhase.REFLECTING,
      ];

      for (const phase of phases) {
        mockOODAService.getCurrentPhase.mockReturnValue(phase);
        mockOODAService.getContext.mockReturnValue({
          phase,
          runId: 'test-run',
          startTime: Date.now(),
          endTime: null,
          observations: [],
          orientation: { currentGoals: [], strategies: [], worldModel: {} },
          decisions: [],
          actions: [],
          reflections: [],
          errors: [],
        });

        const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

        expect(result.text).toContain(`Phase: ${phase}`);
        expect(result.values!.currentPhase).toBe(phase);
      }
    });

    it('should include recent actions when in ACTING phase', async () => {
      mockOODAService.getCurrentPhase.mockReturnValue(OODAPhase.ACTING);
      mockOODAService.getContext.mockReturnValue({
        phase: OODAPhase.ACTING,
        runId: 'test-run',
        startTime: Date.now(),
        endTime: null,
        observations: [],
        orientation: { currentGoals: [], strategies: [], worldModel: {} },
        decisions: [],
        actions: [
          {
            id: 'action-1',
            actionName: 'TEST_ACTION',
            parameters: {},
            status: 'executing',
            startTime: Date.now() - 1000,
          },
        ],
        reflections: [],
        errors: [],
      });

      const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

      expect(result.text).toContain('Current Actions');
      expect(result.text).toContain('TEST_ACTION');
      expect(result.text).toContain('executing');
    });

    it('should include decisions when in DECIDING phase', async () => {
      mockOODAService.getCurrentPhase.mockReturnValue(OODAPhase.DECIDING);
      mockOODAService.getContext.mockReturnValue({
        phase: OODAPhase.DECIDING,
        runId: 'test-run',
        startTime: Date.now(),
        endTime: null,
        observations: [],
        orientation: { currentGoals: [], strategies: [], worldModel: {} },
        decisions: [
          {
            id: 'decision-1',
            type: 'action',
            actionName: 'BROWSE_WEB',
            reasoning: 'Need to gather information',
            confidence: 0.8,
            priority: 1,
            timestamp: Date.now() - 500,
          },
        ],
        actions: [],
        reflections: [],
        errors: [],
      });

      const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

      expect(result.text).toContain('Recent Decisions');
      expect(result.text).toContain('BROWSE_WEB');
      expect(result.text).toContain('Need to gather information');
    });

    it('should include reflections when in REFLECTING phase', async () => {
      mockOODAService.getCurrentPhase.mockReturnValue(OODAPhase.REFLECTING);
      mockOODAService.getContext.mockReturnValue({
        phase: OODAPhase.REFLECTING,
        runId: 'test-run',
        startTime: Date.now(),
        endTime: null,
        observations: [],
        orientation: { currentGoals: [], strategies: [], worldModel: {} },
        decisions: [],
        actions: [],
        reflections: [
          {
            id: 'reflection-1',
            content: 'Successfully completed task',
            type: 'success',
            timestamp: Date.now() - 100,
          },
        ],
        errors: [],
      });

      const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

      expect(result.text).toContain('Reflections');
      expect(result.text).toContain('Successfully completed task');
    });

    it('should include errors when present', async () => {
      mockOODAService.getContext.mockReturnValue({
        phase: OODAPhase.IDLE,
        runId: 'test-run',
        startTime: Date.now(),
        endTime: null,
        observations: [],
        orientation: { currentGoals: [], strategies: [], worldModel: {} },
        decisions: [],
        actions: [],
        reflections: [],
        errors: [
          {
            phase: OODAPhase.ACTING,
            error: 'Failed to execute action',
            timestamp: Date.now() - 1000,
          },
        ],
      });

      const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

      expect(result.text).toContain('Recent Errors');
      expect(result.text).toContain('Failed to execute action');
      expect(result.text).toContain('ACTING');
    });

    it('should provide structured data for autonomous decision making', async () => {
      const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

      expect(result.data).toBeDefined();
      expect(result.data!.context).toBeDefined();
      expect(result.data!.context).toHaveProperty('phase');
      expect(result.data!.context).toHaveProperty('runId');
      expect(result.data!.context).toHaveProperty('observations');
      expect(result.data!.context).toHaveProperty('orientation');
    });

    it('should handle service errors gracefully', async () => {
      mockOODAService.getContext.mockImplementation(() => {
        throw new Error('Service error');
      });

      const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

      expect(result.text).toContain('Autonomous mode is not active');
      expect(result.values!.autonomousActive).toBe(false);
    });

    it('should format duration correctly', async () => {
      mockOODAService.getContext.mockReturnValue({
        phase: OODAPhase.IDLE,
        runId: 'test-run',
        startTime: Date.now() - 65000, // 65 seconds ago
        endTime: null,
        observations: [],
        orientation: { currentGoals: [], strategies: [], worldModel: {} },
        decisions: [],
        actions: [],
        reflections: [],
        errors: [],
      });

      const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

      expect(result.text).toContain('Duration:');
      // Should show as "1m 5s" or similar
    });

    it('should handle completed cycles', async () => {
      const startTime = Date.now() - 10000;
      const endTime = Date.now() - 5000;

      mockOODAService.getContext.mockReturnValue({
        phase: OODAPhase.IDLE,
        runId: 'test-run',
        startTime,
        endTime,
        observations: [],
        orientation: { currentGoals: [], strategies: [], worldModel: {} },
        decisions: [],
        actions: [],
        reflections: [],
        errors: [],
        metrics: {
          cycleTime: 5000,
          actionSuccessRate: 1,
          errorRate: 0,
          decisionsPerCycle: 3,
          resourceEfficiency: 0.95,
          goalProgress: 0.8,
        },
      });

      const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

      expect(result.text).toContain('Cycle completed');
    });
  });

  describe('Integration', () => {
    it('should work with real OODA service patterns', async () => {
      // Simulate a real OODA cycle progression
      const phases = [
        OODAPhase.OBSERVING,
        OODAPhase.ORIENTING,
        OODAPhase.DECIDING,
        OODAPhase.ACTING,
        OODAPhase.REFLECTING,
      ];

      for (const phase of phases) {
        mockOODAService.getCurrentPhase.mockReturnValue(phase);
        mockOODAService.getContext.mockReturnValue({
          phase,
          runId: 'cycle-123',
          startTime: Date.now() - 30000,
          endTime: null,
          observations: phase === OODAPhase.OBSERVING ? [{ type: 'test', data: {} }] : [],
          orientation: {
            currentGoals: [{ id: '1', description: 'Test', priority: 1 }],
            strategies: [],
            worldModel: {},
          },
          decisions: phase === OODAPhase.DECIDING ? [{ id: '1', type: 'action' }] : [],
          actions: phase === OODAPhase.ACTING ? [{ id: '1', actionName: 'TEST' }] : [],
          reflections: phase === OODAPhase.REFLECTING ? [{ id: '1', content: 'Done' }] : [],
          errors: [],
        });

        const result = await worldProvider.get(mockRuntime, mockMemory, mockState);

        expect(result.values!.currentPhase).toBe(phase);
        expect(result.text).toContain(phase);
      }
    });

    it('should provide consistent data structure across calls', async () => {
      const result1 = await worldProvider.get(mockRuntime, mockMemory, mockState);
      const result2 = await worldProvider.get(mockRuntime, mockMemory, mockState);

      // Structure should be consistent
      expect(Object.keys(result1.values!)).toEqual(Object.keys(result2.values!));
      expect(result1.data).toBeDefined();
      expect(result2.data).toBeDefined();
    });
  });
});
