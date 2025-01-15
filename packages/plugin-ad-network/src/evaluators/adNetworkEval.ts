import { Evaluator, IAgentRuntime, Memory, State } from "@elizaos/core";
import { AdNetworkEvalContent, AdNetworkEvalResponse } from "../types/types.ts";

export const adNetworkEvaluator: Evaluator = {
    name: "AD_NETWORK_EVALUATOR",
    description: "Validates token information responses from the ad network",
    similes: [
        "TOKEN_INFO_VALIDATOR",
        "TOKEN_RESPONSE_CHECKER",
        "AD_NETWORK_PROMOTION_VALIDATOR",
    ],
    examples: [
        {
            context: "Validating complete token information response",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "The token 'VAIN' is on the 'base' chain and focuses on AI investments.",
                        tokenDetails: {
                            token: "VAIN",
                            chain: "base",
                            context:
                                "Vainguard is an autonomous AI agent designed as a Fund of Funds, with a mission to invest in the AI token space.",
                        },
                    },
                },
            ],
            outcome: "Token information is valid",
        },
        {
            context: "Missing token details",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "The token details are incomplete.",
                    },
                },
            ],
            outcome: "Missing token details",
        },
    ],

    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> => {
        try {
            const content = message.content as AdNetworkEvalContent;
            return (
                content.tokenDetails !== undefined &&
                typeof content.tokenDetails.token === "string" &&
                typeof content.tokenDetails.chain === "string" &&
                typeof content.tokenDetails.context === "string"
            );
        } catch {
            return false;
        }
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<AdNetworkEvalResponse> => {
        try {
            const content = message.content as AdNetworkEvalContent;
            const { tokenDetails } = content;

            // Validate token details
            if (!tokenDetails) {
                return {
                    success: false,
                    response: "Missing token details.",
                };
            }

            if (!tokenDetails.token) {
                return {
                    success: false,
                    response: "Missing token name.",
                };
            }

            if (!tokenDetails.chain) {
                return {
                    success: false,
                    response: "Missing blockchain information.",
                };
            }

            if (!tokenDetails.context || tokenDetails.context.length < 20) {
                return {
                    success: false,
                    response: "Token context is too short or missing.",
                };
            }

            return {
                success: true,
                response: "Token information is valid.",
            };
        } catch (error) {
            return {
                success: false,
                response:
                    error instanceof Error
                        ? error.message
                        : "Failed to validate token information.",
            };
        }
    },

    alwaysRun: true,
};
