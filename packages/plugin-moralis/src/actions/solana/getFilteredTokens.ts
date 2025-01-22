// actions/getFilteredTokens.ts

import {
    ActionExample,
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@elizaos/core";
import axios from "axios";
import { validateMoralisConfig } from "../../environment";
import { getFilteredTokensTemplate } from "../../templates/getFilteredTokens";

export default {
    name: "GET_FILTERED_TOKENS",
    similes: [
        "FIND_TOKENS",
        "DISCOVER_TOKENS",
        "SEARCH_TOKENS",
        "FILTER_TOKENS",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        await validateMoralisConfig(runtime);
        return true;
    },
    description: "Get filtered token information based on various criteria",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting Moralis GET_FILTERED_TOKENS handler...");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            elizaLogger.log("Composing token filter context...");
            const filterContext = composeContext({
                state,
                template: getFilteredTokensTemplate,
            });

            const content = (await generateObjectDeprecated({
                runtime,
                context: filterContext,
                modelClass: ModelClass.LARGE,
            })) as any;

            if (!content || typeof content !== "object") {
                throw new Error("Invalid response format from model");
            }

            const config = await validateMoralisConfig(runtime);

            const response = await axios.post(
                "https://deep-index.moralis.io/api/v2.2/discovery/tokens",
                {
                    chain: "solana",
                    filters: content.filters || [],
                    sortBy: content.sortBy,
                    limit: 10,
                    timeFramesToReturn: ["oneHour", "oneDay", "oneWeek"],
                    metricsToReturn: [
                        "marketCap",
                        "volumeUsd",
                        "holders",
                        "securityScore",
                    ],
                },
                {
                    headers: {
                        "X-API-Key": config.MORALIS_API_KEY,
                        accept: "application/json",
                        "Content-Type": "application/json",
                    },
                }
            );

            const tokens = response.data;

            if (callback) {
                let formattedResponse = `Found ${tokens.length} tokens matching your criteria:\n\n`;

                tokens.forEach((token: any, index: number) => {
                    formattedResponse += `${index + 1}. ${token.metadata.name} (${token.metadata.symbol})\n`;
                    formattedResponse += `   Contract Address: ${token.metadata.tokenAddress}\n`;
                    formattedResponse += `   Price: $${token.metadata.usdPrice.toFixed(4)}\n`;
                    formattedResponse += `   24h Volume: $${(token.metrics.volumeUsd.oneDay / 1000000).toFixed(2)}M\n`;
                    formattedResponse += `   Market Cap: $${(token.metrics.marketCap / 1000000).toFixed(2)}M\n`;
                    formattedResponse += `   Security Score: ${token.metrics.securityScore}/100\n\n`;
                });

                callback({
                    text: formattedResponse,
                    content: tokens,
                });
            }

            return true;
        } catch (error: any) {
            elizaLogger.error("Error in GET_FILTERED_TOKENS handler:", error);
            const errorMessage = error.response?.data?.message || error.message;
            if (callback) {
                callback({
                    text: `Error discovering tokens: ${errorMessage}`,
                    content: { error: errorMessage },
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Find tokens with high volume and good security score",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll search for tokens with high trading volume and good security metrics.",
                    action: "GET_FILTERED_TOKENS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me new tokens launched in the last week",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll find recently launched tokens for you.",
                    action: "GET_FILTERED_TOKENS",
                },
            },
        ],
    ],
} as Action;
