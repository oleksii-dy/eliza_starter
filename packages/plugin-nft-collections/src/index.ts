import { Plugin } from "@elizaos/core";
import { createNftCollectionProvider } from "./providers/nft-collections";
import {
    getCollectionsAction,
    getThinFloorNFTsAction,
    manageWatchlistAction,
} from "./actions/get-collections";
import { listNFTAction } from "./actions/list-nft";
import { sweepFloorArbitrageAction } from "./actions/sweep-floor";

import { ReservoirService } from "./services/reservoir";
import { MemoryCacheManager } from "./services/cache-manager";
import { RateLimiter } from "./services/rate-limiter";
import { MarketIntelligenceService } from "./services/market-intelligence";
import { SocialAnalyticsService } from "./services/social-analytics";
import { validateEnvironmentVariables } from "./utils/validation";

// Configuration with sensible defaults and environment variable overrides
const config = {
    caching: {
        enabled: process.env.CACHE_ENABLED === "true" || true,
        ttl: Number(process.env.CACHE_TTL) || 3600000, // 1 hour
        maxSize: Number(process.env.CACHE_MAX_SIZE) || 1000,
    },
    security: {
        rateLimit: {
            enabled: process.env.RATE_LIMIT_ENABLED === "true" || true,
            maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
            windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
        },
    },
    maxConcurrent: Number(process.env.MAX_CONCURRENT) || 5,
    maxRetries: Number(process.env.MAX_RETRIES) || 3,
    batchSize: Number(process.env.BATCH_SIZE) || 20,
};

function createNFTCollectionsPlugin(): Plugin {
    // Validate environment variables
    try {
        validateEnvironmentVariables({
            TWITTER_API_KEY: process.env.TWITTER_API_KEY,
            DUNE_API_KEY: process.env.DUNE_API_KEY,
            OPENSEA_API_KEY: process.env.OPENSEA_API_KEY,
            RESERVOIR_API_KEY: process.env.RESERVOIR_API_KEY,
        });
    } catch (error) {
        console.error("Environment Variable Validation Error:", error.message);
        throw error; // Prevent plugin initialization with invalid config
    }

    // Initialize reusable CacheManager if caching is enabled
    const cacheManager = config.caching?.enabled
        ? new MemoryCacheManager({
              ttl: config.caching.ttl,
              maxSize: config.caching.maxSize,
          })
        : null;

    // Initialize reusable RateLimiter if rate limiting is enabled
    const rateLimiter = config.security?.rateLimit?.enabled
        ? new RateLimiter({
              maxRequests: config.security.rateLimit.maxRequests,
              windowMs: config.security.rateLimit.windowMs,
          })
        : null;

    const reservoirService = new ReservoirService({
        cacheManager,
        rateLimiter,
        maxConcurrent: config.maxConcurrent,
        maxRetries: config.maxRetries,
        batchSize: config.batchSize,
    });

    const marketIntelligenceService = new MarketIntelligenceService({
        cacheManager,
        rateLimiter,
        openSeaApiKey: process.env.OPENSEA_API_KEY,
        reservoirApiKey: process.env.RESERVOIR_API_KEY,
    });

    const socialAnalyticsService = new SocialAnalyticsService({
        twitterApiKey: process.env.TWITTER_API_KEY,
        duneApiKey: process.env.DUNE_API_KEY,
    });

    const nftCollectionProvider = createNftCollectionProvider(
        reservoirService,
        marketIntelligenceService,
        socialAnalyticsService
    );

    return {
        name: "nft-collections",
        description:
            "Provides NFT collection information and market intelligence",
        providers: [nftCollectionProvider],
        actions: [
            getCollectionsAction(nftCollectionProvider),
            listNFTAction(reservoirService),
            sweepFloorArbitrageAction(reservoirService, nftCollectionProvider),
            getThinFloorNFTsAction(nftCollectionProvider, reservoirService),
            manageWatchlistAction(nftCollectionProvider),
        ],
        evaluators: [],
    };
}

export default createNFTCollectionsPlugin;
