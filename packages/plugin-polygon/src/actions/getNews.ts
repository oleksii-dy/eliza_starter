import {
    Action,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    elizaLogger,
} from "@elizaos/core";
import { getSummarizedNews } from "../utils/polygon";
import { extractTickerFromMessage } from "@jawk/utils";

export const getNews: Action = {
    name: "GET_NEWS",
    similes: [
        "FETCH_NEWS",
        "GET_LATEST_NEWS",
        "SHOW_NEWS",
        "WHATS_HAPPENING",
        "GET_UPDATES",
        "CHECK_NEWS",
    ],
    description:
        "Fetches latest news articles for a company or stock ticker. Use this action when user asks about news, updates, or recent events related to a specific company or stock.",
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
            const ticker = await extractTickerFromMessage(runtime, _message);
            if (!ticker) {
                callback?.(
                    { text: "Failed to extract ticker from message." },
                    []
                );
                return false;
            }

            const news = await getSummarizedNews(
                ticker,
                runtime,
                state,
                _message
            );
            if (!news) {
                callback?.({
                    text: "No news articles could be retrieved.",
                });
                return false;
            }

            callback?.({
                text: news,
            });

            return true;
        } catch (error) {
            elizaLogger.error("Error getting news:", error);
            callback?.({ text: "Failed to get news." }, []);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the latest news on Tesla?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "",
                    action: "GET_NEWS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show me what's happening with Microsoft stock",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "",
                    action: "GET_NEWS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Any updates on Amazon's business?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "",
                    action: "GET_NEWS",
                },
            },
        ],
    ],
};
