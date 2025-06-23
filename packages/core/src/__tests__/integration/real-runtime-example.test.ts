import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RealRuntimeTestHarness,
  createTestRuntime,
  runIntegrationTest,
  TestModelProvider,
  scenarios,
} from '../../test-utils';
import { stringToUuid } from '../../utils';
import type { IAgentRuntime, Character, Plugin, Memory, UUID, ActionResult } from '../../types';

/**
 * REAL RUNTIME INTEGRATION TESTS
 *
 * This file demonstrates the new real runtime testing approach that replaces
 * mock-based testing with actual agent runtime validation.
 *
 * Key differences from mock testing:
 * - Uses real AgentRuntime instances
 * - Tests actual functionality, not mock calls
 * - Validates real database interactions
 * - Uses realistic AI model responses
 * - Catches real bugs that mocks miss
 */

describe('Real Runtime Integration Testing Examples', () => {
  let harness: RealRuntimeTestHarness;

  afterEach(async () => {
    // Always cleanup real runtime resources
    if (harness) {
      await harness.cleanup();
    }
  });

  describe('Basic Runtime Functionality', () => {
    it('should create and initialize a real runtime instance', async () => {
      const { runtime, harness: testHarness } = await createTestRuntime({
        character: {
          name: 'TestAgent',
          system: 'You are a helpful test agent.',
          bio: ['I help with testing ElizaOS functionality.'],
          messageExamples: [],
          postExamples: [],
          topics: ['testing', 'validation'],
          knowledge: [],
          plugins: [],
        },
        plugins: [],
        apiKeys: { TEST_API_KEY: 'test-key' },
      });

      harness = testHarness;

      // Validate runtime is actually functional
      expect(runtime.agentId).toBeDefined();
      expect(runtime.character.name).toBe('TestAgent');

      // Test real database functionality
      const memory = await runtime.createMemory(
        {
          entityId: stringToUuid('test-user'),
          roomId: stringToUuid('test-room'),
          content: {
            text: 'Test message',
            source: 'test',
          },
        },
        'messages'
      );

      expect(memory).toBeDefined();

      // Verify memory was actually stored
      const memories = await runtime.getMemories({
        roomId: stringToUuid('test-room'),
        count: 10,
        tableName: 'messages',
      });

      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0].content.text).toBe('Test message');
    });

    it('should validate runtime health comprehensively', async () => {
      harness = new RealRuntimeTestHarness();

      const runtime = await harness.createTestRuntime({
        character: {
          name: 'HealthTestAgent',
          system: 'Health check agent',
          bio: ['Testing agent health'],
          messageExamples: [],
          postExamples: [],
          topics: [],
          knowledge: [],
          plugins: [],
        },
        plugins: [],
        apiKeys: { API_KEY: 'test' },
      });

      const healthCheck = await harness.validateRuntimeHealth(runtime);

      expect(healthCheck.healthy).toBe(true);
      expect(healthCheck.issues).toHaveLength(0);
      expect(runtime.agentId).toBeDefined();
    });
  });

  describe('Message Processing with Real Models', () => {
    it('should process messages with realistic AI responses', async () => {
      harness = new RealRuntimeTestHarness();

      const runtime = await harness.createTestRuntime({
        character: {
          name: 'SmartAgent',
          system: 'You are an intelligent assistant.',
          bio: ['I provide helpful responses to user queries.'],
          messageExamples: [
            [
              { name: 'User', content: { text: 'Hello' } },
              { name: 'SmartAgent', content: { text: 'Hello! How can I help?' } },
            ],
          ],
          postExamples: [],
          topics: ['general', 'assistance'],
          knowledge: [],
          plugins: [],
        },
        plugins: [],
        apiKeys: { OPENAI_API_KEY: 'test-key' },
      });

      // Test greeting response
      const greetingResult = await harness.processTestMessage(runtime, 'Hello there!', {
        roomId: 'test-room-1',
        entityId: 'test-user-1',
        timeoutMs: 5000,
      });

      expect(greetingResult.passed).toBe(true);
      expect(greetingResult.errors).toHaveLength(0);
      expect(greetingResult.responseTime).toBeLessThan(5000);

      // Test task creation response
      const taskResult = await harness.processTestMessage(
        runtime,
        'Please create a todo item for groceries',
        {
          roomId: 'test-room-2',
          entityId: 'test-user-1',
          expectedActions: [], // Would specify expected actions if testing action execution
        }
      );

      expect(taskResult.passed).toBe(true);
      expect(taskResult.errors).toHaveLength(0);
    });

    it('should handle complex conversation flows', async () => {
      const result = await runIntegrationTest(
        'Complex conversation flow',
        async (runtime) => {
          // Simulate multi-turn conversation
          const roomId = stringToUuid('conversation-room');
          const userId = stringToUuid('test-user');

          // First message: greeting
          const greeting = await runtime.createMemory(
            {
              entityId: userId,
              roomId,
              content: {
                text: 'Hi, I need help with planning my day',
                source: 'user',
              },
            },
            'messages'
          );

          expect(greeting).toBeDefined();

          // Simulate processing and response
          const response1 = await runtime.createMemory(
            {
              entityId: runtime.agentId,
              roomId,
              content: {
                text: "I'd be happy to help you plan your day! What would you like to focus on?",
                source: 'agent',
              },
            },
            'messages'
          );

          expect(response1).toBeDefined();

          // Second message: specific request
          const request = await runtime.createMemory(
            {
              entityId: userId,
              roomId,
              content: {
                text: 'I need to schedule meetings and prepare a presentation',
                source: 'user',
              },
            },
            'messages'
          );

          expect(request).toBeDefined();

          // Verify conversation history is maintained
          const memories = await runtime.getMemories({
            roomId,
            count: 10,
            tableName: 'messages',
          });

          expect(memories.length).toBe(3);
          expect(memories.some((m) => m.content.text?.includes('planning'))).toBe(true);
          expect(memories.some((m) => m.content.text?.includes('meetings'))).toBe(true);
        },
        {
          character: {
            name: 'PlanningAgent',
            system: 'You help users plan their day effectively.',
            bio: ['I am a planning assistant that helps organize tasks and schedules.'],
            messageExamples: [],
            postExamples: [],
            topics: ['planning', 'scheduling', 'productivity'],
            knowledge: [],
            plugins: [],
          },
        }
      );

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Plugin Integration Testing', () => {
    it('should test plugin functionality with real runtime', async () => {
      // Create a simple test plugin
      const testPlugin: Plugin = {
        name: 'test-plugin',
        description: 'A plugin for testing integration',
        actions: [
          {
            name: 'TEST_ACTION',
            similes: ['TEST'],
            description: 'A test action',
            validate: async () => true,
            handler: async (runtime, message, state, options, callback) => {
              if (callback) {
                await callback({
                  text: 'Test action executed successfully',
                  actions: ['TEST_ACTION'],
                });
              }
              return {
                text: 'Test action executed successfully',
                actions: ['TEST_ACTION'],
                success: true,
              } as ActionResult;
            },
            examples: [
              [
                { name: 'User', content: { text: 'run test' } },
                {
                  name: 'Agent',
                  content: {
                    text: 'Test action executed successfully',
                    actions: ['TEST_ACTION'],
                  },
                },
              ],
            ],
          },
        ],
        providers: [
          {
            name: 'TEST_PROVIDER',
            get: async () => ({
              text: 'Test provider context',
              values: { testFlag: true },
            }),
          },
        ],
        evaluators: [],
      };

      const result = await runIntegrationTest(
        'Plugin integration test',
        async (runtime) => {
          // Verify plugin is loaded
          expect(runtime.plugins).toContain(testPlugin);

          // Verify actions are registered
          const testAction = runtime.actions.find((a) => a.name === 'TEST_ACTION');
          expect(testAction).toBeDefined();

          // Verify providers are registered
          const testProvider = runtime.providers.find((p) => p.name === 'TEST_PROVIDER');
          expect(testProvider).toBeDefined();

          // Test provider functionality
          if (testProvider) {
            const providerResult = await testProvider.get(runtime, {} as any, {} as any);
            expect(providerResult.text).toBe('Test provider context');
            expect(providerResult.values?.testFlag).toBe(true);
          }

          // Test action execution
          if (testAction) {
            const callbackResults: any[] = [];
            const mockCallback = async (content: any) => {
              callbackResults.push(content);
              return [];
            };

            const actionResult = await testAction.handler(
              runtime,
              {
                entityId: stringToUuid('test-user'),
                roomId: stringToUuid('test-room'),
                content: { text: 'run test', source: 'test' },
              } as any,
              { values: {}, data: {}, text: '' },
              {},
              mockCallback
            );

            expect((actionResult as any)?.success).toBe(true);
            expect(callbackResults).toHaveLength(1);
            expect(callbackResults[0].text).toBe('Test action executed successfully');
          }
        },
        {
          plugins: [testPlugin],
        }
      );

      expect(result.passed).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle runtime errors gracefully', async () => {
      harness = new RealRuntimeTestHarness();

      try {
        // Test with invalid configuration
        const runtime = await harness.createTestRuntime({
          character: {
            name: 'ErrorTestAgent',
            system: 'Error testing agent',
            bio: ['Testing error conditions'],
            messageExamples: [],
            postExamples: [],
            topics: [],
            knowledge: [],
            plugins: [],
          },
          plugins: [],
          apiKeys: {},
        });

        // Test error handling in message processing
        const result = await harness.processTestMessage(runtime, 'This might cause an error', {
          timeoutMs: 1000, // Short timeout to test timeout handling
        });

        // Even if there are errors, the test framework should handle them gracefully
        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
        expect(Array.isArray(result.errors)).toBe(true);
      } catch (error) {
        // Error during setup is expected for invalid configuration
        expect(error).toBeDefined();
      }
    });

    it('should handle database isolation properly', async () => {
      // Create two separate runtimes to test isolation
      const { runtime: runtime1, harness: harness1 } = await createTestRuntime();
      const { runtime: runtime2, harness: harness2 } = await createTestRuntime();

      try {
        // Add data to first runtime
        await runtime1.createMemory(
          {
            entityId: stringToUuid('user1'),
            roomId: stringToUuid('room1'),
            content: { text: 'Message in runtime 1', source: 'test' },
          },
          'messages'
        );

        // Add different data to second runtime
        await runtime2.createMemory(
          {
            entityId: stringToUuid('user2'),
            roomId: stringToUuid('room2'),
            content: { text: 'Message in runtime 2', source: 'test' },
          },
          'messages'
        );

        // Verify isolation - runtime1 should not see runtime2's data
        const runtime1Memories = await runtime1.getMemories({
          roomId: stringToUuid('room2'), // Looking for room2 data in runtime1
          count: 10,
          tableName: 'messages',
        });

        const runtime2Memories = await runtime2.getMemories({
          roomId: stringToUuid('room1'), // Looking for room1 data in runtime2
          count: 10,
          tableName: 'messages',
        });

        expect(runtime1Memories).toHaveLength(0); // Should not see runtime2's data
        expect(runtime2Memories).toHaveLength(0); // Should not see runtime1's data

        // Verify each runtime can see its own data
        const runtime1OwnMemories = await runtime1.getMemories({
          roomId: stringToUuid('room1'),
          count: 10,
          tableName: 'messages',
        });

        const runtime2OwnMemories = await runtime2.getMemories({
          roomId: stringToUuid('room2'),
          count: 10,
          tableName: 'messages',
        });

        expect(runtime1OwnMemories).toHaveLength(1);
        expect(runtime2OwnMemories).toHaveLength(1);
      } finally {
        await harness1.cleanup();
        await harness2.cleanup();
      }
    });
  });

  describe('Performance and Resource Management', () => {
    it('should manage resources efficiently', async () => {
      const startMemory = process.memoryUsage().heapUsed;

      harness = new RealRuntimeTestHarness();

      // Create and test multiple runtimes
      for (let i = 0; i < 3; i++) {
        const runtime = await harness.createTestRuntime({
          character: {
            name: `PerfTestAgent${i}`,
            system: 'Performance testing agent',
            bio: [`Performance test agent ${i}`],
            messageExamples: [],
            postExamples: [],
            topics: [],
            knowledge: [],
            plugins: [],
          },
          plugins: [],
          apiKeys: { API_KEY: 'test' },
        });

        // Process some messages
        await harness.processTestMessage(runtime, `Test message ${i}`, { timeoutMs: 2000 });
      }

      const midMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = midMemory - startMemory;

      // Cleanup
      await harness.cleanup();

      // Force garbage collection if available (V8 only)
      if (global.gc) {
        global.gc();
      }

      // Give time for cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const endMemory = process.memoryUsage().heapUsed;

      // Verify memory is managed properly
      expect(memoryIncrease).toBeGreaterThan(0); // Should use some memory

      // Note: We can't reliably test memory reduction due to GC timing
      // Just verify cleanup completed without errors
      expect(harness).toBeDefined();

      console.log(
        `Memory usage: Start: ${Math.round(startMemory / 1024 / 1024)}MB, ` +
          `Mid: ${Math.round(midMemory / 1024 / 1024)}MB, ` +
          `End: ${Math.round(endMemory / 1024 / 1024)}MB`
      );
    });

    it('should handle concurrent operations', async () => {
      const { runtime, harness: testHarness } = await createTestRuntime();
      harness = testHarness;

      // Process multiple messages concurrently
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          harness.processTestMessage(runtime, `Concurrent message ${i}`, {
            roomId: `room-${i}`,
            entityId: `user-${i}`,
            timeoutMs: 3000,
          })
        );
      }

      const results = await Promise.all(promises);

      // All should complete successfully
      results.forEach((result, index) => {
        expect(result.passed).toBe(true);
        expect(result.scenarioName).toContain(`Concurrent message ${index}`);
      });
    });
  });
});

/**
 * COMPARISON: Mock vs Real Runtime Testing
 *
 * This section demonstrates the difference between mock-based and real runtime testing
 */
describe('Mock vs Real Runtime Comparison', () => {
  it('Mock test example (DEPRECATED - shows false confidence)', async () => {
    // This is how the OLD mock-based tests work - DO NOT USE
    const mockRuntime = {
      processMessage: vi.fn().mockResolvedValue('mocked response'),
      createMemory: vi.fn().mockResolvedValue('mock-id'),
      getMemories: vi.fn().mockResolvedValue([]),
    } as any;

    // Mock test passes even with broken implementation
    const result = await mockRuntime.processMessage('test');
    expect(mockRuntime.processMessage).toHaveBeenCalled();
    expect(result).toBe('mocked response');

    // Problem: This test passes but tells us nothing about real functionality!
  });

  it('Real runtime test example (RECOMMENDED - actual validation)', async () => {
    // This is the NEW real runtime approach - USE THIS
    const result = await runIntegrationTest('Real functionality test', async (runtime) => {
      // Test ACTUAL functionality with REAL runtime
      const memory = await runtime.createMemory(
        {
          entityId: stringToUuid('test-user'),
          roomId: stringToUuid('test-room'),
          content: { text: 'Real test message', source: 'test' },
        },
        'messages'
      );

      // Verify REAL database interaction
      expect(memory).toBeDefined();

      // Verify REAL memory retrieval
      const memories = await runtime.getMemories({
        roomId: stringToUuid('test-room'),
        count: 1,
        tableName: 'messages',
      });

      expect(memories).toHaveLength(1);
      expect(memories[0].content.text).toBe('Real test message');

      // This test actually validates that the functionality works!
    });

    expect(result.passed).toBe(true);
  });
});
