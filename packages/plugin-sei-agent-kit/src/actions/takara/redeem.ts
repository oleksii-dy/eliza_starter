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

// Define the interface for the redeem function parameters
export interface RedeemTakaraParams {
    tTokenAddress: Address;
    redeemAmount: string; // Amount in human-readable format (e.g., "100" for 100 USDC)
    // Use "MAX" to redeem all tTokens
    redeemType: 'underlying' | 'tokens'; // Whether to redeem a specific amount of underlying tokens or tTokens
  }

export interface RedeemTakaraContent extends Content {
    tTokenAddress: string;
    redeemAmount: string;
    redeemType?: RedeemTakaraParams['redeemType'];
}

function isRedeemTakaraContent(
    runtime: IAgentRuntime,
    content: any
): content is RedeemTakaraContent {
    elizaLogger.log("Content for Takara redeem", content);
    return (
        typeof content.tTokenAddress === "string" && 
        content.tTokenAddress.trim() !== "" &&
        content.tTokenAddress !== "null" &&
        typeof content.redeemAmount === "string" && 
        content.redeemAmount.trim() !== "" &&
        content.redeemAmount !== "null" &&
        (!content.redeemType || content.redeemType === "underlying" || content.redeemType === "tToken")
    );
}

const redeemTakaraTemplate = `Respond with a JSON markdown block containing only the extracted values. Use 'null' for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tTokenAddress": "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
    "redeemAmount": "10",
    "redeemType": "underlying"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about redeeming from Takara Protocol:
- The tToken address (e.g., "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1")
- The amount to redeem (e.g., "10", "0.5", "MAX" for full redemption)
- Optional: The redeem type ("underlying" for underlying tokens, "tToken" for tTokens)

Look for phrases like:
- "Redeem [AMOUNT] from Takara at [ADDRESS]"
- "Withdraw [AMOUNT] from Takara using [ADDRESS]"
- "Get back [AMOUNT] from Takara Protocol at [ADDRESS]"
- "Redeem all tokens" or "Redeem MAX amount" (for MAX redemption)

If the redeem type is not specified, default to "underlying".
If the user mentions multiple tToken addresses or amounts, focus on the most recently mentioned ones.

Respond with a JSON markdown block containing only the extracted values.
If no relevant Takara redeem information is found in the conversation, respond with null for all values.`;

export const redeemTakaraAction: Action = {
    name: "TAKARA_REDEEM",
    similes: ["REDEEM TAKARA", "WITHDRAW TAKARA", "GET BACK TOKENS", "TAKARA WITHDRAW"],
    description: "Redeem tTokens from the Takara Protocol to get underlying tokens back",
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
        elizaLogger.log("Starting Takara redeem operation");
        
        const seiAgentKit = await getSeiAgentKit(runtime);

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            // Compose redeem context
            const redeemContext = composeContext({
                state,
                template: redeemTakaraTemplate,
            });

            // Generate redeem content
            const content = await generateObjectDeprecated({
                runtime,
                context: redeemContext,
                modelClass: ModelClass.LARGE,
            });

            // Validate redeem content
            if (!isRedeemTakaraContent(runtime, content)) {
                elizaLogger.error("Invalid content for TAKARA_REDEEM action.");
                if (callback) {
                    callback({
                        text: "Unable to process Takara redeem request. Please provide a valid tToken address and redeem amount.",
                        content: { error: "Invalid Takara redeem content" },
                    });
                }
                return false;
            }
            
            elizaLogger.log("Takara redeem content:", content);
            
            // Set default redeem type if not provided
            const redeemType = content.redeemType || "underlying";
            
            // Call the redeemTakara function from sei-agent-kit
            const result = await seiAgentKit.redeemTakara(
                content.tTokenAddress as Address,
                content.redeemAmount,
                redeemType
            );
            
            elizaLogger.success(`Successfully redeemed ${result.redeemedAmount} from Takara at address ${content.tTokenAddress}`);
            if (callback) {
                callback({
                    text: `Successfully redeemed ${result.redeemedAmount} from Takara at address ${content.tTokenAddress}. Transaction hash: ${result.txHash}`,
                    content: result
                });
            }
            return true;
        } catch (error) {
            elizaLogger.error("Error redeeming from Takara Protocol", error);
            if (callback) {
                callback({
                    text: `Error redeeming from Takara Protocol: ${error instanceof Error ? error.message : String(error)}`,
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
                    text: "Redeem 10 tokens from Takara at address 0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll redeem 10 tokens from Takara Protocol...",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully redeemed 10 underlying tokens from Takara at address 0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1. Transaction hash: 0x123456789abcdef",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 