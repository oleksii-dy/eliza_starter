import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
    elizaLogger,
    generateObject,
    ModelClass,
    composeContext,
    Content,
} from "@elizaos/core";
import { z } from "zod";

const TransferSchema = z.object({
    tokenAddress: z.string(),
    recipient: z.string(),
    amount: z.string(),
});

export interface TransferContent extends Content {
    tokenAddress: string;
    recipient: string;
    amount: string | number;
}

const transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Here are several frequently used addresses. Use these for the corresponding tokens:
- ETH/eth: 0x000000000000000000000000000000000000800A
- USDC/usdc: 0xe4c7fbb0a626ed208021ccaba6be1566905e2dfc

Example response:
\`\`\`json
{
    "tokenAddress": "0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E",
    "recipient": "0xCCa8009f5e09F8C5dB63cb0031052F9CB635Af62",
    "amount": "1000"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- Token contract address
- Recipient wallet address
- Amount to transfer

Respond with a JSON markdown block containing only the extracted values.`;

export default {
    name: "TRANSFER_RUNE",
    similes: [
        "TRANSFER_RUNE__ON_BITCOIN",
        "TRANSFER_RUNES_ON_BITCOIN",
        "SEND_RUNE_ON_BITCOIN",
        "MOVE_RUNES_ON_BITCOIN",
        "MOVE_RUNE_ON_BITCOIN",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.info(`Validate => ${JSON.stringify(message)}`);
        return true;
    },
    description: "Transfer runes from the agent's wallet to another address",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.info("Starting Ordinals test handler...");
        // // Initialize or update state
        // if (!state) {
        //     state = (await runtime.composeState(message)) as State;
        // } else {
        //     state = await runtime.updateRecentMessageState(state);
        // }

        try {
            elizaLogger.success("Test completed successfully!");
            if (callback) {
                callback({
                    text: "Test completed successfully!",
                    content: {},
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
                    text: "Send 100 GIZMO•IMAGINARY•KITTEN to bc1p7sqrqnu55k4xedm5585vg8du3jueldvkps8nc96sqv353punzdhq4yg0ke",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Sure, I'll send 100 GIZMO•IMAGINARY•KITTEN to that address now.",
                    action: "TRANSFER_RUNE",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully sent 100 GIZMO•IMAGINARY•KITTEN to bc1p7sqrqnu55k4xedm5585vg8du3jueldvkps8nc96sqv353punzdhq4yg0ke\nTransaction: a7003934654bf20fa06d90e13e9002c7087e7d0fff15a7feb26ab98d7cbcc304",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Please send 0.1 GIZMO•IMAGINARY•KITTEN to bc1p7sqrqnu55k4xedm5585vg8du3jueldvkps8nc96sqv353punzdhq4yg0ke",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Of course. Sending 0.1 GIZMO•IMAGINARY•KITTEN to that address now.",
                    action: "SEND_RUNE",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully sent 0.1 GIZMO•IMAGINARY•KITTEN to bc1p7sqrqnu55k4xedm5585vg8du3jueldvkps8nc96sqv353punzdhq4yg0ke\nTransaction: a7003934654bf20fa06d90e13e9002c7087e7d0fff15a7feb26ab98d7cbcc304",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
