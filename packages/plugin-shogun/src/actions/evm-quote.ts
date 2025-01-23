import {
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    ModelClass,
    composeContext,
    generateObject,
    Content
} from "@elizaos/core";
import { ChainId, fetchEvmQuote, NativeToken, formatStringEstimation } from "@shogun/sdk";
import { isAddress } from "viem";
import { z } from "zod";
import { ethers } from "ethers";
import { LitNodeClient } from "@lit-protocol/lit-node-client";


interface QuoteContent extends Content {
    srcToken: string;
    destToken: string;
    amount: string;
}

interface LitState {
    nodeClient: LitNodeClient;
    evmWallet?: ethers.Wallet;
    pkp?: {
        publicKey: string;
        ethAddress: string;
    };
    capacityCredit?: {
        tokenId: string;
    };
}

const quoteTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "srcToken": "ETH",
    "destToken": "USDC",
    "amount": "1"
}
\`\`\`

{{recentMessages}}

Given the recent messages and wallet information below:

{{walletInfo}}

Extract the following information about the requested token quote:
- srcToken (the token being sold, e.g., "ETH", "USDC", "WETH")
- destToken (the token being bought, e.g., "ETH", "USDC", "WETH")
- amount (the amount of the token being sold)

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.`;

const TOKEN_ADDRESSES = {
    "ETH": NativeToken,
    "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Example Base USDC address
    "WETH": "0x4200000000000000000000000000000000000006",
    "LBTC": "0x8236a87084f8b84306f72007f36f2618a5634494",
    "cbBTC": "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf" //coinbase BTC
};

const TOKEN_DECIMALS = {
    "ETH": 18,
    "USDC": 6,
    "WETH": 18,
    "LBTC": 8,
    "cbBTC": 8
};

const quoteSchema = z.object({
    srcToken: z.string().nullable(),
    destToken: z.string().nullable(),
    amount: z.union([z.string(), z.number()]).nullable()
});

export const quoteSwap: Action = {
    name: "QUOTE_SWAP",
    similes: ["QUOTE_TOKENS", "QUOTE_TOKEN_SWAP", "QUOTE_TOKENS"],
    validate: async (runtime: IAgentRuntime) => true,
    description: "Execute a token swap using Shogun SDK",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        _options: { [key: string]: unknown; } | undefined,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            if (!state) {
                state = await runtime.composeState(message);
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            const content = await generateObject({
                runtime,
                context: composeContext({ state, template: quoteTemplate }),
                schema: quoteSchema,
                modelClass: ModelClass.LARGE,
            });

            const quoteContent = content.object as QuoteContent;

            // Validate content
            if (!quoteContent.amount) {
                console.log("Amount is not a number, skipping quote");
                callback?.({ text: "The amount must be a number" });
                return true;
            }

            if (!quoteContent.srcToken) {
                console.log("srcToken is no data, skipping quote");
                callback?.({ text: "The srcToken must be a valid token" });
                return true;
            }

            if (!quoteContent.destToken) {
                console.log("destToken is no data, skipping quote");
                callback?.({ text: "The destToken must be a valid token" });
                return true;
            }

            // Get token addresses and parse amount
            const srcToken = !isAddress(quoteContent.srcToken) ? 
                TOKEN_ADDRESSES[quoteContent.srcToken as keyof typeof TOKEN_ADDRESSES] : 
                quoteContent.srcToken;
            const destToken = !isAddress(quoteContent.destToken) ? 
                TOKEN_ADDRESSES[quoteContent.destToken as keyof typeof TOKEN_ADDRESSES] : 
                quoteContent.destToken;
            const amount = ethers.utils.parseUnits(
                quoteContent.amount,
                TOKEN_DECIMALS[quoteContent.srcToken as keyof typeof TOKEN_DECIMALS]
            );

            // Get Lit state
            const litState = (state.lit || {}) as LitState;
            if (!litState.pkp?.ethAddress) {
                throw new Error("No PKP address available");
            }

            // Fetch quote using PKP address
            const quote = await fetchEvmQuote({
                senderAddress: litState.pkp.ethAddress,
                amount: amount.toString(),
                srcToken: srcToken,
                destToken: destToken,
                srcChain: ChainId.BASE,
                destChain: ChainId.BASE,
            });

            const expectedAmount = formatStringEstimation(
                quote.outputAmount.value, 
                quote.outputAmount.decimals
            );

            console.log(`Expected to receive: ${expectedAmount} ${quote.outputAmount.symbol}`);
            
            callback?.({
                text: `You can expect to receive approximately ${expectedAmount} ${quote.outputAmount.symbol}`,
                content: {
                    expectedAmount,
                    symbol: quote.outputAmount.symbol,
                    success: true
                }
            });

            return true;
        } catch (error: any) {
            console.error("Quote error:", error);
            callback?.({ 
                text: `Error getting quote: ${error.message}`,
                content: {
                    success: false,
                    error: error.message
                }
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Quote 1 ETH for USDC"
                }
            },
            {
                user: "{{user1}}",
                content: {
                    srcToken: "ETH",
                    destToken: "USDC"
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Processing quote: 1 ETH -> USDC",
                    action: "QUOTE_SWAP"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Swap complete! Transaction: [tx_hash]"
                }
            },
        ]
    ] as ActionExample[][]
};

export default quoteSwap;