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

export interface BalanceContent extends Content {
    ticker: string;
}

function isBalanceContent(
    runtime: IAgentRuntime,
    content: any
): content is BalanceContent {
    elizaLogger.log("Content for transfer", content);
    return (
        typeof content.ticker === "string"
    );
}
const getBalanceTemplate = `Respond with a JSON markdown block containing only the extracted values. Use 'null' for any values that cannot be determined.

Example response:
\`\`\`json
{
    "ticker": "USDC"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about checking a token balance:
- Ticker of the token (e.g. "USDC", "USDT", "DAI", etc.)

Look for phrases like:
- "What's my balance of [TOKEN]"
- "How much [TOKEN] do I have"
- "Check my [TOKEN] balance"
- "Show me my [TOKEN] balance"
- "[TOKEN] balance"

If the user asks about their SEI token or native token balance (using phrases like "SEI balance", "native token", etc), return 'null' for the ticker. 
Important: Never use 'SEI' as the ticker.

If the user mentions multiple tokens, focus on the most recently mentioned one.

Respond with a JSON markdown block containing only the extracted values.
If no relevant token ticker is found in the conversation, respond with null for all values.`;

export const getBalanceERC20Action: Action = {
    name: "GET_BALANCE_ERC20",
    similes: ["GET BALANCE", "CHECK BALANCE", "BALANCE", "GET BALANCE ERC20"],
    description: "Get the balance of a wallet",
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

        state = (await runtime.composeState(message)) as State;


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
            if (!isBalanceContent(runtime, content)) {
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
            if (content.ticker != "null") {
                const tokenAddress = await seiAgentKit.getTokenAddressFromTicker(content.ticker);
                const response = await seiAgentKit.getERC20Balance(tokenAddress);
                elizaLogger.success(`The balance of your wallet is ${response} ${content.ticker}`);
                if (callback) {
                    callback({
                        text: `The balance of your wallet is ${response} ${content.ticker}`,
                    });
                }
                return true;
                
            } else {
                const response = await seiAgentKit.getERC20Balance();
                elizaLogger.success(`The balance of your wallet is ${response} SEI`);
                if (callback) {
                    callback({
                        text: `The balance of your wallet is ${response} SEI`,
                    });
                }
                return true;
            }
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
                    text: "Get the balance of my wallet",
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
                    text: "The balance of your wallet is 100 SEI",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;