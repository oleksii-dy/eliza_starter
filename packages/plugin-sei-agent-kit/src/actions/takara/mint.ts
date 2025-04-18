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

export interface MintTakaraContent extends Content {
    tTokenAddress: string;
    mintAmount: string;
}

function isMintTakaraContent(
    runtime: IAgentRuntime,
    content: any
): content is MintTakaraContent {
    elizaLogger.log("Content for Takara mint", content);
    return (
        typeof content.tTokenAddress === "string" && 
        content.tTokenAddress.trim() !== "" &&
        content.tTokenAddress !== "null" &&
        typeof content.mintAmount === "string" && 
        content.mintAmount.trim() !== "" &&
        content.mintAmount !== "null"
    );
}

const mintTakaraTemplate = `Respond with a JSON markdown block containing only the extracted values. Use 'null' for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tTokenAddress": "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
    "mintAmount": "10"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about minting tTokens on Takara Protocol:
- The tToken address (e.g., "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1")
- The amount to mint (e.g., "10", "0.5", etc.)

Look for phrases like:
- "Mint [AMOUNT] tTokens at [ADDRESS]"
- "Deposit [AMOUNT] into Takara at [ADDRESS]"
- "Supply [AMOUNT] to Takara Protocol using [ADDRESS]"

If the user mentions multiple tToken addresses or amounts, focus on the most recently mentioned ones.

Respond with a JSON markdown block containing only the extracted values.
If no relevant Takara mint information is found in the conversation, respond with null for all values.`;

export const mintTakaraAction: Action = {
    name: "TAKARA_MINT",
    similes: ["MINT TAKARA", "DEPOSIT TAKARA", "SUPPLY TAKARA", "LEND TAKARA"],
    description: "Mint tTokens by depositing underlying tokens into the Takara Protocol",
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
        elizaLogger.log("Starting Takara mint operation");
        
        const seiAgentKit = await getSeiAgentKit(runtime);

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            // Compose mint context
            const mintContext = composeContext({
                state,
                template: mintTakaraTemplate,
            });

            // Generate mint content
            const content = await generateObjectDeprecated({
                runtime,
                context: mintContext,
                modelClass: ModelClass.LARGE,
            });

            // Validate mint content
            if (!isMintTakaraContent(runtime, content)) {
                elizaLogger.error("Invalid content for TAKARA_MINT action.");
                if (callback) {
                    callback({
                        text: "Unable to process Takara mint request. Please provide a valid tToken address and mint amount.",
                        content: { error: "Invalid Takara mint content" },
                    });
                }
                return false;
            }
            
            elizaLogger.log("Takara mint content:", content);
            
            // Call the mintTakara function from sei-agent-kit
            const result = await seiAgentKit.mintTakara(
                content.tTokenAddress as Address,
                content.mintAmount
            );
            
            elizaLogger.success(`Successfully minted ${content.mintAmount} tTokens at address ${content.tTokenAddress}`);
            if (callback) {
                callback({
                    text: `Successfully minted ${content.mintAmount} tTokens at address ${content.tTokenAddress}. Transaction hash: ${result.txHash}`,
                    content: result
                });
            }
            return true;
        } catch (error) {
            elizaLogger.error("Error minting Takara tTokens", error);
            if (callback) {
                callback({
                    text: `Error minting Takara tTokens: ${error instanceof Error ? error.message : String(error)}`,
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
                    text: "Mint 10 tTokens on Takara Protocol at address 0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll mint 10 tTokens on Takara Protocol...",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully minted 10 tTokens at address 0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1. Transaction hash: 0x123456789abcdef",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 