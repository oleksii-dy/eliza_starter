import {
    parseBooleanFromText,
    IAgentRuntime,
    ActionTimelineType,
    elizaLogger,
} from "@elizaos/core";
import { z } from "zod";

export const DEFAULT_MAX_TWEET_LENGTH = 280;

const twitterUsernameSchema = z
    .string()
    .min(1, "An X/Twitter Username must be at least 1 character long")
    .max(15, "An X/Twitter Username cannot exceed 15 characters")
    .refine((username) => {
        // Allow wildcard '*' as a special case
        if (username === "*") return true;

        // Twitter usernames can:
        // - Start with digits now
        // - Contain letters, numbers, underscores
        // - Must not be empty
        return /^[A-Za-z0-9_]+$/.test(username);
    }, "An X Username can only contain letters, numbers, and underscores");

/**
 * This schema defines all required/optional environment settings,
 * including new fields like TWITTER_SPACES_ENABLE.
 */
export const twitterEnvSchema = z.object({
    TWITTER_DRY_RUN: z.boolean(),
    TWITTER_USERNAME: z.string().min(1, "X/Twitter username is required"),
    TWITTER_PASSWORD: z.string().min(1, "X/Twitter password is required"),
    TWITTER_EMAIL: z.string()
        .min(1, "X/Twitter email is required")
        .email("Invalid email format - must be a valid email address"),
    MAX_TWEET_LENGTH: z.number().int().default(DEFAULT_MAX_TWEET_LENGTH),
    TWITTER_SEARCH_ENABLE: z.boolean().default(false),
    TWITTER_2FA_SECRET: z.string(),
    TWITTER_RETRY_LIMIT: z.number().int(),
    TWITTER_POLL_INTERVAL: z.number().int(),
    TWITTER_TARGET_USERS: z.array(twitterUsernameSchema).default([]),
    POST_INTERVAL_MIN: z.number().int(),
    POST_INTERVAL_MAX: z.number().int(),
    ENABLE_ACTION_PROCESSING: z.boolean(),
    ACTION_INTERVAL: z.number().int(),
    POST_IMMEDIATELY: z.boolean(),
    TWITTER_SPACES_ENABLE: z.boolean().default(false),
    MAX_ACTIONS_PROCESSING: z.number().int(),
    ACTION_TIMELINE_TYPE: z
        .nativeEnum(ActionTimelineType)
        .default(ActionTimelineType.ForYou),
});

export type TwitterConfig = z.infer<typeof twitterEnvSchema>;

/**
 * Helper to parse a comma-separated list of Twitter usernames.
 */

function parseTargetUsers(targetUsersStr?: string | null): string[] {
    if (!targetUsersStr?.trim()) {
        return [];
    }
    return targetUsersStr
        .split(",")
        .map((user) => user.trim())
        .filter(Boolean);
}

function safeParseInt(
    value: string | undefined | null,
    defaultValue: number
): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : Math.max(1, parsed);
}

/**
 * Validates or constructs a TwitterConfig object using zod,
 * taking values from the IAgentRuntime or process.env as needed.
 */
export async function validateTwitterConfig(
    runtime: IAgentRuntime
): Promise<TwitterConfig> {
    // Helper to handle $ prefixed values
    const getConfigValue = (key: string) => {
        const value = runtime.getSetting(key);
        return value?.startsWith('$') ? process.env[key] : value || process.env[key];
    };

    const config = {
        TWITTER_DRY_RUN: parseBooleanFromText(getConfigValue("TWITTER_DRY_RUN") || "false"),
        TWITTER_USERNAME: getConfigValue("TWITTER_USERNAME"),
        TWITTER_PASSWORD: getConfigValue("TWITTER_PASSWORD"),
        TWITTER_EMAIL: getConfigValue("TWITTER_EMAIL"),
        MAX_TWEET_LENGTH: safeParseInt(getConfigValue("MAX_TWEET_LENGTH"), DEFAULT_MAX_TWEET_LENGTH),
        TWITTER_SEARCH_ENABLE: parseBooleanFromText(getConfigValue("TWITTER_SEARCH_ENABLE") || "false"),
        TWITTER_2FA_SECRET: getConfigValue("TWITTER_2FA_SECRET") || "",
        TWITTER_RETRY_LIMIT: safeParseInt(getConfigValue("TWITTER_RETRY_LIMIT"), 5),
        TWITTER_POLL_INTERVAL: safeParseInt(getConfigValue("TWITTER_POLL_INTERVAL"), 120),
        TWITTER_TARGET_USERS: parseTargetUsers(getConfigValue("TWITTER_TARGET_USERS")),
        POST_INTERVAL_MIN: safeParseInt(getConfigValue("POST_INTERVAL_MIN"), 90),
        POST_INTERVAL_MAX: safeParseInt(getConfigValue("POST_INTERVAL_MAX"), 180),
        ENABLE_ACTION_PROCESSING: parseBooleanFromText(getConfigValue("ENABLE_ACTION_PROCESSING") || "false"),
        ACTION_INTERVAL: safeParseInt(getConfigValue("ACTION_INTERVAL"), 5),
        POST_IMMEDIATELY: parseBooleanFromText(getConfigValue("POST_IMMEDIATELY") || "false"),
        TWITTER_SPACES_ENABLE: parseBooleanFromText(getConfigValue("TWITTER_SPACES_ENABLE") || "false"),
        MAX_ACTIONS_PROCESSING: safeParseInt(getConfigValue("MAX_ACTIONS_PROCESSING"), 1),
        ACTION_TIMELINE_TYPE: ActionTimelineType.ForYou,
    };

    elizaLogger.error("Raw Twitter config values:", {
        runtimeUsername: runtime.getSetting("TWITTER_USERNAME"),
        envUsername: process.env.TWITTER_USERNAME,
        runtimeEmail: runtime.getSetting("TWITTER_EMAIL"),
        envEmail: process.env.TWITTER_EMAIL,
        finalEmail: config.TWITTER_EMAIL
    });

    elizaLogger.error("Twitter config validation:", {
        username: config.TWITTER_USERNAME,
        email: config.TWITTER_EMAIL,
        hasPassword: !!config.TWITTER_PASSWORD,
        has2FA: !!config.TWITTER_2FA_SECRET,
        searchEnabled: config.TWITTER_SEARCH_ENABLE,
        spacesEnabled: config.TWITTER_SPACES_ENABLE
    });

    // Validation
    if (!config.TWITTER_EMAIL?.includes("@")) {
        throw new Error("X/Twitter configuration validation failed:\nTWITTER_EMAIL: Email must contain @ and a domain (e.g. example@domain.com)");
    }

    if (!config.TWITTER_USERNAME) {
        throw new Error("X/Twitter configuration validation failed:\nTWITTER_USERNAME is required");
    }

    if (!config.TWITTER_PASSWORD) {
        throw new Error("X/Twitter configuration validation failed:\nTWITTER_PASSWORD is required");
    }

    return config;
}
