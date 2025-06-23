import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScenarioRunner } from '../../src/scenario-runner/index.js';
import { AgentServer } from '@elizaos/server';
import { AgentRuntime, type Character, type Plugin, type UUID } from '@elizaos/core';
import type { Scenario } from '../../src/scenario-runner/types.js';
import * as path from 'path';
import * as fs from 'fs/promises';

// Create a mock SQL plugin with database adapter
const mockSqlPlugin: Plugin = {
  name: '@elizaos/plugin-sql',
  description: 'Mock SQL plugin for testing',
  adapter: {
    // Mock database methods
    init: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ rows: [] }),
    execute: vi.fn().mockResolvedValue({ changes: 0 }),
    // Agent methods
    getAgents: vi.fn().mockResolvedValue([]),
    createAgent: vi.fn().mockImplementation((agent) => Promise.resolve(agent)),
    updateAgent: vi.fn().mockResolvedValue(undefined),
    deleteAgent: vi.fn().mockResolvedValue(undefined),
    // Memory methods
    createMemory: vi.fn().mockResolvedValue(undefined),
    getMemories: vi.fn().mockResolvedValue([]),
    searchMemories: vi.fn().mockResolvedValue([]),
    updateMemory: vi.fn().mockResolvedValue(undefined),
    deleteMemory: vi.fn().mockResolvedValue(undefined),
    deleteAllMemories: vi.fn().mockResolvedValue(undefined),
    getMemoryById: vi.fn().mockResolvedValue(null),
    getCachedEmbeddings: vi.fn().mockResolvedValue([]),
    // Entity methods
    createEntity: vi.fn().mockResolvedValue(undefined),
    getEntity: vi.fn().mockResolvedValue(null),
    getEntitiesByIds: vi.fn().mockResolvedValue([]),
    updateEntity: vi.fn().mockResolvedValue(undefined),
    deleteEntity: vi.fn().mockResolvedValue(undefined),
    // Room methods
    createRoom: vi.fn().mockResolvedValue(undefined),
    getRoom: vi.fn().mockResolvedValue(null),
    updateRoom: vi.fn().mockResolvedValue(undefined),
    deleteRoom: vi.fn().mockResolvedValue(undefined),
    getRooms: vi.fn().mockResolvedValue([]),
    // Relationship methods
    createRelationship: vi.fn().mockResolvedValue(undefined),
    getRelationship: vi.fn().mockResolvedValue(null),
    getRelationships: vi.fn().mockResolvedValue([]),
    updateRelationship: vi.fn().mockResolvedValue(undefined),
    deleteRelationship: vi.fn().mockResolvedValue(undefined),
    // World methods
    createWorld: vi.fn().mockResolvedValue(undefined),
    getWorld: vi.fn().mockResolvedValue(null),
    getWorlds: vi.fn().mockResolvedValue([]),
    updateWorld: vi.fn().mockResolvedValue(undefined),
    deleteWorld: vi.fn().mockResolvedValue(undefined),
    // Task methods
    createTask: vi.fn().mockResolvedValue(undefined),
    getTask: vi.fn().mockResolvedValue(null),
    getTasks: vi.fn().mockResolvedValue([]),
    updateTask: vi.fn().mockResolvedValue(undefined),
    deleteTask: vi.fn().mockResolvedValue(undefined),
    updateTaskStatus: vi.fn().mockResolvedValue(undefined),
    // Component methods
    createComponent: vi.fn().mockResolvedValue(undefined),
    getComponent: vi.fn().mockResolvedValue(null),
    getComponents: vi.fn().mockResolvedValue([]),
    updateComponent: vi.fn().mockResolvedValue(undefined),
    deleteComponent: vi.fn().mockResolvedValue(undefined),
    // Add missing required methods
    getEntitiesForRoom: vi.fn().mockResolvedValue([]),
    getEntityById: vi.fn().mockResolvedValue(null),
    ensureRoomExists: vi.fn().mockResolvedValue(undefined),
    ensureWorldExists: vi.fn().mockResolvedValue(undefined),
    addParticipant: vi.fn().mockResolvedValue(undefined),
    removeParticipant: vi.fn().mockResolvedValue(undefined),
    getParticipantsForRoom: vi.fn().mockResolvedValue([]),
    getParticipantUserState: vi.fn().mockResolvedValue(null),
    setParticipantUserState: vi.fn().mockResolvedValue(undefined),
    getTasksByName: vi.fn().mockResolvedValue([]),
    // Cache methods
    setCache: vi.fn().mockResolvedValue(undefined),
    getCache: vi.fn().mockResolvedValue(null),
    deleteCache: vi.fn().mockResolvedValue(undefined),
  } as any,
};

describe('Scenario Runtime Integration', () => {
  let server: AgentServer;
  let mockRuntime: any;
  let runner: ScenarioRunner;

  beforeEach(async () => {
    // Mock console.log to avoid noise in tests
    console.log = vi.fn();

    // Create a simple test character
    const testCharacter: Character = {
      id: 'test-character-id' as UUID,
      name: 'Test Agent',
      bio: ['A test agent for scenario testing'],
      system: 'You are a helpful test agent',
      settings: {
        voice: 'en-US',
      },
    };

    // Create mock runtime instead of real runtime
    mockRuntime = {
      agentId: 'test-agent-id' as UUID,
      character: testCharacter,
      // Add all required runtime methods
      initialize: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      useModel: vi.fn().mockImplementation(async (_type, params) => {
        if (params.prompt?.includes('DM') && params.prompt?.includes('GROUP')) {
          return 'GROUP';
        }
        if (params.prompt?.includes('PASS') || params.prompt?.includes('FAIL')) {
          return 'DECISION: PASS\nCONFIDENCE: 0.9\nREASONING: Test passed successfully\nEVIDENCE: Test evidence\nSUGGESTIONS: None';
        }
        return 'Mock response';
      }),
      
      // Mock all database methods
      createMemory: vi.fn().mockResolvedValue(undefined),
      getMemories: vi.fn().mockResolvedValue([]),
      searchMemories: vi.fn().mockResolvedValue([]),
      updateMemory: vi.fn().mockResolvedValue(undefined),
      deleteMemory: vi.fn().mockResolvedValue(undefined),
      
      // Mock entity methods
      createEntity: vi.fn().mockResolvedValue(undefined),
      getEntity: vi.fn().mockResolvedValue(null),
      getEntityById: vi.fn().mockResolvedValue(null),
      getEntitiesForRoom: vi.fn().mockResolvedValue([]),
      updateEntity: vi.fn().mockResolvedValue(undefined),
      
      // Mock room methods
      createRoom: vi.fn().mockResolvedValue(undefined),
      getRoom: vi.fn().mockResolvedValue(null),
      ensureRoomExists: vi.fn().mockResolvedValue(undefined),
      updateRoom: vi.fn().mockResolvedValue(undefined),
      
      // Mock world methods
      createWorld: vi.fn().mockResolvedValue(undefined),
      getWorld: vi.fn().mockResolvedValue(null),
      ensureWorldExists: vi.fn().mockResolvedValue(undefined),
      updateWorld: vi.fn().mockResolvedValue(undefined),
      
      // Mock participant methods
      addParticipant: vi.fn().mockResolvedValue(undefined),
      removeParticipant: vi.fn().mockResolvedValue(undefined),
      getParticipantsForRoom: vi.fn().mockResolvedValue([]),
      getParticipantUserState: vi.fn().mockResolvedValue(null),
      setParticipantUserState: vi.fn().mockResolvedValue(undefined),
      
      // Mock task methods
      createTask: vi.fn().mockResolvedValue(undefined),
      getTask: vi.fn().mockResolvedValue(null),
      getTasks: vi.fn().mockResolvedValue([]),
      updateTask: vi.fn().mockResolvedValue(undefined),
      deleteTask: vi.fn().mockResolvedValue(undefined),
      
      // Mock actions and providers
      actions: [
        {
          name: 'TEST_ACTION',
          description: 'A test action',
          examples: [],
          handler: async (_runtime, _message, _state, _options, callback) => {
            if (callback) {
              await callback?.({
                text: 'Test action executed',
                source: 'test',
              });
            }
            return true;
          },
          validate: async () => true,
        },
      ],
      providers: [],
      evaluators: [],
      
      // Mock logger
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
      
      // Mock event system
      emitEvent: vi.fn().mockResolvedValue(undefined),
      
      // Mock services
      getService: vi.fn().mockReturnValue(null),
      registerService: vi.fn(),
      
      // Mock other required methods
      composeState: vi.fn().mockResolvedValue({
        values: {},
        data: {},
        text: '',
      }),
      processActions: vi.fn().mockResolvedValue([]),
      evaluate: vi.fn().mockResolvedValue([]),
    };

    // Create a mock server for the scenario runner
    server = {
      stop: vi.fn().mockResolvedValue(undefined),
      registerAgent: vi.fn().mockResolvedValue(undefined),
    } as any;

    runner = new ScenarioRunner(server, mockRuntime);
  });

  afterEach(async () => {
    if (server?.stop) {
      await server.stop();
    }
    
    // Clean up test database
    try {
      await fs.rm(path.join(process.cwd(), '.test-db'), { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  describe('Basic Scenario Execution', () => {
    it('should execute a simple message exchange scenario', async () => {
      const scenario: Scenario = {
        id: 'simple-message-test',
        name: 'Simple Message Exchange',
        description: 'Test basic message exchange between actors',
        actors: [
          {
            id: 'subject-agent' as UUID,
            name: 'Subject Agent',
            role: 'subject',
            script: {
              steps: [
                { type: 'message', content: 'Hello, I am the subject agent' },
              ],
            },
          },
          {
            id: 'tester-agent' as UUID,
            name: 'Tester Agent',
            role: 'assistant',
            script: {
              steps: [
                { type: 'message', content: 'Hello subject, how are you?' },
                { type: 'wait', waitTime: 1000 },
                { type: 'message', content: 'Can you help me with something?' },
              ],
            },
          },
        ],
        setup: {
          roomType: 'group',
        },
        execution: {
          maxDuration: 10000,
          maxSteps: 10,
        },
        verification: {
          rules: [
            {
              id: 'message-exchange',
              type: 'llm',
              description: 'Verify that agents exchanged messages successfully',
              config: {},
            },
          ],
        },
      };

      const result = await runner.runScenario(scenario);

      expect(result.passed).toBe(true);
      expect(result.transcript.length).toBeGreaterThan(0);
      expect(result.verificationResults).toHaveLength(1);
      expect(result.verificationResults[0].passed).toBe(true);
    });

    it('should handle action execution in scenarios', async () => {
      const scenario: Scenario = {
        id: 'action-test',
        name: 'Action Execution Test',
        description: 'Test action execution',
        actors: [
          {
            id: 'subject-agent' as UUID,
            name: 'Subject Agent',
            role: 'subject',
            script: {
              steps: [
                { type: 'action', actionName: 'TEST_ACTION', actionParams: { param: 'value' } },
              ],
            },
          },
        ],
        setup: {
          roomType: 'dm',
        },
        execution: {
          maxDuration: 5000,
        },
        verification: {
          rules: [
            {
              id: 'action-executed',
              type: 'llm',
              description: 'Verify that the test action was executed',
              config: {},
            },
          ],
        },
      };

      const result = await runner.runScenario(scenario);

      expect(result.passed).toBe(true);
      expect(result.metrics.actionCounts['TEST_ACTION']).toBe(1);
    });

    it('should handle scenario timeouts', async () => {
      const scenario: Scenario = {
        id: 'timeout-test',
        name: 'Timeout Test',
        description: 'Test scenario timeout handling',
        actors: [
          {
            id: 'subject-agent' as UUID,
            name: 'Subject Agent',
            role: 'subject',
            script: {
              steps: [
                { type: 'wait', waitTime: 10000 }, // Wait longer than max duration
              ],
            },
          },
        ],
        setup: {},
        execution: {
          maxDuration: 2000, // 2 second timeout
        },
        verification: {
          rules: [
            {
              id: 'timeout-check',
              type: 'llm',
              description: 'Check timeout handling',
              config: {},
            },
          ],
        },
      };

      const startTime = Date.now();
      const result = await runner.runScenario(scenario);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time (not wait full 10s)
      expect(duration).toBeLessThan(15000);
      expect(result.duration).toBeLessThan(15000);
    });
  });

  describe('Multi-Actor Scenarios', () => {
    it('should handle multiple actors with complex interactions', async () => {
      const scenario: Scenario = {
        id: 'multi-actor-test',
        name: 'Multi-Actor Interaction',
        description: 'Test complex multi-actor scenarios',
        actors: [
          {
            id: 'subject' as UUID,
            name: 'Subject',
            role: 'subject',
            script: {
              steps: [
                { type: 'message', content: 'I am ready to help' },
              ],
            },
          },
          {
            id: 'actor1' as UUID,
            name: 'Actor 1',
            role: 'assistant',
            script: {
              steps: [
                { type: 'message', content: 'Hello everyone' },
                { type: 'wait', waitTime: 500 },
                { type: 'message', content: 'I have a question' },
              ],
            },
          },
          {
            id: 'actor2' as UUID,
            name: 'Actor 2',
            role: 'assistant',
            script: {
              steps: [
                { type: 'wait', waitTime: 1000 },
                { type: 'message', content: 'I can help with that' },
              ],
            },
          },
        ],
        setup: {
          roomType: 'group',
          context: 'A collaborative discussion',
        },
        execution: {
          maxDuration: 10000,
        },
        verification: {
          rules: [
            {
              id: 'multi-actor-participation',
              type: 'llm',
              description: 'All actors should participate in the conversation',
              config: {},
            },
          ],
        },
      };

      const result = await runner.runScenario(scenario);

      expect(result.passed).toBe(true);
      // Should have messages from all actors
      const actorIds = new Set(result.transcript.map(msg => msg.actorId));
      expect(actorIds.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Verification Testing', () => {
    it('should verify message count rules', async () => {
      const scenario: Scenario = {
        id: 'message-count-test',
        name: 'Message Count Test',
        description: 'Test message count verification',
        actors: [
          {
            id: 'subject' as UUID,
            name: 'Subject',
            role: 'subject',
            script: {
              steps: [
                { type: 'message', content: 'Message 1' },
                { type: 'message', content: 'Message 2' },
                { type: 'message', content: 'Message 3' },
              ],
            },
          },
        ],
        setup: {},
        execution: {
          maxDuration: 5000,
        },
        verification: {
          rules: [
            {
              id: 'message-count',
              type: 'llm',
              description: 'Should have at least 3 messages',
              config: {
                deterministicType: 'message_count',
                minMessages: 3,
                maxMessages: 10,
              },
            },
          ],
        },
      };

      const result = await runner.runScenario(scenario);

      expect(result.passed).toBe(true);
      expect(result.transcript.length).toBeGreaterThanOrEqual(3);
    });

    it('should support weighted verification rules', async () => {
      const scenario: Scenario = {
        id: 'weighted-rules-test',
        name: 'Weighted Rules Test',
        description: 'Test weighted verification rules',
        actors: [
          {
            id: 'subject' as UUID,
            name: 'Subject',
            role: 'subject',
            script: {
              steps: [
                { type: 'message', content: 'Test message' },
              ],
            },
          },
        ],
        setup: {},
        execution: {
          maxDuration: 5000,
        },
        verification: {
          rules: [
            {
              id: 'critical-rule',
              type: 'llm',
              description: 'Critical rule that must pass',
              weight: 3,
              config: {},
            },
            {
              id: 'optional-rule',
              type: 'llm',
              description: 'Optional rule with low weight',
              weight: 1,
              config: {},
            },
          ],
        },
      };

      const result = await runner.runScenario(scenario);

      expect(result.verificationResults).toHaveLength(2);
      // Overall pass should be weighted
      expect(result.passed).toBeDefined();
    });
  });

  describe('Performance and Metrics', () => {
    it('should collect comprehensive metrics', async () => {
      const scenario: Scenario = {
        id: 'metrics-test',
        name: 'Metrics Collection Test',
        description: 'Test metrics collection',
        actors: [
          {
            id: 'subject' as UUID,
            name: 'Subject',
            role: 'subject',
            script: {
              steps: [
                { type: 'message', content: 'Test message 1' },
                { type: 'action', actionName: 'TEST_ACTION' },
                { type: 'message', content: 'Test message 2' },
              ],
            },
          },
        ],
        setup: {},
        execution: {
          maxDuration: 10000,
        },
        verification: {
          rules: [
            {
              id: 'test-rule',
              type: 'llm',
              description: 'Test verification',
              config: {},
            },
          ],
        },
        benchmarks: {
          customMetrics: [{ name: 'conversation_turns' }],
        },
      };

      const result = await runner.runScenario(scenario);

      expect(result.metrics).toBeDefined();
      expect(result.metrics.duration).toBeGreaterThan(0);
      expect(result.metrics.messageCount).toBeGreaterThan(0);
      expect(result.metrics.actionCounts).toBeDefined();
      expect(result.metrics.tokenUsage).toBeDefined();
      expect(result.metrics.responseLatency).toBeDefined();
      expect(result.metrics.customMetrics).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle setup errors gracefully', async () => {
      // Force an error during setup
      vi.spyOn(mockRuntime, 'ensureWorldExists').mockRejectedValueOnce(new Error('Setup failed'));

      const scenario: Scenario = {
        id: 'error-test',
        name: 'Error Test',
        description: 'Test error handling',
        actors: [
          {
            id: 'subject' as UUID,
            name: 'Subject',
            role: 'subject',
            script: {
              steps: [],
            },
          },
        ],
        setup: {},
        execution: {},
        verification: {
          rules: [
            {
              id: 'test',
              type: 'llm',
              description: 'Test',
              config: {},
            },
          ],
        },
      };

      const result = await runner.runScenario(scenario);

      expect(result.passed).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Setup failed');
    });

    it('should handle runtime errors during execution', async () => {
      const scenario: Scenario = {
        id: 'runtime-error-test',
        name: 'Runtime Error Test',
        description: 'Test runtime error handling',
        actors: [
          {
            id: 'subject' as UUID,
            name: 'Subject',
            role: 'subject',
            script: {
              steps: [
                { type: 'action', actionName: 'NON_EXISTENT_ACTION' },
              ],
            },
          },
        ],
        setup: {},
        execution: {
          maxDuration: 5000,
        },
        verification: {
          rules: [
            {
              id: 'test',
              type: 'llm',
              description: 'Test',
              config: {},
            },
          ],
        },
      };

      const result = await runner.runScenario(scenario);

      // Should complete even with errors
      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });
}); 