import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScenarioRunner } from '../../../src/scenario-runner/index.js';
import type { Scenario, ScenarioResult, ScenarioActor } from '../../../src/scenario-runner/types.js';
import { AgentServer } from '@elizaos/server';
import { createUniqueUuid, type IAgentRuntime, type UUID } from '@elizaos/core';

// Mock dependencies
vi.mock('@elizaos/server');
vi.mock('@elizaos/core');

describe('ScenarioRunner', () => {
  let server: AgentServer;
  let runtime: IAgentRuntime;
  let runner: ScenarioRunner;
  let mockScenario: Scenario;

  beforeEach(() => {
    // Set up mocks
    const agents = new Map<string, IAgentRuntime>();
    
    server = {
      agents,
      database: {},
      initialize: vi.fn(),
      registerAgent: vi.fn(),
      unregisterAgent: vi.fn(),
      stop: vi.fn(),
    } as any;

    runtime = {
      agentId: 'test-agent-id' as UUID,
      character: { name: 'Test Agent' },
      ensureWorldExists: vi.fn(),
      ensureRoomExists: vi.fn(),
      createMemory: vi.fn(),
      emitEvent: vi.fn(),
      generateText: vi.fn().mockResolvedValue('Mock response'),
      useModel: vi.fn().mockResolvedValue('Mock LLM response'),
    } as any;

    // Add runtime to server agents
    agents.set(runtime.agentId, runtime);

    runner = new ScenarioRunner(server, runtime);

    // Create a basic test scenario
    mockScenario = {
      id: 'test-scenario',
      name: 'Test Scenario',
      description: 'A test scenario for unit testing',
      actors: [
        {
          id: 'subject-id' as UUID,
          name: 'Test Subject',
          role: 'subject',
          script: {
            steps: [
              { type: 'message', content: 'Hello, world!' },
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
            id: 'test-rule',
            type: 'llm',
            description: 'Test verification rule',
            config: {},
          },
        ],
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('runScenario', () => {
    it('should successfully run a basic scenario', async () => {
      const result = await runner.runScenario(mockScenario);

      expect(result).toBeDefined();
      expect(result.scenarioId).toBe(mockScenario.id);
      expect(result.name).toBe(mockScenario.name);
      expect(result.passed).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.verificationResults).toBeInstanceOf(Array);
    });

    it('should validate scenario before execution', async () => {
      const invalidScenario = { ...mockScenario, actors: [] };

      await expect(runner.runScenario(invalidScenario)).rejects.toThrow(
        'Scenario must have at least one actor'
      );
    });

    it('should handle setup errors gracefully', async () => {
      vi.mocked(runtime.ensureWorldExists).mockRejectedValueOnce(new Error('Setup failed'));

      const result = await runner.runScenario(mockScenario);

      expect(result.passed).toBe(false);
      expect(result.errors).toContain('Setup failed');
    });

    it('should track metrics during execution', async () => {
      const result = await runner.runScenario(mockScenario);

      expect(result.metrics.messageCount).toBeGreaterThanOrEqual(0);
      expect(result.metrics.duration).toBeGreaterThan(0);
      expect(result.metrics.tokenUsage).toBeDefined();
    });

    it('should execute verification rules', async () => {
      const result = await runner.runScenario(mockScenario, { verbose: true });

      expect(result.verificationResults).toHaveLength(1);
      expect(result.verificationResults[0].ruleId).toBe('test-rule');
    });

    it('should support progress callbacks', async () => {
      const progressCallback = vi.fn();

      await runner.runScenario(mockScenario, {}, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          scenarioId: mockScenario.id,
          phase: expect.any(String),
        })
      );
    });
  });

  describe('runScenarios', () => {
    it('should run multiple scenarios sequentially', async () => {
      const scenarios = [mockScenario, { ...mockScenario, id: 'test-2' }];

      const results = await runner.runScenarios(scenarios);

      expect(results).toHaveLength(2);
      expect(results[0].scenarioId).toBe('test-scenario');
      expect(results[1].scenarioId).toBe('test-2');
    });

    it('should run scenarios in parallel when specified', async () => {
      const scenarios = Array.from({ length: 5 }, (_, i) => ({
        ...mockScenario,
        id: `test-${i}`,
      }));

      const startTime = Date.now();
      const results = await runner.runScenarios(scenarios, {
        parallel: true,
        maxConcurrency: 3,
      });
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      // Parallel execution should be faster than sequential
      expect(duration).toBeLessThan(5000);
    });

    it('should respect maxConcurrency limit', async () => {
      const concurrentCalls: number[] = [];
      let currentConcurrent = 0;
      let maxConcurrent = 0;

      // Mock to track concurrent executions
      vi.mocked(runtime.ensureWorldExists).mockImplementation(async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(resolve => setTimeout(resolve, 100));
        currentConcurrent--;
      });

      const scenarios = Array.from({ length: 6 }, (_, i) => ({
        ...mockScenario,
        id: `test-${i}`,
      }));

      await runner.runScenarios(scenarios, {
        parallel: true,
        maxConcurrency: 2,
      });

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('validateScenario', () => {
    it('should validate required fields', () => {
      const invalidScenarios = [
        { ...mockScenario, id: undefined },
        { ...mockScenario, name: undefined },
        { ...mockScenario, actors: [] },
        { ...mockScenario, verification: { rules: [] } },
      ];

      for (const scenario of invalidScenarios) {
        expect(() => runner['validateScenario'](scenario as any)).toThrow();
      }
    });

    it('should require exactly one subject actor', () => {
      const noSubject = {
        ...mockScenario,
        actors: [{ 
          id: 'test-id' as UUID, 
          name: 'Test', 
          role: 'tester' as const,
          script: { steps: [] }
        }],
      };

      expect(() => runner['validateScenario'](noSubject)).toThrow(
        'Scenario must have exactly one subject actor'
      );

      const twoSubjects = {
        ...mockScenario,
        actors: [
          { 
            id: 'sub1-id' as UUID, 
            name: 'Subject 1', 
            role: 'subject' as const,
            script: { steps: [] }
          },
          { 
            id: 'sub2-id' as UUID, 
            name: 'Subject 2', 
            role: 'subject' as const,
            script: { steps: [] }
          },
        ],
      };

      expect(() => runner['validateScenario'](twoSubjects)).toThrow(
        'Scenario can only have one subject actor'
      );
    });
  });

  describe('setupScenario', () => {
    it('should create world and room for scenario', async () => {
      const context = await runner['setupScenario'](mockScenario);

      expect(runtime.ensureWorldExists).toHaveBeenCalled();
      expect(runtime.ensureRoomExists).toHaveBeenCalled();
      expect(context.roomId).toBeDefined();
      expect(context.worldId).toBeDefined();
      expect(context.actors.size).toBe(1);
    });

    it('should handle initial messages in setup', async () => {
      const scenarioWithMessages = {
        ...mockScenario,
        setup: {
          ...mockScenario.setup,
          initialMessages: [
            { id: '1', content: 'Initial message', sender: 'system', timestamp: Date.now() },
          ],
        },
      };

      await runner['setupScenario'](scenarioWithMessages);

      expect(runtime.createMemory).toHaveBeenCalled();
    });
  });

  describe('executeScenario', () => {
    it('should execute actor scripts', async () => {
      const context = await runner['setupScenario'](mockScenario);
      const progressCallback = vi.fn();

      await runner['executeScenario'](context, progressCallback);

      // Verify script execution
      expect(context.transcript.length).toBeGreaterThan(0);
    });

    it('should handle different script step types', async () => {
      const complexScenario: Scenario = {
        ...mockScenario,
        actors: [
          {
            id: 'subject-id' as UUID,
            name: 'Test Subject',
            role: 'subject',
            script: {
              steps: [
                { type: 'message', content: 'Test message' },
                { type: 'wait', waitTime: 100 },
                { type: 'action', actionName: 'TEST_ACTION', actionParams: {} },
                { type: 'assert', assertion: { type: 'contains', value: 'test', description: 'Test assertion' } },
              ],
            },
          },
        ],
      };

      const context = await runner['setupScenario'](complexScenario);
      await runner['executeScenario'](context);

      // All steps should have been executed
      expect(context.transcript).toBeDefined();
    });
  });

  describe('teardownScenario', () => {
    it('should clean up resources after scenario', async () => {
      const context = await runner['setupScenario'](mockScenario);
      
      await runner['teardownScenario'](context);

      // Verify cleanup happened
      expect(runner['activeScenarios'].has(mockScenario.id)).toBe(false);
    });
  });

  describe('determinePass', () => {
    it('should determine pass based on verification weight', () => {
      const verificationResults = [
        { ruleId: 'rule1', passed: true, ruleName: 'Rule 1', reason: 'Passed' },
        { ruleId: 'rule2', passed: false, ruleName: 'Rule 2', reason: 'Failed' },
        { ruleId: 'rule3', passed: true, ruleName: 'Rule 3', reason: 'Passed' },
      ];

      const scenario = {
        ...mockScenario,
        verification: {
          rules: [
            { id: 'rule1', type: 'llm' as const, description: 'Rule 1', weight: 1, config: {} },
            { id: 'rule2', type: 'llm' as const, description: 'Rule 2', weight: 2, config: {} },
            { id: 'rule3', type: 'llm' as const, description: 'Rule 3', weight: 1, config: {} },
          ],
        },
      };

      const passed = runner['determinePass'](verificationResults, scenario);

      // 2/4 weight passed (50%), below 70% threshold
      expect(passed).toBe(false);
    });
  });

  describe('calculateOverallScore', () => {
    it('should calculate average score from verification results', () => {
      const verificationResults = [
        { ruleId: 'rule1', passed: true, score: 0.9, ruleName: 'Rule 1', reason: 'Good' },
        { ruleId: 'rule2', passed: false, score: 0.3, ruleName: 'Rule 2', reason: 'Poor' },
        { ruleId: 'rule3', passed: true, score: 0.8, ruleName: 'Rule 3', reason: 'Good' },
      ];

      const score = runner['calculateOverallScore'](verificationResults);

      expect(score).toBeCloseTo(0.67, 2); // (0.9 + 0.3 + 0.8) / 3
    });

    it('should handle missing scores', () => {
      const verificationResults = [
        { ruleId: 'rule1', passed: true, ruleName: 'Rule 1', reason: 'Passed' },
        { ruleId: 'rule2', passed: false, ruleName: 'Rule 2', reason: 'Failed' },
      ];

      const score = runner['calculateOverallScore'](verificationResults);

      expect(score).toBe(0.5); // (1 + 0) / 2
    });
  });
}); 