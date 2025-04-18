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
import { getSeiAgentKit } from "../../client";
import { validateSeiConfig } from "../../environment";

export interface SwapContent extends Content {
    amountIn: string;
    tokenIn: string;
    tokenOut: string;
}

function isSwapContent(
    runtime: IAgentRuntime,
    content: any
): content is SwapContent {
    elizaLogger.log("Content for swap", content);
    return (
        typeof content.amountIn === "string" &&
        typeof content.tokenIn === "string" &&
        typeof content.tokenOut === "string"
    );
}

const swapTemplate = `Respond with a JSON markdown block containing only the extracted values. Use 'null' for any values that cannot be determined.

Example response:
\`\`\`json
{
    "amountIn": "10",
    "tokenIn": "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
    "tokenOut": "0x0"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about swapping tokens on Symphony:
- Amount of tokens to swap (the amountIn, e.g. "10", "0.5", etc.)
- Address or ticker of the token to swap from (the tokenIn, e.g. "USDC", "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1")
- Address or ticker of the token to swap to (the tokenOut, e.g. "SEI", "0x0")

Look for phrases like:
- "Swap [AMOUNT] [TOKEN_IN] for [TOKEN_OUT]"
- "Exchange [AMOUNT] [TOKEN_IN] for [TOKEN_OUT]"
- "Trade [AMOUNT] [TOKEN_IN] for [TOKEN_OUT]"
- "Convert [AMOUNT] [TOKEN_IN] to [TOKEN_OUT]"

If the user mentions multiple tokens, focus on the most recently mentioned ones.

Respond with a JSON markdown block containing only the extracted values.
If no relevant token information is found in the conversation, respond with null for all values.`;

export const symphonySwapAction: Action = {
    name: "SYMPHONY_SWAP",
    similes: ["SWAP", "EXCHANGE", "TRADE", "CONVERT", "SYMPHONY SWAP"],
    description: "Swap tokens using Symphony protocol on the SEI blockchain",
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
        elizaLogger.log("Starting Symphony token swap");
        
        const seiAgentKit = await getSeiAgentKit(runtime);

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            // Compose swap context
            const swapContext = composeContext({
                state,
                template: swapTemplate,
            });

            // Generate swap content
            const content = await generateObjectDeprecated({
                runtime,
                context: swapContext,
                modelClass: ModelClass.LARGE,
            });

            // Validate swap content
            if (!isSwapContent(runtime, content)) {
                elizaLogger.error("Invalid content for SYMPHONY_SWAP action.");
                if (callback) {
                    callback({
                        text: "Unable to process swap request. Invalid content provided.",
                        content: { error: "Invalid swap content" },
                    });
                }
                return false;
            }
            
            elizaLogger.log("Swap content:", content);
            
            // Convert ticker symbols to addresses
            const tokenInAddress = content.tokenIn === "SEI" ? 
                "0x0" as `0x${string}` : 
                await seiAgentKit.getTokenAddressFromTicker(content.tokenIn) as `0x${string}`;
            
            const tokenOutAddress = content.tokenOut === "SEI" ? 
                "0x0" as `0x${string}` : 
                await seiAgentKit.getTokenAddressFromTicker(content.tokenOut) as `0x${string}`;
            
            // Call the swap function from sei-agent-kit with addresses instead of ticker symbols
            const response = await seiAgentKit.swap(
                content.amountIn,
                tokenInAddress,
                tokenOutAddress
            );
            
            if (response) {
                elizaLogger.success(`Successfully swapped ${content.amountIn} ${content.tokenIn} for ${content.tokenOut}`);
                if (callback) {
                    callback({
                        text: `I've successfully swapped ${content.amountIn} ${content.tokenIn} for ${content.tokenOut}. Transaction hash: ${response}`,
                    });
                }
                return true;
            } else {
                elizaLogger.error("Swap operation failed");
                if (callback) {
                    callback({
                        text: "Sorry, the swap operation failed. Please try again later.",
                    });
                }
                return false;
            }
        } catch (error) {
            elizaLogger.error("Error performing Symphony swap", error);
            if (callback) {
                callback({
                    text: `Error performing swap: ${error instanceof Error ? error.message : String(error)}`,
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
                    text: "Swap 10 USDC for SEI using Symphony",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you swap 10 USDC for SEI using Symphony...",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I've successfully swapped 10 USDC for SEI. Transaction hash: 0x123456789abcdef",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 