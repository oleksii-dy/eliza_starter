import pRetry from "p-retry";
import { PerformanceMonitor } from "../utils/performance";
import {
    ErrorHandler,
    NFTErrorFactory,
    ErrorType,
    ErrorCode,
    NFTError,
} from "../utils/error-handler";
import { MemoryCacheManager } from "./cache-manager";
import { RateLimiter } from "./rate-limiter";
import { MarketStats, NFTCollection } from "../types";
import { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

// Enhanced error codes specific to Reservoir service
export enum ReservoirErrorCode {
    RATE_LIMIT = "RESERVOIR_RATE_LIMIT",
    API_KEY_INVALID = "RESERVOIR_API_KEY_INVALID",
    INSUFFICIENT_FUNDS = "RESERVOIR_INSUFFICIENT_FUNDS",
    COLLECTION_NOT_FOUND = "RESERVOIR_COLLECTION_NOT_FOUND",
}

// Comprehensive configuration interface
interface ReservoirServiceConfig {
    cacheManager?: MemoryCacheManager;
    rateLimiter?: RateLimiter;
    maxConcurrent?: number;
    maxRetries?: number;
    batchSize?: number;
    apiKey?: string;
    baseUrl?: string;
    timeout?: number;
    retryStrategy?: {
        maxRetries?: number;
        baseDelay?: number;
        jitter?: boolean;
    };
    cacheConfig?: {
        enabled?: boolean;
        defaultTTL?: number;
    };
    telemetry?: {
        enabled?: boolean;
        serviceName?: string;
    };
}

// Validation schema for configuration
const ReservoirConfigSchema = z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional().default("https://api.reservoir.tools"),
    timeout: z.number().positive().optional().default(10000),
    maxRetries: z.number().min(0).optional().default(3),
});

export class ReservoirService {
    private cacheManager?: MemoryCacheManager;
    private rateLimiter?: RateLimiter;
    private maxRetries: number;
    private batchSize: number;
    private performanceMonitor: PerformanceMonitor;
    private errorHandler: ErrorHandler;
    private config: Required<ReservoirServiceConfig>;

    constructor(config: ReservoirServiceConfig = {}) {
        // Validate and merge configuration
        const validatedConfig = ReservoirConfigSchema.parse(config);

        this.config = {
            cacheManager: config.cacheManager,
            rateLimiter: config.rateLimiter,
            maxConcurrent: config.maxConcurrent || 5,
            maxRetries: validatedConfig.maxRetries,
            batchSize: config.batchSize || 20,
            apiKey: validatedConfig.apiKey || process.env.RESERVOIR_API_KEY,
            baseUrl: validatedConfig.baseUrl,
            timeout: validatedConfig.timeout,
            retryStrategy: {
                maxRetries: 3,
                baseDelay: 1000,
                jitter: true,
                ...config.retryStrategy,
            },
            cacheConfig: {
                enabled: true,
                defaultTTL: 300,
                ...config.cacheConfig,
            },
            telemetry: {
                enabled: true,
                serviceName: "ikigai-nft-reservoir",
                ...config.telemetry,
            },
        };

        this.cacheManager = this.config.cacheManager;
        this.rateLimiter = this.config.rateLimiter;
        this.maxRetries = this.config.maxRetries;
        this.batchSize = this.config.batchSize;
        this.performanceMonitor = PerformanceMonitor.getInstance();
        this.errorHandler = ErrorHandler.getInstance();

        // Setup telemetry and monitoring
        this.setupTelemetry();
    }

    // Advanced caching with context-aware invalidation
    private async cachedRequest<T>(
        endpoint: string,
        params: Record<string, any>,
        runtime: IAgentRuntime,
        cacheOptions?: {
            ttl?: number;
            context?: string;
        }
    ): Promise<T> {
        if (!this.config.cacheConfig.enabled) {
            return this.makeRequest<T>(endpoint, params, 0, runtime);
        }

        const cacheKey = this.generateCacheKey(endpoint, params);

        const cachedResponse = await this.cacheManager?.get<T>(cacheKey);
        if (cachedResponse) {
            if (this.isCacheFresh(cachedResponse, cacheOptions?.ttl)) {
                return cachedResponse;
            }
        }

        const freshData = await this.makeRequest<T>(
            endpoint,
            params,
            0,
            runtime
        );

        // Only pass ttl to set method
        await this.cacheManager?.set(
            cacheKey,
            freshData,
            cacheOptions?.ttl ?? this.config.cacheConfig.defaultTTL
        );

        return freshData;
    }

    // Generate deterministic cache key
    private generateCacheKey(
        endpoint: string,
        params: Record<string, any>
    ): string {
        const sortedParams = Object.keys(params)
            .sort()
            .map((key) => `${key}:${params[key]}`)
            .join("|");
        return `reservoir:${endpoint}:${sortedParams}`;
    }

    // Check cache freshness
    private isCacheFresh(cachedResponse: any, ttl?: number): boolean {
        const MAX_CACHE_AGE = ttl || this.config.cacheConfig.defaultTTL * 1000;
        return Date.now() - cachedResponse.timestamp < MAX_CACHE_AGE;
    }

    // Enhanced error handling method
    private handleReservoirError(
        error: Error,
        context: Record<string, any>
    ): NFTError {
        if (error.message.includes("rate limit")) {
            return NFTErrorFactory.create(
                ErrorType.RATE_LIMIT,
                ErrorCode.RATE_LIMIT_EXCEEDED,
                "Reservoir API rate limit exceeded",
                {
                    details: {
                        ...context,
                        retryAfter: this.extractRetryAfter(error),
                    },
                    retryable: true,
                    severity: "HIGH",
                }
            );
        }

        if (error.message.includes("API key")) {
            return NFTErrorFactory.create(
                ErrorType.AUTHENTICATION,
                ErrorCode.API_KEY_INVALID,
                "Invalid Reservoir API key",
                {
                    details: context,
                    retryable: false,
                    severity: "CRITICAL",
                }
            );
        }

        // Fallback to generic error handling
        return NFTErrorFactory.fromError(error);
    }

    // Extract retry-after timestamp
    private extractRetryAfter(error: Error): number {
        // In a real implementation, extract from headers or use exponential backoff
        return Date.now() + 60000; // Default 1 minute
    }

    // Intelligent retry mechanism
    private async retryRequest<T>(
        requestFn: () => Promise<T>,
        options: {
            maxRetries?: number;
            baseDelay?: number;
            jitter?: boolean;
        } = {}
    ): Promise<T> {
        const {
            maxRetries = this.config.retryStrategy.maxRetries,
            baseDelay = this.config.retryStrategy.baseDelay,
            jitter = this.config.retryStrategy.jitter,
        } = options;

        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;

                // Exponential backoff with optional jitter
                const delay = jitter
                    ? baseDelay * Math.pow(2, attempt) * (1 + Math.random())
                    : baseDelay * Math.pow(2, attempt);

                // Log retry attempt
                this.performanceMonitor.recordMetric({
                    operation: "retryRequest",
                    duration: delay,
                    success: false,
                    metadata: {
                        attempt,
                        error: error.message,
                    },
                });

                // Optional: Circuit breaker for critical errors
                if (this.isCircuitBreakerTripped(error)) {
                    break;
                }

                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        // Final error handling
        throw lastError || new Error("Max retries exceeded");
    }

    // Circuit breaker logic
    private isCircuitBreakerTripped(error: Error): boolean {
        const criticalErrors = ["API_KEY_INVALID", "UNAUTHORIZED", "FORBIDDEN"];
        return criticalErrors.some((code) => error.message.includes(code));
    }

    // Telemetry and monitoring setup
    private setupTelemetry() {
        if (!this.config.telemetry.enabled) return;

        // Track API usage metrics
        const usageTracker = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            endpoints: {} as Record<string, number>,
        };

        // Performance monitoring hook
        this.performanceMonitor.on("alert", (alert) => {
            console.log(`Reservoir Service Alert: ${JSON.stringify(alert)}`);
            // In a real implementation, send to monitoring service
        });
    }

    // Existing makeRequest method with enhanced error handling
    async makeRequest<T>(
        endpoint: string,
        params: Record<string, any> = {},
        priority: number = 0,
        runtime: IAgentRuntime
    ): Promise<T> {
        const endOperation = this.performanceMonitor.startOperation(
            "makeRequest",
            { endpoint, params, priority }
        );

        try {
            // Check rate limit
            if (this.rateLimiter) {
                await this.rateLimiter.consume("reservoir", 1);
            }

            const reservoirApiKey =
                runtime.getSetting("RESERVOIR_API_KEY") || this.config.apiKey;

            // Make the request with retries
            const result = await this.retryRequest(async () => {
                const response = await fetch(
                    `${this.config.baseUrl}${endpoint}?${new URLSearchParams(params).toString()}`,
                    {
                        headers: {
                            "x-api-key": reservoirApiKey,
                            "Content-Type": "application/json",
                        },
                        signal: AbortSignal.timeout(this.config.timeout),
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Reservoir API error: ${response.status} ${await response.text()}`
                    );
                }

                return response.json();
            });

            endOperation();
            return result;
        } catch (error) {
            this.performanceMonitor.recordMetric({
                operation: "makeRequest",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    endpoint,
                    params,
                },
            });

            const nftError = this.handleReservoirError(error, {
                endpoint,
                params,
            });
            this.errorHandler.handleError(nftError);
            throw error;
        }
    }

    // Modify getTopCollections to use the updated cachedRequest
    async getTopCollections(
        runtime: IAgentRuntime,
        limit: number = 10
    ): Promise<NFTCollection[]> {
        const endOperation = this.performanceMonitor.startOperation(
            "getTopCollections",
            { limit }
        );

        try {
            const batchSize = 20; // Optimal batch size for Reservoir API
            const batches = Math.ceil(limit / batchSize);
            const promises = [];

            for (let i = 0; i < batches; i++) {
                const offset = i * batchSize;
                const currentLimit = Math.min(batchSize, limit - offset);

                promises.push(
                    this.cachedRequest<any>(
                        "/collections/v6",
                        {
                            limit: currentLimit,
                            offset,
                            sortBy: "1DayVolume",
                        },
                        runtime,
                        {
                            ttl: 3600, // Cache for 1 hour
                            context: "top_collections",
                        }
                    )
                );
            }

            const results = await Promise.all(promises);
            const collections = results.flatMap((data) => data.collections);

            const mappedCollections = collections
                .slice(0, limit)
                .map((collection: any) => ({
                    address: collection.id,
                    name: collection.name,
                    symbol: collection.symbol,
                    description: collection.description,
                    imageUrl: collection.image,
                    externalUrl: collection.externalUrl,
                    twitterUsername: collection.twitterUsername,
                    discordUrl: collection.discordUrl,
                    verified:
                        collection.openseaVerificationStatus === "verified",
                    floorPrice: collection.floorAsk?.price?.amount?.native || 0,
                    volume24h: collection.volume24h || 0,
                    marketCap: collection.marketCap || 0,
                    totalSupply: collection.tokenCount || 0,
                    holders: collection.ownerCount || 0,
                    lastUpdate: new Date().toISOString(),
                }));

            endOperation();
            return mappedCollections;
        } catch (error) {
            // Error handling remains similar to previous implementation
            throw error;
        }
    }

    // Add missing methods
    async getFloorListings(options: {
        collection: string;
        limit: number;
        sortBy: "price" | "rarity";
    }): Promise<
        Array<{
            tokenId: string;
            price: number;
            seller: string;
            marketplace: string;
        }>
    > {
        const endOperation = this.performanceMonitor.startOperation(
            "getFloorListings",
            { options }
        );

        try {
            if (!options.collection) {
                throw new Error("Collection address is required");
            }

            const queryParams = {
                collection: options.collection,
                limit: options.limit?.toString() || "10",
                sortBy: options.sortBy === "price" ? "floorAskPrice" : "rarity",
                includeAttributes:
                    options.sortBy === "rarity" ? "true" : "false",
            };

            const response = await this.makeRequest<{
                asks: Array<{
                    token: {
                        tokenId: string;
                        collection: { id: string };
                    };
                    price: {
                        amount: {
                            native: number;
                            usd?: number;
                        };
                    };
                    maker: string;
                    source: { name: string };
                }>;
            }>("/collections/floor/v2", queryParams, 1, {} as IAgentRuntime);

            const floorListings = response.asks.map((ask) => ({
                tokenId: ask.token.tokenId,
                price: ask.price.amount.native,
                seller: ask.maker,
                marketplace: ask.source?.name || "Reservoir",
            }));

            endOperation();
            return floorListings;
        } catch (error) {
            this.performanceMonitor.recordMetric({
                operation: "getFloorListings",
                duration: 0,
                success: false,
                metadata: {
                    error: error.message,
                    collection: options.collection,
                },
            });

            throw error;
        }
    }

    async createListing(options: {
        tokenId: string;
        collectionAddress: string;
        price: number;
        expirationTime?: number;
        marketplace: "ikigailabs";
        currency?: string;
        quantity?: number;
    }): Promise<{
        listingId: string;
        status: string;
        transactionHash?: string;
        marketplaceUrl: string;
    }> {
        const endOperation = this.performanceMonitor.startOperation(
            "createListing",
            { options }
        );

        try {
            if (
                !options.tokenId ||
                !options.collectionAddress ||
                !options.price
            ) {
                throw new Error("Missing required listing parameters");
            }

            const listingParams = {
                maker: "",
                token: `${options.collectionAddress}:${options.tokenId}`,
                quantity: (options.quantity || 1).toString(),
                price: options.price.toString(),
                currency: options.currency || "ETH",
                expirationTime: (
                    options.expirationTime ||
                    Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
                ).toString(),
            };

            const response = await this.makeRequest<{
                listing: {
                    id: string;
                    status: string;
                    transactionHash?: string;
                };
            }>("/listings/v5/create", listingParams, 1, {} as IAgentRuntime);

            const result = {
                listingId: response.listing.id,
                status: response.listing.status,
                transactionHash: response.listing.transactionHash,
                marketplaceUrl: `https://reservoir.market/collections/${options.collectionAddress}/tokens/${options.tokenId}`,
            };

            endOperation();
            return result;
        } catch (error) {
            this.performanceMonitor.recordMetric({
                operation: "createListing",
                duration: 0,
                success: false,
                metadata: { error: error.message, options },
            });

            throw error;
        }
    }

    async executeBuy(options: {
        listings: Array<{
            tokenId: string;
            price: number;
            seller: string;
            marketplace: string;
        }>;
        taker: string;
    }): Promise<{
        path: string;
        steps: Array<{
            action: string;
            status: string;
        }>;
    }> {
        const endOperation = this.performanceMonitor.startOperation(
            "executeBuy",
            { options }
        );

        try {
            const buyParams = {
                taker: options.taker,
                listings: options.listings.map((listing) => ({
                    token: listing.tokenId,
                    price: listing.price.toString(),
                    seller: listing.seller,
                    source: listing.marketplace,
                })),
            };

            const response = await this.makeRequest<{
                path: string;
                steps: Array<{
                    action: string;
                    status: string;
                }>;
            }>("/execute/buy/v2", buyParams, 1, {} as IAgentRuntime);

            endOperation();
            return response;
        } catch (error) {
            this.performanceMonitor.recordMetric({
                operation: "executeBuy",
                duration: 0,
                success: false,
                metadata: { error: error.message, options },
            });

            throw error;
        }
    }

    async getOwnedNFTs(owner: string): Promise<
        Array<{
            tokenId: string;
            collectionAddress: string;
            name: string;
            imageUrl?: string;
            attributes?: Record<string, string>;
        }>
    > {
        const endOperation = this.performanceMonitor.startOperation(
            "getOwnedNFTs",
            { owner }
        );

        try {
            const params = {
                users: owner,
                limit: "100",
                includeAttributes: "true",
            };

            const response = await this.makeRequest<{
                tokens: Array<{
                    token: {
                        tokenId: string;
                        collection: {
                            id: string;
                            name: string;
                        };
                        image: string;
                        attributes?: Array<{
                            key: string;
                            value: string;
                        }>;
                    };
                }>;
            }>("/users/tokens/v1", params, 1, {} as IAgentRuntime);

            const nfts = response.tokens.map((token) => ({
                tokenId: token.token.tokenId,
                collectionAddress: token.token.collection.id,
                name: token.token.collection.name,
                imageUrl: token.token.image,
                attributes: token.token.attributes
                    ? Object.fromEntries(
                          token.token.attributes.map((attr) => [
                              attr.key,
                              attr.value,
                          ])
                      )
                    : undefined,
            }));

            endOperation();
            return nfts;
        } catch (error) {
            this.performanceMonitor.recordMetric({
                operation: "getOwnedNFTs",
                duration: 0,
                success: false,
                metadata: { error: error.message, owner },
            });

            throw error;
        }
    }
}
