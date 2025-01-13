import { MemoryCacheManager } from "./cache-manager";
import { RateLimiter } from "./rate-limiter";
import { MarketData, MarketDataSchema } from "../utils/validation";
import axios from "axios";
import { z } from "zod";

// Enhanced Market Data Schema
const ExtendedMarketDataSchema = MarketDataSchema.extend({
    liquidityScore: z.number().min(0).max(100).optional(),
    volatility: z.number().min(0).optional(),
    tradeVolume: z
        .object({
            total: z.number().min(0),
            buy: z.number().min(0).optional(),
            sell: z.number().min(0).optional(),
        })
        .optional(),
    priceHistory: z
        .array(
            z.object({
                timestamp: z.string().datetime(),
                price: z.number().min(0),
            })
        )
        .optional(),
});

interface MarketIntelligenceConfig {
    cacheManager?: MemoryCacheManager;
    rateLimiter?: RateLimiter;
    openSeaApiKey?: string;
    reservoirApiKey?: string;
}

export class MarketIntelligenceService {
    private config: MarketIntelligenceConfig;
    private cacheManager: MemoryCacheManager;
    private rateLimiter?: RateLimiter;
    private static CACHE_TTL = 30 * 60; // 30 minutes cache

    constructor(config: MarketIntelligenceConfig = {}) {
        this.config = config;
        this.cacheManager =
            config.cacheManager ||
            new MemoryCacheManager({
                ttl: MarketIntelligenceService.CACHE_TTL,
            });
        this.rateLimiter = config.rateLimiter;
    }

    async getMarketIntelligence(address: string): Promise<MarketData> {
        const cacheKey = `market_intelligence:${address}`;

        // Check cache first
        const cachedData = this.cacheManager.get<MarketData>(cacheKey);
        if (cachedData) return cachedData;

        try {
            // Apply rate limiting if configured
            if (this.rateLimiter) {
                await this.rateLimiter.consume(address);
            }

            // Fetch market data from multiple sources
            const [openSeaData, reservoirData] = await Promise.allSettled([
                this.fetchOpenSeaMarketData(address),
                this.fetchReservoirMarketData(address),
            ]);

            const marketData: MarketData = {
                lastUpdate: new Date().toISOString(),
                floorPrice: this.extractMetric(openSeaData, "floorPrice") || 0,
                volume24h: this.extractMetric(openSeaData, "volume24h") || 0,
                volume7d: this.extractMetric(reservoirData, "volume7d") || 0,
                marketCap: this.calculateMarketCap(
                    this.extractMetric(openSeaData, "floorPrice") || 0,
                    this.extractMetric(openSeaData, "totalSupply") || 0
                ),
                holders:
                    this.extractMetric(reservoirData, "uniqueHolders") || 0,
                bestOffer: this.extractMetric(openSeaData, "bestOffer") || 0,
            };

            // Validate and cache market data
            const validatedData = ExtendedMarketDataSchema.parse({
                ...marketData,
                liquidityScore: this.calculateLiquidityScore(marketData),
                volatility: this.calculateVolatility(address),
            });

            this.cacheManager.set(
                cacheKey,
                validatedData,
                MarketIntelligenceService.CACHE_TTL
            );

            return validatedData;
        } catch (error) {
            console.error(
                `Market intelligence fetch failed for ${address}:`,
                error
            );
            throw new Error(
                `Failed to retrieve market intelligence: ${error.message}`
            );
        }
    }

    private async fetchOpenSeaMarketData(address: string) {
        if (!this.config.openSeaApiKey) {
            console.warn(
                "OpenSea API key not provided for market intelligence"
            );
            return undefined;
        }

        try {
            const response = await axios.get(
                `https://api.opensea.io/api/v2/collections/${address}`,
                {
                    headers: {
                        "X-API-KEY": this.config.openSeaApiKey,
                    },
                }
            );

            return {
                floorPrice: response.data.floor_price,
                volume24h: response.data.total_volume,
                bestOffer: response.data.best_offer,
                totalSupply: response.data.total_supply,
            };
        } catch (error) {
            console.error("OpenSea market data fetch failed", error);
            return undefined;
        }
    }

    private async fetchReservoirMarketData(address: string) {
        if (!this.config.reservoirApiKey) {
            console.warn(
                "Reservoir API key not provided for market intelligence"
            );
            return undefined;
        }

        try {
            const response = await axios.get(
                `https://api.reservoir.tools/collections/v6?id=${address}`,
                {
                    headers: {
                        "X-API-KEY": this.config.reservoirApiKey,
                    },
                }
            );

            return {
                volume7d: response.data.volume7d,
                uniqueHolders: response.data.uniqueHolders,
            };
        } catch (error) {
            console.error("Reservoir market data fetch failed", error);
            return undefined;
        }
    }

    // Utility method to extract specific metrics safely
    private extractMetric(
        result: PromiseSettledResult<any>,
        key: string
    ): number | undefined {
        if (result.status === "fulfilled" && result.value) {
            return result.value[key];
        }
        return undefined;
    }

    // Placeholder calculations with room for sophistication
    private calculateMarketCap(
        floorPrice: number,
        totalSupply: number
    ): number {
        return floorPrice * totalSupply;
    }

    private calculateLiquidityScore(marketData: MarketData): number {
        // Basic liquidity score calculation
        const { volume24h, holders } = marketData;
        return Math.min((volume24h / (holders || 1)) * 10, 100);
    }

    private calculateVolatility(address: string): number {
        // Placeholder for volatility calculation
        // Would typically involve analyzing price history
        return 0;
    }

    // Additional analytical methods
    async getPriceHistory(address: string, days: number = 30): Promise<any[]> {
        // Placeholder for price history retrieval
        return [];
    }

    async getTradingInsights(address: string): Promise<any> {
        // Placeholder for advanced trading insights
        return {};
    }
}

export const marketIntelligenceService = new MarketIntelligenceService({
    openSeaApiKey: process.env.OPENSEA_API_KEY,
    reservoirApiKey: process.env.RESERVOIR_API_KEY,
});
