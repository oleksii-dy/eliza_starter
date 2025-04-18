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

export interface StakeContent extends Content {
    amount: string;
}

function isStakeContent(
    runtime: IAgentRuntime,
    content: any
): content is StakeContent {
    elizaLogger.log("Content for stake", content);
    return (
        typeof content.amount === "string"
    );
}

const stakeTemplate = `Respond with a JSON markdown block containing only the extracted values. Use 'null' for any values that cannot be determined.

Example response:
\`\`\`json
{
    "amount": "10"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about staking SEI tokens:
- Amount of SEI to stake (e.g. "10", "0.5", etc.)

Look for phrases like:
- "Stake [AMOUNT] SEI"
- "Bond [AMOUNT] SEI"
- "Stake [AMOUNT] tokens"
- "Bond [AMOUNT] tokens"

If the user mentions different amounts, focus on the most recently mentioned one.

Respond with a JSON markdown block containing only the extracted values.
If no relevant amount information is found in the conversation, respond with null for all values.`;

export const siloStakeAction: Action = {
    name: "SILO_STAKE",
    similes: ["STAKE", "BOND", "STAKE SEI", "BOND SEI", "SILO STAKE"],
    description: "Stake SEI tokens using the Silo protocol",
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
        elizaLogger.log("Starting Silo stake operation");
        
        const seiAgentKit = await getSeiAgentKit(runtime);

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            // Compose stake context
            const stakeContext = composeContext({
                state,
                template: stakeTemplate,
            });

            // Generate stake content
            const content = await generateObjectDeprecated({
                runtime,
                context: stakeContext,
                modelClass: ModelClass.LARGE,
            });

            // Validate stake content
            if (!isStakeContent(runtime, content)) {
                elizaLogger.error("Invalid content for SILO_STAKE action.");
                if (callback) {
                    callback({
                        text: "Unable to process stake request. Invalid content provided.",
                        content: { error: "Invalid stake content" },
                    });
                }
                return false;
            }
            
            elizaLogger.log("Stake content:", content);
            
            if (content.amount && content.amount !== "null") {
                elizaLogger.log("Using SeiAgentKit instance:", seiAgentKit ? "Available" : "Not available");
                
                try {
                    // Call the stakeSei function from sei-agent-kit with a string amount
                    elizaLogger.log(`Calling stakeSei with amount: ${content.amount}`);
                    const txHash = await seiAgentKit.stake(content.amount);
                    
                    elizaLogger.success(`Successfully staked ${content.amount} SEI tokens`);
                    if (callback) {
                        callback({
                            text: `I've successfully staked ${content.amount} SEI tokens for you. Transaction hash: ${txHash}`,
                        });
                    }
                    return true;
                } catch (stakeError) {
                    elizaLogger.error("Error in stakeSei function:", stakeError);
                    if (callback) {
                        callback({
                            text: `Error staking SEI tokens: ${stakeError instanceof Error ? stakeError.message : String(stakeError)}`,
                        });
                    }
                    return false;
                }
            } else {
                elizaLogger.error("No valid amount provided for staking");
                if (callback) {
                    callback({
                        text: "I couldn't determine how much SEI you want to stake. Please specify an amount.",
                    });
                }
                return false;
            }
        } catch (error) {
            elizaLogger.error("Error staking SEI tokens", error);
            if (callback) {
                callback({
                    text: `Error staking SEI tokens: ${error instanceof Error ? error.message : String(error)}`,
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
                    text: "Stake 10 SEI tokens using Silo",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you stake 10 SEI tokens using Silo...",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I've successfully staked 10 SEI tokens for you. Transaction hash: 0x123456789abcdef",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 