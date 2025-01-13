import axios from "axios";
import { z } from "zod";
import { SocialMetricsSchema, SocialMetrics } from "../utils/validation";
import { MemoryCacheManager } from "./cache-manager";

// Enhanced Social Metrics Schema
const ExtendedSocialMetricsSchema = SocialMetricsSchema.extend({
    twitter: z
        .object({
            followers_count: z.number().int().min(0).optional(),
            following_count: z.number().int().min(0).optional(),
            tweet_count: z.number().int().min(0).optional(),
            engagement_rate: z.number().min(0).max(100).optional(),
        })
        .optional(),
    coinGecko: z
        .object({
            community_score: z.number().min(0).max(100).optional(),
            twitter_followers: z.number().int().min(0).optional(),
            telegram_users: z.number().int().min(0).optional(),
        })
        .optional(),
    dune: z
        .object({
            total_transactions: z.number().int().min(0).optional(),
            unique_wallets: z.number().int().min(0).optional(),
            avg_transaction_value: z.number().min(0).optional(),
        })
        .optional(),
});

export interface SocialAnalyticsConfig {
    twitterApiKey?: string;
    coinGeckoApiKey?: string;
    duneApiKey?: string;
}

export class SocialAnalyticsService {
    private config: SocialAnalyticsConfig;
    private cacheManager: MemoryCacheManager;
    private static CACHE_TTL = 1 * 60 * 60; // 1 hour cache

    constructor(config: SocialAnalyticsConfig = {}) {
        this.config = config;
        this.cacheManager = new MemoryCacheManager({
            ttl: SocialAnalyticsService.CACHE_TTL,
        });
    }

    async getSocialMetrics(address: string): Promise<SocialMetrics> {
        const cacheKey = `social_metrics:${address}`;

        // Check cache first
        const cachedMetrics = this.cacheManager.get<SocialMetrics>(cacheKey);
        if (cachedMetrics) return cachedMetrics;

        try {
            // Fetch metrics from multiple sources with error handling
            const [twitterMetrics, coinGeckoMetrics, duneMetrics] =
                await Promise.allSettled([
                    this.getTwitterMetrics(address),
                    this.getCoinGeckoSocialMetrics(address),
                    this.getDuneSocialMetrics(address),
                ]);

            const socialMetrics: SocialMetrics = {
                lastUpdate: new Date().toISOString(),
                twitterFollowers: this.extractMetric(
                    twitterMetrics,
                    "followers_count"
                ),
                twitterEngagement:
                    this.calculateTwitterEngagementRate(twitterMetrics),
                discordMembers: 0, // Placeholder for future implementation
                discordActive: 0,
                telegramMembers: this.extractMetric(
                    coinGeckoMetrics,
                    "telegram_users"
                ),
                telegramActive: 0,
            };

            // Validate and cache metrics
            const validatedMetrics =
                ExtendedSocialMetricsSchema.parse(socialMetrics);
            this.cacheManager.set(
                cacheKey,
                validatedMetrics,
                SocialAnalyticsService.CACHE_TTL
            );

            return validatedMetrics;
        } catch (error) {
            console.error(`Social metrics fetch failed for ${address}:`, error);
            throw new Error(
                `Failed to retrieve social metrics: ${error.message}`
            );
        }
    }

    private async getTwitterMetrics(address: string) {
        if (!this.config.twitterApiKey) {
            console.warn("Twitter API key not provided for social metrics");
            return undefined;
        }

        try {
            const response = await axios.get(
                `https://api.twitter.com/2/users/by/username/${address}`,
                {
                    headers: {
                        Authorization: `Bearer ${this.config.twitterApiKey}`,
                    },
                }
            );

            return {
                followers_count:
                    response.data.data.public_metrics.followers_count,
                following_count:
                    response.data.data.public_metrics.following_count,
                tweet_count: response.data.data.public_metrics.tweet_count,
                engagement_rate: this.calculateTwitterEngagementRate(
                    response.data.data
                ),
            };
        } catch (error) {
            console.error("Twitter metrics fetch failed", error);
            return undefined;
        }
    }

    private async getCoinGeckoSocialMetrics(address: string) {
        if (!this.config.coinGeckoApiKey) {
            console.warn("CoinGecko API key not provided for social metrics");
        }

        try {
            const response = await axios.get(
                `https://api.coingecko.com/api/v3/coins/${address}`
            );
            return {
                community_score: response.data.community_score,
                twitter_followers: response.data.twitter_followers,
                telegram_users: response.data.telegram_users,
            };
        } catch (error) {
            console.error("CoinGecko metrics fetch failed", error);
            return undefined;
        }
    }

    private async getDuneSocialMetrics(address: string) {
        if (!this.config.duneApiKey) {
            console.warn("Dune API key not provided for social metrics");
            return undefined;
        }

        try {
            const response = await axios.get(
                `https://api.dune.com/api/v1/query/${address}/results`,
                {
                    headers: { "X-Dune-API-Key": this.config.duneApiKey },
                }
            );

            return {
                total_transactions: response.data.total_transactions,
                unique_wallets: response.data.unique_wallets,
                avg_transaction_value: response.data.avg_transaction_value,
            };
        } catch (error) {
            console.error("Dune metrics fetch failed", error);
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

    // Placeholder for more sophisticated engagement rate calculation
    private calculateTwitterEngagementRate(userData: any): number {
        // Basic engagement rate calculation
        // Implement more sophisticated logic as needed
        const { followers_count, tweet_count } = userData.public_metrics;
        return followers_count > 0
            ? Math.min((tweet_count / followers_count) * 100, 100)
            : 0;
    }

    // Sentiment and growth tracking placeholders
    async getSentimentAnalysis(address: string): Promise<number> {
        // Placeholder for sentiment analysis
        return 0;
    }

    async getGrowthRate(address: string): Promise<number> {
        // Placeholder for growth rate tracking
        return 0;
    }
}

export const socialAnalyticsService = new SocialAnalyticsService({
    twitterApiKey: process.env.TWITTER_API_KEY || "",
    duneApiKey: process.env.DUNE_API_KEY || "",
});
