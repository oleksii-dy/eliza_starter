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
import { formatObjectsToText } from "../utils/format";


export const topMarkets: Action = {
    name: "topMarkets",
   
    similes: [
        "fetch top markets",
        "get market rankings", 
        "show top coins",
        "list trending markets",
        "display market leaders",
        "get cryptocurrency rankings",
        "show market caps",
        "fetch coin rankings",
        "get top cryptocurrencies",
        "display market overview",
        "show coin market data",
        "list top trading pairs",
        "get market statistics",
        "fetch market performance",
        "show crypto leaderboard"
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
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
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

        let coinGecko = new CoingeckoProvider();
        let info = await coinGecko.getTopMarketInfo();

        if (callback) {
            callback({
                text: `topMarkets` + (await formatObjectsToText(info)),
                action: 'topMarkets'
            });
        }

        return true;
    }
}
