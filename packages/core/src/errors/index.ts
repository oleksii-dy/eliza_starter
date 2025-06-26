/**
 * Standardized error handling system for ElizaOS
 *
 * This module provides a consistent error handling framework across all packages.
 * It categorizes errors, provides structured information for debugging,
 * and includes recovery guidance for different error scenarios.
 */

export enum ErrorCategory {
  // User-facing errors (400-level)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT = 'INVALID_INPUT',

  // System errors (500-level)
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PLUGIN_ERROR = 'PLUGIN_ERROR',
  SERVICE_ERROR = 'SERVICE_ERROR',
  MODEL_ERROR = 'MODEL_ERROR',

  // Infrastructure errors
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR',
  RESOURCE_EXHAUSTION = 'RESOURCE_EXHAUSTION',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // Internal errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}

export enum ErrorSeverity {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export interface ErrorContext {
  agentId?: string;
  userId?: string;
  roomId?: string;
  pluginName?: string;
  serviceName?: string;
  operationId?: string;
  requestId?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
  // Additional context fields
  operation?: string;
  state?: any;
  error?: any;
  field?: string;
  timeoutMs?: number;
  configKey?: string;
  resource?: string;
  modelType?: string;
  attempts?: number;
  maxAttempts?: number;
  // For error handlers
  failureCount?: number;
  // For not found errors
  identifier?: string;
  // For provider errors
  provider?: string;
  // For performance tracking
  elapsedTime?: number;
}

export interface RecoveryAction {
  action: string;
  description: string;
  automated?: boolean;
}

/**
 * Base error class for all ElizaOS errors
 */
export class ElizaError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  public readonly recoveryActions: RecoveryAction[];
  public readonly errorCode: string;
  public readonly timestamp: number;
  public readonly cause?: Error;

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options: {
      context?: ErrorContext;
      recoverable?: boolean;
      retryable?: boolean;
      recoveryActions?: RecoveryAction[];
      cause?: Error;
      errorCode?: string;
    } = {}
  ) {
    super(message);
    this.name = 'ElizaError';
    this.category = category;
    this.severity = severity;
    this.context = options.context || {};
    this.recoverable = options.recoverable ?? false;
    this.retryable = options.retryable ?? false;
    this.recoveryActions = options.recoveryActions || [];
    this.errorCode = options.errorCode || this.generateErrorCode();
    this.timestamp = Date.now();

    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ElizaError);
    }

    // Chain the cause if provided
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  private generateErrorCode(): string {
    return `${this.category}_${Date.now().toString(36).toUpperCase()}`;
  }

  /**
   * Convert error to JSON for logging and API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      errorCode: this.errorCode,
      timestamp: this.timestamp,
      context: this.context,
      recoverable: this.recoverable,
      retryable: this.retryable,
      recoveryActions: this.recoveryActions,
      stack: this.stack,
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.category) {
      case ErrorCategory.VALIDATION_ERROR:
        return 'Please check your input and try again.';
      case ErrorCategory.PERMISSION_DENIED:
        return 'You do not have permission to perform this action.';
      case ErrorCategory.RESOURCE_NOT_FOUND:
        return 'The requested resource could not be found.';
      case ErrorCategory.RATE_LIMIT_EXCEEDED:
        return 'Too many requests. Please try again later.';
      case ErrorCategory.NETWORK_ERROR:
        return 'Network error occurred. Please check your connection and try again.';
      case ErrorCategory.DATABASE_ERROR:
        return 'Database error occurred. Please try again.';
      case ErrorCategory.TIMEOUT_ERROR:
        return 'Operation timed out. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

/**
 * Specific error types for common scenarios
 */

export class ValidationError extends ElizaError {
  constructor(message: string, context?: ErrorContext, field?: string) {
    super(message, ErrorCategory.VALIDATION_ERROR, ErrorSeverity.LOW, {
      context: { ...context, field },
      recoverable: true,
      retryable: false,
      recoveryActions: [
        {
          action: 'validate_input',
          description: 'Check input format and required fields',
        },
      ],
    });
  }
}

export class DatabaseError extends ElizaError {
  constructor(message: string, context?: ErrorContext, operation?: string) {
    super(message, ErrorCategory.DATABASE_ERROR, ErrorSeverity.HIGH, {
      context: { ...context, operation },
      recoverable: true,
      retryable: true,
      recoveryActions: [
        {
          action: 'retry_operation',
          description: 'Retry the database operation',
          automated: true,
        },
        {
          action: 'check_connection',
          description: 'Verify database connection health',
        },
      ],
    });
  }
}

export class PluginError extends ElizaError {
  constructor(message: string, pluginName: string, context?: ErrorContext) {
    super(message, ErrorCategory.PLUGIN_ERROR, ErrorSeverity.MEDIUM, {
      context: { ...context, pluginName },
      recoverable: true,
      retryable: false,
      recoveryActions: [
        {
          action: 'disable_plugin',
          description: `Disable plugin ${pluginName}`,
        },
        {
          action: 'check_plugin_config',
          description: 'Verify plugin configuration',
        },
      ],
    });
  }
}

export class ServiceError extends ElizaError {
  constructor(message: string, serviceName: string, context?: ErrorContext) {
    super(message, ErrorCategory.SERVICE_ERROR, ErrorSeverity.HIGH, {
      context: { ...context, serviceName },
      recoverable: true,
      retryable: true,
      recoveryActions: [
        {
          action: 'restart_service',
          description: `Restart service ${serviceName}`,
          automated: true,
        },
      ],
    });
  }
}

export class TimeoutError extends ElizaError {
  constructor(message: string, timeoutMs: number, context?: ErrorContext) {
    super(message, ErrorCategory.TIMEOUT_ERROR, ErrorSeverity.MEDIUM, {
      context: { ...context, timeoutMs },
      recoverable: true,
      retryable: true,
      recoveryActions: [
        {
          action: 'retry_with_longer_timeout',
          description: 'Retry operation with increased timeout',
          automated: true,
        },
      ],
    });
  }
}

export class ConfigurationError extends ElizaError {
  constructor(message: string, configKey?: string, context?: ErrorContext) {
    super(message, ErrorCategory.CONFIGURATION_ERROR, ErrorSeverity.HIGH, {
      context: { ...context, configKey },
      recoverable: false,
      retryable: false,
      recoveryActions: [
        {
          action: 'check_configuration',
          description: `Verify configuration for ${configKey || 'application'}`,
        },
      ],
    });
  }
}

/**
 * Error factory functions for common patterns
 */
export const createValidationError = (
  field: string,
  value: unknown,
  expectedFormat?: string
): ValidationError => {
  const message = expectedFormat
    ? `Invalid ${field}: expected ${expectedFormat}, got ${typeof value}`
    : `Invalid ${field}: ${value}`;
  return new ValidationError(message, { field }, field);
};

export const createNotFoundError = (resource: string, identifier: string): ElizaError => {
  return new ElizaError(
    `${resource} not found: ${identifier}`,
    ErrorCategory.RESOURCE_NOT_FOUND,
    ErrorSeverity.LOW,
    {
      context: { resource, identifier },
      recoverable: false,
      retryable: false,
    }
  );
};

export const createTimeoutError = (operation: string, timeoutMs: number): TimeoutError => {
  return new TimeoutError(`Operation timed out after ${timeoutMs}ms: ${operation}`, timeoutMs, {
    operation,
  });
};

/**
 * Error wrapper for transforming unknown errors to ElizaError
 */
export const wrapError = (
  error: unknown,
  category: ErrorCategory = ErrorCategory.INTERNAL_ERROR,
  context?: ErrorContext
): ElizaError => {
  if (error instanceof ElizaError) {
    return error;
  }

  if (error instanceof Error) {
    return new ElizaError(error.message, category, ErrorSeverity.MEDIUM, {
      context,
      cause: error,
    });
  }

  return new ElizaError(String(error), category, ErrorSeverity.MEDIUM, { context });
};

/**
 * Type guard to check if an error is an ElizaError
 */
export const isElizaError = (error: unknown): error is ElizaError => {
  return error instanceof ElizaError;
};
