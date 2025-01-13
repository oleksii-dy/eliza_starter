import { IAgentRuntime, Memory, State, Provider } from "@elizaos/core";
import { generateRandomTicker } from "@jawk/utils";
import { models } from "@elizaos/core";
import {
    getPriceHistoryByTicker,
    getFinancialSummarization,
    getSummarizedNews,
} from "../utils/polygon";
import { format } from "date-fns";
import { extractTickerFromMessage } from "@jawk/utils";
export const financialProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        let ticker = "";

        if (message.content.text === "") {
            ticker = generateRandomTicker();
        } else {
            state.currentQuery = message.content.text;
            ticker = await extractTickerFromMessage(runtime, message, state);
            if (ticker === "") {
                return "";
            }
        }
        // What time period do we want to get the price history for?
        const startDate = format(
            new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
            "yyyy-MM-dd"
        );
        const endDate = format(new Date(), "yyyy-MM-dd");

        const priceHistory = await getPriceHistoryByTicker(
            ticker,
            startDate,
            endDate,
            "day"
        );

        const chunkSize =
            models[runtime.modelProvider].settings.maxInputTokens - 1000;

        const financialData = await getFinancialSummarization(
            ticker,
            runtime,
            state,
            message,
            chunkSize
        );

        const news = await getSummarizedNews(ticker, runtime, state, message);

        return `
        [Provider]
        Please use this information below to answer any questions related to a stock or company.

        Here is information about ${ticker}.

		Ticker: ${ticker}

		Price History: ${JSON.stringify(
            priceHistory[0].history.map((p) => p.close).slice(0, 30)
        )}

		Financial Data: ${JSON.stringify(financialData)}

		News: ${news}

        User Query: ${state.currentQuery}

        [End of Provider]
		`;
    },
};
