import pRetry from "p-retry";
// import pQueue from "p-queue";
import { PerformanceMonitor } from "../utils/performance";
import {
    ErrorHandler,
    NFTErrorFactory,
    ErrorType,
    ErrorCode,
} from "../utils/error-handler";
import { MemoryCacheManager } from "./cache-manager";
import { RateLimiter } from "./rate-limiter";
import { MarketStats, NFTCollection } from "../types";
import { IAgentRuntime } from "@elizaos/core";

interface ReservoirServiceConfig {
    cacheManager?: MemoryCacheManager;
    rateLimiter?: RateLimiter;
    maxConcurrent?: number;
    maxRetries?: number;
    batchSize?: number;
}

export class ReservoirService {
    private cacheManager?: MemoryCacheManager;
    private rateLimiter?: RateLimiter;
    // private queue: pQueue;
    private maxRetries: number;
    private batchSize: number;
    private performanceMonitor: PerformanceMonitor;
    private errorHandler: ErrorHandler;

    constructor(config: ReservoirServiceConfig = {}) {
        this.cacheManager = config.cacheManager;
        this.rateLimiter = config.rateLimiter;

        // this.queue = new pQueue({ concurrency: config.maxConcurrent || 5 });
        this.maxRetries = config.maxRetries || 3;
        this.batchSize = config.batchSize || 20;
        this.performanceMonitor = PerformanceMonitor.getInstance();
        this.errorHandler = ErrorHandler.getInstance();
    }

    async makeRequest<T>(
        endpoint: string,
        params: Record<string, any> = {},
        priority: number = 0,
        runtime: IAgentRuntime
    ): Promise<T> {
        const endOperation = this.performanceMonitor.startOperation(
            "makeRequest",
            {
                endpoint,
                params,
                priority,
            }
        );

        try {
            const cacheKey = `reservoir:${endpoint}:${JSON.stringify(params)}`;

            // Check cache first
            if (this.cacheManager) {
                const cached = await this.cacheManager.get<T>(cacheKey);
                if (cached) {
                    endOperation();
                    return cached;
                }
            }

            // Check rate limit
            if (this.rateLimiter) {
                await this.rateLimiter.consume("reservoir", 1);
            }
            const reservoirApiKey = runtime.getSetting("RESERVOIR_API_KEY");

            // Make the request with retries
            const result = await pRetry(
                async () => {
                    const response = await fetch(
                        `https://api.reservoir.tools${endpoint}?${new URLSearchParams(
                            params
                        ).toString()}`,
                        {
                            headers: {
                                "x-api-key": reservoirApiKey,
                            },
                        }
                    );

                    if (!response.ok) {
                        throw new Error(
                            `Reservoir API error: ${response.status}`
                        );
                    }

                    return response.json();
                },
                {
                    retries: this.maxRetries,
                    onFailedAttempt: (error) => {
                        console.error(
                            `Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`
                        );
                    },
                }
            );

            // Cache the result
            if (this.cacheManager) {
                await this.cacheManager.set(cacheKey, result);
            }

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

            const nftError = NFTErrorFactory.create(
                ErrorType.API,
                ErrorCode.API_ERROR,
                `API request failed: ${endpoint}`,
                {
                    details: {
                        originalError: error.message,
                        endpoint,
                        params,
                    },
                    retryable: true,
                    severity: "HIGH",
                }
            );
            this.errorHandler.handleError(nftError);
            throw error;
        }
    }

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
                    this.makeRequest<any>(
                        `/collections/v6`,
                        {
                            limit: currentLimit,
                            offset,
                            sortBy: "1DayVolume",
                        },
                        1,
                        runtime
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

            endOperation(); // Record successful completion
            return mappedCollections;
        } catch (error) {
            this.performanceMonitor.recordMetric({
                operation: "getTopCollections",
                duration: 0,
                success: false,
                metadata: { error: error.message },
            });

            const nftError = NFTErrorFactory.create(
                ErrorType.API,
                ErrorCode.API_ERROR,
                "Failed to fetch top collections",
                {
                    details: {
                        originalError: error.message,
                        limit,
                    },
                    retryable: true,
                    severity: "MEDIUM",
                }
            );
            this.errorHandler.handleError(nftError);
            throw error;
        }
    }

    async getMarketStats(): Promise<MarketStats> {
        return Promise.resolve({} as MarketStats);
    }

    async getCollectionActivity(collectionAddress: string): Promise<any> {
        return Promise.resolve(null);
    }

    async getCollectionTokens(collectionAddress: string): Promise<any> {
        return Promise.resolve(null);
    }

    async getCollectionAttributes(collectionAddress: string): Promise<any> {
        return Promise.resolve(null);
    }

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
            // Validate required parameters
            if (!options.collection) {
                throw new Error("Collection address is required");
            }

            // Default values
            const limit = options.limit || 10;
            const sortBy = options.sortBy || "price";

            // Construct query parameters
            const queryParams = {
                collection: options.collection,
                limit: limit.toString(),
                sortBy: sortBy === "price" ? "floorAskPrice" : "rarity", // Reservoir API specific sorting
                includeAttributes: sortBy === "rarity" ? "true" : "false",
            };

            const response = await this.makeRequest<{
                asks: Array<{
                    token: {
                        tokenId: string;
                        collection: {
                            id: string;
                        };
                    };
                    price: {
                        amount: {
                            native: number;
                            usd?: number;
                        };
                    };
                    maker: string;
                    source: {
                        name: string;
                    };
                }>;
            }>("/collections/floor/v2", queryParams, 1, {} as IAgentRuntime);

            // Transform Reservoir API response to our expected format
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

            const nftError = NFTErrorFactory.create(
                ErrorType.API,
                ErrorCode.API_ERROR,
                "Failed to fetch floor listings",
                {
                    details: {
                        originalError: error.message,
                        collection: options.collection,
                        limit: options.limit,
                    },
                    retryable: true,
                    severity: "HIGH",
                }
            );
            this.errorHandler.handleError(nftError);

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
        return Promise.resolve({
            path: "",
            steps: [],
        });
    }

    async createListing(options: {
        tokenId: string;
        collectionAddress: string;
        price: number;
        expirationTime?: number; // Unix timestamp
        marketplace: "ikigailabs";
        currency?: string; // Default to ETH
        quantity?: number; // Default to 1 for ERC721
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
            // Validate required parameters
            if (
                !options.tokenId ||
                !options.collectionAddress ||
                !options.price
            ) {
                throw new Error("Missing required listing parameters");
            }

            // Default values
            const currency = options.currency || "ETH";
            const quantity = options.quantity || 1;
            const expirationTime =
                options.expirationTime ||
                Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days from now

            const listingParams = {
                maker: "", // Will be set by runtime or current wallet
                token: `${options.collectionAddress}:${options.tokenId}`,
                quantity: quantity.toString(),
                price: options.price.toString(),
                currency,
                expirationTime: expirationTime.toString(),
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

            const nftError = NFTErrorFactory.create(
                ErrorType.API,
                ErrorCode.API_ERROR,
                "Failed to create NFT listing",
                {
                    details: {
                        originalError: error.message,
                        collectionAddress: options.collectionAddress,
                        tokenId: options.tokenId,
                        price: options.price,
                    },
                    retryable: true,
                    severity: "HIGH",
                }
            );
            this.errorHandler.handleError(nftError);

            throw error;
        }
    }

    async cancelListing(options: {
        listingId: string;
        marketplace: "ikigailabs";
    }): Promise<{
        status: string;
        transactionHash?: string;
    }> {
        return Promise.resolve({
            status: "",
            transactionHash: undefined,
        });
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
        try {
            const endpoint = "/users/tokens/v1";
            const params = {
                users: owner,
                limit: 100, // Configurable limit
                includeAttributes: true,
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
            }>(endpoint, params, 1, {} as IAgentRuntime);

            return response.tokens.map((token) => ({
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
        } catch (error) {
            const nftError = NFTErrorFactory.create(
                ErrorType.API,
                ErrorCode.API_ERROR,
                `Failed to fetch owned NFTs for owner`,
                {
                    details: {
                        owner,
                        originalError: error.message,
                    },
                    retryable: false,
                    severity: "MEDIUM",
                }
            );
            this.errorHandler.handleError(nftError);
            return [];
        }
    }
}
