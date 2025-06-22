import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  type IAgentRuntime,
  type IPlanningService,
  type ActionPlan,
  type PlanningContext,
  type Memory,
  type State,
  type UUID,
  asUUID,
  AgentRuntime,
} from '@elizaos/core';
import { PlanningService } from '../services/planning-service';
import { createMockRuntime, createMockMemory, createMockState } from './test-utils';

/**
 * Integration tests for the unified planning system
 * Tests the complete workflow from planning to execution
 */
describe('Planning Integration Tests', () => {
  let mockRuntime: IAgentRuntime;
  let planningService: PlanningService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime = createMockRuntime();
    planningService = new PlanningService(mockRuntime);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Registration and Initialization', () => {
    it('should register planning service in runtime', async () => {
      const runtime = createMockRuntime();
      
      // Simulate service registration
      const mockGetService = vi.fn().mockReturnValue(new PlanningService(runtime));
      runtime.getService = mockGetService;

      const service = runtime.getService<IPlanningService>('planning');
      
      expect(service).toBeInstanceOf(PlanningService);
      expect(mockGetService).toHaveBeenCalledWith('planning');
    });

    it('should handle missing planning service gracefully', () => {
      const runtime = createMockRuntime();
      runtime.getService = vi.fn().mockReturnValue(null);

      const service = runtime.getService<IPlanningService>('planning');
      
      expect(service).toBeNull();
    });
  });

  describe('Simple Planning', () => {
    it('should create simple plans for basic tasks', async () => {
      const message = createMockMemory({
        content: { text: 'Send an email to John about the meeting' },
      });
      const state = createMockState();

      const plan = await planningService.createSimplePlan(mockRuntime, message, state);

      expect(plan).toBeDefined();
      expect(plan.goal).toContain('email');
      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0].actionName).toBe('SEND_EMAIL');
    });

    it('should handle complex requests with multi-step planning', async () => {
      const message = createMockMemory({
        content: { text: 'Research the weather, then send a summary to the team' },
      });
      const state = createMockState();

      const plan = await planningService.createSimplePlan(mockRuntime, message, state);

      expect(plan).toBeDefined();
      expect(plan.steps.length).toBeGreaterThan(1);
      expect(plan.steps.some(step => step.actionName === 'SEARCH')).toBe(true);
      expect(plan.steps.some(step => step.actionName === 'SEND_EMAIL')).toBe(true);
    });

    it('should create conservative plans when uncertain', async () => {
      const message = createMockMemory({
        content: { text: 'Do something interesting' },
      });
      const state = createMockState();

      const plan = await planningService.createSimplePlan(mockRuntime, message, state);

      expect(plan).toBeDefined();
      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0].actionName).toBe('REPLY');
    });
  });

  describe('Comprehensive Planning', () => {
    it('should create detailed plans with context and constraints', async () => {
      const message = createMockMemory({
        content: { text: 'Plan a project timeline for the new feature' },
      });
      const state = createMockState();
      
      const planningContext: PlanningContext = {
        goal: 'Create a comprehensive project timeline',
        constraints: [
          {
            type: 'time',
            value: '2 weeks',
            description: 'Timeline constraint',
          },
          {
            type: 'resource',
            value: ['PROJECT_MANAGEMENT', 'CALENDAR'],
            description: 'Available tools',
          },
        ],
        availableActions: ['REPLY', 'THINK', 'CREATE_TASK', 'SCHEDULE'],
        availableProviders: ['TIME', 'CALENDAR'],
        preferences: {
          executionModel: 'sequential',
          maxSteps: 5,
          timeoutMs: 30000,
        },
      };

      const plan = await planningService.createComprehensivePlan(
        mockRuntime,
        planningContext,
        message,
        state
      );

      expect(plan).toBeDefined();
      expect(plan.goal).toContain('timeline');
      expect(plan.steps.length).toBeGreaterThan(1);
      expect(plan.executionModel).toBe('sequential');
      expect(plan.constraints).toEqual(planningContext.constraints);
    });

    it('should respect execution model preferences', async () => {
      const message = createMockMemory({
        content: { text: 'Process multiple tasks simultaneously' },
      });
      const state = createMockState();
      
      const planningContext: PlanningContext = {
        goal: 'Process multiple tasks',
        constraints: [],
        availableActions: ['TASK_A', 'TASK_B', 'TASK_C'],
        availableProviders: [],
        preferences: {
          executionModel: 'parallel',
          maxSteps: 10,
          timeoutMs: 60000,
        },
      };

      const plan = await planningService.createComprehensivePlan(
        mockRuntime,
        planningContext,
        message,
        state
      );

      expect(plan.executionModel).toBe('parallel');
      expect(plan.steps.length).toBeGreaterThan(1);
    });

    it('should handle DAG execution model for complex dependencies', async () => {
      const message = createMockMemory({
        content: { text: 'Coordinate dependent tasks with prerequisites' },
      });
      const state = createMockState();
      
      const planningContext: PlanningContext = {
        goal: 'Coordinate dependent tasks',
        constraints: [],
        availableActions: ['SETUP', 'PROCESS', 'FINALIZE'],
        availableProviders: [],
        preferences: {
          executionModel: 'dag',
          maxSteps: 8,
          timeoutMs: 45000,
        },
      };

      const plan = await planningService.createComprehensivePlan(
        mockRuntime,
        planningContext,
        message,
        state
      );

      expect(plan.executionModel).toBe('dag');
      expect(plan.steps.some(step => step.dependencies && step.dependencies.length > 0)).toBe(true);
    });
  });

  describe('Plan Execution', () => {
    it('should execute sequential plans correctly', async () => {
      const message = createMockMemory({
        content: { text: 'Execute test plan' },
      });
      
      const plan: ActionPlan = {
        id: asUUID('test-plan-id'),
        goal: 'Test sequential execution',
        steps: [
          {
            id: asUUID('step-1'),
            actionName: 'REPLY',
            parameters: { text: 'Step 1 completed' },
            expectedOutput: 'Confirmation message',
          },
          {
            id: asUUID('step-2'),
            actionName: 'THINK',
            parameters: { thought: 'Planning next step' },
            expectedOutput: 'Analysis result',
          },
        ],
        executionModel: 'sequential',
        constraints: [],
        createdAt: Date.now(),
        estimatedDuration: 5000,
      };

      const responses: any[] = [];
      const mockCallback = vi.fn((content) => {
        responses.push(content);
        return Promise.resolve([]);
      });

      const result = await planningService.executePlan(mockRuntime, plan, message, mockCallback);

      expect(result.success).toBe(true);
      expect(result.stepResults).toHaveLength(2);
      expect(responses).toHaveLength(2);
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    it('should handle execution errors gracefully', async () => {
      const message = createMockMemory({
        content: { text: 'Execute failing plan' },
      });
      
      const plan: ActionPlan = {
        id: asUUID('test-plan-id'),
        goal: 'Test error handling',
        steps: [
          {
            id: asUUID('step-1'),
            actionName: 'FAILING_ACTION',
            parameters: {},
            expectedOutput: 'Should fail',
          },
        ],
        executionModel: 'sequential',
        constraints: [],
        createdAt: Date.now(),
        estimatedDuration: 5000,
      };

      // Mock a failing action
      mockRuntime.actions = [{
        name: 'FAILING_ACTION',
        similes: [],
        description: 'An action that fails',
        handler: vi.fn().mockRejectedValue(new Error('Action failed')),
        validate: vi.fn().mockResolvedValue(true),
        examples: [],
      }];

      const mockCallback = vi.fn();

      const result = await planningService.executePlan(mockRuntime, plan, message, mockCallback);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Action failed');
      expect(result.stepResults).toHaveLength(1);
      expect(result.stepResults[0].success).toBe(false);
    });

    it('should maintain working memory across steps', async () => {
      const message = createMockMemory({
        content: { text: 'Test working memory' },
      });
      
      const plan: ActionPlan = {
        id: asUUID('test-plan-id'),
        goal: 'Test working memory persistence',
        steps: [
          {
            id: asUUID('step-1'),
            actionName: 'SET_VALUE',
            parameters: { key: 'test', value: 'hello' },
            expectedOutput: 'Value set',
          },
          {
            id: asUUID('step-2'),
            actionName: 'GET_VALUE',
            parameters: { key: 'test' },
            expectedOutput: 'Retrieved value',
          },
        ],
        executionModel: 'sequential',
        constraints: [],
        createdAt: Date.now(),
        estimatedDuration: 5000,
      };

      // Mock actions that use working memory
      let workingMemory: Record<string, any> = {};
      
      mockRuntime.actions = [
        {
          name: 'SET_VALUE',
          similes: [],
          description: 'Set a value in working memory',
          handler: vi.fn().mockImplementation(async (runtime, message, state, options) => {
            const { key, value } = options as any;
            workingMemory[key] = value;
            return { text: `Set ${key} = ${value}` };
          }),
          validate: vi.fn().mockResolvedValue(true),
          examples: [],
        },
        {
          name: 'GET_VALUE',
          similes: [],
          description: 'Get a value from working memory',
          handler: vi.fn().mockImplementation(async (runtime, message, state, options) => {
            const { key } = options as any;
            const value = workingMemory[key];
            return { text: `Retrieved ${key} = ${value}` };
          }),
          validate: vi.fn().mockResolvedValue(true),
          examples: [],
        },
      ];

      const responses: any[] = [];
      const mockCallback = vi.fn((content) => {
        responses.push(content);
        return Promise.resolve([]);
      });

      const result = await planningService.executePlan(mockRuntime, plan, message, mockCallback);

      expect(result.success).toBe(true);
      expect(responses[0].text).toContain('Set test = hello');
      expect(responses[1].text).toContain('Retrieved test = hello');
    });
  });

  describe('Plan Validation', () => {
    it('should validate plan structure and feasibility', async () => {
      const validPlan: ActionPlan = {
        id: asUUID('valid-plan'),
        goal: 'Valid test plan',
        steps: [
          {
            id: asUUID('step-1'),
            actionName: 'REPLY',
            parameters: { text: 'Hello' },
            expectedOutput: 'Greeting response',
          },
        ],
        executionModel: 'sequential',
        constraints: [],
        createdAt: Date.now(),
        estimatedDuration: 1000,
      };

      const validation = await planningService.validatePlan(mockRuntime, validPlan);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.confidence).toBeGreaterThan(0.5);
    });

    it('should detect invalid plans', async () => {
      const invalidPlan: ActionPlan = {
        id: asUUID('invalid-plan'),
        goal: 'Invalid test plan',
        steps: [
          {
            id: asUUID('step-1'),
            actionName: 'NONEXISTENT_ACTION',
            parameters: {},
            expectedOutput: 'Should not work',
          },
        ],
        executionModel: 'sequential',
        constraints: [],
        createdAt: Date.now(),
        estimatedDuration: 1000,
      };

      const validation = await planningService.validatePlan(mockRuntime, invalidPlan);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues[0]).toContain('NONEXISTENT_ACTION');
    });

    it('should detect circular dependencies in DAG plans', async () => {
      const circularPlan: ActionPlan = {
        id: asUUID('circular-plan'),
        goal: 'Plan with circular dependencies',
        steps: [
          {
            id: asUUID('step-1'),
            actionName: 'ACTION_A',
            parameters: {},
            expectedOutput: 'Result A',
            dependencies: [asUUID('step-2')],
          },
          {
            id: asUUID('step-2'),
            actionName: 'ACTION_B',
            parameters: {},
            expectedOutput: 'Result B',
            dependencies: [asUUID('step-1')],
          },
        ],
        executionModel: 'dag',
        constraints: [],
        createdAt: Date.now(),
        estimatedDuration: 2000,
      };

      const validation = await planningService.validatePlan(mockRuntime, circularPlan);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('circular'))).toBe(true);
    });
  });

  describe('Plan Adaptation', () => {
    it('should adapt plans when execution fails', async () => {
      const originalPlan: ActionPlan = {
        id: asUUID('adaptable-plan'),
        goal: 'Adaptable test plan',
        steps: [
          {
            id: asUUID('step-1'),
            actionName: 'PRIMARY_ACTION',
            parameters: {},
            expectedOutput: 'Primary result',
          },
        ],
        executionModel: 'sequential',
        constraints: [],
        createdAt: Date.now(),
        estimatedDuration: 1000,
      };

      const failureContext = {
        failedStep: originalPlan.steps[0],
        error: 'Primary action unavailable',
        remainingSteps: [],
      };

      const newPlan = await planningService.adaptPlan(
        mockRuntime,
        originalPlan,
        failureContext
      );

      expect(newPlan).toBeDefined();
      expect(newPlan.id).not.toBe(originalPlan.id);
      expect(newPlan.goal).toContain(originalPlan.goal);
      expect(newPlan.steps[0].actionName).not.toBe('PRIMARY_ACTION');
    });

    it('should maintain plan integrity during adaptation', async () => {
      const originalPlan: ActionPlan = {
        id: asUUID('complex-plan'),
        goal: 'Complex multi-step plan',
        steps: [
          {
            id: asUUID('step-1'),
            actionName: 'SETUP',
            parameters: {},
            expectedOutput: 'Setup complete',
          },
          {
            id: asUUID('step-2'),
            actionName: 'FAILING_STEP',
            parameters: {},
            expectedOutput: 'Should fail',
          },
          {
            id: asUUID('step-3'),
            actionName: 'CLEANUP',
            parameters: {},
            expectedOutput: 'Cleanup complete',
          },
        ],
        executionModel: 'sequential',
        constraints: [],
        createdAt: Date.now(),
        estimatedDuration: 3000,
      };

      const failureContext = {
        failedStep: originalPlan.steps[1],
        error: 'Step 2 failed',
        remainingSteps: [originalPlan.steps[2]],
      };

      const adaptedPlan = await planningService.adaptPlan(
        mockRuntime,
        originalPlan,
        failureContext
      );

      expect(adaptedPlan.steps.length).toBeGreaterThan(0);
      expect(adaptedPlan.constraints).toEqual(originalPlan.constraints);
      expect(adaptedPlan.executionModel).toBe(originalPlan.executionModel);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty plans gracefully', async () => {
      const emptyPlan: ActionPlan = {
        id: asUUID('empty-plan'),
        goal: 'Empty plan',
        steps: [],
        executionModel: 'sequential',
        constraints: [],
        createdAt: Date.now(),
        estimatedDuration: 0,
      };

      const message = createMockMemory();
      const mockCallback = vi.fn();

      const result = await planningService.executePlan(mockRuntime, emptyPlan, message, mockCallback);

      expect(result.success).toBe(true);
      expect(result.stepResults).toHaveLength(0);
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle malformed planning context', async () => {
      const message = createMockMemory({
        content: { text: 'Test malformed context' },
      });
      const state = createMockState();
      
      const malformedContext = {
        goal: '', // Empty goal
        constraints: null as any, // Invalid constraints
        availableActions: undefined as any, // Missing actions
        availableProviders: [],
        preferences: {} as any, // Missing required preferences
      };

      await expect(
        planningService.createComprehensivePlan(mockRuntime, malformedContext, message, state)
      ).rejects.toThrow();
    });

    it('should handle runtime service unavailability', async () => {
      const brokenRuntime = createMockRuntime();
      brokenRuntime.useModel = vi.fn().mockRejectedValue(new Error('Model service unavailable'));

      const planningServiceWithBrokenRuntime = new PlanningService(brokenRuntime);
      const message = createMockMemory();
      const state = createMockState();

      await expect(
        planningServiceWithBrokenRuntime.createSimplePlan(brokenRuntime, message, state)
      ).rejects.toThrow('Model service unavailable');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large plans efficiently', async () => {
      const largePlan: ActionPlan = {
        id: asUUID('large-plan'),
        goal: 'Large scale plan',
        steps: Array.from({ length: 100 }, (_, i) => ({
          id: asUUID(`step-${i}`),
          actionName: 'REPLY',
          parameters: { text: `Step ${i}` },
          expectedOutput: `Result ${i}`,
        })),
        executionModel: 'sequential',
        constraints: [],
        createdAt: Date.now(),
        estimatedDuration: 100000,
      };

      const message = createMockMemory();
      const mockCallback = vi.fn().mockResolvedValue([]);

      const startTime = Date.now();
      const result = await planningService.executePlan(mockRuntime, largePlan, message, mockCallback);
      const executionTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.stepResults).toHaveLength(100);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle timeout constraints', async () => {
      const timeoutPlan: ActionPlan = {
        id: asUUID('timeout-plan'),
        goal: 'Plan with timeout',
        steps: [
          {
            id: asUUID('slow-step'),
            actionName: 'SLOW_ACTION',
            parameters: {},
            expectedOutput: 'Slow result',
          },
        ],
        executionModel: 'sequential',
        constraints: [
          {
            type: 'time',
            value: 1000, // 1 second timeout
            description: 'Execution timeout',
          },
        ],
        createdAt: Date.now(),
        estimatedDuration: 2000,
      };

      // Mock a slow action
      mockRuntime.actions = [{
        name: 'SLOW_ACTION',
        similes: [],
        description: 'A slow action',
        handler: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
          return { text: 'Slow result' };
        }),
        validate: vi.fn().mockResolvedValue(true),
        examples: [],
      }];

      const message = createMockMemory();
      const mockCallback = vi.fn();

      const result = await planningService.executePlan(mockRuntime, timeoutPlan, message, mockCallback);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });
});