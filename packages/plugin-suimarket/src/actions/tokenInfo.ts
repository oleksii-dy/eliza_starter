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
import { formatObjectToText } from "../utils/format";

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
   
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },

    description: "Get detail of token",
    
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

        const parsedContent = content.object as InfoContent;

        if (!isInfoContent(parsedContent)) {
            console.error("Invalid content for coin info");
            if (callback) {
                callback({
                    text: "Unable to process coin info request. Invalid content provided.",
                    content: { error: "Invalid transfer content" },
                });
            }
            return false;
        }

        elizaLogger.log("[coinInfo] parsed content: ", parsedContent);

        let coinGecko = new CoingeckoProvider();
        let info = await coinGecko.getToken(parsedContent.coinId);
        elizaLogger.info("[coinInfo] details: ", JSON.stringify(info));

        if (callback) {
            callback({
                text: `[coinInfo]` + (await formatObjectToText(info)),
                action: 'tokenInfo'
            });
        }

        return true;
    }
}
