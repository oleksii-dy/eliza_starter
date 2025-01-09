import { IAgentRuntime, Action, Memory, State, ActionExample, elizaLogger, HandlerCallback, composeContext, generateObject, generateObjectArray, ModelClass } from "@elizaos/core"
import { createSolanaRpc,address } from "@solana/web3.js";
import { closePositionInstructions, setWhirlpoolsConfig } from "@orca-so/whirlpools";
import { settings } from '@elizaos/core';
import { sendTransaction } from '../../utils/sendTransaction';
import { loadWallet } from '../../utils/loadWallet';

export interface ClosePositionParams {
    positionMint: string;
    slippageBps?: number;
}

function isClosePositionContent(
    content: any
): content is ClosePositionParams {
    return (typeof content.positionMint === "string") &&
        (typeof content.slippageBps === "number" || content.slippageBps === undefined);
}

export const closePositionAction: Action = {
    name: "CLOSE_POSITION",
    similes: ["REMOVE_LIQUIDITY", "EXIT_POSITION"],
    description: "Close an existing liquidity position in an Orca Whirlpool",

    validate: async function(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        const content = message.content as Partial<ClosePositionParams>;
        if (!content.positionMint || !content.slippageBps) {
            return false;
        }
        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Closing position...");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const closePositionContext = composeContext({
            state,
            template: `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

            Example response:
            \`\`\`json
            {
                positionMint: "BieefG47jAHCGZBxi2q87RDuHyGZyYC3vAzxpyu8pump"
            }
            \`\`\`
            `,
        });

        const content = await generateObjectArray({
            runtime,
            context: closePositionContext,
            modelClass: ModelClass.LARGE,
        });

        if(!isClosePositionContent(content)) {
            if (callback) {
                callback({
                    text: "Unable to close position. Invalid content provided.",
                    content: { error: "Invalid close position content" },
                });
            }
            return false;
        }

        try {
            const positionMint = address(content.positionMint);
            const { signer: wallet } = await loadWallet(
                runtime,
                true
            );
            const rpc = createSolanaRpc(settings.RPC_URL!);

            const { instructions, quote, feesQuote, rewardsQuote } = await closePositionInstructions(
              rpc,
              positionMint,
              content.slippageBps || 100,
              wallet
            );

            const signature = await sendTransaction(rpc, instructions, wallet);

            const output = `Successfully closed your position\n
                Transaction: ${signature};
                estimated token A received: ${quote.tokenEstA}\n
                estimated token B received: ${quote.tokenEstB}\n
                estimated token A fees: ${feesQuote.feeOwedA}\n
                estimated token B fees: ${feesQuote.feeOwedB}\n
                estimated rewards 1: ${rewardsQuote.rewards[0].rewardsOwed}\n
                estimated rewards 2: ${rewardsQuote.rewards[1].rewardsOwed}\n
                estimated rewards 3: ${rewardsQuote.rewards[2].rewardsOwed}\n
                `;

            if (callback) {
                callback({
                    text: output,
                });
            }

            return true;

        } catch (error) {
            console.error("Error during feching positions", error);
            if (callback) {
                callback({
                    text: `Error transferring tokens: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Close my liquidity position with mint address HqoV7Qv27REUtmd9UKSJGGmCRNx3531t33bDG1BUfo9K",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll close your Whirlpool position now...",
                    action: "CLOSE_POSITION",
                    positionMint: "HqoV7Qv27REUtmd9UKSJGGmCRNx3531t33bDG1BUfo9K",
                    slippageBps: 100
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully closed your Whirlpool position\nTransaction: 5KtPn3DXXzHkb7VAVHZGwXJQqww39ASnrf7YkyJoF2qAGEpBEEGvRHLnnTG8ZVwKqNHMqSckWVGnsQAgfH5pbxEb",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;

export default closePositionAction;
