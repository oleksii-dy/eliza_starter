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
import { Address } from "viem";

import { composeContext } from "@elizaos/core";
import { generateObjectDeprecated } from "@elizaos/core";
import { getSeiAgentKit } from "../../client";
import { validateSeiConfig } from "../../environment";

export interface RepayTakaraContent extends Content {
    tTokenAddress: string;
    repayAmount: string;
}

function isRepayTakaraContent(
    runtime: IAgentRuntime,
    content: any
): content is RepayTakaraContent {
    elizaLogger.log("Content for Takara repay", content);
    return (
        typeof content.tTokenAddress === "string" && 
        content.tTokenAddress.trim() !== "" &&
        content.tTokenAddress !== "null" &&
        typeof content.repayAmount === "string" && 
        content.repayAmount.trim() !== "" &&
        content.repayAmount !== "null"
    );
}

const repayTakaraTemplate = `Respond with a JSON markdown block containing only the extracted values. Use 'null' for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tTokenAddress": "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
    "repayAmount": "10"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about repaying loans to Takara Protocol:
- The tToken address (e.g., "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1")
- The amount to repay (e.g., "10", "0.5", "MAX" for full repayment)

Look for phrases like:
- "Repay [AMOUNT] to Takara at [ADDRESS]"
- "Pay back [AMOUNT] to Takara using [ADDRESS]"
- "Return [AMOUNT] to Takara Protocol at [ADDRESS]"
- "Repay full loan" or "Repay MAX amount" (for MAX repayment)

If the user mentions multiple tToken addresses or amounts, focus on the most recently mentioned ones.

Respond with a JSON markdown block containing only the extracted values.
If no relevant Takara repay information is found in the conversation, respond with null for all values.`;

export const repayTakaraAction: Action = {
    name: "TAKARA_REPAY",
    similes: ["REPAY TAKARA", "PAY BACK TAKARA", "RETURN LOAN", "REPAY LOAN"],
    description: "Repay borrowed tokens to the Takara Protocol",
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
        elizaLogger.log("Starting Takara repay operation");
        
        const seiAgentKit = await getSeiAgentKit(runtime);

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            // Compose repay context
            const repayContext = composeContext({
                state,
                template: repayTakaraTemplate,
            });

            // Generate repay content
            const content = await generateObjectDeprecated({
                runtime,
                context: repayContext,
                modelClass: ModelClass.LARGE,
            });

            // Validate repay content
            if (!isRepayTakaraContent(runtime, content)) {
                elizaLogger.error("Invalid content for TAKARA_REPAY action.");
                if (callback) {
                    callback({
                        text: "Unable to process Takara repay request. Please provide a valid tToken address and repay amount.",
                        content: { error: "Invalid Takara repay content" },
                    });
                }
                return false;
            }
            
            elizaLogger.log("Takara repay content:", content);
            
            // Call the repayTakara function from sei-agent-kit
            const result = await seiAgentKit.repayTakara(
                content.tTokenAddress as Address,
                content.repayAmount
            );
            
            elizaLogger.success(`Successfully repaid ${result.repaidAmount} loan amount to Takara at address ${content.tTokenAddress}`);
            if (callback) {
                callback({
                    text: `Successfully repaid ${result.repaidAmount} loan amount to Takara at address ${content.tTokenAddress}. Transaction hash: ${result.txHash}`,
                    content: result
                });
            }
            return true;
        } catch (error) {
            elizaLogger.error("Error repaying to Takara Protocol", error);
            if (callback) {
                callback({
                    text: `Error repaying to Takara Protocol: ${error instanceof Error ? error.message : String(error)}`,
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
                    text: "Repay 10 tokens to Takara at address 0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll repay 10 tokens to Takara Protocol...",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully repaid 10 loan amount to Takara at address 0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1. Transaction hash: 0x123456789abcdef",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 