/**
 * Error handling utilities and patterns for ElizaOS
 *
 * This module provides utility functions for common error handling scenarios,
 * including retry logic, circuit breakers, and error monitoring.
 */

import {
  ElizaError,
  ErrorCategory,
  ErrorSeverity,
  ErrorContext,
  wrapError,
  TimeoutError,
  DatabaseError,
  ServiceError,
} from './index';
import { logger } from '../logger';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
}

export interface TimeoutOptions {
  timeoutMs: number;
  description?: string;
  onTimeout?: () => void;
}

/**
 * Retry mechanism with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    jitter = true,
    onRetry,
    shouldRetry = (error) => error instanceof ElizaError && error.retryable,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw wrapError(lastError, ErrorCategory.INTERNAL_ERROR, {
          operation: 'retry_operation',
          attempts: attempt,
          maxAttempts,
        });
      }

      const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);
      const actualDelay = jitter ? delay * (0.5 + Math.random() * 0.5) : delay;

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${actualDelay}ms`, {
        error: lastError.message,
        attempt,
        delay: actualDelay,
      });

      await new Promise((resolve) => setTimeout(resolve, actualDelay));
    }
  }

  // This should never be reached due to the throw in the catch block, but TypeScript doesn't know that
  throw new Error(lastError?.message || 'Unknown retry error');
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(private options: CircuitBreakerOptions = {}) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const { failureThreshold = 5, resetTimeout = 60000 } = this.options;

    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > resetTimeout) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker transitioning to HALF_OPEN');
      } else {
        throw new ServiceError('Circuit breaker is OPEN - service unavailable', 'circuit_breaker', {
          state: this.state,
          failureCount: this.failureCount,
        });
      }
    }

    try {
      const result = await operation();

      if (this.state === 'HALF_OPEN') {
        this.reset();
        logger.info('Circuit breaker reset to CLOSED');
      }

      return result;
    } catch (error) {
      this.recordFailure();

      if (this.failureCount >= failureThreshold) {
        this.state = 'OPEN';
        this.lastFailureTime = Date.now();
        logger.error('Circuit breaker opened due to repeated failures', {
          failureCount: this.failureCount,
          threshold: failureThreshold,
        });
      }

      throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
  }

  private reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  getState(): { state: string; failureCount: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
    };
  }
}

/**
 * Timeout wrapper with AbortController support
 */
export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: TimeoutOptions
): Promise<T> {
  const { timeoutMs, description = 'operation', onTimeout } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    if (onTimeout) {
      onTimeout();
    }
  }, timeoutMs);

  try {
    const result = await operation(controller.signal);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    if (controller.signal.aborted) {
      throw new TimeoutError(
        `Operation timed out after ${timeoutMs}ms: ${description}`,
        timeoutMs,
        { operation: description }
      );
    }

    throw error;
  }
}

/**
 * Error monitoring and metrics collection
 */
export class ErrorMonitor {
  private errorCounts = new Map<ErrorCategory, number>();
  private criticalErrors: ElizaError[] = [];
  private errorHistory: Array<{ error: ElizaError; timestamp: number }> = [];
  private readonly maxHistorySize = 1000;

  recordError(error: ElizaError, context?: ErrorContext): void {
    // Update error counts
    const count = this.errorCounts.get(error.category) || 0;
    this.errorCounts.set(error.category, count + 1);

    // Store in history
    this.errorHistory.push({ error, timestamp: Date.now() });
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // Handle critical errors
    if (error.severity >= ErrorSeverity.HIGH) {
      this.criticalErrors.push(error);
      this.notifyMonitoring(error, context);
    }

    // Log error appropriately
    this.logError(error, context);

    // Check for error patterns
    this.checkErrorPatterns(error.category);
  }

  private logError(error: ElizaError, context?: ErrorContext): void {
    const logContext = {
      ...error.context,
      ...context,
      errorCode: error.errorCode,
      category: error.category,
      severity: error.severity,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error(`[CRITICAL] ${error.message}`, logContext);
        break;
      case ErrorSeverity.HIGH:
        logger.error(`[HIGH] ${error.message}`, logContext);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(`[MEDIUM] ${error.message}`, logContext);
        break;
      default:
        logger.info(`[LOW] ${error.message}`, logContext);
    }
  }

  private async notifyMonitoring(error: ElizaError, context?: ErrorContext): Promise<void> {
    // This would integrate with monitoring services like Sentry, DataDog, etc.
    logger.error('Critical error requires monitoring attention', {
      error: error.toJSON(),
      context,
    });

    // TODO: Integrate with actual monitoring services
    // await this.sendToSentry(error);
    // await this.triggerAlert(error);
  }

  private checkErrorPatterns(category: ErrorCategory): void {
    const count = this.errorCounts.get(category) || 0;
    const threshold = this.getThresholdForCategory(category);

    if (count >= threshold) {
      logger.error(`Error pattern detected: ${category} occurred ${count} times`, {
        category,
        count,
        threshold,
      });

      // TODO: Implement escalation logic
      // this.escalatePattern(category, count);
    }
  }

  private getThresholdForCategory(category: ErrorCategory): number {
    switch (category) {
      case ErrorCategory.DATABASE_ERROR:
      case ErrorCategory.SERVICE_ERROR:
        return 5;
      case ErrorCategory.NETWORK_ERROR:
        return 10;
      case ErrorCategory.PLUGIN_ERROR:
        return 3;
      default:
        return 20;
    }
  }

  getMetrics(): {
    errorCounts: Map<ErrorCategory, number>;
    criticalErrorCount: number;
    recentErrors: number;
    } {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentErrors = this.errorHistory.filter((entry) => entry.timestamp > oneHourAgo).length;

    return {
      errorCounts: new Map(this.errorCounts),
      criticalErrorCount: this.criticalErrors.length,
      recentErrors,
    };
  }

  clearHistory(): void {
    this.errorHistory = [];
    this.criticalErrors = [];
    this.errorCounts.clear();
  }
}

/**
 * Global error monitor instance
 */
export const errorMonitor = new ErrorMonitor();

/**
 * Safe execution wrapper that catches and logs errors
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  context?: ErrorContext
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const elizaError = wrapError(error, ErrorCategory.INTERNAL_ERROR, context);
    errorMonitor.recordError(elizaError, context);
    return fallbackValue;
  }
}

/**
 * Helper for database operations with automatic retry and error handling
 */
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  return withRetry(operation, {
    maxAttempts: 3,
    baseDelay: 1000,
    shouldRetry: (error) => {
      // Retry on connection errors, timeouts, etc.
      if (error instanceof DatabaseError) {
        return error.retryable;
      }
      return false;
    },
    onRetry: (attempt, error) => {
      logger.warn(`Database operation retry ${attempt}`, {
        error: error.message,
        context,
      });
    },
  });
}

/**
 * Helper for service operations with circuit breaker
 */
export function createServiceExecutor(serviceName: string): {
  execute: <T>(operation: () => Promise<T>) => Promise<T>;
  getHealth: () => { state: string; failureCount: number };
} {
  const circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000,
  });

  return {
    execute: async <T>(operation: () => Promise<T>): Promise<T> => {
      try {
        return await circuitBreaker.execute(operation);
      } catch (error) {
        const serviceError = new ServiceError(
          `Service ${serviceName} operation failed`,
          serviceName,
          { error: error instanceof Error ? error.message : String(error) }
        );
        errorMonitor.recordError(serviceError);
        throw serviceError;
      }
    },
    getHealth: () => circuitBreaker.getState(),
  };
}
