import { type UUID, type IAgentRuntime, type Memory, type State } from './index';

/**
 * Represents a trigger type for workflows
 */
export enum WorkflowTriggerType {
  /** Triggered by a specific event */
  EVENT = 'EVENT',
  /** Triggered by a cron schedule */
  CRON = 'CRON',
  /** Triggered manually */
  MANUAL = 'MANUAL',
  /** Triggered by another workflow */
  WORKFLOW = 'WORKFLOW',
}

/**
 * Represents the status of a workflow
 */
export enum WorkflowStatus {
  /** Workflow is active and can be triggered */
  ACTIVE = 'ACTIVE',
  /** Workflow is paused and won't be triggered */
  PAUSED = 'PAUSED',
  /** Workflow is being edited */
  DRAFT = 'DRAFT',
  /** Workflow has errors and cannot run */
  ERROR = 'ERROR',
}

/**
 * Represents the execution status of a workflow instance
 */
export enum WorkflowExecutionStatus {
  /** Workflow is currently running */
  RUNNING = 'RUNNING',
  /** Workflow completed successfully */
  COMPLETED = 'COMPLETED',
  /** Workflow failed during execution */
  FAILED = 'FAILED',
  /** Workflow was cancelled */
  CANCELLED = 'CANCELLED',
  /** Workflow is waiting for a condition */
  WAITING = 'WAITING',
}

/**
 * Event trigger configuration
 */
export interface EventTrigger {
  type: WorkflowTriggerType.EVENT;
  /** The event name to listen for (e.g., NEW_MESSAGE, ENTITY_JOINED) */
  eventName: string;
  /** Optional filter conditions for the event */
  filter?: {
    /** Filter by room ID */
    roomId?: UUID;
    /** Filter by agent ID */
    agentId?: UUID;
    /** Custom filter function as a string (will be evaluated) */
    customFilter?: string;
  };
}

/**
 * Cron trigger configuration
 */
export interface CronTrigger {
  type: WorkflowTriggerType.CRON;
  /** Cron expression (e.g., "0 9 * * *" for daily at 9am) */
  schedule: string;
  /** Timezone for the cron schedule */
  timezone?: string;
}

/**
 * Manual trigger configuration
 */
export interface ManualTrigger {
  type: WorkflowTriggerType.MANUAL;
}

/**
 * Workflow trigger configuration
 */
export interface WorkflowTrigger {
  type: WorkflowTriggerType.WORKFLOW;
  /** The workflow ID that triggers this workflow */
  workflowId: UUID;
}

/**
 * Union type for all trigger types
 */
export type Trigger = EventTrigger | CronTrigger | ManualTrigger | WorkflowTrigger;

/**
 * Represents a single step in a workflow
 */
export interface WorkflowStep {
  /** Unique identifier for the step */
  id: string;
  /** Human-readable name for the step */
  name: string;
  /** Type of step (action, condition, loop, etc.) */
  type: 'action' | 'condition' | 'loop' | 'parallel' | 'wait';
  /** The action name if type is 'action' */
  action?: string;
  /** Input configuration for the step */
  input?: Record<string, any>;
  /** Condition expression if type is 'condition' */
  condition?: string;
  /** Steps to execute if condition is true */
  ifTrue?: WorkflowStep[];
  /** Steps to execute if condition is false */
  ifFalse?: WorkflowStep[];
  /** Steps to execute in parallel if type is 'parallel' */
  parallelSteps?: WorkflowStep[][];
  /** Steps to loop over if type is 'loop' */
  loopSteps?: WorkflowStep[];
  /** Loop configuration */
  loopConfig?: {
    /** Maximum number of iterations */
    maxIterations?: number;
    /** Variable name for the current item */
    itemVariable?: string;
    /** Variable name for the current index */
    indexVariable?: string;
    /** Expression to get items to loop over */
    itemsExpression?: string;
  };
  /** Wait configuration if type is 'wait' */
  waitConfig?: {
    /** Duration to wait in milliseconds */
    duration?: number;
    /** Condition to wait for */
    condition?: string;
    /** Maximum wait time in milliseconds */
    timeout?: number;
  };
  /** Error handling configuration */
  errorHandling?: {
    /** Whether to continue on error */
    continueOnError?: boolean;
    /** Steps to execute on error */
    onError?: WorkflowStep[];
    /** Maximum number of retries */
    maxRetries?: number;
    /** Retry delay in milliseconds */
    retryDelay?: number;
  };
  /** Timeout for this step in milliseconds */
  timeout?: number;
}

/**
 * Main workflow definition
 */
export interface Workflow {
  /** Unique identifier for the workflow */
  id: UUID;
  /** Human-readable name */
  name: string;
  /** Description of what the workflow does */
  description?: string;
  /** The agent ID that owns this workflow */
  agentId: UUID;
  /** Current status of the workflow */
  status: WorkflowStatus;
  /** Workflow version for tracking changes */
  version: number;
  /** Trigger configuration */
  triggers: Trigger[];
  /** The steps to execute */
  steps: WorkflowStep[];
  /** Variables available throughout the workflow */
  variables?: Record<string, any>;
  /** Required plugins for this workflow */
  requiredPlugins?: string[];
  /** Required actions for this workflow */
  requiredActions?: string[];
  /** Metadata for the workflow */
  metadata?: {
    /** User who created the workflow */
    createdBy?: string;
    /** Creation timestamp */
    createdAt?: number;
    /** Last update timestamp */
    updatedAt?: number;
    /** Tags for categorization */
    tags?: string[];
    /** Category for organization */
    category?: string;
  };
  /** Configuration options */
  config?: {
    /** Maximum execution time in milliseconds */
    maxExecutionTime?: number;
    /** Whether to allow concurrent executions */
    allowConcurrent?: boolean;
    /** Maximum number of concurrent executions */
    maxConcurrentExecutions?: number;
    /** Whether to log execution details */
    enableLogging?: boolean;
    /** Notification settings */
    notifications?: {
      /** Notify on completion */
      onComplete?: boolean;
      /** Notify on error */
      onError?: boolean;
      /** Notification channels */
      channels?: string[];
    };
  };
}

/**
 * Represents a running instance of a workflow
 */
export interface WorkflowExecution {
  /** Unique identifier for this execution */
  id: UUID;
  /** The workflow being executed */
  workflowId: UUID;
  /** Current status of the execution */
  status: WorkflowExecutionStatus;
  /** When the execution started */
  startedAt: number;
  /** When the execution ended (if applicable) */
  endedAt?: number;
  /** The trigger that started this execution */
  trigger: {
    type: WorkflowTriggerType;
    /** Additional trigger data */
    data?: any;
  };
  /** Current step being executed */
  currentStep?: string;
  /** Execution context (variables, state) */
  context: {
    /** Workflow variables */
    variables: Record<string, any>;
    /** Step outputs */
    stepOutputs: Record<string, any>;
    /** Execution state */
    state?: State;
    /** Initial memory that triggered the workflow (if applicable) */
    triggerMemory?: Memory;
  };
  /** Execution history */
  history: WorkflowExecutionHistoryItem[];
  /** Error information if failed */
  error?: {
    /** Error message */
    message: string;
    /** Step where error occurred */
    stepId?: string;
    /** Error stack trace */
    stack?: string;
    /** Error timestamp */
    timestamp: number;
  };
}

/**
 * Represents a single item in the execution history
 */
export interface WorkflowExecutionHistoryItem {
  /** Step ID */
  stepId: string;
  /** Step name */
  stepName: string;
  /** When the step started */
  startedAt: number;
  /** When the step ended */
  endedAt?: number;
  /** Step status */
  status: 'running' | 'completed' | 'failed' | 'skipped';
  /** Step input */
  input?: any;
  /** Step output */
  output?: any;
  /** Error if step failed */
  error?: string;
}

/**
 * Service interface for workflow execution
 */
export interface IWorkflowService {
  /** Service type identifier */
  serviceType: 'workflow';

  /** Initialize the workflow service */
  initialize(runtime: IAgentRuntime): Promise<void>;

  /** Create a new workflow */
  createWorkflow(workflow: Omit<Workflow, 'id'>): Promise<Workflow>;

  /** Update an existing workflow */
  updateWorkflow(id: UUID, updates: Partial<Workflow>): Promise<Workflow>;

  /** Delete a workflow */
  deleteWorkflow(id: UUID): Promise<void>;

  /** Get a workflow by ID */
  getWorkflow(id: UUID): Promise<Workflow | null>;

  /** List all workflows for an agent */
  listWorkflows(agentId: UUID): Promise<Workflow[]>;

  /** Validate a workflow definition */
  validateWorkflow(workflow: Partial<Workflow>): Promise<{ valid: boolean; errors?: string[] }>;

  /** Execute a workflow */
  executeWorkflow(workflowId: UUID, trigger?: any): Promise<WorkflowExecution>;

  /** Get workflow execution by ID */
  getExecution(executionId: UUID): Promise<WorkflowExecution | null>;

  /** List workflow executions */
  listExecutions(workflowId: UUID, limit?: number): Promise<WorkflowExecution[]>;

  /** Cancel a running workflow execution */
  cancelExecution(executionId: UUID): Promise<void>;

  /** Register event listeners for triggers */
  registerTriggers(workflow: Workflow): void;

  /** Unregister event listeners for triggers */
  unregisterTriggers(workflow: Workflow): void;

  /** Start the workflow service (register all active workflows) */
  start(): Promise<void>;

  /** Stop the workflow service (unregister all workflows) */
  stop(): Promise<void>;
}

/**
 * Database adapter extension for workflows
 */
export interface IWorkflowDatabaseAdapter {
  /** Create a new workflow */
  createWorkflow(workflow: Workflow): Promise<void>;

  /** Update an existing workflow */
  updateWorkflow(id: UUID, updates: Partial<Workflow>): Promise<void>;

  /** Delete a workflow */
  deleteWorkflow(id: UUID): Promise<void>;

  /** Get a workflow by ID */
  getWorkflow(id: UUID): Promise<Workflow | null>;

  /** List workflows for an agent */
  listWorkflows(agentId: UUID): Promise<Workflow[]>;

  /** Create a workflow execution record */
  createWorkflowExecution(execution: WorkflowExecution): Promise<void>;

  /** Update a workflow execution */
  updateWorkflowExecution(id: UUID, updates: Partial<WorkflowExecution>): Promise<void>;

  /** Get a workflow execution by ID */
  getWorkflowExecution(id: UUID): Promise<WorkflowExecution | null>;

  /** List workflow executions */
  listWorkflowExecutions(workflowId: UUID, limit?: number): Promise<WorkflowExecution[]>;
}

/**
 * Workflow-related events
 */
export enum WorkflowEventType {
  /** Workflow was created */
  WORKFLOW_CREATED = 'WORKFLOW_CREATED',
  /** Workflow was updated */
  WORKFLOW_UPDATED = 'WORKFLOW_UPDATED',
  /** Workflow was deleted */
  WORKFLOW_DELETED = 'WORKFLOW_DELETED',
  /** Workflow execution started */
  WORKFLOW_STARTED = 'WORKFLOW_STARTED',
  /** Workflow execution completed */
  WORKFLOW_COMPLETED = 'WORKFLOW_COMPLETED',
  /** Workflow execution failed */
  WORKFLOW_FAILED = 'WORKFLOW_FAILED',
  /** Workflow step started */
  WORKFLOW_STEP_STARTED = 'WORKFLOW_STEP_STARTED',
  /** Workflow step completed */
  WORKFLOW_STEP_COMPLETED = 'WORKFLOW_STEP_COMPLETED',
  /** Workflow step failed */
  WORKFLOW_STEP_FAILED = 'WORKFLOW_STEP_FAILED',
}

/**
 * Payload for workflow events
 */
export interface WorkflowEventPayload {
  /** The workflow ID */
  workflowId: UUID;
  /** The execution ID (if applicable) */
  executionId?: UUID;
  /** The step ID (if applicable) */
  stepId?: string;
  /** Additional event data */
  data?: any;
  /** Timestamp of the event */
  timestamp: number;
} 