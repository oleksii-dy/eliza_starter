import {
    ActionExample,
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@elizaos/core";
import axios from "axios";
import { validateMoralisConfig } from "../../environment";
import { getPairOHLCVTemplate } from "../../templates/pairOHLCV";
import { API_ENDPOINTS, SOLANA_API_BASE_URL } from "../../utils/constants";
import { OHLCVParams, OHLCVResponse } from "../../types/solana";

export default {
    name: "GET_SOLANA_PAIR_OHLCV",
    similes: [
        "FETCH_SOLANA_PAIR_HISTORY",
        "GET_SOLANA_PRICE_HISTORY",
        "SHOW_SOLANA_PAIR_CANDLES",
        "CHECK_SOLANA_PRICE_CHART",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        await validateMoralisConfig(runtime);
        return true;
    },
    description:
        "Get OHLCV (price history) data for a specific trading pair on Solana blockchain",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting Moralis GET_SOLANA_PAIR_OHLCV handler...");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            elizaLogger.log("Composing OHLCV request context...");
            const ohlcvContext = composeContext({
                state,
                template: getPairOHLCVTemplate,
            });

            elizaLogger.log("Extracting OHLCV parameters...");
            const content = (await generateObjectDeprecated({
                runtime,
                context: ohlcvContext,
                modelClass: ModelClass.LARGE,
            })) as unknown as OHLCVParams & { pairAddress: string };

            console.log("User extracted params", content);

            if (!content || typeof content !== "object") {
                throw new Error("Invalid response format from model");
            }

            if (!content.pairAddress) {
                throw new Error("No Solana pair address provided");
            }

            const config = await validateMoralisConfig(runtime);
            elizaLogger.log(
                `Fetching OHLCV data for Solana pair ${content.pairAddress}...`
            );

            const response = await axios.get<OHLCVResponse>(
                `${SOLANA_API_BASE_URL}${API_ENDPOINTS.SOLANA.PAIR_OHLCV(content.pairAddress)}`,
                {
                    params: {
                        timeframe: content.timeframe || "1h",
                        currency: content.currency || "usd",
                        fromDate: content.fromDate,
                        toDate: content.toDate,
                        limit: content.limit || 24,
                    },
                    headers: {
                        "X-API-Key": config.MORALIS_API_KEY,
                        accept: "application/json",
                    },
                }
            );

            const candles = response.data.result;
            elizaLogger.success(
                `Successfully fetched ${candles.length} OHLCV candles for pair ${content.pairAddress}`
            );

            if (callback) {
                const timeframe = content.timeframe || "1h";
                const currency = (content.currency || "usd").toUpperCase();

                const formattedCandles = candles.map((candle) => ({
                    time: new Date(candle.timestamp).toLocaleString(),
                    open: `$${candle.open.toFixed(4)}`,
                    high: `$${candle.high.toFixed(4)}`,
                    low: `$${candle.low.toFixed(4)}`,
                    close: `$${candle.close.toFixed(4)}`,
                    volume: `$${Math.round(candle.volume).toLocaleString()}`,
                    trades: candle.trades.toLocaleString(),
                }));

                let summaryText = `Here's the ${timeframe} price history in ${currency} for the Solana trading pair:\n\n`;

                // Add price range summary
                const priceRange = {
                    min: Math.min(...candles.map((c) => c.low)),
                    max: Math.max(...candles.map((c) => c.high)),
                };
                summaryText += `Price Range: $${priceRange.min.toFixed(4)} - $${priceRange.max.toFixed(4)}\n`;

                // Add volume summary
                const totalVolume = candles.reduce(
                    (sum, c) => sum + c.volume,
                    0
                );
                summaryText += `Total Volume: $${Math.round(totalVolume).toLocaleString()}\n`;

                // Add total trades
                const totalTrades = candles.reduce(
                    (sum, c) => sum + c.trades,
                    0
                );
                summaryText += `Total Trades: ${totalTrades.toLocaleString()}\n\n`;

                // Add candlestick data
                summaryText += `Latest ${Math.min(5, candles.length)} candles:\n`;
                formattedCandles.slice(0, 5).forEach((candle) => {
                    summaryText +=
                        `\nTime: ${candle.time}\n` +
                        `Open: ${candle.open}, High: ${candle.high}, Low: ${candle.low}, Close: ${candle.close}\n` +
                        `Volume: ${candle.volume}, Trades: ${candle.trades}`;
                });

                callback({
                    text: summaryText,
                    content: {
                        candles: response.data.result,
                        pairAddress: content.pairAddress,
                        timeframe,
                        currency,
                    },
                });
            }

            return true;
        } catch (error: any) {
            elizaLogger.error("Error in GET_SOLANA_PAIR_OHLCV handler:", error);
            if (callback) {
                callback({
                    text: `Error fetching Solana pair OHLCV data: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Get hourly price history for Solana pair A8nPhpCJqtqHdqUk35Uj9Hy2YsGXFkCZGuNwvkD3k7VC",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll fetch the hourly price history for this Solana trading pair.",
                    action: "GET_SOLANA_PAIR_OHLCV",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me 15-minute candles for Solana pair 83v8iPyZihDEjDdY8RdZddyZNyUtXngz69Lgo9Kt5d6d",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll retrieve the 15-minute candlestick data for this Solana trading pair.",
                    action: "GET_SOLANA_PAIR_OHLCV",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
