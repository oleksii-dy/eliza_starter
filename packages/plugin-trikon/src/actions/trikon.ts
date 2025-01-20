// import type { Action } from "@elizaos/core";

// export const trikonAction: Action = {
//     name: "Trikon",
//     description: "A Trikon action for Trikon plugin",
//     execute: async (context) => {
//         // Implementation here
//         return {
//             success: true,
//             message: "Trikon action executed successfully"
//         };
//     }
// };

// export default trikonAction;
import { elizaLogger } from "@elizaos/core";
import {
    type ActionExample,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    type Action,
} from "@elizaos/core";
import { composeContext } from "@elizaos/core";
import { generateObjectDeprecated } from "@elizaos/core";

export interface TransferContent extends Content {
    recipient: string;
    amount: string | number;
}

function isTransferContent(content: any): content is TransferContent {
    elizaLogger.log("Content for transfer", content);
    return (
        typeof content.recipient === "string" &&
        (typeof content.amount === "string" ||
            typeof content.amount === "number")
    );
}

const transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "recipient": "0x2badda48c062e861ef17a96a806c451fd296a49f45b272dee17f85b0e32663fd",
    "amount": "1000"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- Recipient wallet address
- Amount to transfer

Respond with a JSON markdown block containing only the extracted values.`;

export default {
    name: "SEND_TOKEN",
    similes: [
        "TRANSFER_TOKEN",
        "TRANSFER_TOKENS",
        "SEND_TOKENS",
        "SEND_TRK",
        "PAY",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.log("Validating trikon transfer from user:", message.userId);
        return false;
    },
    description: "Transfer tokens from the agent's wallet to another address",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting SEND_TOKEN handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose transfer context
        const transferContext = composeContext({
            state,
            template: transferTemplate,
        });

        // Generate transfer content
        const content = await generateObjectDeprecated({
            runtime,
            context: transferContext,
            modelClass: ModelClass.SMALL,
        });

        // Validate transfer content
        if (!isTransferContent(content)) {
            elizaLogger.error("Invalid content for TRANSFER_TOKEN action.");
            if (callback) {
                callback({
                    text: "Unable to process transfer request. Invalid content provided.",
                    content: { error: "Invalid transfer content" },
                });
            }
            return false;
        }

        try {
            // TODO: Implement Trikon-specific transfer logic here
            elizaLogger.log(
                `Would transfer ${content.amount} tokens to ${content.recipient}`
            );

            if (callback) {
                callback({
                    text: `Transfer simulation successful for ${content.amount} TRK to ${content.recipient}`,
                    content: {
                        success: true,
                        amount: content.amount,
                        recipient: content.recipient,
                    },
                });
            }

            return true;
        } catch (error) {
            elizaLogger.error("Error during token transfer:", error);
            if (callback) {
                callback({
                    text: `Error transferring tokens: ${error.message}`,
                    content: { error: error.message },
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
                    text: "Send 100 TRK tokens to 0xa385EEeFB533703dc4c811CB6Eb44cac2C14af07",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll send 100 TRK tokens now...",
                    action: "SEND_TOKEN",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully sent 100 TRK tokens to 0xa385EEeFB533703dc4c811CB6Eb44cac2C14af07",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;