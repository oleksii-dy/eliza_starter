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

export interface BalanceContent extends Content {
    address: string;
    token: string | null;
}

function isBalanceContent(content: Content): content is BalanceContent {
    console.log("Content for Balance", content);
    return typeof content.address === "string";
}

const BalanceTemplate = `Given the recent messages and wallet information below:

Example response:
\`\`\`json
{
    "address": "0xfae4887073d5fa0756910fed76d039d718ab2541f82fe0155a6c2193156f5a3d",
}
\`\`\`

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested Balance request:
- Address to check balance for.

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.`;

export default {
    name: "BALANCE",
    similes: ["BALANCE", "GET_BALANCE", "CHECK_BALANCE"],
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        console.log("Validating sui Balance from user:", message.userId);
        return true;
    },
    description: "Balance Token of NAVI",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback,
    ): Promise<boolean> => {
        elizaLogger.log("Starting Balance handler...");

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
        const BalanceSchema = z.object({
            address: z.string(),
            token: z.union([z.string(), z.null()]),
        });
        
        // Compose Balance context
        const BalanceContext = composeContext({
            state: currentState,
            template: BalanceTemplate,
        });

        // Generate Balance content with the schema
        const content = await generateObject({
            runtime,
            context: BalanceContext,
            schema: BalanceSchema,
            modelClass: ModelClass.SMALL,
        });

        const BalanceContent = content.object as BalanceContent;

        // Validate Balance content
        if (!isBalanceContent(BalanceContent)) {
            console.error("Invalid content for Balance action.");
            if (callback) {
                callback({
                    text: "Unable to process Balance request. Invalid content provided.",
                    content: { error: "Invalid Balance content" },
                });
            }
            return false;
        }

        try {
            const balances = walletInfo.getAllBalances();
            let balance: string;
            if (BalanceContent.token) {
                balance = walletInfo.formatBalanceWithKey(BalanceContent.token, balances.get(BalanceContent.token) ?? 0);
            } else {
                balance = walletInfo.formatBalance(balances);
            }
            console.log("Balance successful: ", balance);

            if (callback) {
                callback({
                    text: `Balance of ${BalanceContent.address} result:\n${balance}`,
                    content: {
                        success: true,
                        address: BalanceContent.address,
                        balance: balance,
                    },
                });
            }

            return true;
        } catch (error) {
            console.error("Error during token Balance:", error);
            if (callback) {
                callback({
                    text: `Error Balance tokens: ${error.message}`,
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
                    text: "Check my balance of sui blockchain",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you check your balance of sui blockchain",
                    action: "GET_BALANCE",
                    content: {
                        address: "{{walletAddress}}",
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Check my balance of token 0x2::sui::SUI",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you check your balance of token 0x2::sui::SUI",
                    action: "GET_BALANCE",
                    content: {
                        address: "{{walletAddress}}",
                        token: "0x2::sui::SUI",
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Get sui balance of 0xfae4887073d5fa0756910fed76d039d718ab2541f82fe0155a6c2193156f5a3d",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you check sui balance of 0xfae4887073d5fa0756910fed76d039d718ab2541f82fe0155a6c2193156f5a3d",
                    action: "GET_BALANCE",
                    content: {
                        address: "0xfae4887073d5fa0756910fed76d039d718ab2541f82fe0155a6c2193156f5a3d",
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Check my wallet balance on sui blockchain",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you check your wallet balance on sui blockchain",
                    action: "GET_BALANCE",
                    content: {
                        address: "{{walletAddress}}",
                    },
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
