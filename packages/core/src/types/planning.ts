import { Memory } from './memory';
import { Content } from './messaging';
import { IAgentRuntime } from './runtime';
import { State } from './state';
import type { UUID } from './uuid';
import type { HandlerCallback } from './components';

/**
 * Represents the state of a plan execution
 */
export interface PlanState {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: number;
  endTime?: number;
  currentStepIndex?: number;
  error?: Error;
}

/**
 * Value types for different constraint types
 */
export type ConstraintValue =
  | number // for time constraints (milliseconds)
  | { cpu?: number; memory?: number; storage?: number } // for resource constraints
  | string[] // for dependency constraints (list of dependencies)
  | Record<string, unknown>; // for custom constraints

/**
 * Represents a constraint on plan execution
 */
export interface Constraint {
  type: 'time' | 'resource' | 'dependency' | 'custom';
  value: ConstraintValue;
  description?: string;
}

/**
 * Value types for different condition types
 */
export type ConditionValue = string | number | boolean | Date | RegExp | unknown[];

/**
 * Represents a condition for action execution
 */
export interface Condition {
  type: 'state' | 'result' | 'time' | 'custom';
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'matches';
  value: ConditionValue;
  target: string;
}

/**
 * Data structure for outcome results
 */
export interface OutcomeData {
  [key: string]: string | number | boolean | null | OutcomeData | OutcomeData[];
}

/**
 * Represents expected outcome of an action
 */
export interface Outcome {
  success: boolean;
  data?: OutcomeData;
  stateChanges?: string[];
}

/**
 * Retry policy for failed actions
 */
export interface RetryPolicy {
  maxRetries: number;
  backoffMs?: number;
  backoffMultiplier?: number;
  onError?: 'abort' | 'continue' | 'skip';
}

/**
 * Parameter types for action steps
 */
export type ActionParameter =
  | string
  | number
  | boolean
  | null
  | Date
  | ActionParameter[]
  | { [key: string]: ActionParameter };

/**
 * Represents a single step in an action plan
 */
export interface ActionStep {
  id: UUID;
  actionName: string;
  parameters?: Record<string, ActionParameter>;
  dependencies?: UUID[]; // Other step IDs
  conditions?: Condition[];
  expectedOutcome?: Outcome;
  retryPolicy?: RetryPolicy;
  onError?: 'abort' | 'continue' | 'skip';
}

/**
 * Represents a complete action plan
 */
export interface ActionPlan {
  id: UUID;
  goal: string;
  steps: ActionStep[];
  executionModel: 'sequential' | 'parallel' | 'dag' | 'reactive';
  state: PlanState;
  metadata: {
    createdAt: number;
    estimatedDuration?: number;
    priority?: number;
    constraints?: Constraint[];
    tags?: string[];
    adaptations?: string[];
  };
}

/**
 * Result value types
 */
export interface ResultValueObject {
  [key: string]: ResultValue;
}
export type ResultValue =
  | string
  | number
  | boolean
  | null
  | Date
  | ResultValue[]
  | ResultValueObject;

/**
 * Result of executing a planned action
 */
export interface PlanActionResult {
  values?: Record<string, ResultValue>;
  data?: Record<string, ResultValue>;
  text?: string;
}

/**
 * Memory value type
 */
export interface MemoryValueObject {
  [key: string]: MemoryValue;
}
export type MemoryValue =
  | string
  | number
  | boolean
  | null
  | Date
  | MemoryValue[]
  | MemoryValueObject;

/**
 * Context provided to planned actions during execution
 */
export interface PlanActionContext {
  planId?: UUID;
  stepId?: UUID;
  workingMemory?: WorkingMemory;
  previousResults?: PlanActionResult[];
  abortSignal?: AbortSignal;

  // Methods will be added by implementation
  updateMemory?: (key: string, value: MemoryValue) => void;
  getMemory?: (key: string) => MemoryValue | undefined;
  getPreviousResult?: (stepId: UUID) => PlanActionResult | undefined;
  requestReplanning?: () => Promise<ActionPlan>;
}

/**
 * Working memory interface for maintaining state across actions
 */
export interface WorkingMemory {
  set(key: string, value: MemoryValue): void;
  get(key: string): MemoryValue | undefined;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  entries(): IterableIterator<[string, MemoryValue]>;
  serialize(): Record<string, MemoryValue>;
}

/**
 * Result of executing a plan
 */
export interface PlanExecutionResult {
  planId: UUID;
  success: boolean;
  completedSteps: number;
  totalSteps: number;
  results: PlanActionResult[];
  errors?: Error[];
  duration: number;
  adaptations?: string[];
}

/**
 * Context for planning
 */
export interface PlanningContext {
  goal: string;
  constraints: Constraint[];
  availableActions: string[];
  availableProviders: string[];
  preferences?: {
    executionModel?: 'sequential' | 'parallel' | 'dag';
    maxSteps?: number;
    timeoutMs?: number;
  };
}

/**
 * Unified Planning Service Interface
 * Provides both simple inline planning and complex multi-step planning capabilities
 */
export interface IPlanningService {
  /**
   * Service type for categorization
   */
  readonly serviceType: string;

  /**
   * Service capability description
   */
  readonly capabilityDescription: string;

  /**
   * Creates a simple plan for basic message handling
   * Used by message-handling for backwards compatibility
   */
  createSimplePlan(
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    responseContent: Content
  ): Promise<ActionPlan | null>;

  /**
   * Creates a comprehensive multi-step plan
   * Used for complex planning scenarios
   */
  createComprehensivePlan(
    runtime: IAgentRuntime,
    context: PlanningContext,
    message?: Memory,
    state?: State
  ): Promise<ActionPlan>;

  /**
   * Executes a plan with full runtime integration
   */
  executePlan(
    runtime: IAgentRuntime,
    plan: ActionPlan,
    message: Memory,
    callback?: HandlerCallback
  ): Promise<PlanExecutionResult>;

  /**
   * Validates a plan before execution
   */
  validatePlan(
    runtime: IAgentRuntime,
    plan: ActionPlan
  ): Promise<{ valid: boolean; issues?: string[] }>;

  /**
   * Adapts a plan during execution based on results
   */
  adaptPlan(
    runtime: IAgentRuntime,
    plan: ActionPlan,
    currentStepIndex: number,
    results: PlanActionResult[],
    error?: Error
  ): Promise<ActionPlan>;

  /**
   * Gets the current execution status of a plan
   */
  getPlanStatus(planId: UUID): Promise<PlanState | null>;

  /**
   * Cancels plan execution
   */
  cancelPlan(planId: UUID): Promise<boolean>;

  /**
   * Cleanup method called when service is stopped
   */
  stop(): Promise<void>;
}
