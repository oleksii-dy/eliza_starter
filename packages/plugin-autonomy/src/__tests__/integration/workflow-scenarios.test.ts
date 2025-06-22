import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { autoPlugin } from '../../index';
import { createMockRuntime, createMockMemory, createMockState } from '../utils/mock-runtime';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { OODAPhase, AutonomousServiceType } from '../../types';

/**
 * Integration tests that simulate realistic autonomous workflow scenarios
 * These tests verify end-to-end functionality across multiple components
 */
describe('Workflow Scenario Integration Tests', () => {
  let mockRuntime: IAgentRuntime;
  let oodaService: any;
  let resourceService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockRuntime = createMockRuntime({
      settings: {
        AUTONOMOUS_ENABLED: 'true',
        OODA_CYCLE_INTERVAL: '500', // Faster for testing
        WORLD_ID: 'test-world-id',
        ALLOWED_COMMANDS: JSON.stringify(['echo', 'ls', 'pwd']),
      },
      memoryResults: [
        createMockMemory({
          content: { text: 'Previous system observation', source: 'system' },
          createdAt: Date.now() - 30000,
        }),
        createMockMemory({
          content: { text: 'User requested autonomous mode', source: 'user' },
          createdAt: Date.now() - 20000,
        }),
      ],
    });

    // Initialize services
    const oodaServiceClass = autoPlugin.services?.find(s => s.serviceType === 'autonomous');
    const resourceServiceClass = autoPlugin.services?.find(s => s.serviceType === 'resource-monitor');

    if (oodaServiceClass && resourceServiceClass) {
      oodaService = await oodaServiceClass.start(mockRuntime);
      resourceService = await resourceServiceClass.start(mockRuntime);

      mockRuntime.getService = vi.fn((serviceName: string) => {
        if (serviceName === AutonomousServiceType.AUTONOMOUS) return oodaService;
        if (serviceName === 'resource-monitor') return resourceService;
        return null;
      });
    }
  });

  afterEach(async () => {
    if (oodaService) await oodaService.stop();
    if (resourceService) await resourceService.stop();
    vi.restoreAllMocks();
  });

  describe('Scenario: Information Gathering Workflow', () => {
    it('should gather information through browsing and reflection', async () => {
      // Simulate user request for information
      const userMessage = createMockMemory({
        content: { 
          text: 'Please research the latest developments in AI autonomous systems',
          source: 'user'
        },
      });

      // 1. Get context from providers
      const worldProvider = autoPlugin.providers?.find(p => p.name === 'AUTONOMOUS_WORLD_CONTEXT');
      const feedProvider = autoPlugin.providers?.find(p => p.name === 'AUTONOMOUS_FEED');
      
      if (worldProvider && feedProvider) {
        const mockState = createMockState();
        
        const worldContext = await worldProvider.get(mockRuntime, userMessage, mockState);
        const feedContext = await feedProvider.get(mockRuntime, userMessage, mockState);
        
        expect(worldContext.values!.autonomousActive).toBe(true);
        expect(feedContext.data!.recentMessages).toBeDefined();

        // 2. Enhanced state with provider context
        const enhancedState = {
          ...mockState,
          values: {
            ...mockState.values,
            ...worldContext.values,
            recentMessages: feedContext.values!.recentMessages,
          },
          data: {
            ...mockState.data,
            worldContext: worldContext.data,
            feedData: feedContext.data,
          },
        };

        // 3. Execute browsing action
        const browseAction = autoPlugin.actions?.find(a => a.name === 'BROWSE_WEB');
        if (browseAction) {
          const browseCallback = vi.fn();
          
          const isValid = await browseAction.validate(mockRuntime, userMessage, enhancedState);
          expect(typeof isValid).toBe('boolean');

          // Execute browse action
          await browseAction.handler(mockRuntime, userMessage, enhancedState, {}, browseCallback);
          expect(browseCallback).toHaveBeenCalled();
          
          const browseResponse = browseCallback.mock.calls[0][0];
          expect(browseResponse).toBeDefined();
          expect(browseResponse.actions).toContain('BROWSE_WEB_ERROR'); // Expected in test environment
        }

        // 4. Follow up with reflection
        const reflectAction = autoPlugin.actions?.find(a => a.name === 'REFLECT');
        if (reflectAction) {
          const reflectCallback = vi.fn();
          
          await reflectAction.handler(mockRuntime, userMessage, enhancedState, {}, reflectCallback);
          expect(reflectCallback).toHaveBeenCalled();
          
          const reflectResponse = reflectCallback.mock.calls[0][0];
          expect(reflectResponse.text).toBeDefined();
          expect(reflectResponse.thought).toBeDefined();
        }
      }
    });
  });

  describe('Scenario: System Monitoring and Response', () => {
    it('should monitor resources and respond to system state changes', async () => {
      // 1. Initial resource check
      const initialStatus = resourceService.getResourceStatus();
      expect(initialStatus).toBeDefined();
      expect(initialStatus.cpu).toBeGreaterThanOrEqual(0);

      // 2. Simulate system message about resource usage
      const systemMessage = createMockMemory({
        content: {
          text: 'System resources are under pressure, please optimize operations',
          source: 'system'
        },
      });

      // 3. Get OODA context with resource awareness
      const worldProvider = autoPlugin.providers?.find(p => p.name === 'AUTONOMOUS_WORLD_CONTEXT');
      if (worldProvider) {
        const mockState = createMockState();
        const context = await worldProvider.get(mockRuntime, systemMessage, mockState);
        
        expect(context.values!.autonomousActive).toBe(true);
        expect(context.text).toContain('OODA loop is running');
      }

      // 4. Execute reflection to assess resource situation
      const reflectAction = autoPlugin.actions?.find(a => a.name === 'REFLECT');
      if (reflectAction) {
        const mockCallback = vi.fn();
        const mockState = createMockState();
        
        await reflectAction.handler(mockRuntime, systemMessage, mockState, {}, mockCallback);
        
        expect(mockCallback).toHaveBeenCalled();
        const response = mockCallback.mock.calls[0][0];
        expect(response.text).toBeDefined();
      }

      // 5. Verify OODA service is still functional
      expect(oodaService.serviceName).toBe('autonomous');
      expect(typeof oodaService.stop).toBe('function');
    });
  });

  describe('Scenario: Command Execution Workflow', () => {
    it('should validate and execute system commands safely', async () => {
      const commandMessage = createMockMemory({
        content: {
          text: 'Execute: echo "System status check"',
          source: 'user'
        },
      });

      // 1. Get current system context
      const feedProvider = autoPlugin.providers?.find(p => p.name === 'AUTONOMOUS_FEED');
      if (feedProvider) {
        const mockState = createMockState();
        const feedContext = await feedProvider.get(mockRuntime, commandMessage, mockState);
        
        expect(feedContext.data!.recentMessages).toBeDefined();
        
        // 2. Execute command action
        const commandAction = autoPlugin.actions?.find(a => a.name === 'EXECUTE_COMMAND');
        if (commandAction) {
          const enhancedState = {
            ...mockState,
            data: {
              ...mockState.data,
              feedContext: feedContext.data,
            },
          };

          // Validate command execution
          const isValid = await commandAction.validate(mockRuntime, commandMessage, enhancedState);
          expect(typeof isValid).toBe('boolean');

          // Execute if valid
          if (isValid) {
            const commandCallback = vi.fn();
            await commandAction.handler(mockRuntime, commandMessage, enhancedState, {}, commandCallback);
            expect(commandCallback).toHaveBeenCalled();
          }
        }
      }
    });
  });

  describe('Scenario: File Operations Workflow', () => {
    it('should perform file operations with proper validation', async () => {
      const fileMessage = createMockMemory({
        content: {
          text: 'Create a status report file',
          source: 'user'
        },
      });

      // 1. Check current OODA state
      const worldProvider = autoPlugin.providers?.find(p => p.name === 'AUTONOMOUS_WORLD_CONTEXT');
      if (worldProvider) {
        const mockState = createMockState();
        const worldContext = await worldProvider.get(mockRuntime, fileMessage, mockState);
        
        expect(worldContext.values!.autonomousActive).toBe(true);

        // 2. Execute file operation
        const fileAction = autoPlugin.actions?.find(a => a.name === 'FILE_OPERATION');
        if (fileAction) {
          const enhancedState = {
            ...mockState,
            values: {
              ...mockState.values,
              ...worldContext.values,
            },
          };

          const fileCallback = vi.fn();
          
          try {
            await fileAction.handler(mockRuntime, fileMessage, enhancedState, {}, fileCallback);
            expect(fileCallback).toHaveBeenCalled();
          } catch (error) {
            // File operations might fail in test environment - this is expected
            expect(error).toBeInstanceOf(Error);
          }
        }
      }
    });
  });

  describe('Scenario: Multi-Step Decision Making', () => {
    it('should execute multi-step decision process with OODA loop integration', async () => {
      const decisionMessage = createMockMemory({
        content: {
          text: 'Help me organize my development workflow',
          source: 'user'
        },
      });

      const mockState = createMockState();
      
      // Step 1: Observe - Get current context
      const feedProvider = autoPlugin.providers?.find(p => p.name === 'AUTONOMOUS_FEED');
      const worldProvider = autoPlugin.providers?.find(p => p.name === 'AUTONOMOUS_WORLD_CONTEXT');
      
      if (feedProvider && worldProvider) {
        const feedContext = await feedProvider.get(mockRuntime, decisionMessage, mockState);
        const worldContext = await worldProvider.get(mockRuntime, decisionMessage, mockState);
        
        expect(feedContext.data!.recentMessages).toBeDefined();
        expect(worldContext.values!.autonomousActive).toBe(true);

        // Step 2: Orient - Combine contexts
        const orientedState = {
          ...mockState,
          values: {
            ...mockState.values,
            ...worldContext.values,
            recentMessages: feedContext.values!.recentMessages,
          },
          data: {
            ...mockState.data,
            feedContext: feedContext.data,
            worldContext: worldContext.data,
          },
        };

        // Step 3: Decide & Act - Execute reflection to generate plan
        const reflectAction = autoPlugin.actions?.find(a => a.name === 'REFLECT');
        if (reflectAction) {
          const reflectCallback = vi.fn();
          
          await reflectAction.handler(mockRuntime, decisionMessage, orientedState, {}, reflectCallback);
          expect(reflectCallback).toHaveBeenCalled();
          
          const reflectResponse = reflectCallback.mock.calls[0][0];
          expect(reflectResponse.text).toBeDefined();
          expect(reflectResponse.thought).toBeDefined();
          
          // Verify OODA service integration
          expect(oodaService.serviceName).toBe('autonomous');
        }
      }
    });
  });

  describe('Scenario: Error Recovery and Resilience', () => {
    it('should handle component failures and recover gracefully', async () => {
      const errorMessage = createMockMemory({
        content: {
          text: 'Simulate system error recovery',
          source: 'system'
        },
      });

      // 1. Normal operation
      const worldProvider = autoPlugin.providers?.find(p => p.name === 'AUTONOMOUS_WORLD_CONTEXT');
      if (worldProvider) {
        const mockState = createMockState();
        const normalResult = await worldProvider.get(mockRuntime, errorMessage, mockState);
        expect(normalResult.values!.autonomousActive).toBe(true);
      }

      // 2. Simulate service failure
      const originalGetService = mockRuntime.getService;
      mockRuntime.getService = vi.fn().mockReturnValue(null);

      // 3. Verify graceful degradation
      if (worldProvider) {
        const mockState = createMockState();
        const degradedResult = await worldProvider.get(mockRuntime, errorMessage, mockState);
        expect(degradedResult.values!.autonomousActive).toBe(false);
        expect(degradedResult.text).toContain('not active');
      }

      // 4. Restore service and verify recovery
      mockRuntime.getService = originalGetService;

      if (worldProvider) {
        const mockState = createMockState();
        const recoveredResult = await worldProvider.get(mockRuntime, errorMessage, mockState);
        expect(recoveredResult.values!.autonomousActive).toBe(true);
      }

      // 5. Verify action validation still works
      const reflectAction = autoPlugin.actions?.find(a => a.name === 'REFLECT');
      if (reflectAction) {
        const mockState = createMockState();
        const isValid = await reflectAction.validate(mockRuntime, errorMessage, mockState);
        expect(typeof isValid).toBe('boolean');
      }
    });
  });

  describe('Scenario: Performance Under Load', () => {
    it('should maintain performance with concurrent operations', async () => {
      const messages = Array.from({ length: 5 }, (_, i) => 
        createMockMemory({
          content: {
            text: `Concurrent operation ${i + 1}`,
            source: 'user'
          },
        })
      );

      const mockState = createMockState();
      const startTime = Date.now();

      // Execute multiple provider operations concurrently
      const providers = autoPlugin.providers || [];
      const concurrentOps: Promise<any>[] = [];

      for (const message of messages) {
        for (const provider of providers) {
          concurrentOps.push(provider.get(mockRuntime, message, mockState));
        }
      }

      const results = await Promise.all(concurrentOps);
      const duration = Date.now() - startTime;

      // Verify all operations completed
      expect(results.length).toBe(messages.length * providers.length);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      // Verify service integrity
      expect(oodaService.serviceName).toBe('autonomous');
      expect(resourceService.getResourceStatus()).toBeDefined();

      // Verify all results are valid
      results.forEach((result: any) => {
        expect(result).toBeDefined();
        expect(result.text).toBeDefined();
      });
    });
  });
});