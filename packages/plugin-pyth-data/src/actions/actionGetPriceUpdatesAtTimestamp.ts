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
        elizaLogger.info(`[PriceUpdatesAtTimestamp] ${message}`, data);
        console.log(`[PriceUpdatesAtTimestamp] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
};

interface GetPriceUpdatesAtTimestampContent extends Content {
    text: string;
    priceIds: string[];
    timestamp: number;
    success?: boolean;
    data?: {
        updates?: Array<{
            id: string;
            price: number;
            confidence: number;
            timestamp: number;
            emaPrice?: number;
        }>;
        error?: string;
    };
}

export const getPriceUpdatesAtTimestampAction: Action = {
    name: "GET_PRICE_UPDATES_AT_TIMESTAMP",
    similes: ["GET_HISTORICAL_PRICES", "FETCH_PRICE_AT_TIME", "HISTORICAL_PRICE_LOOKUP"],
    description: "Get price updates for multiple price feeds at a specific timestamp",
    examples: [[
        {
            user: "user",
            content: {
                text: "Get BTC/USD price at timestamp 1641034800",
                priceIds: ["ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"],
                timestamp: 1641034800
            } as GetPriceUpdatesAtTimestampContent
        } as ActionExample,
        {
            user: "assistant",
            content: {
                text: "BTC/USD price at timestamp 1641034800",
                success: true,
                priceIds: ["ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"],
                timestamp: 1641034800,
                data: {
                    updates: [{
                        id: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
                        price: 42000,
                        confidence: 100,
                        timestamp: 1641034800,
                        emaPrice: 41950
                    }]
                }
            } as GetPriceUpdatesAtTimestampContent
        } as ActionExample
    ], [
        {
            user: "user",
            content: {
                text: "Get ETH and BTC prices at timestamp 1641034800",
                priceIds: [
                    "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
                    "ca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6"
                ],
                timestamp: 1641034800
            } as GetPriceUpdatesAtTimestampContent
        } as ActionExample,
        {
            user: "assistant",
            content: {
                text: "ETH and BTC prices at timestamp 1641034800",
                success: true,
                priceIds: [
                    "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
                    "ca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6"
                ],
                timestamp: 1641034800,
                data: {
                    updates: [
                        {
                            id: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
                            price: 42000,
                            confidence: 100,
                            timestamp: 1641034800,
                            emaPrice: 41950
                        },
                        {
                            id: "ca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6",
                            price: 2500,
                            confidence: 50,
                            timestamp: 1641034800,
                            emaPrice: 2495
                        }
                    ]
                }
            } as GetPriceUpdatesAtTimestampContent
        } as ActionExample
    ]],

    async validate(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        logGranular("Validating GET_PRICE_UPDATES_AT_TIMESTAMP action", {
            content: message.content
        });

        try {
            const content = message.content as GetPriceUpdatesAtTimestampContent;

            // Validate against schema
            try {
                await validateSchema(content, ValidationSchemas.GET_PRICE_UPDATES_AT_TIMESTAMP);
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

            // Validate Pyth configuration
            const config = await validatePythConfig(runtime);
            if (!config) {
                throw DataError.validationFailed(content, ["Invalid Pyth configuration"]);
            }

            if (!content.priceIds || !Array.isArray(content.priceIds)) {
                throw DataError.validationFailed(content, ["priceIds must be an array of strings"]);
            }

            if (content.priceIds.length === 0) {
                throw DataError.validationFailed(content, ["priceIds array cannot be empty"]);
            }

            // Validate each price ID is a valid hex string
            content.priceIds.forEach((id, index) => {
                if (!/^[0-9a-fA-F]+$/.test(id)) {
                    throw DataError.validationFailed(content, [`Invalid price ID at index ${index}: ${id}`]);
                }
            });

            // Validate timestamp
            if (typeof content.timestamp !== 'number' || content.timestamp <= 0) {
                throw DataError.validationFailed(content, ["timestamp must be a positive number"]);
            }

            logGranular("GET_PRICE_UPDATES_AT_TIMESTAMP validation successful", {
                priceIds: content.priceIds,
                timestamp: content.timestamp
            });

            return true;
        } catch (error) {
            logGranular("Validation failed", { error });
            elizaLogger.error("Validation failed for GET_PRICE_UPDATES_AT_TIMESTAMP", {
                error: error instanceof Error ? error.message : String(error)
            });
            if (error instanceof DataError) {
                throw error;
            }
            throw DataError.validationFailed(message.content, ["Invalid content format"]);
        }
    },

    async handler(
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        _options: { [key: string]: unknown } = {},
        callback?: HandlerCallback
    ): Promise<boolean> {
        logGranular("Executing GET_PRICE_UPDATES_AT_TIMESTAMP action");

        try {
            const messageContent = message.content as GetPriceUpdatesAtTimestampContent;
            const { priceIds, timestamp } = messageContent;

            // Get Pyth configuration
            const config = await validatePythConfig(runtime);
            if (!config) {
                throw new DataError(
                    DataErrorCode.VALIDATION_FAILED,
                    "Invalid Pyth configuration",
                    ErrorSeverity.HIGH
                );
            }

            // Initialize HermesClient with configuration
            const networkConfig = getNetworkConfig(config.PYTH_NETWORK_ENV);
            const client = new HermesClient(networkConfig.hermes);

            logGranular("Initialized HermesClient", {
                endpoint: networkConfig.hermes
            });

            // Get price updates at timestamp
            const updates = await client.getPriceUpdatesAtTimestamp(
                timestamp,
                priceIds,
                { parsed: true }
            );

            // Process updates
            if (callback) {
                const parsedUpdates = updates as z.infer<typeof schemas.PriceUpdate>;
                const callbackContent: GetPriceUpdatesAtTimestampContent = {
                    text: `Price updates at timestamp ${timestamp}`,
                    priceIds,
                    timestamp,
                    success: true,
                    data: {
                        updates: parsedUpdates.parsed?.map((update: z.infer<typeof schemas.ParsedPriceUpdate>) => ({
                            id: update.id,
                            price: Number(update.price.price),
                            confidence: Number(update.price.conf),
                            timestamp: update.price.publish_time,
                            emaPrice: update.ema_price ? Number(update.ema_price.price) : undefined
                        })) || []
                    }
                };
                await callback(callbackContent);
            }

            return true;
        } catch (error) {
            const pythError = error instanceof DataError ? error : new DataError(
                DataErrorCode.NETWORK_ERROR,
                "Failed to get price updates at timestamp",
                ErrorSeverity.HIGH,
                { originalError: error }
            );

            elizaLogger.error("Failed to get price updates at timestamp", {
                error: pythError
            });

            // Call callback with error
            if (callback) {
                const callbackContent: GetPriceUpdatesAtTimestampContent = {
                    text: "Failed to get price updates at timestamp",
                    priceIds: (message.content as GetPriceUpdatesAtTimestampContent).priceIds,
                    timestamp: (message.content as GetPriceUpdatesAtTimestampContent).timestamp,
                    success: false,
                    data: {
                        error: pythError.message
                    }
                };
                await callback(callbackContent);
            }

            return false;
        }
    }
};

export default getPriceUpdatesAtTimestampAction;
