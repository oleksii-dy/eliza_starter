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

export interface SupplyContent extends Content {
    token: string;
    amount: number;
}

function isSupplyContent(content: Content): content is SupplyContent {
    console.log("Content for Supply", content);
    return typeof content.address === "string";
}

const SupplyTemplate = `Given the recent messages and wallet information below:

Example response:
\`\`\`json
{
    "token": "sui",
    "amount": 100
}
\`\`\`

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested Supply request:
- Token to check for.
- Amount to check for.

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.`;

export default {
    name: "SUPPLY",
    similes: ["SUPPLY"],
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        console.log("Validating Supply from user:", message.userId);
        return true;
    },
    description: "Supply Token to NAVI",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback,
    ): Promise<boolean> => {
        elizaLogger.log("Starting Supply handler...");

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
        const SupplySchema = z.object({
            token: z.string(),
            amount: z.number(),
        });
        
        // Compose Supply context
        const SupplyContext = composeContext({
            state: currentState,
            template: SupplyTemplate,
        });

        // Generate Supply content with the schema
        const content = await generateObject({
            runtime,
            context: SupplyContext,
            schema: SupplySchema,
            modelClass: ModelClass.SMALL,
        });

        const SupplyContent = content.object as SupplyContent;

        // Validate Supply content
        if (!isSupplyContent(SupplyContent)) {
            console.error("Invalid content for Supply action.");
            if (callback) {
                callback({
                    text: "Unable to process Supply request. Invalid content provided.",
                    content: { error: "Invalid Supply content" },
                });
            }
            return false;
        }

        try {
            const supply = walletInfo.depositToNavi(SupplyContent.token, SupplyContent.amount);
            console.log("Supply successful: ", supply);

            if (callback) {
                callback({
                    text: `Supply of ${walletInfo.address} result:\n${supply}`,
                    content: {
                        success: true,
                        token: SupplyContent.token,
                        amount: SupplyContent.amount,
                        supply: supply,
                    },
                });
            }

            return true;
        } catch (error) {
            console.error("Error during token Supply:", error);
            if (callback) {
                callback({
                    text: `Error Supply tokens: ${error.message}`,
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
                    text: "Support {{amount}} {{token}} to NAVI",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you supply {{amount}} {{token}} to NAVI",
                    action: "SUPPLY",
                    content: {
                        address: "{{walletAddress}}",
                    },
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
