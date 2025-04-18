import { elizaLogger,  } from "@elizaos/core";
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

type Address = `0x${string}`

export interface Balanceerc721Content extends Content {
    tokenAddress: string;
}

function isBalanceerc721Content(
    runtime: IAgentRuntime,
    content: any
): content is Balanceerc721Content {
    elizaLogger.log("Content for transfer", content);
    return (
        typeof content.tokenAddress === "string"
    );
}
const getBalanceTemplate = `Respond with a JSON markdown block containing only the extracted values. Use 'null' for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tokenAddress": "0x...."
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about checking a token balance:
- Token address (e.g. "0x....")

Look for phrases like:
- "Check my balance of [token address]"
- "What's my balance of [token address]"
- "How much [token address] do I have"
- "Check my [token address] balance"
- "Show me my [token address] balance"
- "[token address] balance"

Respond with a JSON markdown block containing only the extracted values.
If no relevant token ticker is found in the conversation, respond with null for all values.`;

export const getBalanceERC721Action: Action = {
    name: "GET_BALANCE_ERC721",
    similes: ["GET BALANCE", "CHECK BALANCE", "BALANCE", "GET BALANCE ERC721"],
    description: "Get the amount owned of a specific ERC721 token (NFT)",
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
        elizaLogger.log("Getting balance");
        
        const seiAgentKit = await getSeiAgentKit(runtime);
        // const config = await validateSeiConfig(runtime);

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            // Compose transfer context
            const getBalanceContext = composeContext({
                state,
                template: getBalanceTemplate,
            });

            // Generate transfer content
            const content = await generateObjectDeprecated({
                runtime,
                context: getBalanceContext,
                modelClass: ModelClass.LARGE,
            });

            // Validate transfer content
            if (!isBalanceerc721Content(runtime, content)) {
                elizaLogger.error("Invalid content for GET_BALANCE action.");
                if (callback) {
                    callback({
                        text: "Unable to process transfer request. Invalid content provided.",
                        content: { error: "Invalid transfer content" },
                    });
                }
                return false;
            }
            console.log("\n\nContent:", content);
            const response = await seiAgentKit.getERC721Balance(content.tokenAddress as Address);
            elizaLogger.success(`The balance of your wallet is ${response} ${content.tokenAddress}`);
            if (callback) {
                callback({
                    text: `The balance of your wallet is ${response} ${content.tokenAddress}`,
                });
            }
            return true;
        } catch (error) {
            elizaLogger.error("Error getting balance", error);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user}}",
                content: {
                    text: "Get the balance of 0x....",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll check the balance right away...",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "The balance of your wallet is 100 0x....",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;