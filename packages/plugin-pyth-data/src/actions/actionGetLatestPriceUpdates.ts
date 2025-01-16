import { Action, elizaLogger } from "@elizaos/core";
import { IAgentRuntime, Memory, State, HandlerCallback, Content, ActionExample } from "@elizaos/core";
import { HermesClient } from "../hermes/HermesClient";
import { DataError, ErrorSeverity, DataErrorCode } from "../error";
import { validatePythConfig, getNetworkConfig, getConfig } from "../environment";
import { ValidationSchemas } from "../types/types";
import { validateSchema } from "../utils/validation";
import { schemas } from "../types/zodSchemas";
import { z } from "zod";

// Get configuration for granular logging
const config = getConfig();
const GRANULAR_LOG = config.PYTH_GRANULAR_LOG;

// Enhanced logging helper
const logGranular = (message: string, data?: unknown) => {
    if (GRANULAR_LOG) {
        elizaLogger.info(`[PriceUpdates] ${message}`, data);
        console.log(`[PriceUpdates] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
};

interface GetLatestPriceUpdatesContent extends Content {
    text: string;
    priceIds: string[];
    options?: {
        encoding?: "hex" | "base64";
        parsed?: boolean;
    };
    success?: boolean;
    data?: {
        updates?: Array<{
            price_feed_id: string;
            price: number;
            conf: number;
            expo: number;
            publish_time: number;
            ema_price?: {
                price: number;
                conf: number;
                expo: number;
            };
        }>;
        error?: string;
    };
}

export const getLatestPriceUpdatesAction: Action = {
    name: "GET_LATEST_PRICE_UPDATES",
    similes: ["FETCH_LATEST_PRICES", "GET_CURRENT_PRICES", "CHECK_PRICE_FEED"],
    description: "Retrieve latest price updates from Pyth Network",
    examples: [[
        {
            user: "user",
            content: {
                text: "Get latest BTC/USD price updates",
                priceIds: ["ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"],
                options: {
                    encoding: "base64",
                    parsed: true
                }
            } as GetLatestPriceUpdatesContent
        } as ActionExample,
        {
            user: "assistant",
            content: {
                text: "Here is the latest BTC/USD price",
                success: true,
                priceIds: ["ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"],
                data: {
                    updates: [{
                        price_feed_id: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
                        price: 42000000000,
                        conf: 100000000,
                        expo: -8,
                        publish_time: 1641034800,
                        ema_price: {
                            price: 41950000000,
                            conf: 95000000,
                            expo: -8
                        }
                    }]
                }
            } as GetLatestPriceUpdatesContent
        } as ActionExample
    ]],

    validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
        logGranular("Validating GET_LATEST_PRICE_UPDATES action", {
            content: message.content
        });

        try {
            const content = message.content as GetLatestPriceUpdatesContent;

            // Validate against schema
            try {
                await validateSchema(content, ValidationSchemas.GET_LATEST_PRICE);
                logGranular("Schema validation passed");
            } catch (error) {
                logGranular("Schema validation failed", { error });
                if (error instanceof DataError) {
                    elizaLogger.error("Schema validation failed", {
                        errors: error.details?.errors
                    });
                    throw error;
                }
                throw new DataError(
                    DataErrorCode.VALIDATION_FAILED,
                    "Schema validation failed",
                    ErrorSeverity.HIGH,
                    { error }
                );
            }

            // Validate priceIds array
            if (!content.priceIds || !Array.isArray(content.priceIds)) {
                throw new DataError(
                    DataErrorCode.VALIDATION_FAILED,
                    "priceIds must be an array of strings",
                    ErrorSeverity.HIGH
                );
            }

            if (content.priceIds.length === 0) {
                throw new DataError(
                    DataErrorCode.VALIDATION_FAILED,
                    "priceIds array cannot be empty",
                    ErrorSeverity.HIGH
                );
            }

            // Validate each price ID is a valid hex string
            content.priceIds.forEach((id, index) => {
                if (!/^[0-9a-fA-F]+$/.test(id)) {
                    throw new DataError(
                        DataErrorCode.VALIDATION_FAILED,
                        `Invalid price ID at index ${index}: ${id}`,
                        ErrorSeverity.HIGH
                    );
                }
            });

            return true;
        } catch (error) {
            logGranular("Validation failed", { error });
            elizaLogger.error("Validation failed for GET_LATEST_PRICE_UPDATES", {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options: { [key: string]: unknown } = {},
        callback?: HandlerCallback
    ): Promise<boolean> => {
        logGranular("Executing GET_LATEST_PRICE_UPDATES action");

        try {
            const messageContent = message.content as GetLatestPriceUpdatesContent;
            const { priceIds, options = {} } = messageContent;

            // Get Pyth configuration
            const config = await validatePythConfig(runtime);
            if (!config) {
                throw new DataError(
                    DataErrorCode.VALIDATION_FAILED,
                    "Invalid Pyth configuration",
                    ErrorSeverity.HIGH
                );
            }

            // Get network configuration
            const networkConfig = getNetworkConfig(config.PYTH_NETWORK_ENV);

            // Initialize Hermes client
            const hermesClient = new HermesClient(networkConfig.hermes);

            logGranular("Initialized HermesClient", {
                endpoint: networkConfig.hermes
            });

            try {
                // Get latest price updates
                const updates = await hermesClient.getLatestPriceUpdates(priceIds, {
                    parsed: true,
                    encoding: options?.encoding as "hex" | "base64" | undefined
                });

                logGranular("Successfully retrieved price updates", {
                    count: updates.parsed?.length || 0
                });

                // Create callback content
                const callbackContent: GetLatestPriceUpdatesContent = {
                    text: `Retrieved ${updates.parsed?.length || 0} price updates`,
                    success: true,
                    priceIds,
                    data: {
                        updates: (updates as z.infer<typeof schemas.PriceUpdate>).parsed?.map((update) => ({
                            price_feed_id: update.id,
                            price: Number(update.price.price),
                            conf: Number(update.price.conf),
                            expo: Number(update.price.expo),
                            publish_time: update.price.publish_time,
                            ema_price: update.ema_price ? {
                                price: Number(update.ema_price.price),
                                conf: Number(update.ema_price.conf),
                                expo: Number(update.ema_price.expo)
                            } : undefined
                        })) || []
                    }
                };

                // Call callback with results
                if (callback) {
                    await callback(callbackContent);
                }

                return true;
            } catch (error) {
                logGranular("Failed to process price updates request", { error });
                if (error instanceof DataError) {
                    throw error;
                }
                throw new DataError(
                    DataErrorCode.VALIDATION_FAILED,
                    "Failed to process price updates request",
                    ErrorSeverity.HIGH,
                    { originalError: error }
                );
            }
        } catch (error) {
            logGranular("Failed to get latest price updates", { error });
            if (error instanceof DataError) {
                throw error;
            }
            throw new DataError(
                DataErrorCode.NETWORK_ERROR,
                "Failed to get latest price updates",
                ErrorSeverity.HIGH,
                { originalError: error }
            );
        }
    }
};

export default getLatestPriceUpdatesAction;
