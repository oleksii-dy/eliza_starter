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

export interface WithdrawContent extends Content {
    token: string;
    amount: number;
}

function isWithdrawContent(content: Content): content is WithdrawContent {
    console.log("Content for Withdraw", content);
    return typeof content.address === "string";
}

const WithdrawTemplate = `Given the recent messages and wallet information below:

Example response:
\`\`\`json
{
    "token": "sui",
    "amount": 100
}
\`\`\`

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested Withdraw request:
- Token to check for.
- Amount to check for.

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.`;

export default {
    name: "WITHDRAW",
    similes: ["WITHDRAW"],
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        console.log("Validating Withdraw from user:", message.userId);
        return true;
    },
    description: "Withdraw Token From NAVI",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback,
    ): Promise<boolean> => {
        elizaLogger.log("Starting Withdraw handler...");

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
        const WithdrawSchema = z.object({
            token: z.string(),
            amount: z.number(),
        });
        
        // Compose Withdraw context
        const WithdrawContext = composeContext({
            state: currentState,
            template: WithdrawTemplate,
        });

        // Generate Withdraw content with the schema
        const content = await generateObject({
            runtime,
            context: WithdrawContext,
            schema: WithdrawSchema,
            modelClass: ModelClass.SMALL,
        });

        const WithdrawContent = content.object as WithdrawContent;

        // Validate Withdraw content
        if (!isWithdrawContent(WithdrawContent)) {
            console.error("Invalid content for Withdraw action.");
            if (callback) {
                callback({
                    text: "Unable to process Withdraw request. Invalid content provided.",
                    content: { error: "Invalid Withdraw content" },
                });
            }
            return false;
        }

        try {
            const withdraw = walletInfo.withdraw(WithdrawContent.token, WithdrawContent.amount);
            console.log("Withdraw successful: ", withdraw);

            if (callback) {
                callback({
                    text: `Withdraw of ${walletInfo.address} result:\n${withdraw}`,
                    content: {
                        success: true,
                        token: WithdrawContent.token,
                        amount: WithdrawContent.amount,
                        withdraw: withdraw,
                    },
                });
            }

            return true;
        } catch (error) {
            console.error("Error during token Withdraw:", error);
            if (callback) {
                callback({
                    text: `Error Withdraw tokens: ${error.message}`,
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
                    text: "Withdraw {{amount}} {{token}} from NAVI",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you withdraw {{amount}} {{token}} from NAVI",
                    action: "WITHDRAW",
                    content: {
                        address: "{{walletAddress}}",
                    },
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
