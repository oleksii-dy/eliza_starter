import {
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    composeContext,
    elizaLogger,
    generateObject,
    type Action,
} from "@elizaos/core";
import { z } from "zod";

import { CoingeckoProvider } from "../providers/coingeckoProvider";

export interface InfoContent extends Content {
    coinId: string;
}

function isInfoContent(content: Content): content is InfoContent {
    console.log("Content for transfer", content);
    return (
        typeof content.coinId === "string"
    );
}

const coinInfoTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "coinId": "bitcoin"
}
\`\`\`


{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- Coin ID according to CoinGecko's coin list

Respond with a JSON markdown block containing only the extracted values.`;

export const tokenInfo: Action = {
    name: "tokenInfo",
    similes: [
        "GET_TOKEN",
        "TOKEN_DATA",
        "TOKEN_DETAILS",
        "SHOW_TOKEN",
        "CHECK_TOKEN",
        "TOKEN_STATUS",
        "TOKEN_LOOKUP",
        "FIND_TOKEN",
        "TOKEN_PRICE",
        "PRICE_CHECK",
        "GET_PRICE",
        "PRICE_INFO",
        "TOKEN_METRICS",
        "TOKEN_STATS"
    ],
    examples: [],
    // examples: [
    //   [
    //   {
    //       user: "{{user1}}",
    //       content: {
    //           text: "What's the current price of Bitcoin?",
    //       },
    //   },
    //   {
    //       user: "{{user2}}",
    //       content: {
    //           text: "I'll check the Bitcoin price for you",
    //           action: "GET_PRICE",
    //       },
    //   },
    //   {
    //       user: "{{user2}}",
    //       content: {
    //           text: "Bitcoin is currently trading at $42,000 USD with 24h volume of $28B",
    //       },
    //   }
    // ],
    //   [
    //     {
    //         user: "{{user1}}",
    //         content: {
    //             text: "What's the current price of ADA?",
    //         },
    //     },
    //     {
    //         user: "{{user2}}",
    //         content: {
    //             text: "I'll check the Cardano (ADA) price for you",
    //             action: "GET_PRICE",
    //         },
    //     },
    //     {
    //         user: "{{user2}}",
    //         content: {
    //             text: "Cardano (ADA) is currently trading at $0.45 USD with 24h volume of $150M",
    //         },
    //     }
    // ],
    // [
    //     {
    //         user: "{{user1}}",
    //         content: {
    //             text: "What's the current price of ETH?",
    //         },
    //     },
    //     {
    //         user: "{{user2}}",
    //         content: {
    //             text: "I'll check the Ethereum (ETH) price for you",
    //             action: "GET_PRICE",
    //         },
    //     },
    //     {
    //         user: "{{user2}}",
    //         content: {
    //             text: "Ethereum (ETH) is currently trading at $2,200 USD with 24h volume of $15B",
    //         },
    //     }
    // ]
    // ] as ActionExample [][],
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },
    description: "Get Token info from coingecko",
    
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[tokenInfo]");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const _schema = z.object({
          coinId: z.string()
        });

        const _context = composeContext({
            state,
            template: coinInfoTemplate,
        });

        const content = await generateObject({
            runtime,
            context: _context,
            schema: _schema,
            modelClass: ModelClass.SMALL,
        });

        const transferContent = content.object as InfoContent;

        // Validate transfer content
        if (!isInfoContent(transferContent)) {
            console.error("Invalid content for coin info");
            if (callback) {
                callback({
                    text: "Unable to process coin info request. Invalid content provided.",
                    content: { error: "Invalid transfer content" },
                });
            }
            return false;
        }

        elizaLogger.log("[coinInfo]", transferContent);

        let coinGecko = new CoingeckoProvider();
        let info = await coinGecko.getCoinDetails(transferContent.coinId);
        elizaLogger.info("btc info>", JSON.stringify(info));

        if (callback) {
            callback({
                text: `Coin info: ` + JSON.stringify(info),
                action: 'tokenInfo'
            });
        }

        return true;
    }
}
