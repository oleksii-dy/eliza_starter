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

export interface BorrowTakaraContent extends Content {
    tTokenAddress: string;
    borrowAmount: string;
}

function isBorrowTakaraContent(
    runtime: IAgentRuntime,
    content: any
): content is BorrowTakaraContent {
    elizaLogger.log("Content for Takara borrow", content);
    return (
        typeof content.tTokenAddress === "string" && 
        content.tTokenAddress.trim() !== "" &&
        content.tTokenAddress !== "null" &&
        typeof content.borrowAmount === "string" && 
        content.borrowAmount.trim() !== "" &&
        content.borrowAmount !== "null"
    );
}

const borrowTakaraTemplate = `Respond with a JSON markdown block containing only the extracted values. Use 'null' for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tTokenAddress": "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
    "borrowAmount": "10"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about borrowing from Takara Protocol:
- The tToken address (e.g., "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1")
- The amount to borrow (e.g., "10", "0.5", etc.)

Look for phrases like:
- "Borrow [AMOUNT] from Takara at [ADDRESS]"
- "Take a loan of [AMOUNT] from Takara using [ADDRESS]"
- "Get [AMOUNT] from Takara Protocol at [ADDRESS]"

If the user mentions multiple tToken addresses or amounts, focus on the most recently mentioned ones.

Respond with a JSON markdown block containing only the extracted values.
If no relevant Takara borrow information is found in the conversation, respond with null for all values.`;

export const borrowTakaraAction: Action = {
    name: "TAKARA_BORROW",
    similes: ["BORROW TAKARA", "LOAN TAKARA", "GET LOAN", "TAKARA LOAN"],
    description: "Borrow underlying tokens from the Takara Protocol using tTokens as collateral",
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
        elizaLogger.log("Starting Takara borrow operation");
        
        const seiAgentKit = await getSeiAgentKit(runtime);

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            // Compose borrow context
            const borrowContext = composeContext({
                state,
                template: borrowTakaraTemplate,
            });

            // Generate borrow content
            const content = await generateObjectDeprecated({
                runtime,
                context: borrowContext,
                modelClass: ModelClass.LARGE,
            });

            // Validate borrow content
            if (!isBorrowTakaraContent(runtime, content)) {
                elizaLogger.error("Invalid content for TAKARA_BORROW action.");
                if (callback) {
                    callback({
                        text: "Unable to process Takara borrow request. Please provide a valid tToken address and borrow amount.",
                        content: { error: "Invalid Takara borrow content" },
                    });
                }
                return false;
            }
            
            elizaLogger.log("Takara borrow content:", content);
            
            // Call the borrowTakara function from sei-agent-kit
            const result = await seiAgentKit.borrowTakara(
                content.tTokenAddress as Address,
                content.borrowAmount
            );
            
            elizaLogger.success(`Successfully borrowed ${content.borrowAmount} tokens against collateral at address ${content.tTokenAddress}`);
            if (callback) {
                callback({
                    text: `Successfully borrowed ${content.borrowAmount} tokens against collateral at address ${content.tTokenAddress}. Transaction hash: ${result.txHash}`,
                    content: { result }
                });
            }
            return true;
        } catch (error) {
            elizaLogger.error("Error borrowing from Takara Protocol", error);
            if (callback) {
                callback({
                    text: `Error borrowing from Takara Protocol: ${error instanceof Error ? error.message : String(error)}`,
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
                    text: "Borrow 10 tokens from Takara at address 0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll borrow 10 tokens from Takara Protocol...",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully borrowed 10 tokens against collateral at address 0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1. Transaction hash: 0x123456789abcdef",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 