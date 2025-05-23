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

export interface RemoveLiquidityContent extends Content {
    tokenId: string;
    liquidity?: string;
}

function isRemoveLiquidityContent(
    runtime: IAgentRuntime,
    content: any
): content is RemoveLiquidityContent {
    elizaLogger.log("Content for DragonSwap remove liquidity", content);
    return (
        typeof content.tokenId === "string" && 
        content.tokenId.trim() !== "" &&
        content.tokenId !== "null" &&
        (!content.liquidity || 
            (typeof content.liquidity === "string" && 
            content.liquidity.trim() !== "" &&
            content.liquidity !== "null"))
    );
}

const removeLiquidityTemplate = `Respond with a JSON markdown block containing only the extracted values. Use 'null' for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tokenId": "1234",
    "liquidity": "500000000000000000"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about removing liquidity from DragonSwap:
- The NFT position token ID (tokenId)
- Optional: The amount of liquidity to remove (liquidity). If not specified, all liquidity will be removed.

Look for phrases like:
- "Remove liquidity from position [TOKEN_ID]"
- "Withdraw [AMOUNT] liquidity from position [TOKEN_ID]"
- "Remove all liquidity from position [TOKEN_ID]"
- "Remove [AMOUNT] liquidity from my DragonSwap position [TOKEN_ID]"

If the user mentions multiple token IDs, focus on the most recently mentioned one.

Respond with a JSON markdown block containing only the extracted values.
If no relevant DragonSwap liquidity removal information is found in the conversation, respond with null for all values.`;

export const removeDragonSwapLiquidityAction: Action = {
    name: "DRAGONSWAP_REMOVE_LIQUIDITY",
    similes: ["REMOVE LIQUIDITY", "WITHDRAW LIQUIDITY", "REMOVE DRAGONSWAP LIQUIDITY"],
    description: "Remove liquidity from a DragonSwap pool position",
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
        elizaLogger.log("Starting DragonSwap remove liquidity operation");
        
        const seiAgentKit = await getSeiAgentKit(runtime);

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            // Compose remove liquidity context
            const liquidityContext = composeContext({
                state,
                template: removeLiquidityTemplate,
            });

            // Generate remove liquidity content
            const content = await generateObjectDeprecated({
                runtime,
                context: liquidityContext,
                modelClass: ModelClass.LARGE,
            });

            // Validate remove liquidity content
            if (!isRemoveLiquidityContent(runtime, content)) {
                elizaLogger.error("Invalid content for DRAGONSWAP_REMOVE_LIQUIDITY action.");
                if (callback) {
                    callback({
                        text: "Unable to process DragonSwap remove liquidity request. Please provide a valid token ID.",
                        content: { error: "Invalid DragonSwap remove liquidity content" },
                    });
                }
                return false;
            }
            
            elizaLogger.log("DragonSwap remove liquidity content:", content);
            
            // Convert tokenId to bigint
            const tokenId = BigInt(content.tokenId);
            
            // Convert liquidity to bigint if provided
            const liquidityAmount = content.liquidity ? BigInt(content.liquidity) : undefined;
            
            // Call the removeLiquidity function from sei-agent-kit
            const result = await seiAgentKit.removeDragonSwapLiquidity(tokenId, liquidityAmount);
            
            const liquidityDisplayText = liquidityAmount ? `${liquidityAmount.toString()} liquidity` : "all liquidity";
            elizaLogger.success(`Successfully removed ${liquidityDisplayText} from DragonSwap position with token ID ${tokenId}`);
            if (callback) {
                callback({
                    text: `Successfully removed ${liquidityDisplayText} from DragonSwap position with token ID ${tokenId}. Transaction hash: ${result}`,
                    content: { result }
                });
            }
            return true;
        } catch (error) {
            elizaLogger.error("Error removing liquidity from DragonSwap", error);
            if (callback) {
                callback({
                    text: `Error removing liquidity from DragonSwap: ${error instanceof Error ? error.message : String(error)}`,
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
                    text: "Remove all liquidity from my DragonSwap position with token ID 1234",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll remove liquidity from your DragonSwap position...",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully removed all liquidity from DragonSwap position with token ID 1234. Transaction hash: 0x123456789abcdef",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 