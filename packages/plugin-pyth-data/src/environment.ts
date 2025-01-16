import { IAgentRuntime, elizaLogger } from "@elizaos/core";
import { z } from "zod";

// Environment Variables
let ENV: string = "mainnet";

// Pyth Network Configuration
const PYTH_NETWORKS = {
    mainnet: {
        hermes: process.env.PYTH_MAINNET_HERMES_URL || "https://hermes.pyth.network",
        wss: process.env.PYTH_MAINNET_WSS_URL || "wss://hermes.pyth.network/ws",
        pythnet: process.env.PYTH_MAINNET_PYTHNET_URL || "https://pythnet.rpcpool.com",
        contractRegistry: process.env.PYTH_MAINNET_CONTRACT_REGISTRY || "https://pyth.network/developers/price-feed-ids",
        programKey: process.env.PYTH_MAINNET_PROGRAM_KEY || "FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"
    },
    testnet: {
        hermes: process.env.PYTH_TESTNET_HERMES_URL || "https://hermes-beta.pyth.network",
        wss: process.env.PYTH_TESTNET_WSS_URL || "wss://hermes-beta.pyth.network/ws",
        pythnet: process.env.PYTH_TESTNET_PYTHNET_URL || "https://pythnet.rpcpool.com",
        contractRegistry: process.env.PYTH_TESTNET_CONTRACT_REGISTRY || "https://pyth.network/developers/price-feed-ids#testnet",
        programKey: process.env.PYTH_TESTNET_PROGRAM_KEY || "FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"
    }
} as const;

// Log environment information
elizaLogger.info("Environment sources", {
    shellVars: Object.keys(process.env).filter(key => key.startsWith('PYTH_')),
});

export const pythEnvSchema = z.object({
    PYTH_NETWORK_ENV: z.enum(["mainnet", "testnet"]).default("mainnet"),
    PYTH_MAX_RETRIES: z.string().transform(Number).default("3"),
    PYTH_RETRY_DELAY: z.string().transform(Number).default("1000"),
    PYTH_TIMEOUT: z.string().transform(Number).default("5000"),
    PYTH_MAX_PRICE_AGE: z.string().transform(Number).default("60000"),
    PYTH_CONFIDENCE_INTERVAL: z.string().transform(Number).default("0.95"),
    PYTH_UPDATE_INTERVAL: z.string().transform(Number).default("500"),
    PYTH_MAX_SUBSCRIPTIONS: z.string().transform(Number).default("100"),
    PYTH_BATCH_SIZE: z.string().transform(Number).default("10"),
    PYTH_CACHE_DURATION: z.string().transform(Number).default("300000"),
    PYTH_GRANULAR_LOG: z.boolean().default(true),
    PYTH_COMMITMENT_LEVEL: z.enum(["processed", "confirmed", "finalized"]).default("confirmed"),
    PYTH_ENABLE_WEBSOCKET: z.boolean().default(true),
    PYTH_RECONNECT_INTERVAL: z.string().transform(Number).default("5000"),
    PYTH_MAX_CONNECTION_ATTEMPTS: z.string().transform(Number).default("5"),
    PYTH_ENABLE_PRICE_CACHING: z.boolean().default(true),
    PYTH_ENABLE_METRICS: z.boolean().default(false),
    PYTH_LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
    PYTH_MAX_SLIPPAGE: z.string().transform(Number).default("0.05"),
    PYTH_MIN_LIQUIDITY_RATIO: z.string().transform(Number).default("0.1"),
    PYTH_MIN_DATA_POINTS: z.string().transform(Number).default("10"),
    PYTH_OUTLIER_THRESHOLD: z.string().transform(Number).default("2.0"),
    PYTH_WS_HEARTBEAT_INTERVAL: z.string().transform(Number).default("30000"),
    PYTH_WS_MAX_MISSED_HEARTBEATS: z.string().transform(Number).default("3"),
    PYTH_WS_RECONNECT_DELAY: z.string().transform(Number).default("1000"),
    RUNTIME_CHECK_MODE: z.boolean().default(false),
});

export type PythConfig = z.infer<typeof pythEnvSchema>;

export function getConfig(
    env: string | undefined | null = ENV ||
        process.env.PYTH_NETWORK_ENV
): PythConfig {
    ENV = env || "mainnet";

    return {
        PYTH_NETWORK_ENV: (env as "mainnet" | "testnet") || "mainnet",
        PYTH_MAX_RETRIES: Number(process.env.PYTH_MAX_RETRIES || "3"),
        PYTH_RETRY_DELAY: Number(process.env.PYTH_RETRY_DELAY || "1000"),
        PYTH_TIMEOUT: Number(process.env.PYTH_TIMEOUT || "5000"),
        PYTH_MAX_PRICE_AGE: Number(process.env.PYTH_MAX_PRICE_AGE || "60000"),
        PYTH_CONFIDENCE_INTERVAL: Number(process.env.PYTH_CONFIDENCE_INTERVAL || "0.95"),
        PYTH_UPDATE_INTERVAL: Number(process.env.PYTH_UPDATE_INTERVAL || "500"),
        PYTH_MAX_SUBSCRIPTIONS: Number(process.env.PYTH_MAX_SUBSCRIPTIONS || "100"),
        PYTH_BATCH_SIZE: Number(process.env.PYTH_BATCH_SIZE || "10"),
        PYTH_CACHE_DURATION: Number(process.env.PYTH_CACHE_DURATION || "300000"),
        PYTH_GRANULAR_LOG: process.env.PYTH_GRANULAR_LOG === "true" || false,
        PYTH_COMMITMENT_LEVEL: (process.env.PYTH_COMMITMENT_LEVEL as "processed" | "confirmed" | "finalized") || "confirmed",
        PYTH_ENABLE_WEBSOCKET: process.env.PYTH_ENABLE_WEBSOCKET === "true" || true,
        PYTH_RECONNECT_INTERVAL: Number(process.env.PYTH_RECONNECT_INTERVAL || "5000"),
        PYTH_MAX_CONNECTION_ATTEMPTS: Number(process.env.PYTH_MAX_CONNECTION_ATTEMPTS || "5"),
        PYTH_ENABLE_PRICE_CACHING: process.env.PYTH_ENABLE_PRICE_CACHING === "true" || true,
        PYTH_ENABLE_METRICS: process.env.PYTH_ENABLE_METRICS === "true" || false,
        PYTH_LOG_LEVEL: (process.env.PYTH_LOG_LEVEL as "error" | "warn" | "info" | "debug") || "info",
        PYTH_MAX_SLIPPAGE: Number(process.env.PYTH_MAX_SLIPPAGE || "0.05"),
        PYTH_MIN_LIQUIDITY_RATIO: Number(process.env.PYTH_MIN_LIQUIDITY_RATIO || "0.1"),
        PYTH_MIN_DATA_POINTS: Number(process.env.PYTH_MIN_DATA_POINTS || "10"),
        PYTH_OUTLIER_THRESHOLD: Number(process.env.PYTH_OUTLIER_THRESHOLD || "2.0"),
        PYTH_WS_HEARTBEAT_INTERVAL: Number(process.env.PYTH_WS_HEARTBEAT_INTERVAL || "30000"),
        PYTH_WS_MAX_MISSED_HEARTBEATS: Number(process.env.PYTH_WS_MAX_MISSED_HEARTBEATS || "3"),
        PYTH_WS_RECONNECT_DELAY: Number(process.env.PYTH_WS_RECONNECT_DELAY || "1000"),
        RUNTIME_CHECK_MODE: process.env.RUNTIME_CHECK_MODE === "true" || false,
    };
}

export async function validatePythConfig(
    runtime: IAgentRuntime
): Promise<PythConfig> {
    try {
        const envConfig = getConfig(
            runtime.getSetting("PYTH_NETWORK_ENV") ?? undefined
        );

        const config = {
            PYTH_NETWORK_ENV: process.env.PYTH_NETWORK_ENV || runtime.getSetting("PYTH_NETWORK_ENV") || envConfig.PYTH_NETWORK_ENV,
            PYTH_MAX_RETRIES: process.env.PYTH_MAX_RETRIES || runtime.getSetting("PYTH_MAX_RETRIES") || envConfig.PYTH_MAX_RETRIES.toString(),
            PYTH_RETRY_DELAY: process.env.PYTH_RETRY_DELAY || runtime.getSetting("PYTH_RETRY_DELAY") || envConfig.PYTH_RETRY_DELAY.toString(),
            PYTH_TIMEOUT: process.env.PYTH_TIMEOUT || runtime.getSetting("PYTH_TIMEOUT") || envConfig.PYTH_TIMEOUT.toString(),
            PYTH_MAX_PRICE_AGE: process.env.PYTH_MAX_PRICE_AGE || runtime.getSetting("PYTH_MAX_PRICE_AGE") || envConfig.PYTH_MAX_PRICE_AGE.toString(),
            PYTH_CONFIDENCE_INTERVAL: process.env.PYTH_CONFIDENCE_INTERVAL || runtime.getSetting("PYTH_CONFIDENCE_INTERVAL") || envConfig.PYTH_CONFIDENCE_INTERVAL.toString(),
            PYTH_UPDATE_INTERVAL: process.env.PYTH_UPDATE_INTERVAL || runtime.getSetting("PYTH_UPDATE_INTERVAL") || envConfig.PYTH_UPDATE_INTERVAL.toString(),
            PYTH_MAX_SUBSCRIPTIONS: process.env.PYTH_MAX_SUBSCRIPTIONS || runtime.getSetting("PYTH_MAX_SUBSCRIPTIONS") || envConfig.PYTH_MAX_SUBSCRIPTIONS.toString(),
            PYTH_BATCH_SIZE: process.env.PYTH_BATCH_SIZE || runtime.getSetting("PYTH_BATCH_SIZE") || envConfig.PYTH_BATCH_SIZE.toString(),
            PYTH_CACHE_DURATION: process.env.PYTH_CACHE_DURATION || runtime.getSetting("PYTH_CACHE_DURATION") || envConfig.PYTH_CACHE_DURATION.toString(),
            PYTH_GRANULAR_LOG: process.env.PYTH_GRANULAR_LOG === "true" || false,
            PYTH_COMMITMENT_LEVEL: process.env.PYTH_COMMITMENT_LEVEL || runtime.getSetting("PYTH_COMMITMENT_LEVEL") || envConfig.PYTH_COMMITMENT_LEVEL,
            PYTH_ENABLE_WEBSOCKET: process.env.PYTH_ENABLE_WEBSOCKET === "true" || true,
            PYTH_RECONNECT_INTERVAL: process.env.PYTH_RECONNECT_INTERVAL || runtime.getSetting("PYTH_RECONNECT_INTERVAL") || envConfig.PYTH_RECONNECT_INTERVAL.toString(),
            PYTH_MAX_CONNECTION_ATTEMPTS: process.env.PYTH_MAX_CONNECTION_ATTEMPTS || runtime.getSetting("PYTH_MAX_CONNECTION_ATTEMPTS") || envConfig.PYTH_MAX_CONNECTION_ATTEMPTS.toString(),
            PYTH_ENABLE_PRICE_CACHING: process.env.PYTH_ENABLE_PRICE_CACHING === "true" || true,
            PYTH_ENABLE_METRICS: process.env.PYTH_ENABLE_METRICS === "true" || false,
            PYTH_LOG_LEVEL: process.env.PYTH_LOG_LEVEL || runtime.getSetting("PYTH_LOG_LEVEL") || envConfig.PYTH_LOG_LEVEL,
            PYTH_MAX_SLIPPAGE: process.env.PYTH_MAX_SLIPPAGE || runtime.getSetting("PYTH_MAX_SLIPPAGE") || envConfig.PYTH_MAX_SLIPPAGE.toString(),
            PYTH_MIN_LIQUIDITY_RATIO: process.env.PYTH_MIN_LIQUIDITY_RATIO || runtime.getSetting("PYTH_MIN_LIQUIDITY_RATIO") || envConfig.PYTH_MIN_LIQUIDITY_RATIO.toString(),
            PYTH_MIN_DATA_POINTS: process.env.PYTH_MIN_DATA_POINTS || runtime.getSetting("PYTH_MIN_DATA_POINTS") || envConfig.PYTH_MIN_DATA_POINTS.toString(),
            PYTH_OUTLIER_THRESHOLD: process.env.PYTH_OUTLIER_THRESHOLD || runtime.getSetting("PYTH_OUTLIER_THRESHOLD") || envConfig.PYTH_OUTLIER_THRESHOLD.toString(),
            PYTH_WS_HEARTBEAT_INTERVAL: process.env.PYTH_WS_HEARTBEAT_INTERVAL || runtime.getSetting("PYTH_WS_HEARTBEAT_INTERVAL") || envConfig.PYTH_WS_HEARTBEAT_INTERVAL.toString(),
            PYTH_WS_MAX_MISSED_HEARTBEATS: process.env.PYTH_WS_MAX_MISSED_HEARTBEATS || runtime.getSetting("PYTH_WS_MAX_MISSED_HEARTBEATS") || envConfig.PYTH_WS_MAX_MISSED_HEARTBEATS.toString(),
            PYTH_WS_RECONNECT_DELAY: process.env.PYTH_WS_RECONNECT_DELAY || runtime.getSetting("PYTH_WS_RECONNECT_DELAY") || envConfig.PYTH_WS_RECONNECT_DELAY.toString(),
            RUNTIME_CHECK_MODE: process.env.RUNTIME_CHECK_MODE === "true" || false,
        };

        return pythEnvSchema.parse(config);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to validate Pyth configuration: ${errorMessage}`);
    }
}

// Export network configurations
export const getNetworkConfig = (env: string = ENV) => PYTH_NETWORKS[env as keyof typeof PYTH_NETWORKS];
