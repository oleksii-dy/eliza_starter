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
        elizaLogger.info(`[Twaps] ${message}`, data);
        console.log(`[Twaps] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
};
interface GetLatestTwapsContent extends Content {
    text: string;
    priceIds: string[];
    windows: number[];
    success?: boolean;
    data?: {
        twaps?: Array<{
            priceId: string;
            windows: Array<{
                window: number;
                value: number;
                confidence: number;
                timestamp: number;
            }>;
        }>;
        error?: string;
    };
}

// Transform TWAP data to match interface
const transformTwapResponse = (response: z.infer<typeof schemas.TwapsResponse>) => {
    if (!response.parsed) return [];
    return response.parsed.map((item) => ({
        priceId: item.id,
        windows: [{
            window: item.end_timestamp - item.start_timestamp,
            value: Number(item.twap.price),
            confidence: Number(item.twap.conf),
            timestamp: item.end_timestamp
        }]
    }));
};

export const getLatestTwapsAction: Action = {
    name: "GET_LATEST_TWAPS",
    similes: ["FETCH_TIME_WEIGHTED_PRICES", "GET_AVERAGE_PRICES", "CHECK_TWAP_VALUES"],
    description: "Retrieve Time-Weighted Average Prices (TWAPs) for specified price IDs and time windows from Pyth Network",
    examples: [[
        {
            user: "user",
            content: {
                text: "Get latest TWAPs for BTC/USD",
                priceIds: ["ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"],
                windows: [300, 900]
            } as GetLatestTwapsContent
        } as ActionExample,
        {
            user: "assistant",
            content: {
                text: "Latest TWAPs for BTC/USD",
                priceIds: ["ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"],
                windows: [300, 900],
                success: true,
                data: {
                    twaps: [{
                        priceId: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
                        windows: [
                            {
                                window: 300,
                                value: 42000,
                                confidence: 100,
                                timestamp: 1641034800
                            },
                            {
                                window: 900,
                                value: 41950,
                                confidence: 95,
                                timestamp: 1641034800
                            }
                        ]
                    }]
                }
            } as GetLatestTwapsContent
        } as ActionExample
    ], [
        {
            user: "user",
            content: {
                text: "Get latest TWAPs for ETH/USD and BTC/USD",
                priceIds: [
                    "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
                    "ca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6"
                ],
                windows: [300, 900]
            } as GetLatestTwapsContent
        } as ActionExample,
        {
            user: "assistant",
            content: {
                text: "Latest TWAPs for ETH/USD and BTC/USD",
                priceIds: [
                    "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
                    "ca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6"
                ],
                windows: [300, 900],
                success: true,
                data: {
                    twaps: [
                        {
                            priceId: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
                            windows: [
                                {
                                    window: 300,
                                    value: 42000,
                                    confidence: 100,
                                    timestamp: 1641034800
                                },
                                {
                                    window: 900,
                                    value: 41950,
                                    confidence: 95,
                                    timestamp: 1641034800
                                }
                            ]
                        },
                        {
                            priceId: "ca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6",
                            windows: [
                                {
                                    window: 300,
                                    value: 2500,
                                    confidence: 50,
                                    timestamp: 1641034800
                                },
                                {
                                    window: 900,
                                    value: 2495,
                                    confidence: 45,
                                    timestamp: 1641034800
                                }
                            ]
                        }
                    ]
                }
            } as GetLatestTwapsContent
        } as ActionExample
    ]],

    async validate(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        logGranular("Validating GET_LATEST_TWAPS action", {
            content: message.content
        });

        try {
            const content = message.content as GetLatestTwapsContent;

            // Validate against schema
            try {
                await validateSchema(content, ValidationSchemas.GET_LATEST_TWAPS);
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
                throw new DataError(
                    DataErrorCode.VALIDATION_FAILED,
                    "Invalid Pyth configuration",
                    ErrorSeverity.HIGH
                );
            }

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

            if (!content.windows || !Array.isArray(content.windows)) {
                throw new DataError(
                    DataErrorCode.VALIDATION_FAILED,
                    "windows must be an array of numbers",
                    ErrorSeverity.HIGH
                );
            }

            if (content.windows.length === 0) {
                throw new DataError(
                    DataErrorCode.VALIDATION_FAILED,
                    "windows array cannot be empty",
                    ErrorSeverity.HIGH
                );
            }

            // Validate each window is a positive number
            content.windows.forEach((window, index) => {
                if (typeof window !== 'number' || window <= 0) {
                    throw new DataError(
                        DataErrorCode.VALIDATION_FAILED,
                        `Invalid window at index ${index}: ${window}. Must be a positive number.`,
                        ErrorSeverity.HIGH
                    );
                }
            });

            logGranular("GET_LATEST_TWAPS validation successful", {
                priceIds: content.priceIds,
                windows: content.windows
            });

            return true;
        } catch (error) {
            elizaLogger.error("Validation failed for GET_LATEST_TWAPS", {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    },

    async handler(
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        _options: { [key: string]: unknown } = {},
        callback?: HandlerCallback
    ): Promise<boolean> {
        logGranular("Executing GET_LATEST_TWAPS action");

        try {
            const content = message.content as GetLatestTwapsContent;
            const { priceIds, windows } = content;

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

            // Get latest TWAPs
            const twaps = await client.getLatestTwaps(priceIds, windows[0], {
                parsed: true
            });

            logGranular("Successfully retrieved TWAPs", {
                count: twaps.parsed?.length || 0
            });

            // Create callback content
            const callbackContent: GetLatestTwapsContent = {
                text: `Retrieved TWAPs for ${priceIds.length} price feeds`,
                success: true,
                priceIds,
                windows,
                data: {
                    twaps: transformTwapResponse(twaps)
                }
            };

            // Call callback with results
            if (callback) {
                await callback(callbackContent);
            }

            return true;
        } catch (error) {
            const pythError = error instanceof DataError ? error : new DataError(
                DataErrorCode.NETWORK_ERROR,
                "Failed to get TWAPs",
                ErrorSeverity.HIGH,
                { originalError: error }
            );

            elizaLogger.error("Failed to get TWAPs", {
                error: pythError
            });

            // Call callback with error
            if (callback) {
                const callbackContent: GetLatestTwapsContent = {
                    text: "Failed to get TWAPs",
                    priceIds: (message.content as GetLatestTwapsContent).priceIds,
                    windows: (message.content as GetLatestTwapsContent).windows,
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

export default getLatestTwapsAction;
