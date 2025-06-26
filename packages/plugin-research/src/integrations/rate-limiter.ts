import { logger } from '@elizaos/core';

// Simple built-in rate limiter implementation
class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;

  constructor(config: {
    tokensPerInterval: number;
    interval: 'second' | 'minute' | 'hour' | 'day';
    fireImmediately?: boolean;
  }) {
    this.maxTokens = config.tokensPerInterval;
    this.tokens = config.tokensPerInterval;
    this.lastRefill = Date.now();

    // Convert interval to milliseconds
    const intervalMs = {
      second: 1000,
      minute: 60000,
      hour: 3600000,
      day: 86400000,
    };

    this.refillRate = intervalMs[config.interval] / config.tokensPerInterval;
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.refillRate);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  async tryRemoveTokens(count: number): Promise<boolean> {
    this.refillTokens();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  async removeTokens(count: number): Promise<void> {
    while (!(await this.tryRemoveTokens(count))) {
      // Wait for tokens to become available
      await new Promise((resolve) => setTimeout(resolve, this.refillRate));
    }
  }

  async getTokensRemaining(): Promise<number> {
    this.refillTokens();
    return this.tokens;
  }
}

import { SearchProvider } from '../types';

export class RateLimitedProvider implements SearchProvider {
  private limiter: RateLimiter;
  public readonly name: string;
  public readonly supportedDomains: string[] = ['*'];

  constructor(
    private provider: SearchProvider,
    config: {
      tokensPerInterval: number;
      interval: 'second' | 'minute' | 'hour' | 'day';
      fireImmediately?: boolean;
    }
  ) {
    this.name = `RateLimited(${provider.name || 'Unknown'})`;
    this.limiter = new RateLimiter(config);
  }

  async search(
    query: string,
    options?: any
  ): Promise<import('../types').SearchResult[]> {
    const hasTokens = await this.limiter.tryRemoveTokens(1);
    if (!hasTokens) {
      logger.warn(`[${this.name}] Rate limit reached, waiting...`);
      await this.limiter.removeTokens(1);
    }

    return this.provider.search(query, options);
  }
}

// Alias for backwards compatibility
export const RateLimitedSearchProvider = RateLimitedProvider;

export interface RateLimiterConfig {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  burstSize?: number;
}

// Convenience function to create rate-limited providers
export function createRateLimitedProvider(
  provider: SearchProvider,
  config: RateLimiterConfig = {}
): SearchProvider {
  // Use the most restrictive limit
  if (config.requestsPerMinute) {
    return new RateLimitedProvider(provider, {
      tokensPerInterval: config.requestsPerMinute,
      interval: 'minute',
    });
  } else if (config.requestsPerHour) {
    return new RateLimitedProvider(provider, {
      tokensPerInterval: config.requestsPerHour,
      interval: 'hour',
    });
  } else if (config.requestsPerDay) {
    return new RateLimitedProvider(provider, {
      tokensPerInterval: config.requestsPerDay,
      interval: 'day',
    });
  } else {
    // Default to 60 requests per minute
    return new RateLimitedProvider(provider, {
      tokensPerInterval: 60,
      interval: 'minute',
    });
  }
}

// Advanced rate limiter with adaptive behavior
export class AdaptiveRateLimiter extends RateLimitedProvider {
  private errorCount: number = 0;
  private successCount: number = 0;
  private lastRateLimitError: number = 0;

  async search(
    query: string,
    options?: any
  ): Promise<import('../types').SearchResult[]> {
    try {
      const results = await super.search(query, options);
      this.successCount++;
      this.errorCount = Math.max(0, this.errorCount - 1); // Gradually reduce error count
      return results;
    } catch (error: any) {
      if (
        error.message?.includes('rate limit') ||
        error.message?.includes('429')
      ) {
        this.errorCount++;
        this.lastRateLimitError = Date.now();

        // Exponential backoff based on error count
        const backoffMs = Math.min(60000, 1000 * Math.pow(2, this.errorCount));
        logger.warn(
          `[AdaptiveRateLimiter] Backing off for ${backoffMs}ms after ${this.errorCount} rate limit errors`
        );

        await new Promise((resolve) => setTimeout(resolve, backoffMs));

        // Retry once after backoff
        return super.search(query, options);
      }
      throw error;
    }
  }

  getStats() {
    return {
      errorCount: this.errorCount,
      successCount: this.successCount,
      lastRateLimitError: this.lastRateLimitError,
      timeSinceLastError: this.lastRateLimitError
        ? Date.now() - this.lastRateLimitError
        : null,
    };
  }
}
