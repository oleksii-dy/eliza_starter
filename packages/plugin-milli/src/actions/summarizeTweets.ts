import { Action, IAgentRuntime, Memory, HandlerCallback, State, elizaLogger } from "@elizaos/core";
import { Scraper } from "agent-twitter-client";
import { OpenAI } from 'openai';
import { summarizeExamples } from "../examples";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // or your actual key for testing
});


export const summarizeTweetsAction: Action = {
    name: "SUMMARIZE_TWEETS",
    description: "Fetch and summarize recent tweets from monitored accounts",
    similes: ["GET_TWEETS", "ANALYZE_TWEETS", "TWEET_SUMMARY", "COMMUNITY_UPDATE"],
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
            elizaLogger.info("Starting tweet summarization for Milli agent");
            
            // Get monitored accounts from settings
            const monitoredAccounts = runtime.getSetting("TWEET_ACCOUNTS_TO_MONITOR")?.split(",") || 
                                    ["MilliCoinSei", "pebloescobarSEI", "bandosei", "Ryuzaki_SEI", "SeiNetwork", "YakaFinance"];
            
            const maxTweets = parseInt(runtime.getSetting("MAX_TWEETS_PER_ACCOUNT") || "10");
            
            // Initialize Twitter client using agent-twitter-client
            const scraper = new Scraper();
            
            // Check if we have Twitter credentials
            const twitterUsername = runtime.getSetting("TWITTER_USERNAME");
            const twitterPassword = runtime.getSetting("TWITTER_PASSWORD");
            
            if (!twitterUsername || !twitterPassword) {
                elizaLogger.warn("Twitter credentials not configured, using public access only");
            } else {
                try {
                    await scraper.login(twitterUsername, twitterPassword);
                    elizaLogger.info("Successfully logged into Twitter");
                } catch (error) {
                    elizaLogger.warn("Failed to login to Twitter, using public access:", error);
                }
            }
            
            for (const account of monitoredAccounts) {
                try {
                    elizaLogger.info(`Fetching tweets from @${account.trim()}`);
                    
                    // Fetch real tweets from the account
                    const accountTweets = await fetchAccountTweets(scraper, account.trim(), maxTweets);
                    
                    if (accountTweets.length > 0) {
                        const summarizedContent = await summarizeContent(accountTweets);
                        callback({ text: summarizedContent }, []);
                    }
                } catch (error) {
                    elizaLogger.error(`Error fetching tweets from @${account}:`, error);
                }
            }
        } catch (error) {
            elizaLogger.error("Error in summarizeTweetsAction:", error);
            callback({ 
                text: "I encountered an error while fetching community updates. Please try again later." 
            }, []);
        }
    },
    examples: summarizeExamples
};


async function summarizeContent(tweets: any[]): Promise<string> {
    if (tweets.length === 0) return "No recent tweets to summarize.";
    
    // Use node-summary to create a concise summary
    const tweetTexts = tweets.map(tweet => tweet.text).join("\n");
    
    try {
        const summaryPrompt = `
            Please summarize the following content. Include the image context (if any), the article highlights, and the main point of the text.

            Text:
            ${tweetTexts}
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are an assistant that summarizes mixed media content including images, text, and articles."
                },
                {
                    role: "user",
                    content: summaryPrompt
                }
            ],
            temperature: 0.5
        });
        return response.choices[0].message.content || "Summary could not be generated.";
    } catch (error) {
        elizaLogger.error("Error summarizing tweets:", error);
        return "Error generating summary.";
    }
}

// Helper functions
async function fetchAccountTweets(scraper: Scraper, username: string, maxTweets: number): Promise<any[]> {
    try {
        elizaLogger.info(`Fetching ${maxTweets} tweets from @${username}`);
        
        // Get user profile to get user ID
        const profile = await scraper.getProfile(username);
        if (!profile || !profile.userId) {
            elizaLogger.warn(`Could not find profile for @${username}`);
            return [];
        }
        
        // Fetch tweets from the user
        const tweets = [];
        for await (const tweet of scraper.getTweets(username, maxTweets)) {
            tweets.push({
                id: tweet.id,
                text: tweet.text,
                username: tweet.username,
                timestamp: new Date(tweet.timestamp),
                likes: tweet.likes || 0,
                retweets: tweet.retweets || 0,
                replies: tweet.replies || 0,
                hashtags: tweet.hashtags || [],
                mentions: tweet.mentions || [],
                urls: tweet.urls || []
            });
            
            if (tweets.length >= maxTweets) break;
        }
        
        elizaLogger.info(`Successfully fetched ${tweets.length} tweets from @${username}`);
        return tweets;
        
    } catch (error) {
        elizaLogger.error(`Error fetching tweets from @${username}:`, error);
        return [];
    }
}