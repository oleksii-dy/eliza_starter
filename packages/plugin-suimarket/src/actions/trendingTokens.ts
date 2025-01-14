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
    // generateObject,
    type Action,
} from "@elizaos/core";
import { generateObjectDeprecated } from "@elizaos/core";
import { CoingeckoProvider } from "../providers/coingeckoProvider";
// import { formatObjectsToText } from "../utils/format";
const trendingPromptTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
    Example response:
    \`\`\`json
    {
        size:1
    }
    \`\`\`
    {{recentMessages}}

    Extract ONLY from the current message (ignore any previous context or messages):

        Given the recent messages, extract the following information:

        size: Number of news items to return: Must be a positive integer Default is 1 if not specified Maximum value is 100 Minimum value is 1 If mentioned in message, use that number If not mentioned, use default value 1

        VALIDATION RULES:
            All property names must use double quotes
            All string values must use double quotes
            null values should not use quotes
            No trailing commas allowed
            No single quotes anywhere in the JSON

    Respond with a JSON markdown block containing only the extracted values.`;


export const trendingTokens: Action = {
    name: "trendingTokens",

    description: "Get trending tokens",

    similes: [
        "SHOW_TRENDING_COINS",
        "GET_HOT_TOKENS",
        "FETCH_TRENDING_CRYPTO",
        "DISPLAY_POPULAR_TOKENS",
        "SHOW_WHATS_TRENDING",
        "GET_MOST_SEARCHED_TOKENS",
        "LIST_VIRAL_CRYPTOCURRENCIES",
        "SHOW_BUZZING_TOKENS",
        "GET_HYPED_COINS",
        "DISPLAY_TRENDING_GAINERS",
        "FETCH_TRENDING_MOVERS",
        "SHOW_TRENDING_MOMENTUM",
        "GET_VIRAL_TOKENS",
        "DISPLAY_TRENDING_MARKETS",
        "SHOW_BREAKOUT_TOKENS"
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

    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
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
        const newsCryptoPannicContext = composeContext({
            state,
            template: trendingPromptTemplate,
        });
        // Generate transfer content
        const content = await generateObjectDeprecated({
            runtime,
            context: newsCryptoPannicContext,
            modelClass: ModelClass.SMALL,
        });
        elizaLogger.log("content: ",content);
        const coinGecko = new CoingeckoProvider();
        const info = await coinGecko.getTrendingTokens();

        if (callback) {
            callback({
                text: `Below are ${content.size} trending coins we have collected,`,
                action: 'trendingTokens',
                result: {
                    type: "marketStatisticsTable",
                    data:info.slice(0,content.size)
                }
            });
        }

        return true;
    }
}
