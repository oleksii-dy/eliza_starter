import { composeContext, elizaLogger } from "@elizaos/core";
import { generateMessageResponse } from "@elizaos/core";
import { messageCompletionFooter } from "@elizaos/core";
import {
    type Action,
    type ActionExample,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
} from "@elizaos/core";
import axios from "axios";
import { TaylorTwitterClient } from "../twitter.ts";

const NEWS_API_URL = "https://newsdata.io/api/1/news";

export const newsHandlerTemplate = `# Task: Summarize the following news article into a concise tweet (under 280 characters).
Focus on the key points and make it engaging.

Article Title: {{title}}
Article Description: {{description}}

Write a concise summary tweet: ` + messageCompletionFooter;

export const fetchNewsAction: Action = {
    name: "FETCH_NEWS",
    similes: ["SHARE_NEWS", "POST_NEWS"],
    description: "Fetches and shares the latest crypto news articles as tweets",
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
        try {
            const apiKey = runtime.getSetting("NEWSDATA_API_KEY");
            if (!apiKey) {
                throw new Error("News API key not configured");
            }
            // Fetch news articles
            const response = await axios.get(NEWS_API_URL, {
                params: {
                    apikey: apiKey,
                    q: "crypto",
                    size: 10
                }
            });

            if (response.data.status !== "success") {
                throw new Error("Failed to fetch news articles");
            }

            const articles = response.data.results;
            const summaries: string[] = [];

            // Initialize Twitter client
            const twitterClient = new TaylorTwitterClient();
            await twitterClient.start(runtime);

            // Generate summaries for each article and post to Twitter
            for (const article of articles) {
                const context = composeContext({
                    state: {
                        ...state,
                        title: article.title,
                        description: article.description
                    },
                    template: newsHandlerTemplate
                });

                const summary = await generateMessageResponse({
                    runtime,
                    context,
                    modelClass: ModelClass.SMALL
                });

                if (summary.text && summary.text.length <= 280) {
                    summaries.push(summary.text);
                    // Post each summary as a separate tweet
                    try {
                        await twitterClient.postUpdate(summary.text);
                        elizaLogger.success("[FETCH_NEWS] Successfully posted tweet:", summary.text.substring(0, 50) + "...");
                    } catch (tweetError) {
                        elizaLogger.error("[FETCH_NEWS] Error posting tweet:", tweetError);
                    }
                }
            }

            // Create response with all summaries
            const responseContent: Content = {
                text: summaries.join("\n\n"),
                action: "FETCH_NEWS"
            };

            await callback(responseContent);
            return responseContent;

        } catch (error) {
            elizaLogger.error("[FETCH_NEWS] Error fetching news:", error);
            const errorContent: Content = {
                text: "Sorry, I couldn't fetch the latest news right now. Please try again later.",
                action: "FETCH_NEWS"
            };
            await callback(errorContent);
            return errorContent;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the latest in crypto?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Here are the latest crypto news updates:\n\n1. Trump's crypto firm faces scrutiny over secret deals and foreign investments\n2. Orderly Network launches enhanced liquidity layer for DeFi trading\n3. Crypto scams on the rise as retired woman loses savings in Oconomowoc",
                    action: "FETCH_NEWS",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
