import {
    type ActionExample,
    elizaLogger,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
    type Action,
} from "@elizaos/core";
import { BinanceService } from "../services";

export const getKlineAction: Action = {
    name: "GET_KLINE",
    similes: [
        "GET_KLINE",
    ],
    description: "Get current kline information for a cryptocurrency pair",
    validate: async () => true, // Public endpoint
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: Record<string, unknown>,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
          
            console.log("handleBnbQuery 8, in fungbnb. action.handler");
            const binanceService = new BinanceService({
                apiKey: runtime.getSetting("BINANCE_API_KEY"),
                secretKey: runtime.getSetting("BINANCE_SECRET_KEY"),
                });
            // const binanceService = new BinanceService();
            const klineData = await binanceService.getKline({symbol: "BTCUSDT", interval: "1m"});

            console.log("handleBnbQuery 9, in fungbnb. action.handler kilneData: ", JSON.stringify(klineData));

            if (callback) {
                callback({
                    text: `The current`,
                    content: klineData,
                });
            }

            return true;
        } catch (error) {
            elizaLogger.error("Error in price check:", error);
            if (callback) {
                const errorMessage = error.message.includes("Invalid API key")
                    ? "Unable to connect to Binance API"
                    : error.message.includes("Invalid symbol")
                      ? "Sorry, could not find price for the cryptocurrency symbol you provided"
                      : `Sorry, I encountered an error: ${error.message}`;

                callback({
                    text: errorMessage,
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
                    text: "What's the current kline of Bitcoin?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll check the current Bitcoin kilne for you right away.",
                    action: "GET_PRICE",
                },
            }
        ]
    ] as ActionExample[][],
} as Action;
