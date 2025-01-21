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
import getTransactionInfo from "../providers/checkTxHash";
const checkTxHashTemplate = `Please extract the following swap details for SUI network:

{
    "txHash": string  | null                // txHash is transaction block on sui network
}

Recent messages: {{recentMessages}}

Retrieve and return the transaction details using the given txHash. The response should be a JSON object with the specified field. If the txHash is unavailable or invalid, return null.

Example response:
{
    "txHash": "3JKomKRrX1cWeHiy4KHDcHMY66b2MyAdrMJqy2E5AV1D"
}
\`\`\`
VALIDATION RULES:
            All property names must use double quotes
            All string values must use double quotes
            null values should not use quotes
            No trailing commas allowed
            No single quotes anywhere in the JSON


`;



export const checkTxhashOnSui: Action = {
    name: "CHECK_TXHASH_SUI_NETWORK",
    similes: [
        "SUI_VERIFY_TXHASH",
        "SUI_GET_TRANSACTION_DETAILS",
        "SUI_LOOKUP_TXHASH",
        "SUI_FETCH_TXHASH_INFO",
        "SUI_QUERY_TRANSACTION",
        "SUI_CHECK_TX_STATUS",
        "SUI_INSPECT_TXHASH",
        "SUI_RETRIEVE_TXHASH_DATA",
        "SUI_ANALYZE_TRANSACTION",
        "SUI_SCAN_TXHASH"
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

        const checkTxHashContext = composeContext({
            state,
            template: checkTxHashTemplate,
        });

        const content = await generateObjectDeprecated({
            runtime,
            context: checkTxHashContext,
            modelClass: ModelClass.SMALL,
        });
        console.log("content:", content);

        const checkInfoTxHash = await getTransactionInfo(content.txHash);

        try {

            callback({
               text:`Your transaction status for txhash ${content.txHash} is ${checkInfoTxHash.effects.status.status}.`,
               action:"CHECK_TXHASH_SUI_NETWORK",
               result: {
                type: "info_txhash",
                data: checkInfoTxHash,

            }
            })
            return true;
        } catch (error) {
            callback({
                text:`Your transaction for txhash ${content.txHash} is not available.`,
                action:"CHECK_TXHASH_SUI_NETWORK",
             })
            console.error("Error during token swap:", error);
            return false;
        }
    },
    examples: [
        [
            {
                "user": "{{user1}}",
                "content": {
                    "txHash": "9XbGmKRrX2cYeHiY4LJDdHNY77c3MzBrMKpxz3F5BV2E"
                }
            },
            {
                "user": "{{user2}}",
                "content": {
                    "text": "Fetching transaction details for txHash: 9XbGmKRrX2cYeHiY4LJDdHNY77c3MzBrMKpxz3F5BV2E...",
                    "action": "SUI_CHECK_TXHASH",
                    "params": {
                        "txHash": "9XbGmKRrX2cYeHiY4LJDdHNY77c3MzBrMKpxz3F5BV2E"
                    }
                }
            }
        ],
        [
            {
                "user": "{{user1}}",
                "content": {
                    "txHash": "9XbGmKRrX2cYeHiY4LJDdHNY77c3MzBrMKpxz3F5BV2E"
                }
            },
            {
                "user": "{{user2}}",
                "content": {
                    "text": "check txhash 3LvEnUFK7qxTU4Wh3CwgUhJJowiuMAiyNhyMDpteAknC",
                    "action": "SUI_CHECK_TXHASH",
                    "params": {
                        "txHash": "3LvEnUFK7qxTU4Wh3CwgUhJJowiuMAiyNhyMDpteAknC"
                    }
                }
            }
        ]
    ] as ActionExample[][],
} as Action;
