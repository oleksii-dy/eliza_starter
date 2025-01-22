import {
    ActionExample,
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    // settings,
    State,
    type Action,
} from "@elizaos/core";
import findByVerifiedAndSymbol from "../providers/searchCoinInAggre";
// import { RedisClient } from "@elizaos/adapter-redis";
const swapTemplate = `Please extract the following swap details for SUI network:

{
    "inputTokenSymbol": string | null,     // Token being sold (e.g. "SUI")
    "outputTokenSymbol": string | null,    // Token being bought
    "amount": number | 0,               // Amount to swap
}

Recent messages: {{recentMessages}}

Extract the swap parameters from the conversation and wallet context above. Return only a JSON object with the specified fields. Use null for any values that cannot be determined.

Ensure that all token symbols are converted to uppercase.

Example response:
{
    "inputTokenSymbol": "SUI",
    "outputTokenSymbol": "USDC",
    "amount": 1.5,
}
\`\`\`
VALIDATION RULES:
            All property names must use double quotes
            All string values must use double quotes
            null values should not use quotes
            No trailing commas allowed
            No single quotes anywhere in the JSON


`;



export const executeSwap: Action = {
    name: "SUI_EXECUTE_SWAP_BY_SYMBOL",
    similes: ["SUI_SWAP_TOKENS_BY_SYMBOL", "SUI_TOKEN_SWAP_BY_SYMBOL", "SUI_TRADE_TOKENS_BY_SYMBOL", "SUI_EXCHANGE_TOKENS_BY_SYMBOL"],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {

        return true;
    },
    description: "Perform a token swap.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("compose history...");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const swapContext = composeContext({
            state,
            template: swapTemplate,
        });
        elizaLogger.log("compose history...done!");

        elizaLogger.log("extract content ...");
        const content = await generateObjectDeprecated({
            runtime,
            context: swapContext,
            modelClass: ModelClass.SMALL,
        });
        elizaLogger.log("extract content ...done -> ", content);
        await callback({
            text:`Please double-check all details before swapping to avoid any loss`,
            action:"SUI_EXECUTE_SWAP_BY_SYMBOL",
           
         })
        const inputTokenObject = await findByVerifiedAndSymbol(content.inputTokenSymbol);
        if(!inputTokenObject){
            callback({
                text:`We do not support ${content.inputTokenSymbol} token in SUI network yet, We only support swapping token symbol to token symbol or token address to token address.`,
             })
             return false
        }
        const outputTokenObject = await findByVerifiedAndSymbol(content.outputTokenSymbol);
        if(!outputTokenObject){
            callback({
                text:`We do not support ${content.outputTokenSymbol} token in SUI network yet, We only support swapping token symbol to token symbol or token address to token address. `,
             })
             return false
        }

        const responseData = {
            amount: content.amount,
            fromToken: inputTokenObject,
            toToken:outputTokenObject

        }
        try {
            await callback({
               text:`Please double-check all details before swapping to avoid any loss`,
               action:"SUI_EXECUTE_SWAP_BY_SYMBOL",
               result: {
                type: "swap",
                data:responseData,

            }
            })

            return true;
        } catch (error) {
            console.error("Error during token swap:", error);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    inputTokenSymbol: "SUI",
                    outputTokenSymbol: "USDT",
                    amount: 10,
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Initiating swap of 10 SUI for USDT on SUI network...",
                    action: "SUI_EXECUTE_SWAP_BY_SYMBOL",
                    params: {
                        inputTokenSymbol: "SUI",
                        outputTokenSymbol: "USDT",
                        amount: "10"
                    }
                }
            }
        ],
        [
            {
                "user": "{{user1}}",
                "content": {
                    "inputTokenSymbol": "CETUS",
                    "outputTokenSymbol": "DEEP",
                    "amount": 0
                }
            },
            {
                "user": "{{user2}}",
                "content": {
                    "text": "Initiating swap CeTUS for deep on SUI network...",
                    "action": "SUI_EXECUTE_SWAP_BY_SYMBOL",
                    "params": {
                        "inputTokenSymbol": "CeTUS",
                        "outputTokenSymbol": "deep",
                        "amount": "0"
                    }
                }
            }
            ]
    ] as ActionExample[][],
} as Action;
