import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

interface RateLimitStore {
  hits: number;
  resetTime: number;
}

export class RateLimiter {
  private store: Map<string, RateLimitStore> = new Map();
  private options: Required<RateLimitOptions>;

  constructor(options?: RateLimitOptions) {
    this.options = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      keyGenerator: (req) => req.ip || 'unknown',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many requests, please try again later',
      ...options,
    };

    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Rate limiting middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = this.options.keyGenerator(req);
      const now = Date.now();

      // Get or create store entry
      let entry = this.store.get(key);
      if (!entry || entry.resetTime < now) {
        entry = {
          hits: 0,
          resetTime: now + this.options.windowMs,
        };
        this.store.set(key, entry);
      }

      // Increment hit count
      entry.hits++;

      // Check if limit exceeded
      if (entry.hits > this.options.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

        res.setHeader('X-RateLimit-Limit', this.options.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
        res.setHeader('Retry-After', retryAfter.toString());

        return res.status(429).json({
          error: this.options.message,
          retryAfter,
        });
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.options.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (this.options.maxRequests - entry.hits).toString());
      res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());

      // Handle response to potentially skip counting
      if (this.options.skipSuccessfulRequests || this.options.skipFailedRequests) {
        const originalSend = res.send;
        const self = this;
        res.send = function (data: unknown) {
          const success = res.statusCode < 400;

          if (
            (success && self.options.skipSuccessfulRequests) ||
            (!success && self.options.skipFailedRequests)
          ) {
            entry!.hits--;
          }

          return originalSend.call(this, data);
        };
      }

      next();
    };
  }

  /**
   * Create a rate limiter for specific endpoints
   */
  static forEndpoint(endpoint: string, options?: RateLimitOptions): RateLimiter {
    return new RateLimiter({
      ...options,
      keyGenerator: (req) => `${endpoint}:${req.ip || 'unknown'}`,
    });
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Get current rate limit status for a key
   */
  getStatus(key: string): { hits: number; remaining: number; resetTime: number } | null {
    const entry = this.store.get(key);
    if (!entry || entry.resetTime < Date.now()) {
      return null;
    }

    return {
      hits: entry.hits,
      remaining: Math.max(0, this.options.maxRequests - entry.hits),
      resetTime: entry.resetTime,
    };
  }
}

// Pre-configured rate limiters for different use cases
export const rateLimiters = {
  // General API rate limit
  general: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  }),

  // Strict rate limit for authentication endpoints
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    skipSuccessfulRequests: true,
  }),

  // Rate limit for form submissions
  forms: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
  }),

  // Rate limit for secret operations
  secrets: new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 30,
  }),
};
