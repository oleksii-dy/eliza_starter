/**
 * Base error class for ElizaOS errors
 */
export class ElizaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ElizaError';
    Object.setPrototypeOf(this, ElizaError.prototype);
  }
}

/**
 * Planning-specific errors
 */
export class PlanningError extends ElizaError {
  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message, code, details);
    this.name = 'PlanningError';
    Object.setPrototypeOf(this, PlanningError.prototype);
  }
}

export class PlanValidationError extends PlanningError {
  constructor(
    message: string,
    public readonly validationErrors: string[]
  ) {
    super(message, 'PLAN_VALIDATION_FAILED', { validationErrors });
    this.name = 'PlanValidationError';
    Object.setPrototypeOf(this, PlanValidationError.prototype);
  }
}

export class PlanExecutionError extends PlanningError {
  declare cause?: Error;

  constructor(
    message: string,
    public readonly stepId: string,
    public readonly stepIndex: number,
    cause?: Error
  ) {
    super(message, 'PLAN_EXECUTION_FAILED', { stepId, stepIndex, cause: cause?.message });
    this.name = 'PlanExecutionError';
    Object.setPrototypeOf(this, PlanExecutionError.prototype);
    if (cause) {
      this.cause = cause;
    }
  }
}

export class PlanTimeoutError extends PlanningError {
  constructor(
    public readonly planId: string,
    public readonly timeoutMs: number
  ) {
    super(`Plan ${planId} timed out after ${timeoutMs}ms`, 'PLAN_TIMEOUT', { planId, timeoutMs });
    this.name = 'PlanTimeoutError';
    Object.setPrototypeOf(this, PlanTimeoutError.prototype);
  }
}

export class PlanAdaptationError extends PlanningError {
  declare cause?: Error;

  constructor(
    message: string,
    public readonly planId: string,
    cause?: Error
  ) {
    super(message, 'PLAN_ADAPTATION_FAILED', { planId, cause: cause?.message });
    this.name = 'PlanAdaptationError';
    Object.setPrototypeOf(this, PlanAdaptationError.prototype);
    if (cause) {
      this.cause = cause;
    }
  }
}

/**
 * Scenario-specific errors
 */
export class ScenarioError extends ElizaError {
  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message, code, details);
    this.name = 'ScenarioError';
    Object.setPrototypeOf(this, ScenarioError.prototype);
  }
}

export class ScenarioValidationError extends ScenarioError {
  constructor(
    message: string,
    public readonly validationErrors: string[]
  ) {
    super(message, 'SCENARIO_VALIDATION_FAILED', { validationErrors });
    this.name = 'ScenarioValidationError';
    Object.setPrototypeOf(this, ScenarioValidationError.prototype);
  }
}

export class ScenarioExecutionError extends ScenarioError {
  declare cause?: Error;

  constructor(
    message: string,
    public readonly scenarioId: string,
    public readonly stepIndex: number,
    cause?: Error
  ) {
    super(message, 'SCENARIO_EXECUTION_FAILED', { scenarioId, stepIndex, cause: cause?.message });
    this.name = 'ScenarioExecutionError';
    Object.setPrototypeOf(this, ScenarioExecutionError.prototype);
    if (cause) {
      this.cause = cause;
    }
  }
}

export class ScenarioTimeoutError extends ScenarioError {
  constructor(
    public readonly scenarioId: string,
    public readonly timeoutMs: number
  ) {
    super(`Scenario ${scenarioId} timed out after ${timeoutMs}ms`, 'SCENARIO_TIMEOUT', {
      scenarioId,
      timeoutMs,
    });
    this.name = 'ScenarioTimeoutError';
    Object.setPrototypeOf(this, ScenarioTimeoutError.prototype);
  }
}

export class ScenarioSecurityError extends ScenarioError {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly resource: string
  ) {
    super(message, 'SCENARIO_SECURITY_VIOLATION', { operation, resource });
    this.name = 'ScenarioSecurityError';
    Object.setPrototypeOf(this, ScenarioSecurityError.prototype);
  }
}

export class ScenarioEnvironmentError extends ScenarioError {
  constructor(
    message: string,
    public readonly missingDependencies: string[]
  ) {
    super(message, 'SCENARIO_ENVIRONMENT_ERROR', { missingDependencies });
    this.name = 'ScenarioEnvironmentError';
    Object.setPrototypeOf(this, ScenarioEnvironmentError.prototype);
  }
}

/**
 * Error codes for consistent error handling
 */
export const ErrorCodes = {
  // Planning errors
  PLAN_VALIDATION_FAILED: 'PLAN_VALIDATION_FAILED',
  PLAN_EXECUTION_FAILED: 'PLAN_EXECUTION_FAILED',
  PLAN_TIMEOUT: 'PLAN_TIMEOUT',
  PLAN_ADAPTATION_FAILED: 'PLAN_ADAPTATION_FAILED',
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  PLAN_ALREADY_EXECUTING: 'PLAN_ALREADY_EXECUTING',
  PLAN_CANCELLED: 'PLAN_CANCELLED',

  // Scenario errors
  SCENARIO_VALIDATION_FAILED: 'SCENARIO_VALIDATION_FAILED',
  SCENARIO_EXECUTION_FAILED: 'SCENARIO_EXECUTION_FAILED',
  SCENARIO_TIMEOUT: 'SCENARIO_TIMEOUT',
  SCENARIO_SECURITY_VIOLATION: 'SCENARIO_SECURITY_VIOLATION',
  SCENARIO_ENVIRONMENT_ERROR: 'SCENARIO_ENVIRONMENT_ERROR',
  SCENARIO_NOT_FOUND: 'SCENARIO_NOT_FOUND',
  SCENARIO_STEP_FAILED: 'SCENARIO_STEP_FAILED',

  // General errors
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Type guard for ElizaOS errors
 */
export function isElizaError(error: unknown): error is ElizaError {
  return error instanceof ElizaError;
}

export function isPlanningError(error: unknown): error is PlanningError {
  return error instanceof PlanningError;
}

export function isScenarioError(error: unknown): error is ScenarioError {
  return error instanceof ScenarioError;
}
