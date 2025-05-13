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

export interface GetBorrowBalanceContent extends Content {
    tTokenAddress: string;
    userAddress?: string;
}

function isGetBorrowBalanceContent(
    runtime: IAgentRuntime,
    content: any
): content is GetBorrowBalanceContent {
    elizaLogger.log("Content for Takara get borrow balance", content);
    return (
        typeof content.tTokenAddress === "string" && 
        content.tTokenAddress.trim() !== "" &&
        content.tTokenAddress !== "null" &&
        (!content.userAddress || 
            (typeof content.userAddress === "string" && 
            content.userAddress.trim() !== "" &&
            content.userAddress !== "null"))
    );
}

const getBorrowBalanceTemplate = `Respond with a JSON markdown block containing only the extracted values. Use 'null' for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tTokenAddress": "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
    "userAddress": "0x123abc"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about checking borrow balance on Takara Protocol:
- The tToken address (e.g., "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1")
- Optional: The user address to check (if not provided, the current user's address will be used)

Look for phrases like:
- "Check my borrow balance from Takara at [ADDRESS]"
- "Show loan balance for [ADDRESS]"
- "What's my borrow amount at [ADDRESS]"
- "Check borrow balance for [USER_ADDRESS] at [TOKEN_ADDRESS]"
- "How much do I owe on Takara at [ADDRESS]"

If the user mentions multiple tToken addresses, focus on the most recently mentioned one.

Respond with a JSON markdown block containing only the extracted values.
If no relevant Takara borrow balance information is found in the conversation, respond with null for all values.`;

export const getBorrowBalanceAction: Action = {
    name: "TAKARA_GET_BORROW_BALANCE",
    similes: ["CHECK BORROW", "SHOW BORROW", "LOAN BALANCE", "BORROW AMOUNT", "CHECK LOAN"],
    description: "Retrieve the current borrow balance for a user from Takara Protocol",
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
        elizaLogger.log("Starting Takara get borrow balance operation");
        
        const seiAgentKit = await getSeiAgentKit(runtime);

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            // Compose get borrow balance context
            const borrowContext = composeContext({
                state,
                template: getBorrowBalanceTemplate,
            });

            // Generate get borrow balance content
            const content = await generateObjectDeprecated({
                runtime,
                context: borrowContext,
                modelClass: ModelClass.LARGE,
            });

            // Validate get borrow balance content
            if (!isGetBorrowBalanceContent(runtime, content)) {
                elizaLogger.error("Invalid content for TAKARA_GET_BORROW_BALANCE action.");
                if (callback) {
                    callback({
                        text: "Unable to process Takara get borrow balance request. Please provide a valid tToken address.",
                        content: { error: "Invalid Takara get borrow balance content" },
                    });
                }
                return false;
            }
            
            elizaLogger.log("Takara get borrow balance content:", content);
            
            // Call the getBorrowBalance function from sei-agent-kit
            const userAddress = content.userAddress as Address | undefined;
            const result = await seiAgentKit.getBorrowBalance(content.tTokenAddress as Address, userAddress);
            
            const userDisplayText = userAddress ? `for address ${userAddress}` : "for your wallet";
            elizaLogger.success(`Successfully retrieved borrow balance ${userDisplayText} from Takara at address ${content.tTokenAddress}`);
            if (callback) {
                callback({
                    text: `Here's the borrow balance information ${userDisplayText} from Takara at address ${content.tTokenAddress}:\n${JSON.stringify(result, null, 2)}`,
                    content: { result }
                });
            }
            return true;
        } catch (error) {
            elizaLogger.error("Error getting borrow balance from Takara Protocol", error);
            if (callback) {
                callback({
                    text: `Error getting borrow balance from Takara Protocol: ${error instanceof Error ? error.message : String(error)}`,
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
                    text: "Check my borrow balance on Takara at address 0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll check your borrow balance on Takara Protocol...",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Here's the borrow balance information for your wallet from Takara at address 0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1: [borrow details]",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 