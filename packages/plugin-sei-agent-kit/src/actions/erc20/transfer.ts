import { elizaLogger,  } from "@elizaos/core";

import {
    type ActionExample,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    type Action,
} from "@elizaos/core";
import { composeContext } from "@elizaos/core";
import { generateObjectDeprecated } from "@elizaos/core";
import { getSeiAgentKit } from "../../client";
import { validateSeiConfig } from "../../environment";

type Address = `0x${string}`

export interface TransferContent extends Content {
    amount: string;
    recipient: Address;
    ticker?: string;
}

function isTransferContent(
    runtime: IAgentRuntime,
    content: any
): content is TransferContent {
    elizaLogger.log("Content for transfer", content);
    return (
        typeof content.amount === "string" &&
        typeof content.recipient === "string" &&
        (typeof content.ticker === "string" || typeof content.ticker === "undefined")
    );
}

const transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "recipient": "9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa",
    "amount": 1000, 
    "ticker": "USDC"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:

Recipient wallet address:
- Must be a valid Sei blockchain address
- Should be in the format 0x... or sei...
- Extract the full address, not just a username or partial address

Amount to transfer:
- Must be a positive number
- Can be an integer or decimal value
- Should not include currency symbols or commas
- Convert written numbers (e.g. "one thousand") to numeric form

Token ticker:
- The symbol/ticker of the token to transfer (e.g. "USDC", "USDT", "DAI")
- Should be uppercase
- If the user asks about their SEI token or native token balance (using phrases like "SEI balance", "native token", etc), return 'null' for the ticker. 
- Important: Never use 'SEI' as the ticker.
- If no specific token is mentioned, use null

Respond with a JSON markdown block containing only the extracted values. Ensure all values match the expected formats described above.`;


/** 
 * Our transfer returns:
 *  `Transferred ${amount}  to ${destination}.\nTransaction hash for the transfer: ${hash}`;
 */

export const transferERC20Action: Action = {
    name: "TRANSFER_ERC20",
    similes: ["TRANSFER", "SEND TOKEN", "SEND", "MOVE FUNDS"],
    description: "Transfer tokens to a destination address",
    validate: async (runtime: IAgentRuntime): Promise<boolean> => {
        await validateSeiConfig(runtime);
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting TRANSFER action...");
        
        const seiAgentKit = await getSeiAgentKit(runtime);

        
        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        
        // Compose transfer context
        const transferContext = composeContext({
            state,
            template: transferTemplate,
        });
        
        // Generate transfer content
        const content = await generateObjectDeprecated({
            runtime,
            context: transferContext,
            modelClass: ModelClass.LARGE,
        });
        
        // // Validate transfer content
        // if (!isTransferContent(runtime, content)) {
        //     elizaLogger.error("Invalid content for TRANSFER_TOKEN action.");
        //     if (callback) {
        //         callback({
        //             text: "Unable to process transfer request. Invalid content provided.",
        //             content: { error: "Invalid transfer content" },
        //         });
        //     }
        //     return false;
        // }
        try {
            if (content.ticker != 'null') {
                const response = await seiAgentKit.ERC20Transfer(content.amount, content.recipient as Address, content.ticker as string);
                elizaLogger.success("Transferred tokens successfully");
                if (callback) {
                    callback({
                        text: response,
                    });
                }
            } else {
                const response = await seiAgentKit.ERC20Transfer(content.amount, content.recipient as Address);
                elizaLogger.success("Transferred tokens successfully");
                if (callback) {
                    callback({
                        text: response,
                    });
                }
            }
            return true;
        } catch (error) {
            elizaLogger.error("Error transferring tokens", error);
            if (callback) {
                callback({
                    text: "Error transferring tokens",
                    content: { error: "Error transferring tokens" },
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
                    text: "Transfer 100 SEI tokens to 9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa",
                    action: "TRANSFER",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll transfer 100 SEI tokens right away...",
                    action: "TRANSFER",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Successfully transferred 100 SEI tokens to 9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa\nTransaction: 5KtPn3DXXzHkb7VAVHZGwXJQqww39ASnrf7YkyJoF2qAGEpBEEGvRHLnnTG8ZVwKqNHMqSckWVGnsQAgfH5pbxEb",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
