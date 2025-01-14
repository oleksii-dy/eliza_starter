import {
    // ActionExample,
    // Content,
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

import { CoingeckoProvider } from "../providers/coingeckoProvider";
import { formatObjectsToText } from "../utils/format";


export const trendingTokens: Action = {
    name: "trendingTokens",

    description: "Get trending tokens",

    similes: [
        "show trending coins",
        "get hot tokens",
        "fetch trending crypto",
        "display popular tokens",
        "show what's trending",
        "get most searched tokens",
        "list viral cryptocurrencies",
        "show buzzing tokens",
        "get hyped coins",
        "display trending gainers",
        "fetch trending movers",
        "show trending momentum",
        "get viral tokens",
        "display trending markets",
        "show breakout tokens"
    ],

    examples: [
    [
        {
        "user": "{{user1}}",
        "content": {
            "text": "What tokens are trending right now?"
        }
        },
        {
        "user": "{{user2}}",
        "content": {
            "text": "I'm fetching the current trending tokens data..."
        }
        },
        {
        "user": "{{user2}}",
        "content": {
            "text": "🔥 Top Trending Tokens:\n1. PEPE: +145% (24h) | 250K mentions\n2. BONK: +67% (24h) | 180K mentions\n3. WIF: +23% (24h) | 120K mentions\n4. JUP: +89% (24h) | 95K mentions\n5. SATS: +12% (24h) | 85K mentions",
            "action": "GET_TRENDING_TOKENS",
            "content": {
            "params": {
                "limit": 5,
                "timeframe": "24h",
                "includeSocial": true
            }
            }
        }
        }
    ],
    [
        {
        "user": "{{user1}}",
        "content": {
            "text": "Show me the hottest coins today"
        }
        },
        {
        "user": "{{user2}}",
        "content": {
            "text": "Looking up today's hottest cryptocurrencies..."
        }
        },
        {
        "user": "{{user2}}",
        "content": {
            "text": "🚀 Today's Hottest Coins:\n1. MEME: 2.4M trades | +234% volume\n2. DOGE: 1.8M trades | +156% volume\n3. SHIB: 950K trades | +89% volume\n4. FLOKI: 780K trades | +67% volume\n5. WOJAK: 550K trades | +45% volume",
            "action": "GET_TRENDING_TOKENS",
            "content": {
            "params": {
                "limit": 5,
                "timeframe": "today",
                "includeTrading": true
            }
            }
        }
        }
    ]
    ],

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[trendingTokens]");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        let coinGecko = new CoingeckoProvider();
        let info = await coinGecko.getTrendingTokens();

        if (callback) {
            callback({
                text: `[trendingTokens]: ` + (await formatObjectsToText(info)),
                action: 'trendingTokens'
            });
        }

        return true;
    }
}
