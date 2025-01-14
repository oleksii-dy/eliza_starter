import {
    Action,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    elizaLogger,
    composeContext,
    ModelClass,
    generateText
} from "@elizaos/core";
import {
    getPriceHistoryByTicker

}
from '../utils/polygon';
import { generateLineGraph } from '../services/chartGeneration';
import { CurrentPriceTemplate, PriceHistoryRangeTemplate } from '../templates';
import { extractTickerFromMessage, getDateRange } from '@jawk/utils';

export const getPriceHistory: Action = {
    name:"GET_PRICE_HISTORY",
    similes: [
        "GET_PRICES",
        "STOCK_PRICES",
        "PRICE_HISTORY",
        "GET_HISTORICAL_PRICES",
        "CHECK_PRICE_HISTORY",
        "STOCK_PRICES_HISTORY"
    ],
    description: "Fetches price history for a company or stock ticker. Use this action when the user asks about stock prices. Returns latest price if user asking for current price.",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        return Boolean(process.env.POLYGON_API_KEY);
    },
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state?: State,
        _options?: any,
        callback?: HandlerCallback
    ) => {
        try {
            const ticker = await extractTickerFromMessage(
                runtime,
                _message,
                state
            );
            if (!ticker) {
                callback?.(
                    { text: "Failed to extract ticker from message." },
                    []
                );
                return false
            }

            state = await runtime.composeState(_message, {
                userQuery: _message.content.text,
                ticker: ticker,
            });
            let context = null;

            const dateRange = await getDateRange(runtime, _message, state, PriceHistoryRangeTemplate);
            console.log("dateRange", dateRange);
            if (!dateRange) {
                callback?.(
                    { text: "Failed to get date range." },
                    []
                );
                return false
            }
            console.log("dateRange", dateRange);

            let { start, end, period } = dateRange;
            console.log("start", start);
            console.log("end", end);
            console.log("period", period);

            console.log("if check condition num: ", Math.abs(Number(end) - Number(start)));
            if (Math.abs(Number(end) - Number(start)) <= 86400000) { // 24 hours in milliseconds
                console.log("if statement");
                console.log("updated start", start);
            console.log("end", end);
            const prices = await getPriceHistoryByTicker(ticker, Number(start), Number(end), period);
            console.log("getPriceHistoryByTicker had response");
            if (prices[0].history.length === 0) {
                callback?.(
                    { text: "No data found for the given ticker and date range." },
                    []
                );
                return false
            }
            const closePrices = prices[0].history.map(({ date, close }) => ({ date, close }));
            state.closePrice = closePrices[0].close;  // 242.7
            state.closeDate = new Date(closePrices[0].date).toLocaleDateString();  // Converts timestamp to readable date

            console.log("closePrice", state.closePrice);
            console.log("closeDate", state.closeDate);

                const template = CurrentPriceTemplate;
                context = composeContext({
                    state,
                        template,
                    })
                } else {
                    console.log("else statement");
            const prices = await getPriceHistoryByTicker(ticker, Number(start), Number(end), period);
            if (prices[0].history.length === 0) {
                callback?.(
                    { text: "No data found for the given ticker and date range." },
                    []
                );
                return false
            }
            console.log("We got this many price points:", prices[0].history.length);
            const outputPath = './line_graph.jpeg';

            const closePrices = prices[0].history.map(({ date, close }) => ({ date, close }));

            try {
                const result = await generateLineGraph(closePrices, period, ticker, outputPath);
                console.log('Chart generated at:', result);
            } catch (err) {
                console.error('Error generating chart:', err);
            }

            state.closePrices = closePrices;
            console.log("start", start);
            console.log("end", end);
                    const template = PriceHistoryRangeTemplate;
                    context = composeContext({
                        state,
                        template,
                    })
                }

            console.log("context", context);


            const priceResponse = await generateText({runtime, context, modelClass: ModelClass.SMALL})

            callback?.(
                { text:priceResponse}
            )
            return true
        } catch (error) {
            elizaLogger.error("Error getting prices:", error);
            callback?.(
                { text: "Failed to get prices." },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How much is a share of Amazon worth?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "",
                    action: "GET_PRICE_HISTORY"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How much is $AMZN",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "",
                    action: "GET_PRICE_HISTORY"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What is the price of Amazon stock?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "",
                    action: "GET_PRICE_HISTORY"
                },
            },
        ],
    ],
};
