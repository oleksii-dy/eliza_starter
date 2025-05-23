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

export interface GetRedeemableAmountContent extends Content {
    tTokenAddress: string;
    userAddress?: string;
}

function isGetRedeemableAmountContent(
    runtime: IAgentRuntime,
    content: any
): content is GetRedeemableAmountContent {
    elizaLogger.log("Content for Takara get redeemable amount", content);
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

const getRedeemableAmountTemplate = `Respond with a JSON markdown block containing only the extracted values. Use 'null' for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tTokenAddress": "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
    "userAddress": "0x123abc"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about checking redeemable amounts on Takara Protocol:
- The tToken address (e.g., "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1")
- Optional: The user address to check (if not provided, the current user's address will be used)

Look for phrases like:
- "Check how much I can redeem from Takara at [ADDRESS]"
- "Show redeemable amount for [ADDRESS]"
- "What's my redeemable balance at [ADDRESS]"
- "Check redeemable amount for [USER_ADDRESS] at [TOKEN_ADDRESS]"

If the user mentions multiple tToken addresses, focus on the most recently mentioned one.

Respond with a JSON markdown block containing only the extracted values.
If no relevant Takara redeemable amount information is found in the conversation, respond with null for all values.`;

export const getRedeemableAmountAction: Action = {
    name: "TAKARA_GET_REDEEMABLE_AMOUNT",
    similes: ["CHECK REDEEMABLE", "SHOW REDEEMABLE", "REDEEMABLE BALANCE", "TAKARA BALANCE"],
    description: "Check the amount of underlying tokens that can be redeemed by a user from Takara Protocol",
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
        elizaLogger.log("Starting Takara get redeemable amount operation");
        
        const seiAgentKit = await getSeiAgentKit(runtime);

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            // Compose get redeemable amount context
            const redeemableContext = composeContext({
                state,
                template: getRedeemableAmountTemplate,
            });

            // Generate get redeemable amount content
            const content = await generateObjectDeprecated({
                runtime,
                context: redeemableContext,
                modelClass: ModelClass.LARGE,
            });

            // Validate get redeemable amount content
            if (!isGetRedeemableAmountContent(runtime, content)) {
                elizaLogger.error("Invalid content for TAKARA_GET_REDEEMABLE_AMOUNT action.");
                if (callback) {
                    callback({
                        text: "Unable to process Takara get redeemable amount request. Please provide a valid tToken address.",
                        content: { error: "Invalid Takara get redeemable amount content" },
                    });
                }
                return false;
            }
            
            elizaLogger.log("Takara get redeemable amount content:", content);
            
            // Call the getRedeemableAmount function from sei-agent-kit
            const userAddress = content.userAddress as Address | undefined;
            const result = await seiAgentKit.getRedeemableAmount(content.tTokenAddress as Address, userAddress as Address);
            
            const userDisplayText = userAddress ? `for address ${userAddress}` : "for your wallet";
            elizaLogger.success(`Successfully retrieved redeemable amount ${userDisplayText} from Takara at address ${content.tTokenAddress}`);
            if (callback) {
                callback({
                    text: `Here's the redeemable amount information ${userDisplayText} from Takara at address ${content.tTokenAddress}:\n${JSON.stringify(result, null, 2)}`,
                    content: { result }
                });
            }
            return true;
        } catch (error) {
            elizaLogger.error("Error getting redeemable amount from Takara Protocol", error);
            if (callback) {
                callback({
                    text: `Error getting redeemable amount from Takara Protocol: ${error instanceof Error ? error.message : String(error)}`,
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
                    text: "Check how much I can redeem from Takara at address 0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll check your redeemable amount on Takara Protocol...",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Here's the redeemable amount information for your wallet from Takara at address 0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1: [redeemable details]",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 