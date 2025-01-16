import { Action, elizaLogger } from "@elizaos/core";
import { IAgentRuntime, Memory, State, HandlerCallback, Content, ActionExample } from "@elizaos/core";
import { HermesClient } from "../hermes/HermesClient";
import { DataError, ErrorSeverity, DataErrorCode } from "../error";
import { validatePythConfig, getNetworkConfig, getConfig } from "../environment";
import { ValidationSchemas } from "../types/types";
import { validateSchema } from "../utils";

// Get configuration for granular logging
const config = getConfig();
const GRANULAR_LOG = config.PYTH_GRANULAR_LOG;

// Enhanced logging helper
const logGranular = (message: string, data?: unknown) => {
    if (GRANULAR_LOG) {
        elizaLogger.info(`[PriceUpdatesStream] ${message}`, data);
        console.log(`[PriceUpdatesStream] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
};

interface GetPriceUpdatesStreamContent extends Content {
    text: string;
    priceIds: string[];
    options?: {
        encoding?: "hex" | "base64";
        parsed?: boolean;
        allowUnordered?: boolean;
        benchmarksOnly?: boolean;
    };
    success?: boolean;
    data?: {
        streamId: string;
        status: 'connected' | 'disconnected' | 'error';
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

export const getPriceUpdatesStreamAction: Action = {
    name: "GET_PRICE_UPDATES_STREAM",
    similes: ["STREAM_PRICE_UPDATES", "SUBSCRIBE_TO_PRICES", "WATCH_PRICE_FEED"],
    description: "Create a streaming connection for real-time price updates from Pyth Network",
    examples: [[
        {
            user: "user",
            content: {
                text: "Stream BTC/USD price updates",
                priceIds: ["ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"],
                options: {
                    encoding: "hex",
                    parsed: true,
                    benchmarksOnly: true
                }
            } as GetPriceUpdatesStreamContent
        } as ActionExample,
        {
            user: "assistant",
            content: {
                text: "Starting BTC/USD price stream...",
                success: true,
                priceIds: ["ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"],
                data: {
                    streamId: "stream_1",
                    status: "connected",
                    updates: [{
                        id: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
                        price: 42000,
                        confidence: 100,
                        timestamp: 1641034800,
                        emaPrice: 41950
                    }]
                }
            } as GetPriceUpdatesStreamContent
        } as ActionExample
    ], [
        {
            user: "user",
            content: {
                text: "Stream ETH and BTC prices with benchmarks only",
                priceIds: [
                    "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
                    "ca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6"
                ],
                options: {
                    benchmarksOnly: true,
                    parsed: true
                }
            } as GetPriceUpdatesStreamContent
        } as ActionExample,
        {
            user: "assistant",
            content: {
                text: "Starting price stream for BTC and ETH...",
                success: true,
                priceIds: [
                    "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
                    "ca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6"
                ],
                data: {
                    streamId: "stream_2",
                    status: "connected",
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
            } as GetPriceUpdatesStreamContent
        } as ActionExample
    ]],

    async validate(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        logGranular("Validating GET_PRICE_UPDATES_STREAM action", {
            content: message.content
        });

        try {
            const content = message.content as GetPriceUpdatesStreamContent;

            // Validate against schema
            try {
                await validateSchema(content, ValidationSchemas.GET_PRICE_UPDATES_STREAM);
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

            // Validate options if provided
            if (content.options) {
                const { encoding, parsed, allowUnordered, benchmarksOnly } = content.options;

                if (encoding && !["hex", "base64"].includes(encoding)) {
                    throw DataError.validationFailed(content, ["encoding must be either 'hex' or 'base64'"]);
                }

                if (parsed !== undefined && typeof parsed !== "boolean") {
                    throw DataError.validationFailed(content, ["parsed must be a boolean"]);
                }

                if (allowUnordered !== undefined && typeof allowUnordered !== "boolean") {
                    throw DataError.validationFailed(content, ["allowUnordered must be a boolean"]);
                }

                if (benchmarksOnly !== undefined && typeof benchmarksOnly !== "boolean") {
                    throw DataError.validationFailed(content, ["benchmarksOnly must be a boolean"]);
                }
            }

            logGranular("GET_PRICE_UPDATES_STREAM validation successful", {
                priceIds: content.priceIds,
                options: content.options
            });

            return true;
        } catch (error) {
            logGranular("Validation failed", { error });
            elizaLogger.error("Validation failed for GET_PRICE_UPDATES_STREAM", {
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
        logGranular("Executing GET_PRICE_UPDATES_STREAM action");

        try {
            const messageContent = message.content as GetPriceUpdatesStreamContent;
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

            // Initialize HermesClient with configuration
            const networkConfig = getNetworkConfig(config.PYTH_NETWORK_ENV);
            const client = new HermesClient(networkConfig.hermes);

            logGranular("Initialized HermesClient", {
                endpoint: networkConfig.hermes
            });

            // Create price updates stream
            const eventSource = await client.getPriceUpdatesStream(priceIds, {
                parsed: true,
                encoding: options?.encoding as "hex" | "base64" | undefined,
                allowUnordered: options?.allowUnordered,
                benchmarksOnly: options?.benchmarksOnly
            });

            // Generate a unique stream ID
            const streamId = `stream_${Date.now()}`;

            // Store the EventSource in state for cleanup
            if (state && typeof state.set === 'function') {
                state.set("eventSource", eventSource);
                state.set("streamId", streamId);
            }

            // Set up event handlers
            eventSource.onmessage = async (event: MessageEvent) => {
                logGranular("Received price update", {
                    streamId,
                    data: event.data
                });

                try {
                    const update = JSON.parse(event.data);

                    // Call callback with stream data
                    if (callback) {
                        const callbackContent: GetPriceUpdatesStreamContent = {
                            text: `Received price update for stream ${streamId}`,
                            success: true,
                            priceIds: messageContent.priceIds,
                            data: {
                                streamId,
                                status: 'connected',
                                updates: [{
                                    id: update.priceId,
                                    price: update.price,
                                    confidence: update.confidence,
                                    timestamp: update.timestamp,
                                    emaPrice: update.emaPrice
                                }]
                            }
                        };
                        await callback(callbackContent);
                    }
                } catch (error) {
                    logGranular("Failed to parse price update", {
                        streamId,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            };

            eventSource.onerror = async (error: Event) => {
                const pythError = new DataError(
                    DataErrorCode.CONNECTION_FAILED,
                    "Stream error occurred",
                    ErrorSeverity.HIGH,
                    { originalError: error }
                );

                logGranular("Stream error", {
                    streamId,
                    error: pythError
                });

                // Call callback with error
                if (callback) {
                    const callbackContent: GetPriceUpdatesStreamContent = {
                        text: "WebSocket stream error occurred",
                        success: false,
                        priceIds: messageContent.priceIds,
                        data: {
                            streamId,
                            status: 'error',
                            error: pythError.message
                        }
                    };
                    await callback(callbackContent);
                }

                // Close the stream on error
                eventSource.close();
            };

            // Initial success callback
            if (callback) {
                const callbackContent: GetPriceUpdatesStreamContent = {
                    text: "WebSocket stream initialized",
                    success: true,
                    priceIds: messageContent.priceIds,
                    data: {
                        streamId,
                        status: 'connected'
                    }
                };
                await callback(callbackContent);
            }

            return true;
        } catch (error) {
            const pythError = error instanceof DataError ? error : new DataError(
                DataErrorCode.NETWORK_ERROR,
                "Failed to create price updates stream",
                ErrorSeverity.HIGH,
                { originalError: error }
            );

            elizaLogger.error("Failed to create price updates stream", {
                error: pythError
            });

            // Call callback with error
            if (callback) {
                const callbackContent: GetPriceUpdatesStreamContent = {
                    text: "Failed to create price updates stream",
                    success: false,
                    priceIds: (message.content as GetPriceUpdatesStreamContent).priceIds,
                    data: {
                        streamId: "error",
                        status: 'error',
                        error: pythError.message
                    }
                };
                await callback(callbackContent);
            }

            return false;
        }
    }
};

export default getPriceUpdatesStreamAction;
