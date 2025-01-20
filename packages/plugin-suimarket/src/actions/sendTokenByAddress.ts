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
const sendTokenTemplate = `Please extract the following swap details for SUI network:

{
    "amount": number | null,               // Amount of tokens to transfer
    "tokenAddress": string | null,         // Token address on the SUI network (e.g., "0xb6a9f896fd6c0f777699b9aa2b1bb745caa5eb1f3978173c1ddffd4bdd3994e9::uni::UNI")
    "destinationAddress": string | null    // Recipient's wallet address
}

Recent messages: {{recentMessages}}

Extract the token transfer parameters from the conversation and wallet context above. Return only a JSON object with the specified fields. Use null for any values that cannot be determined.

Example Response:
{
    "amount": 10.5,
    "tokenAddress": "0xb6a9f896fd6c0f777699b9aa2b1bb745caa5eb1f3978173c1ddffd4bdd3994e9::uni::UNI",
    "destinationAddress": "0xa3b1c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0"
}
\`\`\`
VALIDATION RULES:
            All property names must use double quotes
            All string values must use double quotes
            null values should not use quotes
            No trailing commas allowed
            No single quotes anywhere in the JSON


`;



export const sendTokenByAddress: Action = {
    name: "SUI_SEND_TOKEN_BY_ADDRESS",
    similes: [
        "SUI_TRANSFER_TOKENS_BY_ADDRESS",
        "SUI_TOKENS_SEND_BY_ADDRESS",
        "SUI_ASSET_SEND_BY_ADDRESS",
        "SUI_TOKENS_TRANSFER_BY_ADDRESS",
        "SUI_SEND_ASSETS_BY_ADDRESS",
        "SUI_TOKENS_TRANSFER_BY_ADDRESS",
        "SUI_ASSET_TRANSFER_BY_ADDRESS",
        "SUI_TOKENS_DISPATCH_BY_ADDRESS",
        "SUI_SEND_ASSETS_BY_ADDRESS",
        "SUI_TOKENS_SHIP_BY_ADDRESS",
        "SUI_TOKENS_DELIVER_BY_ADDRESS",
        "SUI_ASSET_SHIP_BY_ADDRESS",
        "SUI_TOKENS_SEND_OUT_BY_ADDRESS",
        "SUI_ASSET_DISPATCH_BY_ADDRESS",
        "SUI_ASSET_TRANSFER_OUT_BY_ADDRESS",
        "SUI_TOKENS_SEND_OUT_BY_ADDRESS",
        "SUI_ASSETS_DELIVER_BY_ADDRESS",
    ],
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

        const sendTokenContext = composeContext({
            state,
            template: sendTokenTemplate,
        });

        const content = await generateObjectDeprecated({
            runtime,
            context: sendTokenContext,
            modelClass: ModelClass.LARGE,
        });
        console.log("content:", content);

        let tokenObject;

        if(content.tokenAddress){
            tokenObject = await getInfoTokenOnSui(content.tokenAddress);
            if(tokenObject=== "ADDRESS_NOT_EXIST"){
                callback({
                        text:`We do not support ${content.tokenAddress} token in SUI network yet`,
                     })
                return false
            }
        }

        const responseData = {
            amount: content.amount,
            token_info:tokenObject,
            destinationAddress: content.destinationAddress
        }
        try {

            callback({
               text:`Send Tokens ${content.tokenAddress} ${tokenObject.symbol ? `\n Symbol: ${tokenObject.symbol}` : ""} \n To:   ${content.destinationAddress} \n Amount: ${content.amount} \n Please double-check all details before swapping to avoid any loss`,
               action:"SUI_SEND_TOKEN_BY_ADDRESS",
               result: {
                type: "send_sui_chain",
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
                    "amount": 10.5,
                    "tokenAddress": "0xb6a9f896fd6c0f777699b9aa2b1bb745caa5eb1f3978173c1ddffd4bdd3994e9::uni::UNI",
                    "destinationAddress": "0xa3b1c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Send 10 0xb6a9f896fd6c0f777699b9aa2b1bb745caa5eb1f3978173c1ddffd4bdd3994e9::uni::UNI to 0xa3b1c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0",
                    action: "SUI_EXECUTE_SWAP_BY_SYMBOL",
                    params: {
                        "amount": 10,
                        "tokenAddress": "0xb6a9f896fd6c0f777699b9aa2b1bb745caa5eb1f3978173c1ddffd4bdd3994e9::uni::UNI",
                        "destinationAddress": "0xa3b1c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0"
                    }
                }
            }
        ]
    ] as ActionExample[][],
} as Action;
