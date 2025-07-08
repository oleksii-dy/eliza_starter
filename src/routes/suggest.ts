import { desc, eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { isHex, sha256, toHex } from "viem";
import {
  type IAgentRuntime,
  ModelType,
  type Route,
  logger,
} from "@elizaos/core";
import { schema } from "@elizaos/plugin-sql";
import { LEVVA_SERVICE } from "../constants/enum";
import { suggestTypes, suggestTypeTemplate } from "../templates/generate";
import { CacheEntry } from "../types/core";
import { ILevvaService } from "../types/service";
import { getDb, getLevvaUser, getToken } from "../util/db";
import { getChain } from "../util/eth/client";

type SuggestType = (typeof suggestTypes)[number]["name"];

interface MessageEntry {
  authorId: string;
  rawMessage: {
    text?: string;
    message?: string;
    actions: string[];
    thought: string;
    metadata: Record<string, any>;
  };
}

interface Suggestions {
  label: string;
  text: string;
}

async function handler(req: Request, res: Response, runtime: IAgentRuntime) {
  const { address, channelId } = req.query;
  const service = runtime.getService<ILevvaService>(LEVVA_SERVICE.LEVVA_COMMON);

  try {
    if (!isHex(address)) {
      throw new Error("Invalid address");
    }

    if (!channelId) {
      throw new Error("Channel ID is required");
    }

    const user = (await getLevvaUser(runtime, { address }))[0];

    if (!user) {
      throw new Error("User not found");
    }

    const db = getDb(runtime);

    const messages = (await db
      .select()
      .from(schema.messageTable)
      .where(eq(schema.messageTable.channelId, channelId))
      .orderBy(desc(schema.messageTable.createdAt))
      .limit(10)) as MessageEntry[];

    const needsSuggest = !messages.length || messages[0].authorId !== user.id;

    if (!needsSuggest) {
      res.status(200).json({
        success: true,
        suggestions: [],
      });

      return;
    }

    // most recent chainId when present
    let chainId: number | undefined;
    const recentMessages: (MessageEntry["rawMessage"] & {
      isAgent: boolean;
    })[] = [];

    for (const message of messages) {
      const raw = message.rawMessage;
      const isAgent = message.authorId !== user.id;
      recentMessages.push({ ...raw, isAgent });

      if (
        typeof chainId !== "number" &&
        raw.metadata &&
        "chainId" in raw.metadata
      ) {
        chainId = raw.metadata.chainId;
      }
    }

    if (typeof chainId !== "number") {
      chainId = 1; // use mainnet as fallback
    }

    const chain = getChain(chainId);

    const conversation = recentMessages
      .map((item) => {
        return `${item.isAgent ? "Agent: " : "User: "} ${item.text ?? item.message}`;
      })
      .reverse()
      .join("\n");

    const conversationHash = sha256(toHex(conversation));

    const cached = await runtime.getCache<CacheEntry<Suggestions[]>>(
      `suggestions:${user.address}`
    );

    if (cached?.hash === conversationHash) {
      res.status(200).json({
        success: true,
        suggestions: cached.value,
      });

      return;
    }

    // todo register suggest types corresponding to actions
    // todo improve prompt to determine suggest type
    const gen = await runtime.useModel(ModelType.OBJECT_LARGE, {
      prompt: suggestTypeTemplate
        .replace("{{userData}}", JSON.stringify(user))
        .replace("{{conversation}}", conversation),
    });

    const type = gen.type as SuggestType;
    let result: { suggestions: Suggestions[] } | undefined;

    if (type === "exchange-pairs") {
      const assets = await service.getWalletAssets({
        address,
        chainId,
      });

      const available = await getToken(runtime, { chainId });

      available.push({
        symbol: chain.nativeCurrency.symbol,
        name: chain.nativeCurrency.name,
        decimals: chain.nativeCurrency.decimals,
        address: undefined,
        info: undefined,
        chainId,
      });

      result = await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `<task>
Generate suggestions for exchange pairs, given user's portfolio and available tokens
</task>
<decision>
${JSON.stringify(gen)}
</decision>
<conversation>
${conversation}
</conversation>
<portfolio>
User has following tokens available in portfolio:
${service.formatWalletAssets(assets)}
</portfolio>
<availableTokens>
Tokens known to agent:
${available.map((token) => token.symbol).join(", ")}
</availableTokens>
<instructions>
Generate 5 suggestions for exchange pairs
Please include exact token symbol for suggestion text.
</instructions>
<keys>
- "suggestions" should be an array of objects with the following keys:
  - "label"
  - "text"
</keys>
<output>
Respond using JSON format like this:
{
  "suggestions": [
    {
      "label": "USDT -> ETH",
      "text": "I want to swap USDT to ETH",
    },
    {
      "label": "ETH -> USDT",
      "text": "Please, exchange ETH to USDT",
    },
    {
      "label": "ETH -> USDC",
      "text": "ETH for USDC",
    }
  ]
}

Your response should include the valid JSON block and nothing else.
</output>`,
      });
    } else if (type === "exchange-amount") {
      const assets = await service.getWalletAssets({
        address,
        chainId,
      });

      // todo move it to service
      const available = await getToken(runtime, { chainId });

      available.push({
        symbol: chain.nativeCurrency.symbol,
        name: chain.nativeCurrency.name,
        decimals: chain.nativeCurrency.decimals,
        address: undefined,
        info: undefined,
        chainId,
      });

      result = await runtime.useModel(ModelType.OBJECT_LARGE, {
        prompt: `<task>Generate suggestions for exchange amount or alternative swap pairs, given user's portfolio and previous conversation
</task>
<decision>
${JSON.stringify(gen)}
</decision>
<portfolio>
User has following tokens available in portfolio:
${service.formatWalletAssets(assets)}
</portfolio>
<availableTokens>
Tokens known to agent:
${available.map((token) => token.symbol).join(", ")}
</availableTokens>
<conversation>
${conversation}
</conversation>
<instructions>
User can either have the input token available or not, so consider cases:

1. When input token NOT in portfolio:
  - Generate 4 suggestions for another input token available in portfolio without token amount.
  - Input token should NOT be the same as the output token, so "Swap ETH -> USDT" is CORRECT, but "Swap ETH -> ETH" is WRONG.
  - Acknowledge missing input token in label, eg. "No {{tokenIn}}, swap {{availableToken}} -> {{tokenOut}}".
  - Text should NOT include amount, eg. "I want to swap {{availableToken}} to {{tokenOut}}" is CORRECT, but "I want to swap 0.123456789987654321 {{availableToken}} to {{tokenOut}}" is WRONG.

2. When input token IS in portfolio:
  - Generate 4 suggestions for exchange amount, that corresponds to 100%(or 95% instead for native token or deduced value if present), 50%, 25%, 10% of the input token balance.
  - User should be able to see trimmed swap amount in suggestion label, but not the percentage, eg. NOT "100% {{tokenIn}}", but "0.12 {{tokenIn}}".
  - Trim amount in label to 6 decimal places if the value is less than 1. Use 2 decimal places otherwise, eg. "0.12 {{tokenIn}}".
  - Do not trim amount in text, eg. "I want to swap 0.123456789987654321 {{tokenIn}}".

Determine if user has input token available in portfolio and use appropriate case.
</instructions>
<keys>
- "thought" should be a short description of what the agent is thinking about and planning.
- "suggestions" should be an array of objects with the following keys:
  - "label" - short description of the suggestion
  - "text" - message containing untrimmed swap amount 
</keys>
<output>
Respond using JSON format like this:
{
  "thought": "<string>",
  "suggestions": <array>
}

Your response should include the valid JSON block and nothing else.
</output>`,
      });
    } /* if (type === "default") */ else {
      result = await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `<task>
Generate suggestions for user based on the conversation leading to the following action types
</task>
<decision>
${JSON.stringify(gen)}
</decision>
<conversation>
${conversation}
</conversation>
<actionTypes>
- Analyze portfolio
- Suggest strategy
- Swap tokens
- Crypto news
</actionTypes>
<instructions>
Generate 4 suggestions for chat with agent
</instructions>
<keys>
- "suggestions" should be an array of objects with the following keys:
  - "label"
  - "text"
</keys>
<output>
Respond using JSON format like this:
{
  "suggestions": [
    {
      "label": "What's new?",
      "text": "What's the latest crypto news?",
    }, {
      "label": "Find preferred stragegy",
      "text": "Can you suggest an optimal strategy for me?",
    }, {
      "label": "Exchange tokens",
      "text": "I want to swap tokens, please help",
    }, {
      "label": "Analyze my wallet",
      "text": "Please, tell me about my portfolio",
    }
  ]
}

Your response should include the valid JSON block and nothing else.
</output>`,
      });
    }

    await runtime.setCache(`suggestions:${user.address}`, {
      hash: conversationHash,
      value: result?.suggestions ?? [],
    });

    res.status(200).json({
      success: true,
      suggestions: result?.suggestions ?? [],
    });
  } catch (error) {
    logger.error(error);

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

const suggestRoute: Route = {
  name: "suggest",
  path: "/suggest",
  type: "GET",
  handler,
};

export default suggestRoute;
