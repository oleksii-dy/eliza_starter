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
        elizaLogger.info(`[PublisherCaps] ${message}`, data);
        console.log(`[PublisherCaps] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
};

interface GetLatestPublisherCapsContent extends Content {
    text: string;
    success?: boolean;
    data?: {
        caps?: Array<{
            publisher: string;
            cap: number;
            timestamp: number;
        }>;
        error?: string;
    };
}

export const getLatestPublisherCapsAction: Action = {
    name: "GET_LATEST_PUBLISHER_CAPS",
    similes: ["FETCH_PUBLISHER_CAPS", "GET_PUBLISHER_LIMITS", "CHECK_PUBLISHER_CAPS"],
    description: "Retrieve latest publisher caps from Pyth Network",
    examples: [[
        {
            user: "user",
            content: {
                text: "Get latest publisher caps"
            } as GetLatestPublisherCapsContent
        } as ActionExample,
        {
            user: "assistant",
            content: {
                text: "Latest publisher caps",
                success: true,
                data: {
                    caps: [{
                        publisher: "0x1234567890abcdef1234567890abcdef12345678",
                        cap: 1000000,
                        timestamp: 1641034800
                    }]
                }
            } as GetLatestPublisherCapsContent
        } as ActionExample
    ]],

    validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
        logGranular("Validating GET_LATEST_PUBLISHER_CAPS action", {
            content: message.content
        });

        try {
            const content = message.content as GetLatestPublisherCapsContent;

            // Validate against schema
            try {
                await validateSchema(content, ValidationSchemas.GET_LATEST_PUBLISHER_CAPS);
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

            return true;
        } catch (error) {
            logGranular("Validation failed", { error });
            elizaLogger.error("Validation failed for GET_LATEST_PUBLISHER_CAPS", {
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
        logGranular("Executing GET_LATEST_PUBLISHER_CAPS action");

        try {
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

            // Create message content
            const messageContent: GetLatestPublisherCapsContent = {
                text: "Get latest publisher caps",
                success: false
            };

            try {
                // Validate input
                await validateSchema(
                    messageContent,
                    ValidationSchemas.GET_LATEST_PUBLISHER_CAPS
                );

                // Get publisher caps with options
                const caps = await hermesClient.getLatestPublisherCaps({
                    parsed: true
                });

                const parsedCaps = caps as z.infer<typeof schemas.LatestPublisherStakeCapsUpdateDataResponse>;

                logGranular("Successfully retrieved publisher caps", {
                    count: parsedCaps.parsed?.[0]?.publisher_stake_caps.length || 0
                });

                // Create callback content
                const callbackContent: GetLatestPublisherCapsContent = {
                    text: `Retrieved ${parsedCaps.parsed?.[0]?.publisher_stake_caps.length || 0} publisher caps`,
                    success: true,
                    data: {
                        caps: parsedCaps.parsed?.[0]?.publisher_stake_caps.map((cap) => ({
                            publisher: cap.publisher,
                            cap: cap.cap,
                            timestamp: Date.now() // Since timestamp is not in the response
                        })) || []
                    }
                };

                // Call callback with results
                if (callback) {
                    await callback(callbackContent);
                }

                return true;
            } catch (error) {
                logGranular("Failed to process publisher caps request", { error });
                if (error instanceof DataError) {
                    throw error;
                }
                throw new DataError(
                    DataErrorCode.VALIDATION_FAILED,
                    "Failed to process publisher caps request",
                    ErrorSeverity.HIGH,
                    { originalError: error }
                );
            }
        } catch (error) {
            logGranular("Failed to get publisher caps", { error });
            if (error instanceof DataError) {
                throw error;
            }
            throw new DataError(
                DataErrorCode.NETWORK_ERROR,
                "Failed to get publisher caps",
                ErrorSeverity.HIGH,
                { originalError: error }
            );
        }
    }
};

export default getLatestPublisherCapsAction;
