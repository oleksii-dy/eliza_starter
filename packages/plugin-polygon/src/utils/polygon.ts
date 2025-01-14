import dotenv from "dotenv";
dotenv.config();

import {
    restClient,
    ITickers,
    ITickersQuery,
    IGlobalOptions,
    ITickerDetails,
    IStockFinancialResults,
    ITickerNews,
} from "@polygon.io/client-js";
import {
    composeContext,
    generateText,
    trimTokens,
    IAgentRuntime,
    State,
    Memory,
    models,
    ModelClass,
    ServiceType,
    elizaLogger,
} from "@elizaos/core";
import { BrowserService } from "@elizaos/plugin-node";
import { format, addDays } from "date-fns";
import {
    FinancialSummarizationTemplate,
    FinancialMapReduceSummarizationTemplate,
    ExtractNewsBasedonTickerTemplate,
} from "../templates";

export const createClient = () => {
    const apiKey = process.env.POLYGON_API_KEY;
    elizaLogger.log("apiKey", apiKey);

    const rest = restClient(apiKey);
    return rest;
};

type NewsResults = {
    ticker: string;
    articles: ITickerNews["results"];
};

export const getNewsByTicker = async (
    ticker: string[]
): Promise<NewsResults[]> => {
    const rest = createClient();

    const news: NewsResults[] = [];

    await Promise.all(
        ticker.map(async (ticker) => {
            try {
                const newsArticles = await rest.reference.tickerNews({
                    ticker: ticker,
                    sort: "published_utc",
                    order: "desc",
                    limit: 20,
                });

                news.push({
                    ticker: ticker,
                    articles: newsArticles.results,
                });
            } catch (error) {
                console.log("No articles found for", ticker);
            }
        })
    );

    return news;
};
type PriceDataPoint = {
    date: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};

type TickerHistory = {
    ticker: string;
    history: PriceDataPoint[];
};

export const getPriceHistoryByTicker = async (
    ticker: string,
    start: number,
    end: number,
    period: string
) => {
    const rest = createClient();
    console.log("getPriceHistoryByTicker called");
    const tickerHistory: TickerHistory[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end); // Current date

    if (end - start <= 86400000) {
        start = end - 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        console.log("start updated in getPriceHistoryByTicker", start);
    }

    try {
        const dailyData = await rest.stocks.aggregates(
            ticker,
            1,
            period,
            String(start),
            String(end)
        );
        if (dailyData.results.length === 0) {
            return [];
        }
        tickerHistory.push({
            ticker: ticker,
            history: dailyData.results.map((result) => ({
                date: result.t,
                open: result.o,
                high: result.h,
                low: result.l,
                close: result.c,
                volume: result.v,
            })),
        });
    } catch (error) {
        console.log(error);
        console.log(
            `No data found for ${ticker} between ${new Date(
                start
            ).toISOString()} and ${new Date(end).toISOString()}`
        );
    }

    return tickerHistory;
};

export const getCompanyFinancialsTicker = async (
    ticker: string
): Promise<IStockFinancialResults["results"]> => {
    const rest = createClient();

    const query = {
        ticker: ticker,
        timeframe: "annual" as "annual" | "quarterly",
        order: "desc" as "desc" | "asc",
        limit: 5,
    };
    const financials = await rest.reference.stockFinancials(query);
    return financials.results;
};

export const getFinancialSummarization = async (
    ticker: string,
    runtime: IAgentRuntime,
    state: State,
    _message: Memory,
    chunkSize: number
) => {
    const financials = await getCompanyFinancialsTicker(ticker);
    if (financials.length === 0) {
        return "";
    }

    state.objective = _message.content.text;

    const summaries = [];

    await Promise.all(
        financials.map(async (financial) => {
            state.financial = JSON.stringify(financial.financials);

            const template = await trimTokens(
                FinancialSummarizationTemplate,
                chunkSize,
                runtime
            );
            const context = composeContext({
                state,
                template,
            });

            const summary = await generateText({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            });
            const summaryWithFiscalPeriod = `${financial.fiscal_year}-${financial.fiscal_period}: ${summary}`;
            summaries.push(summaryWithFiscalPeriod);
        })
    );

    const currentSummary = summaries.join("\n\n");

    state.summaries = currentSummary;

    const template = await trimTokens(
        FinancialMapReduceSummarizationTemplate,
        chunkSize,
        runtime
    );

    const context = composeContext({
        state,
        template,
    });

    const finalSummary = await generateText({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
    });

    return finalSummary;
};

export const getSummarizedNews = async (
    ticker: string,
    runtime: IAgentRuntime,
    state: State,
    _message: Memory
) => {
    const news = await getNewsByTicker([ticker]);
    if (!news) {
        return "";
    }

    const newsBrowser = (await runtime.getService(
        ServiceType.BROWSER
    )) as BrowserService;
    if (!newsBrowser) {
        return "";
    }

    const allSummaries = [];

    for (const newsResult of news) {
        const articles = newsResult.articles.slice(0, 5); // Limit to 5 most recent articles
        const summaries = await Promise.all(
            articles.map(async (article) => {
                try {
                    const newsContent = await newsBrowser.getPageContent(
                        article.article_url,
                        runtime
                    );
                    return {
                        title: newsContent.title,
                        url: article.article_url,
                        publishedDate: article.published_utc,
                        summary: newsContent.description,
                    };
                } catch (error) {
                    console.log("Error getting news content:", error);
                    return null;
                }
            })
        );

        const validSummaries = summaries.filter(Boolean);
        allSummaries.push({
            ticker: newsResult.ticker,
            articles: validSummaries,
        });
    }

    const formattedNews = allSummaries
        .map((summary) => {
            return `News for ${summary.ticker}:\n${summary.articles
                .map(
                    (article) =>
                        `- ${article.title} (${new Date(
                            article.publishedDate
                        ).toLocaleDateString()})\n  ${article.summary}\n`
                )
                .join("\n")}`;
        })
        .join("\n\n");

    state.formattedNews = formattedNews;
    state.ticker = ticker;

    const tickerNewsContext = composeContext({
        state,
        template: ExtractNewsBasedonTickerTemplate,
    });

    const extractNewsBasedOnTicker = await generateText({
        runtime,
        context: tickerNewsContext,
        modelClass: ModelClass.MEDIUM,
    });
    if (!extractNewsBasedOnTicker) {
        return "";
    }

    return extractNewsBasedOnTicker;
};
