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
    elizaLogger.log("getNewsByTicker called with tickers:", ticker);
    const rest = createClient();

    const news: NewsResults[] = [];

    elizaLogger.log("Fetching news for each ticker...");
    await Promise.all(
        ticker.map(async (ticker) => {
            elizaLogger.log(`Fetching news for ticker: ${ticker}`);
            try {
                const newsArticles = await rest.reference.tickerNews({
                    ticker: ticker,
                    sort: "published_utc",
                    order: "desc",
                    limit: 20,
                });

                elizaLogger.log(`Found ${newsArticles.results.length} articles for ${ticker}`);
                news.push({
                    ticker: ticker,
                    articles: newsArticles.results,
                });
            } catch (error) {
                elizaLogger.log(`No articles found for ${ticker}`, error);
            }
        })
    );

    elizaLogger.log(`Returning news for ${news.length} tickers`);
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
    elizaLogger.log("getPriceHistoryByTicker called", {ticker, start, end, period});
    const rest = createClient();
    const tickerHistory: TickerHistory[] = [];
    const startDate = new Date(start);
    const endDate = new Date(Math.min(end, Date.now() - 15 * 60 * 1000));

    elizaLogger.log(`Fetching price history from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    if (end - start <= 86400000) {
        start = end - 24 * 60 * 60 * 1000;
        elizaLogger.log("Time range too short, adjusted start date", new Date(start).toISOString());
    }

    try {
        elizaLogger.log("Requesting aggregates from Polygon API...");
        const dailyData = await rest.stocks.aggregates(
            ticker,
            1,
            period,
            String(start),
            String(end)
        );
        if (dailyData.results.length === 0) {
            elizaLogger.log("No results returned from Polygon API");
            return [];
        }
        elizaLogger.log(`Received ${dailyData.results.length} data points`);

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
        elizaLogger.error("Error fetching price history:", error);
        elizaLogger.log(
            `No data found for ${ticker} between ${new Date(
                start
            ).toISOString()} and ${new Date(end).toISOString()}`
        );
    }

    elizaLogger.log(`Returning history with ${tickerHistory[0]?.history.length || 0} data points`);
    return tickerHistory;
};

export const getCompanyFinancialsTicker = async (
    ticker: string
): Promise<IStockFinancialResults["results"]> => {
    elizaLogger.log("getCompanyFinancialsTicker called for", ticker);
    const rest = createClient();

    const query = {
        ticker: ticker,
        timeframe: "annual" as "annual" | "quarterly",
        order: "desc" as "desc" | "asc",
        limit: 5,
    };
    elizaLogger.log("Requesting financial data with query:", query);
    const financials = await rest.reference.stockFinancials(query);
    elizaLogger.log(`Received ${financials.results.length} financial records`);
    return financials.results;
};

export const getFinancialSummarization = async (
    ticker: string,
    runtime: IAgentRuntime,
    state: State,
    _message: Memory,
    chunkSize: number
) => {
    elizaLogger.log("getFinancialSummarization called", {ticker, chunkSize});
    const financials = await getCompanyFinancialsTicker(ticker);
    if (financials.length === 0) {
        elizaLogger.log("No financials found, returning empty string");
        return "";
    }

    state.objective = _message.content.text;
    elizaLogger.log("Processing financials for summarization");

    const summaries = [];

    await Promise.all(
        financials.map(async (financial) => {
            elizaLogger.log(`Processing financial period: ${financial.fiscal_year}-${financial.fiscal_period}`);
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

            elizaLogger.log("Generating summary for period");
            const summary = await generateText({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            });
            const summaryWithFiscalPeriod = `${financial.fiscal_year}-${financial.fiscal_period}: ${summary}`;
            summaries.push(summaryWithFiscalPeriod);
        })
    );

    elizaLogger.log(`Generated ${summaries.length} period summaries`);
    const currentSummary = summaries.join("\n\n");

    state.summaries = currentSummary;

    elizaLogger.log("Generating final summarization");
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

    elizaLogger.log("Financial summarization complete");
    return finalSummary;
};

export const getSummarizedNews = async (
    ticker: string,
    runtime: IAgentRuntime,
    state: State,
) => {
    elizaLogger.log("getSummarizedNews called for", ticker);
    const news = await getNewsByTicker([ticker]);
    if (!news) {
        elizaLogger.log("No news found, returning empty string");
        return "";
    }

    const newsBrowser = (await runtime.getService(
        ServiceType.BROWSER
    )) as BrowserService;
    if (!newsBrowser) {
        elizaLogger.log("Browser service not available");
        return "";
    }

    const allSummaries = [];

    elizaLogger.log("Processing news articles");
    for (const newsResult of news) {
        elizaLogger.log(`Processing news for ${newsResult.ticker}`);
        const articles = newsResult.articles.slice(0, 5);
        elizaLogger.log(`Processing ${articles.length} recent articles`);

        const summaries = await Promise.all(
            articles.map(async (article) => {
                try {
                    elizaLogger.log(`Fetching content for article: ${article.article_url}`);
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
                    elizaLogger.error("Error getting news content:", error);
                    return null;
                }
            })
        );

        const validSummaries = summaries.filter(Boolean);
        elizaLogger.log(`Got ${validSummaries.length} valid summaries`);
        allSummaries.push({
            ticker: newsResult.ticker,
            articles: validSummaries,
        });
    }

    elizaLogger.log("Formatting news summaries");
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

    elizaLogger.log("Generating final news context");
    const tickerNewsContext = composeContext({
        state,
        template: ExtractNewsBasedonTickerTemplate,
    });

    elizaLogger.log("Generating final news summary");
    const extractNewsBasedOnTicker = await generateText({
        runtime,
        context: tickerNewsContext,
        modelClass: ModelClass.MEDIUM,
    });
    if (!extractNewsBasedOnTicker) {
        elizaLogger.log("Failed to generate news summary");
        return "";
    }

    elizaLogger.log("News summarization complete");
    return extractNewsBasedOnTicker;
};
