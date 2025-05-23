import {
    elizaLogger,
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import { Scraper } from "agent-twitter-client";
import { TwitterClientInterface } from "@elizaos/client-twitter";
import { TweetContent } from "../types";
import { validateTwitterConfig } from "../environment";
import { getFeedExamples} from "../examples";
import { createTwitterService } from "../services";


async function summarizeSaveRecentTweets(runtime: IAgentRuntime, twitterHandle: string): Promise<string> {
    // start twitter client and get the manager
    const twitterManager = await TwitterClientInterface.start(runtime);
    // Fetch recent tweets using the Twitter plugin, make sure search is enabled in your .env config
    const tweets: TweetContent[] = await twitterManager.search.fetchRecentTweets(username, 10);
    // concatenate tweet texts
    const tweetTexts = tweets.map(t => t.text).join('\n');
    // summarize the tweets (using LLM)
    const summary = await runtime.summarizeText(tweetTexts, {
        prompt: `Summarize the following tweets from @${username}:`
    });

    // save summary to db
    await runtime.databaseAdapter.save('twitter_summaries', {
        username,
        summary,
        timestamp: new Date().toISOString(),
    });
    
    return summary;
}



export const getFeedAndSummarizeAction: Action = {
    name: "GET_FEED",
    similes: [
        "timeline"
    ],
    description: "Pull the feed from the target twitter accounts",
    validate: async (runtime: IAgentRuntime) => {
        const username = runtime.getSetting("TWITTER_USERNAME");
        const password = runtime.getSetting("TWITTER_PASSWORD");
        const email = runtime.getSetting("TWITTER_EMAIL");
        const hasCredentials = !!username && !!password && !!email;
        elizaLogger.log(`Has credentials: ${hasCredentials}`);

        return hasCredentials;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ): Promise<string> => {

        const config = await validateTwitterConfig(runtime);
        const twitterService = createTwitterService(
            config.TWITTER_USERNAME,
        );

        try {

            const summary = await summarizeSaveRecentTweets(runtime, twitterHandle);

            const TwitterData = await twitterService.getTwitterFeed();
            elizaLogger.success(
                `Successfully fetched target twitter account feeds!`
            );
            if (callback) {
                callback({
                    text: `
                    Here is the latest in all things Milli, Sei, and more...
                    
                    ${TwitterData.topics}
                    `
                });
                return true;
            }
        } catch (error:any) {
            elizaLogger.error("Error in twitter plugin handler:", error);
            callback({
                text: `Error fetching twitter feed: ${error.message}`,
                content: { error: error.message },
            });
            return false;
        }
    },
    examples: getFeedExamples as ActionExample[][],
} as Action;