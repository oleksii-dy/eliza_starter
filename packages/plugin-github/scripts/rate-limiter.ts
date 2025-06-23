import { logger } from './logger';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  maxRetries: number;
  initialRetryDelayMs: number;
  maxRetryDelayMs: number;
  backoffMultiplier: number;
}

interface RateLimitState {
  requests: number[];
  retryCount: Map<string, number>;
  lastError: Map<string, Error>;
}

export class RateLimiter {
  private config: RateLimitConfig;
  private state: RateLimitState;
  private queue: Array<() => Promise<any>> = [];
  private processing = false;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRequests: config.maxRequests || 60,
      windowMs: config.windowMs || 60 * 1000, // 1 minute
      maxRetries: config.maxRetries || 3,
      initialRetryDelayMs: config.initialRetryDelayMs || 1000,
      maxRetryDelayMs: config.maxRetryDelayMs || 60 * 1000,
      backoffMultiplier: config.backoffMultiplier || 2,
    };

    this.state = {
      requests: [],
      retryCount: new Map(),
      lastError: new Map(),
    };
  }

  /**
   * Execute a function with rate limiting and retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    key: string,
    options: { priority?: number } = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          await this.waitForRateLimit();
          const result = await this.executeWithRetry(fn, key);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      // Add to queue with priority
      if (options.priority) {
        this.queue.unshift(task);
      } else {
        this.queue.push(task);
      }

      this.processQueue();
    });
  }

  /**
   * Wait until rate limit allows next request
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Clean up old requests outside the window
    this.state.requests = this.state.requests.filter((time) => time > windowStart);

    // Check if we're at the limit
    if (this.state.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.state.requests[0];
      const waitTime = oldestRequest + this.config.windowMs - now;

      if (waitTime > 0) {
        logger.info(`Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s`);
        await this.delay(waitTime);
        return this.waitForRateLimit(); // Recursive call to re-check
      }
    }

    // Record this request
    this.state.requests.push(now);
  }

  /**
   * Execute function with exponential backoff retry
   */
  private async executeWithRetry<T>(fn: () => Promise<T>, key: string): Promise<T> {
    const retryCount = this.state.retryCount.get(key) || 0;

    try {
      const result = await fn();
      
      // Success - reset retry count
      this.state.retryCount.delete(key);
      this.state.lastError.delete(key);
      
      return result;
    } catch (error: any) {
      const isRateLimitError = this.isRateLimitError(error);
      const isRetryableError = this.isRetryableError(error);

      if (!isRateLimitError && !isRetryableError) {
        logger.error(`Non-retryable error for ${key}`, error);
        throw error;
      }

      if (retryCount >= this.config.maxRetries) {
        logger.error(`Max retries (${this.config.maxRetries}) exceeded for ${key}`, error);
        this.state.retryCount.delete(key);
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = this.calculateRetryDelay(retryCount, error);
      
      logger.warn(`Retry ${retryCount + 1}/${this.config.maxRetries} for ${key} after ${delay}ms`, {
        error: error.message,
        statusCode: error.response?.status,
      });

      // Update state
      this.state.retryCount.set(key, retryCount + 1);
      this.state.lastError.set(key, error);

      // Wait and retry
      await this.delay(delay);
      return this.executeWithRetry(fn, key);
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number, error: any): number {
    let baseDelay = this.config.initialRetryDelayMs;

    // Check for Retry-After header
    if (error.response?.headers?.['retry-after']) {
      const retryAfter = error.response.headers['retry-after'];
      if (!isNaN(retryAfter)) {
        baseDelay = parseInt(retryAfter) * 1000;
      }
    }

    // Apply exponential backoff
    const delay = Math.min(
      baseDelay * Math.pow(this.config.backoffMultiplier, retryCount),
      this.config.maxRetryDelayMs
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    
    return Math.floor(delay + jitter);
  }

  /**
   * Check if error is rate limit related
   */
  private isRateLimitError(error: any): boolean {
    if (!error.response) return false;
    
    const status = error.response.status;
    return status === 429 || status === 403;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error.response) return true; // Network errors are retryable
    
    const status = error.response.status;
    return (
      status === 429 || // Rate limit
      status === 403 || // Forbidden (might be temporary)
      status === 408 || // Request timeout
      status === 500 || // Internal server error
      status === 502 || // Bad gateway
      status === 503 || // Service unavailable
      status === 504    // Gateway timeout
    );
  }

  /**
   * Process queued tasks
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
      }
    }

    this.processing = false;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current state for monitoring
   */
  getState(): {
    currentRequests: number;
    queueLength: number;
    retryingKeys: string[];
  } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const currentRequests = this.state.requests.filter((time) => time > windowStart).length;

    return {
      currentRequests,
      queueLength: this.queue.length,
      retryingKeys: Array.from(this.state.retryCount.keys()),
    };
  }

  /**
   * Reset rate limiter state
   */
  reset(): void {
    this.state.requests = [];
    this.state.retryCount.clear();
    this.state.lastError.clear();
    this.queue = [];
    this.processing = false;
  }
}

// Create rate limiters for different services
export const githubRateLimiter = new RateLimiter({
  maxRequests: 5000, // GitHub's limit per hour
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRetries: 5,
  initialRetryDelayMs: 2000,
});

export const npmRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  maxRetries: 3,
  initialRetryDelayMs: 1000,
});

export const openAIRateLimiter = new RateLimiter({
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
  maxRetries: 3,
  initialRetryDelayMs: 5000,
  maxRetryDelayMs: 120 * 1000, // 2 minutes
});

// Helper function to create custom rate limiter
export function createRateLimiter(config: Partial<RateLimitConfig>): RateLimiter {
  return new RateLimiter(config);
} 