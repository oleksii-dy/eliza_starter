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
import axios from "axios";
const swapTemplate = `Please extract the following swap details for SUI network:

{
    "inputTokenSymbol": string | null,     // Token being sold (e.g. "SUI")
    "outputTokenSymbol": string | null,    // Token being bought
    "amount": number | null,               // Amount to swap
}

Recent messages: {{recentMessages}}
Wallet info: {{walletInfo}}

Extract the swap parameters from the conversation and wallet context above. Return only a JSON object with the specified fields. Use null for any values that cannot be determined.

Example response:
{
    "inputTokenSymbol": "SUI",
    "outputTokenSymbol": "USDC",
    "amount": 1.5,
}
\`\`\``;



export const executeSwap: Action = {
    name: "SUI_EXECUTE_SWAP",
    similes: ["SUI_SWAP_TOKENS", "SUI_TOKEN_SWAP", "SUI_TRADE_TOKENS", "SUI_EXCHANGE_TOKENS"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Check if the necessary parameters are provided in the message
        console.log("Message:", message);
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
        const responseCoinInfo = await axios.create({
            baseURL: "https://aggregator.rockee.ai",
            timeout: 5000,
          }).get("/coins_info")

        if(!Array.isArray(responseCoinInfo.data) || !responseCoinInfo.data.find((item: { symbol: string }) => item.symbol === content.inputTokenSymbol)){
            callback({
                text:`Token ${content.inputTokenSymbol} not exist`,
             })

            return true;
        }
        console.log(1)
        if(!Array.isArray(responseCoinInfo.data) || !responseCoinInfo.data.find((item: { symbol: string }) => item.symbol === content.outputTokenSymbol)){
            callback({
                text:`Token ${content.outputTokenSymbol} not exist`,
             })
            return true;
        }
        console.log(2)
        const responseData = {
            ...content,
            inputTokenAddress:responseCoinInfo.data.find((item: { symbol: string; type: string }) => item.symbol === content.inputTokenSymbol).type,
            outputTokenAddress:responseCoinInfo.data.find((item: { symbol: string; type: string }) => item.symbol === content.outputTokenSymbol).type,
        }
        try {

            callback({
               text:"Pls swap",
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
                    action: "SUI_TOKEN_SWAP",
                    params: {
                        inputType: "0x2::sui::SUI",
                        outputType: "0x4fb3c0f9e62b5d3956e2f0e284f2a5d128954750b109203a0f34c92c6ba21247::coin::USDT",
                        amount: "10000000000", // Amount in base units
                        slippageBps: 50
                    }
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Swap executed successfully! Transaction digest: {{txDigest}}",
                    transactionDetails: {
                        digest: "8k2x9NM4pB6MiUx9YH1zKwP9K7Z8YfFvH1J5QrLZDvs2",
                        status: "success",
                        gasFee: "0.00234 SUI"
                    }
                }
            }
        ]
    ] as ActionExample[][],
} as Action;
