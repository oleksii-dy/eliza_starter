import {
    ActionExample,
    composeContext,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    // settings,
    State,
    type Action,
} from "@elizaos/core";
import getInfoTokenOnSui from "../providers/coinMetaDataSui";
import { getImageOnSuiScan } from "../providers/getImageOnSuiScan";
const swapTemplate = `Please extract the following swap details for SUI network:

{
    "inputTokenAddress": string | null,     // Token being sold (e.g. "0xb6a9f896fd6c0f777699b9aa2b1bb745caa5eb1f3978173c1ddffd4bdd3994e9::uni::UNI")
    "outputTokenAddress": string | null,    // Token being bought
    "amount": number | 0,               // Amount to swap
}

Recent messages: {{recentMessages}}

Extract the swap parameters from the conversation and wallet context above. Return only a JSON object with the specified fields. Use null for any values that cannot be determined.

Example response:
{
    "inputTokenAddress": "0xb6a9f896fd6c0f777699b9aa2b1bb745caa5eb1f3978173c1ddffd4bdd3994e9::uni::UNI",
    "outputTokenAddress": "0xb6a9f896fd6c0f777699b9aa2b1bb745caa5eb1f3978173c1ddffd4bdd3994e9::suicy::SUICY",
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



export const executeSwapByAddress: Action = {
    name: "SUI_EXECUTE_SWAP_BY_ADDRESS",
    similes: ["SUI_SWAP_TOKENS_BY_ADDRESS", "SUI_TOKEN_SWAP_BY_ADDRESS", "SUI_TRADE_TOKENS_BY_ADDRESS", "SUI_EXCHANGE_TOKENS_BY_ADDRESS"],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        // Check if the necessary parameters are provided in the message
        // console.log("Message:", message);
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
        // composeState
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const swapContext = composeContext({
            state,
            template: swapTemplate,
        });

        const content = await generateObjectDeprecated({
            runtime,
            context: swapContext,
            modelClass: ModelClass.LARGE,
        });
        console.log("content:", content);
        const inputTokenObject = await getInfoTokenOnSui(content.inputTokenAddress);

        if(inputTokenObject=== "ADDRESS_NOT_EXIST"){
            callback({
                text:`We do not support ${content.inputTokenAddress} token in SUI network yet, We only support swapping token symbol to token symbol or token address to token address.`,
             })
             return false
        }
        const outputTokenObject = await getInfoTokenOnSui(content.outputTokenAddress);
        if(outputTokenObject ==="ADDRESS_NOT_EXIST"){
            callback({
                text:`We do not support ${content.outputTokenAddress} token in SUI network yet, We only support swapping token symbol to token symbol or token address to token address.`,
             })
             return false
        }

        const responseData = {
            amount: content.amount,
            fromToken: {...inputTokenObject,
                type: content.inputTokenAddress,
                imgUrl: await getImageOnSuiScan(content.inputTokenAddress)
            },
            toToken:{...outputTokenObject,
                type:content.outputTokenAddress,
                imgUrl: await getImageOnSuiScan(content.outputTokenAddress)
            }

        }

        try {

            callback({
               text:`Please double-check all details before swapping to avoid any loss`,
               action:"SUI_EXECUTE_SWAP_BY_ADDRESS",
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
                    slippageBps: 50
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Initiating swap of 10 SUI for USDT on SUI network...",
                    action: "SUI_EXECUTE_SWAP_BY_SYMBOL",
                    params: {
                        inputType: "0x2::sui::SUI",
                        outputType: "0x4fb3c0f9e62b5d3956e2f0e284f2a5d128954750b109203a0f34c92c6ba21247::coin::USDT",
                        amount: "10000000000", // Amount in base units
                        slippageBps: 50
                    }
                }
            }
        ]
    ] as ActionExample[][],
} as Action;
