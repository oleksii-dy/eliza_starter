import {
  Action,
  ActionExample,
  Memory,
  State,
  HandlerCallback,
  IAgentRuntime,
  generateObject,
  composeContext,
  ModelClass,
} from "@elizaos/core";
import { ethers } from "ethers";
import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitContracts } from "@lit-protocol/contracts-sdk";

interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
}

interface LitState {
  contractClient: LitContracts;
  nodeClient: LitNodeClient;
  authSig: {
    sig: string;
    derivedVia: string;
    signedMessage: string;
    address: string;
  };
  pkp?: {
    tokenId: string;
    publicKey: string;
    ethAddress: string;
  };
  wallet: ethers.Wallet;
}

const NETWORKS = {
  SEPOLIA: {
    chainId: 11155111,
    rpcUrl: process.env.RPC_URL,
    uniswapRouter: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
    tokens: {
      WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
      USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      LINK: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    },
  },
} as const;

const ALLOWED_TOKENS = NETWORKS.SEPOLIA.tokens;

const TOKEN_ADDRESSES = {
  WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
  USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  LINK: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
} as const;

const TOKEN_DECIMALS = {
  WETH: 18,
  USDC: 6,
  LINK: 18,
};

interface SwapContent {
  srcToken: string;
  destToken: string;
  amount: string;
}

const swapTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "srcToken": "WETH",
    "destToken": "USDC",
    "amount": "0.0001"
}
\`\`\`

{{recentMessages}}

Given the recent messages and wallet information below:

{{walletInfo}}

Extract the following information about the requested token swap:
- srcToken (the token being sold)
- destToken (the token being bought)
- amount (the amount of the token being sold)

Available tokens: ${Object.keys(TOKEN_ADDRESSES).join(", ")}

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined. The result should be a valid JSON object with the following schema:
\`\`\`json
{
    "srcToken": string | null,
    "destToken": string | null,
    "amount": string | null
}
\`\`\``;

export const swapTokens: Action = {
  name: "SWAP_TOKENS",
  description: "Swaps tokens using Uniswap V3 on Sepolia",
  similes: [
    "SWAP_TOKENS",
    "TOKEN_SWAP",
    "TRADE_TOKENS",
    "swap * for *",
    "trade * for *",
  ],
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    console.log("SWAP_TOKENS validation started", { message });
    const content = message.content as unknown as SwapContent;

    if (!content.amount || isNaN(parseFloat(content.amount))) {
      console.log("Invalid amount", { content });
      return false;
    }

    if (!content.srcToken || !content.destToken) {
      console.log("Missing token information", { content });
      return false;
    }

    const allowedTokens = Object.keys(TOKEN_ADDRESSES);
    if (
      !allowedTokens.includes(content.srcToken) ||
      !allowedTokens.includes(content.destToken)
    ) {
      console.log("Invalid tokens", { content, allowedTokens });
      return false;
    }

    const state = await runtime.composeState(message);
    if (!(state.lit as { wallet?: unknown })?.wallet) {
      console.log("No wallet configured");
      return false;
    }

    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      if (!state) {
        state = await runtime.composeState(message);
      } else {
        state = await runtime.updateRecentMessageState(state);
      }

      const content = (await generateObject({
        runtime,
        context: composeContext({ state, template: swapTemplate }),
        modelClass: ModelClass.LARGE,
      })) as unknown as SwapContent;

      // Your existing swap logic here, but with better error handling and feedback

      callback?.({
        text: `Processing swap: ${content.amount} ${content.srcToken} -> ${content.destToken}`,
        content: {
          action: "SWAP_TOKENS",
          status: "processing",
          srcToken: content.srcToken,
          destToken: content.destToken,
          amount: content.amount,
        },
      });

      // ... rest of your swap implementation ...
    } catch (error) {
      console.error("Swap error:", error);
      callback?.({
        text: `Failed to execute swap: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        content: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Swap 0.0001 WETH for USDC",
        },
      },
      {
        user: "{{user1}}",
        content: {
          srcToken: "WETH",
          destToken: "USDC",
          amount: "0.0001",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Processing swap: 0.0001 WETH -> USDC",
          action: "SWAP_TOKENS",
        },
      },
    ],
  ] as ActionExample[][],
};
