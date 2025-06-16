import {
  type Action,
  type Content,
  logger,
  ModelType,
  UUID,
} from "@elizaos/core";
import { and, eq } from "drizzle-orm";
import {
  encodeFunctionData,
  erc20Abi,
  getAddress,
  isHex,
  parseUnits,
} from "viem";
import { erc20Table } from "../schema/erc20";
import { levvaUserTable } from "../schema/levva-user";
import { lower } from "../schema/util";
import { swapTemplate } from "../templates";
import type { TokenData } from "../types";
import {
  extractTokenData,
  getChain,
  getClient,
  getDb,
  getTokenData,
} from "../util";
import { getSwapRouteV1, postSwapRouteV1 } from "src/api/kyber";

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

interface CalldataWithDescription {
  to: `0x${string}`;
  data: `0x${string}`;
  value?: string;
  title: string;
  description: string;
}

export const swapTokens: Action = {
  name: "SWAP_TOKENS",
  description: "Returns all necessary calls to swap two tokens",
  similes: ["SWAP_TOKENS", "EXCHANGE_TOKENS", "swap tokens", "exchange tokens"],

  validate: async (_runtime, message) => {
    return true;
  },

  handler: async (runtime, message, state, options, callback) => {
    // const [tokenIn, tokenOut] = message.content.text?.match(addressRegex) ?? [];

    try {
      const db = getDb(runtime);
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

      const userResult = await db
        .select()
        .from(levvaUserTable)
        .where(eq(levvaUserTable.id, userAddressId));

      const _address = userResult[0]?.address;

      if (!isHex(_address)) {
        throw new Error("User not found");
      }

      const address = getAddress(_address);
      const modelSmall = runtime.getModel(ModelType.OBJECT_SMALL);

      const gen = await modelSmall(runtime, {
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
          text: "Which token do you want to swap?",
          actions: ["SWAP_TOKENS"],
          source: message.content.source,
        };

        return await callback(responseContent);
      } else if (!toToken) {
        logger.info("Could not find to token, need to ask user");

        const responseContent: Content = {
          text: "Which token do you want to swap to?",
          actions: ["SWAP_TOKENS"],
          source: message.content.source,
        };

        return await callback(responseContent);
      } else if (!amount) {
        logger.info("Could not find amount, need to ask user");

        const responseContent = {
          text: `How much ${fromToken} do you want to swap?`,
          actions: ["SWAP_TOKENS"],
          source: message.content.source,
        };

        return await callback(responseContent);
      }

      let tokenIn: TokenData | undefined;
      let tokenOut: TokenData | undefined;

      if (!isHex(fromToken)) {
        const symbol = fromToken;

        if (
          symbol.toLowerCase() === chain.nativeCurrency.symbol.toLowerCase()
        ) {
          logger.info("Using native currency as token in");
          tokenIn = extractTokenData(chain.nativeCurrency);
        } else {
          const tokenResult = await db
            .select()
            .from(erc20Table)
            .where(
              and(
                eq(lower(erc20Table.symbol), symbol.toLowerCase()),
                eq(erc20Table.chainId, chainId)
              )
            );

          tokenIn = extractTokenData(tokenResult[0]);
        }

        if (!tokenIn) {
          logger.info(
            "Could not find token in db, need to ask user for its address"
          );

          const responseContent: Content = {
            text: `I couldn't find the token ${fromToken} on ${chain.name}, maybe you know it's address?`,
            actions: ["SWAP_TOKENS"],
            source: message.content.source,
          };

          return await callback(responseContent);
        }
      } else {
        tokenIn = await getTokenData(chainId, fromToken);
        logger.info(`Saving ${fromToken} as ${tokenIn.symbol}`);

        await db.insert(erc20Table).values({
          ...(tokenIn as Required<TokenData>),
          chainId,
        });
      }

      // fixme: add helper function
      if (!isHex(toToken)) {
        const symbol = toToken;

        if (
          symbol.toLowerCase() === chain.nativeCurrency.symbol.toLowerCase()
        ) {
          logger.info("Using native currency as token out");
          tokenOut = extractTokenData(chain.nativeCurrency);
        } else {
          const tokenResult = await db
            .select()
            .from(erc20Table)
            .where(
              and(
                eq(lower(erc20Table.symbol), symbol.toLowerCase()),
                eq(erc20Table.chainId, chainId)
              )
            );

          tokenOut = extractTokenData(tokenResult[0]);
        }

        if (!tokenOut) {
          logger.info(
            "Could not find token out, need to ask user for its address"
          );

          const responseContent: Content = {
            text: `I couldn't find the token ${toToken} on ${chain.name}, maybe you know it's address?`,
            actions: ["SWAP_TOKENS"],
            source: message.content.source,
          };

          return await callback(responseContent);
        }
      } else {
        tokenOut = await getTokenData(chainId, toToken);
        logger.info(`Saving ${toToken} as ${tokenOut.symbol}`);

        await db.insert(erc20Table).values({
          ...(tokenOut as Required<TokenData>),
          chainId,
        });
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
          text: `You don't have enough ${tokenIn.symbol} to swap`,
          actions: ["SWAP_TOKENS"],
          source: message.content.source,
        };

        return await callback(responseContent);
      }

      const calls: CalldataWithDescription[] = [];
      const clientId = runtime.getSetting("KYBER_CLIENT_ID");

      const route = await getSwapRouteV1({
        chainId,
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: amountUnits.toString() as `${number}`,
        clientId,
      });

      const routeSummary = route?.data.routeSummary;
      const routerAddress = route?.data.routerAddress;

      if (!isHex(routerAddress) || !routeSummary) {
        throw new Error(
          `Failed to get swap route, received: ${JSON.stringify(route)}`
        );
      }

      const build = await postSwapRouteV1({
        address,
        route,
        clientId,
        chainId,
      });

      if (!build.data) {
        throw new Error(
          `Failed to build swap route, received: ${JSON.stringify(build)}`
        );
      }

      if (tokenIn.address) {
        // check allowance
        const allowance = await client.readContract({
          address: tokenIn.address,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, routerAddress],
        });

        if (allowance < amountUnits) {
          calls.push({
            to: tokenIn.address,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [routerAddress, amountUnits],
            }),
            title: `Approve ${amount} ${tokenIn.symbol}`,
            description: `Approve spending ${amount} ${tokenIn.symbol} to ${routerAddress}`,
          });
        }
      }

      calls.push({
        to: routerAddress,
        data: build.data.data as `0x${string}`,
        value: build.data.transactionValue,
        title: `Swap ${amount} ${tokenIn.symbol} to ${tokenOut.symbol}`,
        description: `Swap ${amount} ${tokenIn.symbol} to ${tokenOut.symbol}`,
      });

      console.log("swap route", route);

      const json = {
        id: "calls.json",
        url: `data:application/json;base64,${Buffer.from(JSON.stringify(calls)).toString("base64")}`,
      };

      const responseContent: Content = {
        text: `Swapping ${amount} ${tokenIn.symbol} to ${tokenOut.symbol}...
Please approve transactions in your wallet.`,
        actions: ["SWAP_TOKENS"],
        source: message.content.source,
        attachments: [json],
      };

      await callback(responseContent);

      await runtime.createMemory(
        {
          content: {
            text: "Transactions' calldata:",
            attachments: [json],
          },
          agentId: runtime.agentId,
          entityId: message.entityId,
          roomId: message.roomId,
          worldId: message.worldId,
        },
        "messages"
      );

      return true;
    } catch (error) {
      logger.error("Error in SWAP_TOKENS action:", error);
      const responseContent: Content = {
        text: `Failed to swap, reason: ${error.message ?? "unknown"}. Please try again.`,
        actions: ["SWAP_TOKENS"],
        source: message.content.source,
      };

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
          text: "Swapping {{amount}} {{token1}} to {{token2}}...\nPlease approve transactions in your wallet.",
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
          text: "it is {{address}}",
        },
      },
    ],
  ],
};
