import { describe, expect, it } from 'bun:test';
import type {
  ActionPlan,
  ActionStep,
  PlanState,
  PlanningContext,
  PlanActionResult,
  PlanActionContext,
  WorkingMemory,
  IPlanningService,
  Constraint,
  Condition,
  Outcome,
  StepDependency,
  PlanMetrics,
  PlanEvaluation,
  PlanExecutionResult,
  AdaptationRule,
  ResourceRequirement,
} from '../planning';

describe('Planning Types', () => {
  describe('Constraint', () => {
    it('should have required properties', () => {
      const constraint: Constraint = {
        type: 'resource',
        value: { maxMemory: 1024 },
      };
      expect(constraint.type).toBe('resource');
      expect(constraint.value).toEqual({ maxMemory: 1024 });
    });

    it('should allow various constraint types', () => {
      const timeConstraint: Constraint = {
        type: 'time',
        value: 3600,
      };
      const resourceConstraint: Constraint = {
        type: 'resource',
        value: { cpu: 50, memory: 2048 },
      };
      expect(timeConstraint.type).toBe('time');
      expect(resourceConstraint.type).toBe('resource');
    });
  });

  describe('Condition', () => {
    it('should have required properties', () => {
      const condition: Condition = {
        type: 'state',
        operator: 'equals',
        value: 'ready',
      };
      expect(condition.type).toBe('state');
      expect(condition.operator).toBe('equals');
      expect(condition.value).toBe('ready');
    });
  });

  describe('Outcome', () => {
    it('should support various outcome types', () => {
      const successOutcome: Outcome = {
        type: 'success',
        description: 'Task completed',
        data: { result: 'processed' },
      };
      const failureOutcome: Outcome = {
        type: 'failure',
        description: 'Task failed',
      };
      expect(successOutcome.type).toBe('success');
      expect(failureOutcome.type).toBe('failure');
      expect(successOutcome.data).toEqual({ result: 'processed' });
    });
  });

  describe('ActionStep', () => {
    it('should have all required properties', () => {
      const step: ActionStep = {
        id: 'step-1',
        type: 'action',
        actionId: 'send-message',
        description: 'Send notification',
      };
      expect(step.id).toBe('step-1');
      expect(step.type).toBe('action');
      expect(step.actionId).toBe('send-message');
    });

    it('should support optional properties', () => {
      const step: ActionStep = {
        id: 'step-2',
        type: 'decision',
        actionId: 'evaluate',
        description: 'Evaluate condition',
        parameters: { threshold: 0.8 },
        dependencies: ['step-1'],
        conditions: [],
        expectedOutcomes: [],
        timeout: 5000,
        retryPolicy: {
          maxAttempts: 3,
          delay: 1000,
          backoffMultiplier: 2,
        },
      };
      expect(step.parameters).toEqual({ threshold: 0.8 });
      expect(step.timeout).toBe(5000);
      expect(step.retryPolicy?.maxAttempts).toBe(3);
    });
  });

  describe('PlanState', () => {
    it('should support all plan states', () => {
      const states: PlanState[] = [
        'draft',
        'ready',
        'executing',
        'paused',
        'completed',
        'failed',
        'cancelled',
      ];
      states.forEach((state) => {
        const plan = { state };
        expect(states).toContain(plan.state);
      });
    });
  });

  describe('ActionPlan', () => {
    it('should have all required properties', () => {
      const plan: ActionPlan = {
        id: 'plan-1',
        name: 'Test Plan',
        description: 'A test plan',
        goal: 'Complete test',
        steps: [],
        state: 'draft',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(plan.id).toBe('plan-1');
      expect(plan.name).toBe('Test Plan');
      expect(plan.state).toBe('draft');
    });
  });

  describe('PlanActionResult', () => {
    it('should have required properties', () => {
      const result: PlanActionResult = {
        values: { success: true },
        data: { message: 'completed' },
      };
      expect(result.values).toEqual({ success: true });
      expect(result.data).toEqual({ message: 'completed' });
    });

    it('should support text results', () => {
      const textResult: PlanActionResult = {
        text: 'Operation completed successfully',
        data: { status: 'complete' },
      };
      expect(textResult.text).toBe('Operation completed successfully');
      expect(textResult.data).toEqual({ status: 'complete' });
    });
  });

  describe('PlanningContext', () => {
    it('should have all required properties', () => {
      const context: PlanningContext = {
        goal: 'Process data',
        constraints: [],
        availableActions: ['read', 'write', 'process'],
        currentState: { status: 'idle' },
        preferences: { priority: 'high' },
      };
      expect(context.goal).toBe('Process data');
      expect(context.availableActions).toContain('read');
    });
  });

  describe('WorkingMemory', () => {
    it('should define required methods', () => {
      const memory: WorkingMemory = {
        store: async (key: string, value: any) => {},
        retrieve: async (key: string) => ({ data: 'test' }),
        update: async (key: string, value: any) => {},
        remove: async (key: string) => {},
        clear: async () => {},
        getAll: async () => ({ key1: 'value1' }),
        serialize: async () => JSON.stringify({ key1: 'value1' }),
        deserialize: async (data: string) => {},
      };
      expect(memory.store).toBeDefined();
      expect(memory.retrieve).toBeDefined();
      expect(memory.update).toBeDefined();
    });
  });

  describe('IPlanningService', () => {
    it('should define all required methods', () => {
      const service: Partial<IPlanningService> = {
        createPlan: async () => ({}) as ActionPlan,
        executePlan: async () => ({}) as PlanExecutionResult,
        evaluatePlan: async () => ({}) as PlanEvaluation,
        adaptPlan: async () => ({}) as ActionPlan,
        getPlanStatus: async () => 'ready',
        cancelPlan: async () => {},
        resumePlan: async () => ({}) as PlanExecutionResult,
        getPlanHistory: async () => [],
        exportPlan: async () => ({}),
        importPlan: async () => ({}) as ActionPlan,
      };
      expect(service.createPlan).toBeDefined();
      expect(service.executePlan).toBeDefined();
      expect(service.evaluatePlan).toBeDefined();
    });
  });

  describe('PlanMetrics', () => {
    it('should track plan performance metrics', () => {
      const metrics: PlanMetrics = {
        totalSteps: 10,
        completedSteps: 7,
        failedSteps: 1,
        skippedSteps: 2,
        executionTime: 5000,
        resourceUsage: {
          cpu: 45,
          memory: 1024,
          apiCalls: 25,
        },
      };
      expect(metrics.totalSteps).toBe(10);
      expect(metrics.completedSteps).toBe(7);
      expect(metrics.resourceUsage?.cpu).toBe(45);
    });
  });

  describe('AdaptationRule', () => {
    it('should define adaptation rules', () => {
      const rule: AdaptationRule = {
        id: 'rule-1',
        condition: {
          type: 'performance',
          operator: 'less_than',
          value: 0.8,
        },
        action: {
          type: 'modify_parameters',
          parameters: { threshold: 0.6 },
        },
        priority: 1,
      };
      expect(rule.id).toBe('rule-1');
      expect(rule.priority).toBe(1);
      expect(rule.action.type).toBe('modify_parameters');
    });
  });
});
