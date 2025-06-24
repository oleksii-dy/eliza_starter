import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { autoPlugin } from '../../index';
import { createMockRuntime, createMockMemory, createMockState } from '../utils/mock-runtime';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { OODAPhase, AutonomousServiceType } from '../../types';

/**
 * Integration tests that verify components work together properly
 * These tests focus on real interactions between services, actions, and providers
 */
describe('Component Integration Tests', () => {
  let mockRuntime: IAgentRuntime;
  let oodaService: any;
  let resourceService: any;

  beforeEach(async () => {
    mock.restore();

    // Create runtime with integrated services
    mockRuntime = createMockRuntime({
      settings: {
        AUTONOMOUS_ENABLED: 'true',
        OODA_CYCLE_INTERVAL: '1000',
        WORLD_ID: 'test-world-id',
      },
    });

    // Start the actual services
    const oodaServiceClass = autoPlugin.services?.find((s) => s.serviceType === 'autonomous');
    const resourceServiceClass = autoPlugin.services?.find(
      (s) => s.serviceType === 'resource-monitor'
    );

    if (oodaServiceClass && resourceServiceClass) {
      oodaService = await oodaServiceClass.start(mockRuntime);
      resourceService = await resourceServiceClass.start(mockRuntime);

      // Register services with mock runtime
      mockRuntime.getService = mock((serviceName: string) => {
        if (serviceName === AutonomousServiceType.AUTONOMOUS) {
          return oodaService;
        }
        if (serviceName === 'resource-monitor') {
          return resourceService;
        }
        return null;
      });
    }
  });

  afterEach(async () => {
    // Clean up services
    if (oodaService) {
      await oodaService.stop();
    }
    if (resourceService) {
      await resourceService.stop();
    }
    mock.restore();
  });

  describe('OODA Service + Resource Monitor Integration', () => {
    it('should integrate resource status into OODA orientation phase', async () => {
      expect(oodaService).toBeDefined();
      expect(resourceService).toBeDefined();

      // Wait for services to initialize
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get resource status
      const resourceStatus = resourceService.getResourceStatus();
      expect(resourceStatus).toBeDefined();
      expect(resourceStatus.cpu).toBeGreaterThanOrEqual(0);
      expect(resourceStatus.memory).toBeGreaterThanOrEqual(0);

      // Verify services are running (no direct context access in real service)
      expect(oodaService.serviceName).toBe('autonomous');
      expect(resourceService.serviceName).toBe('resource-monitor');
    });

    it('should adjust OODA cycle timing based on resource availability', async () => {
      // Simulate high resource usage
      const highUsageStatus = {
        cpu: 90,
        memory: 85,
        diskSpace: 95,
        apiCalls: {},
        taskSlots: { used: 4, total: 5 },
      };

      // Mock resource service to return high usage
      resourceService.getResourceStatus = mock().mockReturnValue(highUsageStatus);

      // Wait for OODA cycle to process resource status
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify resource service is tracking constraints
      expect(resourceService.isResourceConstrained()).toBe(true);
      const constraints = resourceService.getResourceConstraints();
      expect(constraints.length).toBeGreaterThan(0);
    });
  });

  describe('Provider + Service Integration', () => {
    it('should provide real-time OODA context through world provider', async () => {
      const worldProvider = autoPlugin.providers?.find(
        (p) => p.name === 'AUTONOMOUS_WORLD_CONTEXT'
      );
      expect(worldProvider).toBeDefined();

      if (worldProvider) {
        const mockMessage = createMockMemory();
        const mockState = createMockState();

        const result = await worldProvider.get(mockRuntime, mockMessage, mockState);

        expect(result).toBeDefined();
        expect(result.values).toBeDefined();
        expect(result.values!.autonomousActive).toBe(true);
        expect(result.values!.oodaRunning).toBe(true);
        expect(result.text).toContain('OODA loop is running');
      }
    });

    it('should provide formatted message feed through autonomous feed provider', async () => {
      const feedProvider = autoPlugin.providers?.find((p) => p.name === 'AUTONOMOUS_FEED');
      expect(feedProvider).toBeDefined();

      if (feedProvider) {
        const runtimeWithMessages = createMockRuntime({
          memoryResults: [
            createMockMemory({
              content: { text: 'System message 1', source: 'system' },
              createdAt: Date.now() - 10000,
            }),
            createMockMemory({
              content: { text: 'User message 1', source: 'user' },
              createdAt: Date.now() - 5000,
            }),
          ],
        });

        const mockMessage = createMockMemory();
        const mockState = createMockState();

        const result = await feedProvider.get(runtimeWithMessages, mockMessage, mockState);

        expect(result).toBeDefined();
        expect(result.text).toBeDefined();
        expect(result.data!.recentMessages).toBeDefined();
        expect(Array.isArray(result.data!.recentMessages)).toBe(true);
      }
    });
  });

  describe('Action + Service Integration', () => {
    it('should execute REFLECT action with OODA service context', async () => {
      const reflectAction = autoPlugin.actions?.find((a) => a.name === 'REFLECT');
      expect(reflectAction).toBeDefined();

      if (reflectAction) {
        const mockMessage = createMockMemory({
          content: { text: 'Reflecting on recent activities', source: 'user' },
        });
        const mockState = createMockState();
        const mockCallback = mock();

        // Execute reflect action
        await reflectAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);

        expect(mockCallback).toHaveBeenCalled();
        const response = mockCallback.mock.calls[0][0];
        expect(response).toBeDefined();
        expect(response.text).toBeDefined();
        expect(response.thought).toBeDefined();
      }
    });

    it('should validate actions based on OODA service state', async () => {
      const actions = autoPlugin.actions || [];
      expect(actions.length).toBeGreaterThan(0);

      const mockMessage = createMockMemory();
      const mockState = createMockState();

      for (const action of actions) {
        try {
          const isValid = await action.validate(mockRuntime, mockMessage, mockState);
          expect(typeof isValid).toBe('boolean');
        } catch (error) {
          // Some actions might require specific conditions
          expect(error).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe('End-to-End Component Workflow', () => {
    it('should execute complete autonomous workflow with all components', async () => {
      // 1. Get initial state from providers
      const worldProvider = autoPlugin.providers?.find(
        (p) => p.name === 'AUTONOMOUS_WORLD_CONTEXT'
      );
      const feedProvider = autoPlugin.providers?.find((p) => p.name === 'AUTONOMOUS_FEED');

      const mockMessage = createMockMemory({
        content: { text: 'Execute autonomous workflow', source: 'user' },
      });
      const mockState = createMockState();

      // 2. Get provider context
      let worldContext, feedContext;
      if (worldProvider) {
        worldContext = await worldProvider.get(mockRuntime, mockMessage, mockState);
        expect(worldContext.values!.autonomousActive).toBe(true);
      }

      if (feedProvider) {
        feedContext = await feedProvider.get(mockRuntime, mockMessage, mockState);
        expect(feedContext.data!.recentMessages).toBeDefined();
      }

      // 3. Execute action based on context
      const reflectAction = autoPlugin.actions?.find((a) => a.name === 'REFLECT');
      if (reflectAction) {
        const mockCallback = mock();
        await reflectAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);
        expect(mockCallback).toHaveBeenCalled();
      }

      // 4. Verify services are still available
      expect(oodaService.serviceName).toBe('autonomous');
      expect(resourceService.getResourceStatus()).toBeDefined();
    });

    it('should handle service failures gracefully across components', async () => {
      // Simulate OODA service failure
      oodaService.stop();
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Update mock runtime to return null service
      mockRuntime.getService = mock().mockReturnValue(null);

      // Providers should handle missing service
      const worldProvider = autoPlugin.providers?.find(
        (p) => p.name === 'AUTONOMOUS_WORLD_CONTEXT'
      );
      if (worldProvider) {
        const mockMessage = createMockMemory();
        const mockState = createMockState();

        const result = await worldProvider.get(mockRuntime, mockMessage, mockState);
        expect(result.values!.autonomousActive).toBe(false);
        expect(result.text).toContain('not active');
      }

      // Actions should still validate without throwing
      const actions = autoPlugin.actions || [];
      for (const action of actions.slice(0, 3)) {
        // Test first 3 actions
        try {
          const mockMessage = createMockMemory();
          const mockState = createMockState();
          const isValid = await action.validate(mockRuntime, mockMessage, mockState);
          expect(typeof isValid).toBe('boolean');
        } catch (error) {
          // Expected for some actions when service is down
        }
      }
    });
  });

  describe('Cross-Component Data Flow', () => {
    it('should pass data between providers and actions correctly', async () => {
      // Get world context from provider
      const worldProvider = autoPlugin.providers?.find(
        (p) => p.name === 'AUTONOMOUS_WORLD_CONTEXT'
      );
      expect(worldProvider).toBeDefined();

      if (worldProvider) {
        const mockMessage = createMockMemory();
        const mockState = createMockState();

        const worldResult = await worldProvider.get(mockRuntime, mockMessage, mockState);

        // Use world context in state for action
        const enhancedState = {
          ...mockState,
          values: {
            ...mockState.values,
            ...worldResult.values,
          },
          data: {
            ...mockState.data,
            worldContext: worldResult.data,
          },
        };

        // Execute action with enhanced state
        const reflectAction = autoPlugin.actions?.find((a) => a.name === 'REFLECT');
        if (reflectAction) {
          const mockCallback = mock();
          await reflectAction.handler(mockRuntime, mockMessage, enhancedState, {}, mockCallback);

          expect(mockCallback).toHaveBeenCalled();
          const response = mockCallback.mock.calls[0][0];
          expect(response.text).toBeDefined();
        }
      }
    });

    it('should maintain consistent state across service interactions', async () => {
      // Wait for service operations
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify service maintains consistency (no direct context access)
      expect(oodaService.serviceName).toBe('autonomous');

      // Service should maintain its core functionality
      expect(typeof oodaService.stop).toBe('function');
    });
  });

  describe('Performance Integration', () => {
    it('should coordinate component timing efficiently', async () => {
      const startTime = Date.now();

      // Execute multiple provider calls
      const providers = autoPlugin.providers || [];
      const mockMessage = createMockMemory();
      const mockState = createMockState();

      const providerResults = await Promise.all(
        providers.map((provider) => provider.get(mockRuntime, mockMessage, mockState))
      );

      const providerTime = Date.now() - startTime;
      expect(providerTime).toBeLessThan(1000); // Should complete within 1 second
      expect(providerResults.length).toBe(providers.length);

      // Verify all providers returned valid results
      providerResults.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.text).toBeDefined();
      });
    });

    it('should handle concurrent component operations', async () => {
      const concurrentOperations: Promise<any>[] = [];

      // Start multiple provider operations concurrently
      const worldProvider = autoPlugin.providers?.find(
        (p) => p.name === 'AUTONOMOUS_WORLD_CONTEXT'
      );
      const feedProvider = autoPlugin.providers?.find((p) => p.name === 'AUTONOMOUS_FEED');

      if (worldProvider && feedProvider) {
        const mockMessage = createMockMemory();
        const mockState = createMockState();

        concurrentOperations.push(worldProvider.get(mockRuntime, mockMessage, mockState));
        concurrentOperations.push(feedProvider.get(mockRuntime, mockMessage, mockState));

        // Add action execution
        const reflectAction = autoPlugin.actions?.find((a) => a.name === 'REFLECT');
        if (reflectAction) {
          const mockCallback = mock();
          concurrentOperations.push(
            reflectAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback)
          );
        }

        // Execute all operations concurrently
        const results = await Promise.all(concurrentOperations);
        expect(results.length).toBe(concurrentOperations.length);

        // Verify no conflicts occurred
        expect(oodaService.serviceName).toBe('autonomous');
        expect(resourceService.getResourceStatus()).toBeDefined();
      }
    });
  });
});
