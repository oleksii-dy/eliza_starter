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
import { Address } from "viem";

import { composeContext } from "@elizaos/core";
import { generateObjectDeprecated } from "@elizaos/core";
import { getSeiAgentKit } from "../../client";
import { validateSeiConfig } from "../../environment";

export interface AddLiquidityContent extends Content {
    token0: string;
    token1: string;
    amount0: string;
    amount1: string;
    fee: number;
    tickLower: number;
    tickUpper: number;
}

function isAddLiquidityContent(
    runtime: IAgentRuntime,
    content: any
): content is AddLiquidityContent {
    elizaLogger.log("Content for DragonSwap add liquidity", content);
    return (
        typeof content.token0 === "string" && 
        content.token0.trim() !== "" &&
        content.token0 !== "null" &&
        typeof content.token1 === "string" && 
        content.token1.trim() !== "" &&
        content.token1 !== "null" &&
        typeof content.amount0 === "string" && 
        content.amount0.trim() !== "" &&
        content.amount0 !== "null" &&
        typeof content.amount1 === "string" && 
        content.amount1.trim() !== "" &&
        content.amount1 !== "null" &&
        typeof content.fee === "number" &&
        typeof content.tickLower === "number" &&
        typeof content.tickUpper === "number"
    );
}

const addLiquidityTemplate = `Respond with a JSON markdown block containing only the extracted values. Use 'null' for any values that cannot be determined.

Example response:
\`\`\`json
{
    "token0": "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
    "token1": "0x0",
    "amount0": "10",
    "amount1": "5",
    "fee": 3000,
    "tickLower": -887220,
    "tickUpper": 887220
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about adding liquidity to DragonSwap:
- The first token address (token0)
- The second token address (token1)
- The amount of the first token to add (amount0)
- The amount of the second token to add (amount1)
- The fee tier (fee) - usually 500 for 0.05%, 3000 for 0.3%, or 10000 for 1%
- The lower tick of the position (tickLower)
- The upper tick of the position (tickUpper)

Look for phrases like:
- "Add liquidity with [AMOUNT0] of [TOKEN0] and [AMOUNT1] of [TOKEN1]"
- "Provide liquidity to DragonSwap with [AMOUNT0] [TOKEN0] and [AMOUNT1] [TOKEN1]"

If any specific values are not provided, use these defaults:
- fee: 3000 (0.3%)
- tickLower: -887220
- tickUpper: 887220

If the user mentions multiple token addresses or amounts, focus on the most recently mentioned ones.

Respond with a JSON markdown block containing only the extracted values.
If no relevant DragonSwap liquidity addition information is found in the conversation, respond with null for all values.`;

export const addDragonSwapLiquidityAction: Action = {
    name: "DRAGONSWAP_ADD_LIQUIDITY",
    similes: ["ADD LIQUIDITY", "PROVIDE LIQUIDITY", "ADD DRAGONSWAP LIQUIDITY"],
    description: "Add liquidity to a DragonSwap pool",
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
        elizaLogger.log("Starting DragonSwap add liquidity operation");
        
        const seiAgentKit = await getSeiAgentKit(runtime);

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            // Compose add liquidity context
            const liquidityContext = composeContext({
                state,
                template: addLiquidityTemplate,
            });

            // Generate add liquidity content
            const content = await generateObjectDeprecated({
                runtime,
                context: liquidityContext,
                modelClass: ModelClass.LARGE,
            });

            // Validate add liquidity content
            if (!isAddLiquidityContent(runtime, content)) {
                elizaLogger.error("Invalid content for DRAGONSWAP_ADD_LIQUIDITY action.");
                if (callback) {
                    callback({
                        text: "Unable to process DragonSwap add liquidity request. Please provide valid token addresses and amounts.",
                        content: { error: "Invalid DragonSwap add liquidity content" },
                    });
                }
                return false;
            }
            
            elizaLogger.log("DragonSwap add liquidity content:", content);
            
            // Call the addLiquidity function from sei-agent-kit
            const result = await seiAgentKit.addDragonSwapLiquidity(
                content.token0 as Address,
                content.token1 as Address,
                content.amount0,
                content.amount1,
                content.fee,
                content.tickLower,
                content.tickUpper
            );
            
            elizaLogger.success(`Successfully added liquidity to DragonSwap with ${content.amount0} of ${content.token0} and ${content.amount1} of ${content.token1}`);
            if (callback) {
                callback({
                    text: `Successfully added liquidity to DragonSwap with ${content.amount0} of ${content.token0} and ${content.amount1} of ${content.token1}. Transaction hash: ${result}`,
                    content: { result }
                });
            }
            return true;
        } catch (error) {
            elizaLogger.error("Error adding liquidity to DragonSwap", error);
            if (callback) {
                callback({
                    text: `Error adding liquidity to DragonSwap: ${error instanceof Error ? error.message : String(error)}`,
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
                    text: "Add liquidity to DragonSwap with 10 SEI and 5 USDC",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll add liquidity to DragonSwap with 10 SEI and 5 USDC...",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully added liquidity to DragonSwap with 10 of 0x0 (SEI) and 5 of 0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1 (USDC). Transaction hash: 0x123456789abcdef",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 