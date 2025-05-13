import { elizaLogger } from "@elizaos/core";
import {
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    Action,
} from "@elizaos/core";

import { composeContext } from "@elizaos/core";
import { generateObjectDeprecated } from "@elizaos/core";
import { getSeiAgentKit } from "../../client";
import { validateSeiConfig } from "../../environment";

export interface UnstakeContent extends Content {
    amount: string;
}

function isUnstakeContent(
    runtime: IAgentRuntime,
    content: any
): content is UnstakeContent {
    elizaLogger.log("Content for unstake", content);
    return (
        typeof content.amount === "string"
    );
}

const unstakeTemplate = `Respond with a JSON markdown block containing only the extracted values. Use 'null' for any values that cannot be determined.

Example response:
\`\`\`json
{
    "amount": "10"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about unstaking SEI tokens:
- Amount of SEI to unstake (e.g. "10", "0.5", etc.)

Look for phrases like:
- "Unstake [AMOUNT] SEI"
- "Unbond [AMOUNT] SEI"
- "Withdraw [AMOUNT] SEI"
- "Unstake [AMOUNT] tokens"
- "Unbond [AMOUNT] tokens"
- "Withdraw [AMOUNT] tokens"

If the user mentions different amounts, focus on the most recently mentioned one.

Respond with a JSON markdown block containing only the extracted values.
If no relevant amount information is found in the conversation, respond with null for all values.`;

export const siloUnstakeAction: Action = {
    name: "SILO_UNSTAKE",
    similes: ["UNSTAKE", "UNBOND", "WITHDRAW", "UNSTAKE SEI", "UNBOND SEI", "SILO UNSTAKE"],
    description: "Unstake SEI tokens from the Silo protocol",
    validate: async (runtime: IAgentRuntime): Promise<boolean> => {
        await validateSeiConfig(runtime);
        return true;
    },
    handler: async (
        runtime: IAgentRuntime, 
        message: Memory, 
        state: State,
        options: Record<string, unknown>, 
        callback: HandlerCallback): Promise<boolean> => {
        elizaLogger.log("Starting Silo unstake operation");
        
        const seiAgentKit = await getSeiAgentKit(runtime);

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            // Compose unstake context
            const unstakeContext = composeContext({
                state,
                template: unstakeTemplate,
            });

            // Generate unstake content
            const content = await generateObjectDeprecated({
                runtime,
                context: unstakeContext,
                modelClass: ModelClass.LARGE,
            });

            // Validate unstake content
            if (!isUnstakeContent(runtime, content)) {
                elizaLogger.error("Invalid content for SILO_UNSTAKE action.");
                if (callback) {
                    callback({
                        text: "Unable to process unstake request. Invalid content provided.",
                        content: { error: "Invalid unstake content" },
                    });
                }
                return false;
            }
            
            elizaLogger.log("Unstake content:", content);
            
            if (content.amount && content.amount !== "null") {
                // Call the unstakeSei function from sei-agent-kit with a string amount
                const txHash = await seiAgentKit.unstake(content.amount);
                
                // For display purposes, convert to number
                const amountNum = parseFloat(content.amount);
                
                elizaLogger.success(`Successfully unstaked ${amountNum} SEI tokens`);
                if (callback) {
                    callback({
                        text: `I've successfully unstaked ${amountNum} SEI tokens for you. Transaction hash: ${txHash}`,
                    });
                }
                return true;
            } else {
                elizaLogger.error("No valid amount provided for unstaking");
                if (callback) {
                    callback({
                        text: "I couldn't determine how much SEI you want to unstake. Please specify an amount.",
                    });
                }
                return false;
            }
        } catch (error) {
            elizaLogger.error("Error unstaking SEI tokens", error);
            if (callback) {
                callback({
                    text: `Error unstaking SEI tokens: ${error instanceof Error ? error.message : String(error)}`,
                });
            }
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user}}",
                content: {
                    text: "Unstake 10 SEI tokens from Silo",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you unstake 10 SEI tokens from Silo...",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I've successfully unstaked 10 SEI tokens for you. Transaction hash: 0x123456789abcdef",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 