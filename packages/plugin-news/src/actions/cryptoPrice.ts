import { generateText, ModelClass } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import {
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";

const MAX_RETRIES = 3;
const RATE_LIMIT_DELAY = 1000;

export const cryptoPriceAction: Action = {
    name: "CRYPTO_PRICE",
    similes: [
        "CRYPTO_PRICE",
        "CRYPTOCURRENCY_PRICE",
        "TOKEN_PRICE",
        "COIN_PRICE",
        "CRYPTO_VALUE",
        "CRYPTO_MARKET",
        "CRYPTO_STATS",
    ],
    description:
        "Use this action when users ask about cryptocurrency prices, market data, or statistics.",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        }

        // Initialize API configuration
        const API_BASE_URL = "https://api.coingecko.com/api/v3";
        const headers = {
            accept: "application/json",
            "x-cg-demo-api-key": "CG-9Th38kYNk897hKYtEJwSjdaY",
        };

        // Helper function to make API calls with retry logic
        async function makeApiCall(endpoint: string, params: any = {}) {
            let retries = 0;
            while (retries < MAX_RETRIES) {
                try {
                    const queryString = new URLSearchParams(params).toString();
                    const url = `${API_BASE_URL}${endpoint}${queryString ? "?" + queryString : ""}`;

                    const response = await fetch(url, { headers });

                    if (response.status === 429) {
                        // Rate limited, wait and retry
                        await new Promise((resolve) =>
                            setTimeout(resolve, RATE_LIMIT_DELAY)
                        );
                        retries++;
                        continue;
                    }

                    return await response.json();
                } catch (error) {
                    elizaLogger.error(`API call failed: ${error}`);
                    retries++;
                    if (retries === MAX_RETRIES) throw error;
                    await new Promise((resolve) =>
                        setTimeout(resolve, RATE_LIMIT_DELAY)
                    );
                }
            }
        }

        async function getCryptoDetails(query: {
            symbol?: string;
            name?: string;
        }) {
            try {
                // First get the coin id using the search endpoint
                const searchResponse = await makeApiCall("/search", {
                    query: query.name || query.symbol,
                });

                if (
                    !searchResponse.coins ||
                    searchResponse.coins.length === 0
                ) {
                    return null;
                }

                const coinId = searchResponse.coins[0].id;

                // Get market data
                const marketData = await makeApiCall(`/coins/${coinId}`, {
                    localization: false,
                    tickers: false,
                    community_data: false,
                    developer_data: false,
                    sparkline: false,
                });

                return marketData;
            } catch (error) {
                elizaLogger.error("Error fetching crypto details:", error);
                return null;
            }
        }

        function formatPriceUpdate(data: any): string {
            if (!data || !data.market_data) {
                return "Sorry, I couldn't find data for that cryptocurrency.";
            }

            const marketData = data.market_data;

            return `
            ${data.name}'s Info
Current Price: $${marketData.current_price.usd.toFixed(2)}
24h Change: ${marketData.price_change_percentage_24h.toFixed(2)}%
24h Volume: $${(marketData.total_volume.usd / 1000000).toFixed(2)}M
Market Cap: $${(marketData.market_cap.usd / 1000000000).toFixed(2)}B
All Time High: $${marketData.ath.usd.toFixed(2)}
Last Updated: ${new Date(marketData.last_updated).toLocaleString()}
            `.trim();
        }

        try {
            // Extract crypto query from message
            const symbolContext = `
            Extract the crypto query from the {{userName}} message. The message is: ${message.content.text}
            Only return the crypto token symbol, do not include any other text
            return the symbol string only
            E.g Give me pear price action return PEAR
            update on btc return BTC
             `;

            const tokenNameContext = `
            Extract the crypto query from the {{userName}} message. The message is: ${message.content.text}
            Only return the crypto token name, do not include any other text
            return the name string only
            E.g Give me pear price action return Pear
                update on btc return Bitcoin
             `;

            const symbolQuery = await generateText({
                runtime,
                context: symbolContext,
                modelClass: ModelClass.SMALL,
            });
            const tokenNameQuery = await generateText({
                runtime,
                context: tokenNameContext,
                modelClass: ModelClass.SMALL,
            });

            callback({
                text: "Fetching cryptocurrency data...",
                action: "CRYPTO_PRICE",
                source: message.content.source,
            });

            const cryptoData = await getCryptoDetails({
                symbol: symbolQuery.toLowerCase(),
                name: tokenNameQuery.toLowerCase(),
            });

            if (!cryptoData) {
                callback({
                    text: "Sorry, I couldn't find data for that cryptocurrency.",
                    action: "CRYPTO_PRICE",
                    source: message.content.source,
                });
                return true;
            }

            const priceUpdate = formatPriceUpdate(cryptoData);

            const newMemory: Memory = {
                userId: message.userId,
                roomId: message.roomId,
                agentId: message.agentId,
                content: {
                    text: priceUpdate,
                    action: "CRYPTO_PRICE",
                    source: message.content.source,
                },
            };

            await runtime.messageManager.createMemory(newMemory);
            callback(newMemory.content);
        } catch (error) {
            elizaLogger.error("Error in crypto price action:", error);
            callback({
                text: "Sorry, I encountered an error while fetching cryptocurrency data.",
                action: "CRYPTO_PRICE",
                source: message.content.source,
            });
        }

        return true;
    },

    examples: [
        [
            {
                user: "user",
                content: {
                    text: "What's the current price of Bitcoin?",
                    action: "CRYPTO_PRICE",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "Let me fetch the latest Bitcoin price data for you.",
                    action: "CRYPTO_PRICE",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "I'll check Ethereum's current market performance.",
                    action: "CRYPTO_PRICE",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
