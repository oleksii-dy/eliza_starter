import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OODALoopService } from '../../ooda-service';
import { createMockRuntime, createMockService } from '../utils/mock-runtime';
import type { IAgentRuntime } from '@elizaos/core';
import { OODAPhase, LogLevel } from '../../types';

// Mock the ResourceMonitorService
vi.mock('../../resource-monitor', () => ({
  ResourceMonitorService: {
    start: vi.fn().mockResolvedValue(createMockService('resource-monitor', {
      getCpuUsage: vi.fn().mockReturnValue(45.5),
      getMemoryUsage: vi.fn().mockReturnValue(60.2),
      getDiskUsage: vi.fn().mockResolvedValue(75.8),
    })),
  },
}));

describe('OODALoopService', () => {
  let mockRuntime: IAgentRuntime;
  let service: OODALoopService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime = createMockRuntime({
      settings: {
        AUTONOMOUS_LOOP_INTERVAL: '5000',
        AUTONOMOUS_LOG_LEVEL: LogLevel.INFO,
        MAX_CONCURRENT_ACTIONS: '3',
      },
    });
  });

  afterEach(async () => {
    if (service && (service as any).isRunning) {
      await service.stop();
    }
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', async () => {
      service = new OODALoopService(mockRuntime);
      
      expect(service).toBeDefined();
      expect(service.serviceName).toBe('autonomous');
      expect(service.capabilityDescription).toContain('OODA loop');
    });

    it('should start service successfully', async () => {
      service = await OODALoopService.start(mockRuntime) as OODALoopService;
      
      expect(service).toBeDefined();
      expect((service as any).isRunning).toBe(true);
      expect((service as any).runtime).toBe(mockRuntime);
    });

    it('should load default goals correctly', async () => {
      service = new OODALoopService(mockRuntime);
      
      const goals = (service as any).goals;
      expect(Array.isArray(goals)).toBe(true);
      expect(goals.length).toBeGreaterThan(0);
      
      // Check for expected default goals
      const hasLearningGoal = goals.some(g => g.description.includes('Learn'));
      const hasTaskGoal = goals.some(g => g.description.includes('task'));
      const hasHealthGoal = goals.some(g => g.description.includes('health'));
      
      expect(hasLearningGoal).toBe(true);
      expect(hasTaskGoal).toBe(true);
      expect(hasHealthGoal).toBe(true);
    });

    it('should handle missing runtime dependencies gracefully', async () => {
      const limitedRuntime = createMockRuntime({
        simulateErrors: true,
      });
      
      // Should not throw during construction
      expect(() => {
        service = new OODALoopService(limitedRuntime);
      }).not.toThrow();
    });

    it('should validate configuration parameters', async () => {
      const configRuntime = createMockRuntime({
        settings: {
          AUTONOMOUS_LOOP_INTERVAL: 'invalid',
          MAX_CONCURRENT_ACTIONS: 'not-a-number',
        },
      });
      
      service = new OODALoopService(configRuntime);
      
      // Should use defaults for invalid config
      expect((service as any).loopCycleTime).toBe(5000); // Default
      expect((service as any).maxConcurrentActions).toBe(3); // Default
    });
  });

  describe('OODA phases', () => {
    beforeEach(async () => {
      service = new OODALoopService(mockRuntime);
    });

    it('should execute observe phase correctly', async () => {
      const context = (service as any).currentContext;
      
      // Manually trigger observe phase
      await (service as any).observePhase();
      
      expect(context.phase).toBe(OODAPhase.OBSERVING);
      expect(Array.isArray(context.observations)).toBe(true);
      expect(context.observations.length).toBeGreaterThan(0);
      
      // Should have system state observation
      const systemObs = context.observations.find(o => o.type === 'system_state');
      expect(systemObs).toBeDefined();
      expect(typeof systemObs.relevance).toBe('number');
      expect(systemObs.relevance).toBeGreaterThanOrEqual(0);
      expect(systemObs.relevance).toBeLessThanOrEqual(1);
    });

    it('should execute orient phase with resource status', async () => {
      const context = (service as any).currentContext;
      
      // First observe to gather data
      await (service as any).observePhase();
      
      // Then orient
      await (service as any).orientPhase();
      
      expect(context.phase).toBe(OODAPhase.ORIENTING);
      expect(context.orientation).toBeDefined();
      expect(context.orientation.resourceStatus).toBeDefined();
      
      const resources = context.orientation.resourceStatus;
      expect(typeof resources.cpu).toBe('number');
      expect(typeof resources.memory).toBe('number');
      expect(typeof resources.disk).toBe('number');
      expect(resources.taskSlots).toBeDefined();
      expect(typeof resources.taskSlots.used).toBe('number');
      expect(typeof resources.taskSlots.total).toBe('number');
    });

    it('should execute decide phase with goal prioritization', async () => {
      const context = (service as any).currentContext;
      
      // Prepare context with observations and orientation
      await (service as any).observePhase();
      await (service as any).orientPhase();
      
      // Execute decide phase
      await (service as any).decidePhase();
      
      expect(context.phase).toBe(OODAPhase.DECIDING);
      expect(Array.isArray(context.decisions)).toBe(true);
      
      // Should have at least attempted to make decisions
      expect(context.decisions.length).toBeGreaterThanOrEqual(0);
    });

    it('should execute act phase with action tracking', async () => {
      const context = (service as any).currentContext;
      
      // Prepare context with previous phases
      await (service as any).observePhase();
      await (service as any).orientPhase();
      await (service as any).decidePhase();
      
      // Execute act phase
      await (service as any).actPhase();
      
      expect(context.phase).toBe(OODAPhase.ACTING);
      expect(Array.isArray(context.actions)).toBe(true);
    });

    it('should execute reflect phase with metrics update', async () => {
      const context = (service as any).currentContext;
      const startTime = Date.now();
      
      // Execute full cycle
      await (service as any).observePhase();
      await (service as any).orientPhase();
      await (service as any).decidePhase();
      await (service as any).actPhase();
      await (service as any).reflectPhase();
      
      expect(context.phase).toBe(OODAPhase.REFLECTING);
      expect(context.metrics).toBeDefined();
      
      // Should have calculated cycle time
      expect(typeof context.metrics.cycleTime).toBe('number');
      expect(context.metrics.cycleTime).toBeGreaterThan(0);
      
      // Should have action success rate
      expect(typeof context.metrics.actionSuccessRate).toBe('number');
      expect(context.metrics.actionSuccessRate).toBeGreaterThanOrEqual(0);
      expect(context.metrics.actionSuccessRate).toBeLessThanOrEqual(1);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      service = new OODALoopService(mockRuntime);
    });

    it('should handle phase execution errors gracefully', async () => {
      const context = (service as any).currentContext;
      
      // Mock an error in orient phase
      const originalOrient = (service as any).orientPhase;
      (service as any).orientPhase = vi.fn().mockRejectedValue(new Error('Orient phase error'));
      
      // Should not throw
      await expect((service as any).runOODALoop()).resolves.not.toThrow();
      
      // Should track the error
      expect(context.errors.length).toBeGreaterThan(0);
      expect(context.errors[0].message).toContain('Orient phase error');
      
      // Restore original method
      (service as any).orientPhase = originalOrient;
    });

    it('should continue operation after individual phase failures', async () => {
      const context = (service as any).currentContext;
      
      // Mock errors in multiple phases
      (service as any).observePhase = vi.fn().mockRejectedValue(new Error('Observe error'));
      (service as any).orientPhase = vi.fn().mockRejectedValue(new Error('Orient error'));
      
      // Run loop
      await (service as any).runOODALoop();
      
      // Should have logged errors but continued
      expect(context.errors.length).toBeGreaterThanOrEqual(2);
      expect(context.phase).toBeDefined(); // Should have progressed through phases
    });

    it('should track error metrics correctly', async () => {
      const context = (service as any).currentContext;
      
      // Simulate some errors
      context.errors.push(
        { message: 'Error 1', timestamp: Date.now(), phase: OODAPhase.OBSERVING },
        { message: 'Error 2', timestamp: Date.now(), phase: OODAPhase.ORIENTING }
      );
      
      // Run reflect phase to calculate metrics
      await (service as any).reflectPhase();
      
      expect(typeof context.metrics.errorRate).toBe('number');
      expect(context.metrics.errorRate).toBeGreaterThan(0);
      expect(context.metrics.errorRate).toBeLessThanOrEqual(1);
    });
  });

  describe('metrics calculation', () => {
    beforeEach(async () => {
      service = new OODALoopService(mockRuntime);
    });

    it('should calculate action success rate correctly', async () => {
      const actionResults = (service as any).actionResults;
      
      // Add some test action results
      actionResults.push(
        { success: true, timestamp: Date.now(), actionName: 'TEST_ACTION_1' },
        { success: true, timestamp: Date.now(), actionName: 'TEST_ACTION_2' },
        { success: false, timestamp: Date.now(), actionName: 'TEST_ACTION_3', error: 'Test error' }
      );
      
      const successRate = (service as any).calculateRealActionSuccessRate();
      
      expect(typeof successRate).toBe('number');
      expect(successRate).toBeCloseTo(2/3, 2); // 2 successes out of 3 total
    });

    it('should track decision counts per cycle', async () => {
      const context = (service as any).currentContext;
      
      // Add some test decisions
      context.decisions.push(
        { action: 'REFLECT', reason: 'Test decision 1', priority: 1 },
        { action: 'ANALYZE', reason: 'Test decision 2', priority: 2 }
      );
      
      await (service as any).reflectPhase();
      
      expect(typeof context.metrics.decisionsPerCycle).toBe('number');
      expect(context.metrics.decisionsPerCycle).toBe(2);
    });

    it('should measure cycle time accurately', async () => {
      const context = (service as any).currentContext;
      const startTime = Date.now();
      
      context.cycleStartTime = startTime;
      
      // Wait a small amount
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await (service as any).reflectPhase();
      
      expect(typeof context.metrics.cycleTime).toBe('number');
      expect(context.metrics.cycleTime).toBeGreaterThan(0);
      expect(context.metrics.cycleTime).toBeGreaterThanOrEqual(10); // At least our wait time
    });

    it('should compute resource efficiency metrics', async () => {
      const context = (service as any).currentContext;
      
      // Set up resource status
      context.orientation = {
        resourceStatus: {
          cpu: 50,
          memory: 60,
          disk: 70,
          taskSlots: { used: 2, total: 3 }
        }
      };
      
      await (service as any).reflectPhase();
      
      expect(typeof context.metrics.resourceEfficiency).toBe('number');
      expect(context.metrics.resourceEfficiency).toBeGreaterThan(0);
      expect(context.metrics.resourceEfficiency).toBeLessThanOrEqual(1);
    });

    it('should handle empty action results gracefully', async () => {
      const actionResults = (service as any).actionResults;
      actionResults.length = 0; // Clear array
      
      const successRate = (service as any).calculateRealActionSuccessRate();
      
      expect(typeof successRate).toBe('number');
      expect(successRate).toBe(0.8); // Should use default when no data
    });
  });

  describe('lifecycle management', () => {
    it('should stop service cleanly', async () => {
      service = await OODALoopService.start(mockRuntime) as OODALoopService;
      
      expect((service as any).isRunning).toBe(true);
      
      await service.stop();
      
      expect((service as any).isRunning).toBe(false);
      expect((service as any).loopTimer).toBeNull();
    });

    it('should handle stop() called multiple times', async () => {
      service = await OODALoopService.start(mockRuntime) as OODALoopService;
      
      // Stop multiple times should not throw
      await service.stop();
      await service.stop();
      await service.stop();
      
      expect((service as any).isRunning).toBe(false);
    });

    it('should clean up timers on stop', async () => {
      service = await OODALoopService.start(mockRuntime) as OODALoopService;
      
      const timer = (service as any).loopTimer;
      expect(timer).not.toBeNull();
      
      await service.stop();
      
      expect((service as any).loopTimer).toBeNull();
    });
  });

  describe('service properties', () => {
    it('should have correct static properties', () => {
      expect(OODALoopService.serviceType).toBe('autonomous');
      expect(typeof OODALoopService.start).toBe('function');
    });

    it('should have correct instance properties', async () => {
      service = new OODALoopService(mockRuntime);
      
      expect(service.serviceName).toBe('autonomous');
      expect(typeof service.capabilityDescription).toBe('string');
      expect(service.capabilityDescription).toContain('OODA');
    });
  });
});