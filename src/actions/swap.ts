import {
  type Action,
  type Content,
  IAgentRuntime,
  logger,
  ModelType,
  UUID,
} from "@elizaos/core";
import { Chain, erc20Abi, isHex, parseUnits } from "viem";
import { LEVVA_ACTIONS } from "../constants";
import { estimationTemplate, swapTemplate } from "../templates";
import type { TokenData, TokenDataWithInfo } from "../types/token";
import {
  extractTokenData,
  getChain,
  getClient,
  getLevvaUser,
  getToken,
  getTokenData,
  upsertToken,
} from "../util";
import { rephrase } from "../util/generate";
import { formatEstimation, selectSwapRouter } from "src/util/eth/swap";
import { parseTokenInfo } from "src/util/eth/token";

interface RawMessage {
  senderId: UUID;
  senderName: string;
  message: string;
  channelId: UUID;
  roomId: string;
  serverId: UUID;
  messageId: UUID;
  source: string;
  metadata: Record<string, unknown>;
}

async function getTokenDataWithInfo(
  runtime: IAgentRuntime,
  chain: Chain,
  symbolOrAddress?: string
) {
  let tokenData: TokenDataWithInfo | undefined;

  if (!isHex(symbolOrAddress)) {
    const symbol = symbolOrAddress;

    if (symbol.toLowerCase() === chain.nativeCurrency.symbol.toLowerCase()) {
      logger.info("Using native currency as token in");
      tokenData = extractTokenData(chain.nativeCurrency);
    } else {
      const token = (await getToken(runtime, { chainId: chain.id, symbol }))[0];
      tokenData = extractTokenData(token);
      tokenData.info = parseTokenInfo(token.info);
    }
  } else {
    tokenData = await getTokenData(chain.id, symbolOrAddress);
    logger.info(`Saving ${symbolOrAddress} as ${tokenData.symbol}`);

    await upsertToken(runtime, {
      ...(tokenData as Required<TokenData>),
      chainId: chain.id,
    });
  }

  return tokenData;
}

export const swapTokens: Action = {
  name: LEVVA_ACTIONS.SWAP_TOKENS,
  description:
    "Replies with all necessary info to swap two tokens, in case on insufficient info from the user, ask the user for it. This action should ignore the REPLY rule in IMPORTANT ACTION ORDERING RULES section.",
  similes: ["SWAP_TOKENS", "EXCHANGE_TOKENS", "swap tokens", "exchange tokens"],

  validate: async () => {
    return true;
  },

  handler: async (runtime, message, state, options, callback) => {
    try {
      logger.info("SWAP_TOKENS action called");
      // fixme types
      const raw = (message.metadata as unknown as { raw: RawMessage }).raw;
      const chainId = raw.metadata.chainId as number | undefined;
      const userAddressId = raw.metadata.userAddressId as UUID | undefined;

      if (!userAddressId) {
        throw new Error("User address ID is required");
      }

      if (!chainId) {
        throw new Error("Unknown chain");
      }

      const chain = getChain(chainId);
      const userResult = await getLevvaUser(runtime, { id: userAddressId });
      const address = userResult[0]?.address;

      if (!isHex(address)) {
        throw new Error("User not found");
      }

      const gen = await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: swapTemplate.replace(
          "{{recentMessages}}",
          state.values.recentMessages
        ),
      });

      if (typeof gen !== "object") {
        throw new Error("Failed to generate params object");
      }

      const { fromToken, toToken, amount } = gen;

      if (!fromToken) {
        logger.info("Could not find from token, need to ask user");

        const responseContent: Content = {
          thought:
            "User didn't provide source token, I should ask the user for it.",
          text: "Which token do you want to swap?",
          actions: ["SWAP_TOKENS"],
          source: message.content.source,
        };

        return await callback(
          await rephrase({ runtime, content: responseContent, state })
        );
      } else if (!toToken) {
        logger.info("Could not find to token, need to ask user");

        const responseContent: Content = {
          thought:
            "User didn't provide destination token, I should ask the user for it.",
          text: "Which token do you want to swap to?",
          actions: ["SWAP_TOKENS"],
          source: message.content.source,
        };

        return await callback(
          await rephrase({ runtime, content: responseContent, state })
        );
      } else if (!amount) {
        logger.info("Could not find amount, need to ask user");

        const responseContent = {
          thought: "User didn't provide amount, I should ask the user for it.",
          text: `How much ${fromToken} do you want to swap?`,
          actions: ["SWAP_TOKENS"],
          source: message.content.source,
        };

        return await callback(
          await rephrase({ runtime, content: responseContent, state })
        );
      }

      const tokenIn = await getTokenDataWithInfo(runtime, chain, fromToken);

      if (!tokenIn) {
        logger.info(
          "Could not find token in db, need to ask user for its address"
        );

        const responseContent: Content = {
          thought:
            "User didn't provide token in address, I should ask the user for it.",
          text: `I couldn't find the token ${fromToken} on ${chain.name}, maybe you know it's address?`,
          actions: ["SWAP_TOKENS"],
          source: message.content.source,
        };

        return await callback(
          await rephrase({ runtime, content: responseContent, state })
        );
      }

      const tokenOut = await getTokenDataWithInfo(runtime, chain, toToken);

      if (!tokenOut) {
        logger.info(
          "Could not find token out, need to ask user for its address"
        );

        const responseContent: Content = {
          thought:
            "User didn't provide token out address, I should ask the user for it.",
          text: `I couldn't find the token ${toToken} on ${chain.name}, maybe you know it's address?`,
          actions: ["SWAP_TOKENS"],
          source: message.content.source,
        };

        return await callback(
          await rephrase({ runtime, content: responseContent, state })
        );
      }

      const client = getClient(chain);

      const balance = !tokenIn.address
        ? await client.getBalance({ address })
        : await client.readContract({
            address: tokenIn.address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address],
          });

      const amountUnits = parseUnits(amount, tokenIn.decimals);

      if (balance < amountUnits) {
        logger.info(`Not enough ${tokenIn.symbol} to swap`);

        const responseContent: Content = {
          thought:
            "User doesn't have enough tokens to swap, I should tell the user about it.",
          text: `You don't have enough ${tokenIn.symbol} to swap`,
          actions: ["SWAP_TOKENS"],
          source: message.content.source,
        };

        return await callback(
          await rephrase({ runtime, content: responseContent, state })
        );
      }

      const swap = selectSwapRouter(tokenIn, tokenOut);

      const { calls, estimation } = await swap(runtime, {
        address,
        amountIn: amountUnits,
        chain,
        decimals: tokenIn.decimals,
      });

      const json = {
        id: "calls.json",
        url: `data:application/json;base64,${Buffer.from(JSON.stringify(calls)).toString("base64")}`,
      };

      const responseContent: Content = {
        thought: `Swapping ${amount} ${tokenIn.symbol} to ${tokenOut.symbol}...`,
        text: `Swapping ${amount} ${tokenIn.symbol} to ${tokenOut.symbol}...
${formatEstimation(estimation)}
Please approve transactions in your wallet.`,
        actions: ["SWAP_TOKENS"],
        source: message.content.source,
        attachments: [json],
      };

      await callback(
        await rephrase({ runtime, content: responseContent, state })
      );

      return true;
    } catch (error) {
      logger.error("Error in SWAP_TOKENS action:", error);
      const thought = `Action failed with error: ${error.message ?? "unknown"}. I should tell the user about the error.`;
      const text = `Failed to swap, reason: ${error.message ?? "unknown"}. Please try again.`;

      const responseContent = await rephrase({
        runtime,
        content: {
          text,
          thought,
          actions: ["SWAP_TOKENS"],
          source: message.content.source,
        },
        state,
      });

      await callback(responseContent);
      return false;
    }
  },
  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Please swap {{amount}} {{token1}} to {{token2}}",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Please confirm swap for {{amount}} {{token1}} for {{token2}}",
          action: "SWAP_TOKENS",
          attachments: [
            {
              id: "calls.json",
              url: "data:application/json;base64,{{calls}}",
            },
          ],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Swap tokens",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Which token do you want to swap?",
          action: "SWAP_TOKENS",
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "{{amount}} {{token1}} to {{token2}}",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: `Swapping {{amount}} {{token1}} to {{token2}}...\n${estimationTemplate(true)}\nPlease approve transactions in your wallet.`,
          action: "SWAP_TOKENS",
          attachments: [
            {
              id: "calls.json",
              url: "data:application/json;base64,{{calls}}",
            },
          ],
        },
      },
    ],
    [
      {
        name: "{{agentName}}",
        content: {
          text: "I couldn't find the token {{token}} on {{chain}}, maybe you know it's address?",
          actions: ["SWAP_TOKENS"],
        },
      },
      {
        name: "{{user1}}",
        content: {
          text: "It is {{address}}",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Swapping {{amount}} {{token1}} to {{token2}}...\nPlease approve transactions in your wallet.",
          actions: ["SWAP_TOKENS"],
          attachments: [
            {
              id: "calls.json",
              url: "data:application/json;base64,{{calls}}",
            },
          ],
        },
      },
    ],
    [
      // fixme maybe needs another action type for this
      {
        name: "{{user1}}",
        content: {
          text: "Cancel transaction",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Your transaction request has been cancelled.",
          actions: ["SWAP_TOKENS"],
        },
      },
    ],
  ],
};
