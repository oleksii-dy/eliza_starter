import { logger } from '@elizaos/core';

interface RateLimiterOptions {
    maxRequests: number;
    windowMs: number;
    maxBurst?: number;
}

interface TokenBucket {
    tokens: number;
    lastRefill: number;
    maxTokens: number;
    refillRate: number;
}

export class RateLimiter {
    private buckets: Map<string, TokenBucket> = new Map();
    private requestQueues: Map<string, Array<() => void>> = new Map();

    constructor(private options: RateLimiterOptions) {
        // Calculate refill rate (tokens per millisecond)
        this.options.maxBurst = options.maxBurst || options.maxRequests;
    }

    /**
     * Check if request can proceed or should wait
     */
    async checkLimit(key: string = 'default'): Promise<void> {
        return new Promise((resolve) => {
            const bucket = this.getOrCreateBucket(key);
            
            // Refill tokens based on time passed
            this.refillBucket(bucket);
            
            if (bucket.tokens >= 1) {
                // Consume a token and proceed
                bucket.tokens -= 1;
                resolve();
            } else {
                // Queue the request
                const queue = this.requestQueues.get(key) || [];
                queue.push(resolve);
                this.requestQueues.set(key, queue);
                
                // Schedule processing when tokens are available
                const timeUntilToken = this.getTimeUntilNextToken(bucket);
                setTimeout(() => this.processQueue(key), timeUntilToken);
            }
        });
    }

    private getOrCreateBucket(key: string): TokenBucket {
        let bucket = this.buckets.get(key);
        if (!bucket) {
            bucket = {
                tokens: this.options.maxBurst!,
                lastRefill: Date.now(),
                maxTokens: this.options.maxBurst!,
                refillRate: this.options.maxRequests / this.options.windowMs,
            };
            this.buckets.set(key, bucket);
        }
        return bucket;
    }

    private refillBucket(bucket: TokenBucket): void {
        const now = Date.now();
        const timePassed = now - bucket.lastRefill;
        const tokensToAdd = timePassed * bucket.refillRate;
        
        bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
    }

    private getTimeUntilNextToken(bucket: TokenBucket): number {
        const tokensNeeded = 1 - bucket.tokens;
        const timeNeeded = tokensNeeded / bucket.refillRate;
        return Math.max(0, Math.ceil(timeNeeded));
    }

    private processQueue(key: string): void {
        const queue = this.requestQueues.get(key);
        if (!queue || queue.length === 0) return;
        
        const bucket = this.getOrCreateBucket(key);
        this.refillBucket(bucket);
        
        // Process as many queued requests as we have tokens
        while (queue.length > 0 && bucket.tokens >= 1) {
            const resolve = queue.shift();
            if (resolve) {
                bucket.tokens -= 1;
                resolve();
            }
        }
        
        // If there are still queued requests, schedule next processing
        if (queue.length > 0) {
            const timeUntilToken = this.getTimeUntilNextToken(bucket);
            setTimeout(() => this.processQueue(key), timeUntilToken);
        }
    }

    /**
     * Get current rate limit status
     */
    getStatus(key: string = 'default'): {
        available: number;
        limit: number;
        queued: number;
        nextRefillMs: number;
    } {
        const bucket = this.buckets.get(key);
        const queue = this.requestQueues.get(key) || [];
        
        if (!bucket) {
            return {
                available: this.options.maxBurst!,
                limit: this.options.maxRequests,
                queued: 0,
                nextRefillMs: 0,
            };
        }
        
        this.refillBucket(bucket);
        
        return {
            available: Math.floor(bucket.tokens),
            limit: this.options.maxRequests,
            queued: queue.length,
            nextRefillMs: this.getTimeUntilNextToken(bucket),
        };
    }

    /**
     * Reset rate limiter for a specific key
     */
    reset(key: string = 'default'): void {
        this.buckets.delete(key);
        const queue = this.requestQueues.get(key);
        if (queue) {
            // Resolve all queued requests
            queue.forEach(resolve => resolve());
            this.requestQueues.delete(key);
        }
    }
}

/**
 * Create a rate-limited wrapper for any async function
 */
export function createRateLimitedFunction<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: RateLimiterOptions,
    keyExtractor?: (...args: Parameters<T>) => string
): T {
    const limiter = new RateLimiter(options);
    
    return (async (...args: Parameters<T>) => {
        const key = keyExtractor ? keyExtractor(...args) : 'default';
        await limiter.checkLimit(key);
        
        try {
            return await fn(...args);
        } catch (error) {
            // If rate limit error, retry after delay
            if (error instanceof Error && error.message.includes('429')) {
                logger.warn(`Rate limit hit, retrying after delay...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                await limiter.checkLimit(key);
                return await fn(...args);
            }
            throw error;
        }
    }) as T;
}

/**
 * Composite rate limiter for multiple limits (e.g., per second and per minute)
 */
export class CompositeRateLimiter {
    private limiters: RateLimiter[];

    constructor(limits: RateLimiterOptions[]) {
        this.limiters = limits.map(options => new RateLimiter(options));
    }

    async checkLimit(key: string = 'default'): Promise<void> {
        // All limiters must pass
        await Promise.all(this.limiters.map(limiter => limiter.checkLimit(key)));
    }

    getStatus(key: string = 'default'): Array<{
        available: number;
        limit: number;
        queued: number;
        nextRefillMs: number;
        windowMs: number;
    }> {
        return this.limiters.map((limiter, index) => ({
            ...limiter.getStatus(key),
            windowMs: (limiter as any).options.windowMs,
        }));
    }

    reset(key: string = 'default'): void {
        this.limiters.forEach(limiter => limiter.reset(key));
    }
}

/**
 * Pre-configured rate limiters for common services
 */
export const RateLimiters = {
    // Helius RPC limits
    helius: () => new CompositeRateLimiter([
        { maxRequests: 100, windowMs: 1000 }, // 100 per second
        { maxRequests: 3000, windowMs: 60000 }, // 3000 per minute
    ]),
    
    // Jupiter API limits
    jupiter: () => new RateLimiter({
        maxRequests: 100,
        windowMs: 60000, // 100 per minute
        maxBurst: 10,
    }),
    
    // Birdeye API limits
    birdeye: () => new RateLimiter({
        maxRequests: 100,
        windowMs: 60000, // 100 per minute
        maxBurst: 5,
    }),
    
    // Default Solana RPC
    solanaRpc: () => new RateLimiter({
        maxRequests: 10,
        windowMs: 10000, // 10 per 10 seconds
        maxBurst: 5,
    }),
}; 