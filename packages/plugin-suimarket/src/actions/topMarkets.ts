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
// import { z } from "zod";
import { generateObjectDeprecated } from "@elizaos/core";
import { CoingeckoProvider } from "../providers/coingeckoProvider";
import { formatObjectsToText } from "../utils/format";

const topMarketPromptTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
    Example response:
    \`\`\`json
    {
        vs_currency:"usd",
        ids: "bitcoin,ethereum,solana,bnb,cardano,sui,
        category: "layer-1",
        order: "market_cap_desc",
        per_page: 5,
        page: 1,
        price_change_percentage: "1h",
        locale: "en",
        precision: "8"
    }
    \`\`\`
    {{recentMessages}}

    Extract ONLY from the current message (ignore any previous context or messages):

Given the recent messages, extract the following information:

        vs_currency: Extract currency symbols, following these rules:
            Look for common fiat currency symbols (USD, EUR, VND, etc.)
            Convert all symbols to lowercase
            If multiple currencies found, use the first one only
            Must be wrapped in double quotes
            If no currency specified, return "usd"

        ids: Extract coin IDs, following these rules:
            Must be lowercase
            Comma-separated for multiple coins
            Must be wrapped in double quotes
            Example: "bitcoin,ethereum,solana"
            If no coins specified, return "bitcoin,ethereum,solana,bnb,cardano,sui"

        category: Must be one of:
            layer-1
            layer-2
            ai
            aiagent
            Must be wrapped in double quotes
            If not specified, return layer-1

        order: Must be one of:
            market_cap_desc (default)
            market_cap_asc
            volume_asc
            volume_desc
            id_asc
            id_desc
            Must be wrapped in double quotes

        per_page: Must be:
            Automatically calculated based on number of IDs
            Maximum value of 10 per page
            If IDs count ≤ 10, per_page = number of IDs
            If IDs count > 10, per_page = 10
            No quotes
            Example 1: ids="btc,eth,xrp" → per_page=3
            Example 2: ids="btc,eth,xrp,bnb,sui,sol,cube,wemix,wld,arb,op" → per_page=10

        page: Must be:
            Calculated based on IDs count and per_page
            If IDs count ≤ 10, page=1
            If IDs count > 10, use multiple pages
            No quotes
            Example: 12 IDs → page 1 (first 10 IDs) and page 2 (remaining 2 IDs)

        price_change_percentage: Must be one of:
            1h (default)
            24h
            7d
            14d
            30d
            200d
            1y
            Must be wrapped in double quotes
            Can be comma-separated for multiple timeframes

        locale: Must be:
            Valid language code
            Must be wrapped in double quotes
            Default to "en" if not specified

        precision: Must be:
            String representation of number
            Must be wrapped in double quotes
            Default to "8" if not specified

        VALIDATION RULES:
            All property names must use double quotes
            All string values must use double quotes
            null values should not use quotes
            No trailing commas allowed
            No single quotes anywhere in the JSON

    Respond with a JSON markdown block containing only the extracted values.`;



// function formatOutput(params: any): string {
//     return  JSON.stringify(params);
// }

export const topMarkets: Action = {
    name: "topMarkets",

    similes: [
        "FETCH_TOP_MARKETS",
        "GET_MARKET_RANKINGS",
        "SHOW_TOP_COINS",
        "LIST_TRENDING_MARKETS",
        "DISPLAY_MARKET_LEADERS",
        "GET_CRYPTOCURRENCY_RANKINGS",
        "SHOW_MARKET_CAPS",
        "FETCH_COIN_RANKINGS",
        "GET_TOP_CRYPTOCURRENCIES",
        "DISPLAY_MARKET_OVERVIEW",
        "SHOW_COIN_MARKET_DATA",
        "LIST_TOP_TRADING_PAIRS",
        "GET_MARKET_STATISTICS",
        "FETCH_MARKET_PERFORMANCE",
        "SHOW_CRYPTO_LEADERBOARD"
    ],

    examples: [
    [
        {
        "user": "{{user1}}",
        "content": {
            "text": "What are the top crypto markets right now?"
        }
        },
        {
        "user": "{{user2}}",
        "content": {
            "text": "I'm fetching the latest market data from CoinGecko..."
        }
        },
        {
        "user": "{{user2}}",
        "content": {
            "text": "Here are the top 5 markets by market cap:\n1. Bitcoin (BTC): $43,250 | 24h: +2.3%\n2. Ethereum (ETH): $2,280 | 24h: +1.8%\n3. BNB (BNB): $305 | 24h: +0.5%\n4. Solana (SOL): $98 | 24h: +5.2%\n5. XRP (XRP): $0.62 | 24h: -0.8%",
            "action": "GET_COINGECKO_MARKETS",
            "content": {
            "params": {
                "limit": 5,
                "sortBy": "market_cap",
                "order": "desc",
                "sparkline": true
            }
            }
        }
        }
    ],
    [
        {
        "user": "{{user1}}",
        "content": {
            "text": "Show me the highest volume coins today"
        }
        },
        {
        "user": "{{user2}}",
        "content": {
            "text": "Retrieving the highest volume cryptocurrencies..."
        }
        },
        {
        "user": "{{user2}}",
        "content": {
            "text": "Top 5 coins by 24h volume:\n1. Tether (USDT): $48.2B\n2. Bitcoin (BTC): $32.1B\n3. Ethereum (ETH): $15.8B\n4. USDC (USDC): $12.4B\n5. BNB (BNB): $8.9B",
            "action": "GET_COINGECKO_MARKETS",
            "content": {
            "params": {
                "limit": 5,
                "sortBy": "volume_24h",
                "order": "desc",
                "sparkline": false
            }
            }
        }
        }
    ]
    ],

    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },

    description: "Retrieves top cryptocurrency markets data from CoinGecko including price, market cap, volume and other key metrics",

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[topMarkets]");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }
        const topMarketsContext = composeContext({
            state,
            template: topMarketPromptTemplate,
        });
        // Generate transfer content
        const content = await generateObjectDeprecated({
            runtime,
            context: topMarketsContext,
            modelClass: ModelClass.LARGE,
        });

        elizaLogger.log("content: ",content);


        const coinGecko = new CoingeckoProvider();
        const info = await coinGecko.getTopMarketInfo(
            content.vs_currency,
            content.ids,
            content.category,
            content.order,
            content.per_page,
            content.page,
            content.price_change_percentage,
            content.locale,
            content.precision
        );

        if (callback) {
            callback({
                text: `topMarkets` + (await formatObjectsToText(info)),
                action: 'topMarkets'
            });
        }

        return true;
    }
}
