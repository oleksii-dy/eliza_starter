import { EventEmitter } from 'events';
import { IAgentRuntime, logger } from '@elizaos/core';

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  successThreshold?: number;
  timeout?: number;
  volumeThreshold?: number;
  errorThresholdPercentage?: number;
  rollingWindowSize?: number;
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rejectedRequests: number;
  timeouts: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  state: CircuitBreakerState;
  errorPercentage: number;
  averageResponseTime: number;
}

interface RequestMetric {
  timestamp: number;
  success: boolean;
  duration: number;
  error?: Error;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private resetTimer?: NodeJS.Timeout;
  private readonly metrics: RequestMetric[] = [];
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(
    private readonly name: string,
    private readonly runtime: IAgentRuntime,
    options: CircuitBreakerOptions = {}
  ) {
    super();

    this.options = {
      failureThreshold: options.failureThreshold || 5,
      resetTimeout: options.resetTimeout || 60000, // 60 seconds
      successThreshold: options.successThreshold || 2,
      timeout: options.timeout || 10000, // 10 seconds
      volumeThreshold: options.volumeThreshold || 10,
      errorThresholdPercentage: options.errorThresholdPercentage || 50,
      rollingWindowSize: options.rollingWindowSize || 60000, // 60 seconds
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      this.recordMetric(false, 0, new Error('Circuit breaker is open'));
      this.emit('rejected', { name: this.name, state: this.state });

      if (fallback) {
        return await fallback();
      }

      throw new Error(`Circuit breaker '${this.name}' is open`);
    }

    const startTime = Date.now();

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      const duration = Date.now() - startTime;

      this.onSuccess(duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.onFailure(error as Error, duration);

      if (fallback) {
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Operation timed out after ${this.options.timeout}ms`)),
          this.options.timeout
        )
      ),
    ]);
  }

  /**
   * Handle successful execution
   */
  private onSuccess(duration: number): void {
    this.recordMetric(true, duration);
    this.lastSuccessTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successes++;

      if (this.successes >= this.options.successThreshold) {
        this.close();
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      this.failures = 0;
    }

    this.emit('success', {
      name: this.name,
      duration,
      state: this.state,
    });
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error, duration: number): void {
    this.recordMetric(false, duration, error);
    this.lastFailureTime = new Date();
    this.failures++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.open();
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpen()) {
        this.open();
      }
    }

    this.emit('failure', {
      name: this.name,
      error,
      duration,
      state: this.state,
      failures: this.failures,
    });
  }

  /**
   * Check if circuit should open based on metrics
   */
  private shouldOpen(): boolean {
    // Simple threshold check
    if (this.failures >= this.options.failureThreshold) {
      return true;
    }

    // Volume and error percentage check
    const recentMetrics = this.getRecentMetrics();
    if (recentMetrics.length >= this.options.volumeThreshold) {
      const errorCount = recentMetrics.filter((m) => !m.success).length;
      const errorPercentage = (errorCount / recentMetrics.length) * 100;

      if (errorPercentage >= this.options.errorThresholdPercentage) {
        return true;
      }
    }

    return false;
  }

  /**
   * Open the circuit breaker
   */
  private open(): void {
    this.state = CircuitBreakerState.OPEN;
    this.failures = 0;
    this.successes = 0;

    this.emit('open', {
      name: this.name,
      lastFailureTime: this.lastFailureTime,
    });

    // Set timer to transition to half-open
    this.resetTimer = setTimeout(() => {
      this.halfOpen();
    }, this.options.resetTimeout);

    logger?.warn(
      `Circuit breaker '${this.name}' opened. Will retry in ${this.options.resetTimeout}ms`
    );
  }

  /**
   * Close the circuit breaker
   */
  private close(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.successes = 0;

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }

    this.emit('close', {
      name: this.name,
      lastSuccessTime: this.lastSuccessTime,
    });

    logger?.info(`Circuit breaker '${this.name}' closed`);
  }

  /**
   * Transition to half-open state
   */
  private halfOpen(): void {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.successes = 0;

    this.emit('half-open', {
      name: this.name,
    });

    logger?.info(`Circuit breaker '${this.name}' is half-open. Testing with limited requests`);
  }

  /**
   * Record a metric
   */
  private recordMetric(success: boolean, duration: number, error?: Error): void {
    const metric: RequestMetric = {
      timestamp: Date.now(),
      success,
      duration,
      error,
    };

    this.metrics.push(metric);

    // Clean old metrics
    const cutoff = Date.now() - this.options.rollingWindowSize * 2;
    while (this.metrics.length > 0 && this.metrics[0].timestamp < cutoff) {
      this.metrics.shift();
    }
  }

  /**
   * Get recent metrics within the rolling window
   */
  private getRecentMetrics(): RequestMetric[] {
    const cutoff = Date.now() - this.options.rollingWindowSize;
    return this.metrics.filter((m) => m.timestamp >= cutoff);
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const recentMetrics = this.getRecentMetrics();
    const totalRequests = recentMetrics.length;
    const successfulRequests = recentMetrics.filter((m) => m.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const timeouts = recentMetrics.filter((m) => m.error?.message.includes('timed out')).length;

    const errorPercentage = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;

    const averageResponseTime =
      totalRequests > 0 ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      rejectedRequests: this.metrics.filter((m) =>
        m.error?.message.includes('Circuit breaker is open')
      ).length,
      timeouts,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      state: this.state,
      errorPercentage,
      averageResponseTime,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Force reset the circuit breaker
   */
  reset(): void {
    this.close();
    this.metrics.length = 0;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
  }

  /**
   * Force open the circuit (for testing/maintenance)
   */
  forceOpen(): void {
    this.open();
  }

  /**
   * Force close the circuit (for testing/recovery)
   */
  forceClose(): void {
    this.close();
  }
}

/**
 * Circuit breaker factory for managing multiple breakers
 */
export class CircuitBreakerFactory {
  private readonly breakers = new Map<string, CircuitBreaker>();

  constructor(private readonly runtime: IAgentRuntime) {}

  /**
   * Get or create a circuit breaker
   */
  getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(name, this.runtime, options);
      this.breakers.set(name, breaker);
    }

    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breakers
   */
  getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get metrics for all breakers
   */
  getAllMetrics(): Map<string, CircuitBreakerMetrics> {
    const metrics = new Map<string, CircuitBreakerMetrics>();

    for (const [name, breaker] of this.breakers) {
      metrics.set(name, breaker.getMetrics());
    }

    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Remove a circuit breaker
   */
  removeBreaker(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.removeAllListeners();
      this.breakers.delete(name);
    }
  }
}
