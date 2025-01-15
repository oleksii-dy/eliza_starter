import { Plugin } from "@elizaos/core";
import { getNews } from "../actions/getNews";
import { getPriceHistory } from "../actions/getPriceHistory";
import { getFinancials } from "../actions/getFinancials";
import { financialProvider } from "../providers/financeProvider";
export { getNewsByTicker, getPriceHistoryByTicker, getCompanyFinancialsTicker, getFinancialSummarization, getSummarizedNews } from "../utils/polygon";
export { StockAnalyzer } from "../utils/financialanalysis";

export const polygonPlugin: Plugin = {
    name: "polygon",
    description: "Pulls data from Polygon API",
    actions: [getNews, getPriceHistory, getFinancials],
   // providers: [financialProvider],
    evaluators: [],
    // separate examples will be added for services and clients
    services: [],
    clients: [],
};
