import {
    type ActionExample,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    composeContext,
    elizaLogger,
    generateObject,
    type Action,
} from "@elizaos/core";
import { z } from "zod";
import { walletProvider } from "../providers/wallet";

export interface BorrowContent extends Content {
    token: string;
    amount: number;
}

function isBorrowContent(content: Content): content is BorrowContent {
    console.log("Content for Borrow", content);
    return typeof content.address === "string";
}

const BorrowTemplate = `Given the recent messages and wallet information below:

Example response:
\`\`\`json
{
    "token": "sui",
    "amount": 100
}
\`\`\`

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested Borrow request:
- Token to check for.
- Amount to check for.

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.`;

export default {
    name: "BORROW",
    similes: ["BORROW"],
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        console.log("Validating Borrow from user:", message.userId);
        return true;
    },
    description: "Borrow Token from NAVI",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback,
    ): Promise<boolean> => {
        elizaLogger.log("Starting Borrow handler...");

        const walletInfo = await walletProvider.get(runtime, message, state);
        state.walletInfo = walletInfo;

        // Initialize or update state
        let currentState: State;
        if (!state) {
            currentState = (await runtime.composeState(message)) as State;
        } else {
            currentState = await runtime.updateRecentMessageState(state);
        }
        
        // Define the schema for the expected output
        const BorrowSchema = z.object({
            token: z.string(),
            amount: z.number(),
        });
        
        // Compose Borrow context
        const BorrowContext = composeContext({
            state: currentState,
            template: BorrowTemplate,
        });

        // Generate Borrow content with the schema
        const content = await generateObject({
            runtime,
            context: BorrowContext,
            schema: BorrowSchema,
            modelClass: ModelClass.SMALL,
        });

        const BorrowContent = content.object as BorrowContent;

        // Validate Borrow content
        if (!isBorrowContent(BorrowContent)) {
            console.error("Invalid content for Borrow action.");
            if (callback) {
                callback({
                    text: "Unable to process Borrow request. Invalid content provided.",
                    content: { error: "Invalid Borrow content" },
                });
            }
            return false;
        }

        try {
            const borrow = walletInfo.borrow(BorrowContent.token, BorrowContent.amount);
            console.log("Borrow successful: ", borrow);

            if (callback) {
                callback({
                    text: `Borrow of ${walletInfo.address} result:\n${borrow}`,
                    content: {
                        success: true,
                        token: BorrowContent.token,
                        amount: BorrowContent.amount,
                        borrow: borrow,
                    },
                });
            }

            return true;
        } catch (error) {
            console.error("Error during token Borrow:", error);
            if (callback) {
                callback({
                    text: `Error Borrow tokens: ${error.message}`,
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
                    text: "Borrow {{amount}} {{token}} from NAVI",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you borrow {{amount}} {{token}} from NAVI",
                    action: "BORROW",
                    content: {
                        address: "{{walletAddress}}",
                    },
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
