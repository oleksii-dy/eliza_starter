import { elizaLogger } from "@elizaos/core";
import {
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    Action,
} from "@elizaos/core";

import { composeContext } from "@elizaos/core";
import { generateObjectDeprecated } from "@elizaos/core";
import { validateSeiConfig } from "../../environment";
import { getSeiAgentKit } from "../../client"

export interface GetTokenAddressContent extends Content {
    ticker: string;
}

function isGetTokenAddressContent(
    runtime: IAgentRuntime,
    content: any
): content is GetTokenAddressContent {
    elizaLogger.log("Content for get token address", content);
    return (
        typeof content.ticker === "string"
    );
}

const getTokenAddressTemplate = `Respond with a JSON markdown block containing only the extracted values. Use 'null' for any values that cannot be determined.

Example response:
\`\`\`json
{
    "ticker": "SEI"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about getting a token address:
- Ticker symbol of the token (e.g. "SEI", "USDC", "USDT", etc.)

Look for phrases like:
- "Get token address for [TICKER]"
- "What's the address of [TICKER]"
- "Find [TICKER] token address"
- "[TICKER] token address"
- "Address of [TICKER]"

If the user mentions multiple tokens, focus on the most recently mentioned one.

Respond with a JSON markdown block containing only the extracted values.
If no relevant ticker is found in the conversation, respond with "null" for the ticker.`;

export const dexscreenerGetTokenAddressAction: Action = {
    name: "DEXSCREENER_GET_TOKEN_ADDRESS",
    similes: ["TOKEN ADDRESS", "GET ADDRESS", "FIND TOKEN", "DEXSCREENER ADDRESS", "TOKEN LOOKUP"],
    description: "Get the token address for a given ticker symbol using DexScreener",
    validate: async (runtime: IAgentRuntime): Promise<boolean> => {
        await validateSeiConfig(runtime);
        return true;
    },
    handler: async (
        runtime: IAgentRuntime, 
        message: Memory, 
        state: State,
        options: Record<string, unknown>, 
        callback: HandlerCallback): Promise<boolean> => {
        elizaLogger.log("Starting DexScreener getTokenAddress operation");

        const seiAgentKit = await getSeiAgentKit(runtime);

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            // Compose get token address context
            const getTokenAddressContext = composeContext({
                state,
                template: getTokenAddressTemplate,
            });

            // Generate get token address content
            const content = await generateObjectDeprecated({
                runtime,
                context: getTokenAddressContext,
                modelClass: ModelClass.LARGE,
            });

            // Validate get token address content
            if (!isGetTokenAddressContent(runtime, content)) {
                elizaLogger.error("Invalid content for DEXSCREENER_GET_TOKEN_ADDRESS action.");
                if (callback) {
                    callback({
                        text: "Unable to get token address. Invalid content provided.",
                        content: { error: "Invalid get token address content" },
                    });
                }
                return false;
            }
            
            elizaLogger.log("Get token address content:", content);
            
            if (content.ticker && content.ticker !== "null") {
                // Call the getTokenAddressFromTicker function
                const tokenAddress = await seiAgentKit.getTokenAddressFromTicker(content.ticker);
                
                if (tokenAddress) {
                    elizaLogger.success(`Found token address for ${content.ticker}`);
                    if (callback) {
                        callback({
                            text: `The token address for ${content.ticker} is ${tokenAddress}`,
                            content: { ticker: content.ticker, address: tokenAddress },
                        });
                    }
                    return true;
                } else {
                    elizaLogger.error("No token address found");
                    if (callback) {
                        callback({
                            text: `I couldn't find a token address for ${content.ticker}. This token might not be listed on DexScreener or it might not exist on the Sei blockchain.`,
                        });
                    }
                    return false;
                }
            } else {
                elizaLogger.error("No valid ticker provided");
                if (callback) {
                    callback({
                        text: "I couldn't determine which token you want to look up. Please specify a token ticker symbol.",
                    });
                }
                return false;
            }
        } catch (error) {
            elizaLogger.error("Error getting token address", error);
            if (callback) {
                callback({
                    text: `Error getting token address: ${error instanceof Error ? error.message : String(error)}`,
                });
            }
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user}}",
                content: {
                    text: "What's the address of the USDC token?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll look up the address for USDC on DexScreener...",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "The token address for USDC is 0x123456789abcdef",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 