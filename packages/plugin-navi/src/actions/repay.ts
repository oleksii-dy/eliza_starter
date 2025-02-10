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

export interface RepayContent extends Content {
    token: string;
    amount: number;
}

function isRepayContent(content: Content): content is RepayContent {
    console.log("Content for Repay", content);
    return typeof content.address === "string";
}

const RepayTemplate = `Given the recent messages and wallet information below:

Example response:
\`\`\`json
{
    "token": "sui",
    "amount": 100
}
\`\`\`

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested Repay request:
- Token to check for.
- Amount to check for.

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.`;

export default {
    name: "REPAY",
    similes: ["REPAY"],
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        console.log("Validating Repay from user:", message.userId);
        return true;
    },
    description: "Repay Debt to NAVI",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback,
    ): Promise<boolean> => {
        elizaLogger.log("Starting Repay handler...");

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
        const RepaySchema = z.object({
            token: z.string(),
            amount: z.number(),
        });
        
        // Compose Repay context
        const RepayContext = composeContext({
            state: currentState,
            template: RepayTemplate,
        });

        // Generate Repay content with the schema
        const content = await generateObject({
            runtime,
            context: RepayContext,
            schema: RepaySchema,
            modelClass: ModelClass.SMALL,
        });

        const RepayContent = content.object as RepayContent;

        // Validate Repay content
        if (!isRepayContent(RepayContent)) {
            console.error("Invalid content for Repay action.");
            if (callback) {
                callback({
                    text: "Unable to process Repay request. Invalid content provided.",
                    content: { error: "Invalid Repay content" },
                });
            }
            return false;
        }

        try {
            const repay = walletInfo.repay(RepayContent.token, RepayContent.amount);
            console.log("Repay successful: ", repay);

            if (callback) {
                callback({
                    text: `Repay of ${walletInfo.address} result:\n${repay}`,
                    content: {
                        success: true,
                        token: RepayContent.token,
                        amount: RepayContent.amount,
                        repay: repay,
                    },
                });
            }

            return true;
        } catch (error) {
            console.error("Error during token Repay:", error);
            if (callback) {
                callback({
                    text: `Error Repay tokens: ${error.message}`,
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
                    text: "Repay {{amount}} {{token}} from NAVI",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you repay {{amount}} {{token}} from NAVI",
                    action: "REPAY",
                    content: {
                        address: "{{walletAddress}}",
                    },
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
