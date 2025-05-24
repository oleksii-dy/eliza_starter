import { Action, IAgentRuntime, Memory, HandlerCallback, State, elizaLogger } from "@elizaos/core";
import { Scraper } from "agent-twitter-client";

export const summarizeTweetsAction: Action = {
    name: "SUMMARIZE_TWEETS",
    description: "Fetch and summarize recent tweets from monitored accounts",
    similes: ["GET_TWEETS", "ANALYZE_TWEETS", "TWEET_SUMMARY", "COMMUNITY_UPDATE"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const text = message.content.text.toLowerCase();
        return text.includes("tweet") ||
               text.includes("community") ||
               text.includes("sentiment") ||
               text.includes("latest") ||
               text.includes("what's happening") ||
               text.includes("update");
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
                                    ["seinetwork", "ElizaOSAI", "ai16zdao"];
            
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

            let summaryText = "📊 **Community Pulse Update**\n\n";
            let totalTweets = 0;
            let sentimentScore = 0;
            const topics = new Set<string>();
            
            for (const account of monitoredAccounts) {
                try {
                    elizaLogger.info(`Fetching tweets from @${account.trim()}`);
                    
                    // Fetch real tweets from the account
                    const accountTweets = await fetchAccountTweets(scraper, account.trim(), maxTweets);
                    
                    if (accountTweets.length > 0) {
                        totalTweets += accountTweets.length;
                        summaryText += `**@${account.trim()}** (${accountTweets.length} recent tweets)\n`;
                        
                        // Analyze sentiment and extract topics
                        const analysis = analyzeAccountTweets(accountTweets);
                        sentimentScore += analysis.sentiment;
                        analysis.topics.forEach(topic => topics.add(topic));
                        
                        summaryText += `- Sentiment: ${getSentimentLabel(analysis.sentiment)}\n`;
                        summaryText += `- Key topics: ${analysis.topics.slice(0, 3).join(", ")}\n\n`;
                    }
                } catch (error) {
                    elizaLogger.error(`Error fetching tweets from @${account}:`, error);
                    summaryText += `**@${account.trim()}** - Unable to fetch recent tweets\n\n`;
                }
            }
            
            // Overall summary
            const overallSentiment = sentimentScore / monitoredAccounts.length;
            summaryText += `**Overall Community Sentiment**: ${getSentimentLabel(overallSentiment)}\n`;
            summaryText += `**Total Tweets Analyzed**: ${totalTweets}\n`;
            summaryText += `**Trending Topics**: ${Array.from(topics).slice(0, 5).join(", ")}\n`;
            
            elizaLogger.info("Tweet summarization completed");
            callback({ text: summaryText }, []);
            
        } catch (error) {
            elizaLogger.error("Error in summarizeTweetsAction:", error);
            callback({ 
                text: "I encountered an error while fetching community updates. Please try again later." 
            }, []);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "What's the latest sentiment in the community?" },
            },
            {
                user: "{{agentName}}",
                content: { 
                    text: "📊 **Community Pulse Update**\n\n**@seinetwork** (8 recent tweets)\n- Sentiment: Positive\n- Key topics: mainnet, development, partnerships\n\n**Overall Community Sentiment**: Positive\n**Total Tweets Analyzed**: 24\n**Trending Topics**: mainnet, DeFi, partnerships, development, ecosystem"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Can you give me a community update?" },
            },
            {
                user: "{{agentName}}",
                content: { 
                    text: "📊 **Community Pulse Update**\n\nBased on recent activity from monitored accounts, the community sentiment is positive with strong discussion around development milestones and ecosystem growth."
                },
            },
        ],
    ],
};

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

function analyzeAccountTweets(tweets: any[]): { sentiment: number; topics: string[] } {
    if (tweets.length === 0) {
        return { sentiment: 0, topics: ["no data"] };
    }
    
    // Basic sentiment analysis using keyword scoring
    const sentiments = tweets.map(tweet => analyzeTweetSentiment(tweet.text));
    const avgSentiment = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
    
    // Extract topics from tweet content
    const allText = tweets.map(tweet => tweet.text.toLowerCase()).join(' ');
    const topics = extractTopics(allText);
    
    return {
        sentiment: avgSentiment,
        topics: topics.length > 0 ? topics : ["general"]
    };
}

function analyzeTweetSentiment(text: string): number {
    const positiveWords = [
        'great', 'awesome', 'excellent', 'amazing', 'fantastic', 'love', 'best', 'perfect',
        'bullish', 'moon', 'pump', 'gains', 'profit', 'success', 'winning', 'excited',
        'optimistic', 'positive', 'good', 'strong', 'solid', 'promising', 'breakthrough',
        'innovation', 'revolutionary', 'incredible', 'outstanding', 'impressive'
    ];
    
    const negativeWords = [
        'bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'fail', 'failed',
        'bearish', 'dump', 'crash', 'loss', 'losses', 'scam', 'rug', 'concerned',
        'worried', 'disappointed', 'frustrated', 'weak', 'poor', 'declining',
        'problematic', 'issues', 'broken', 'useless', 'disaster', 'catastrophe'
    ];
    
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    let score = 0;
    
    words.forEach(word => {
        if (positiveWords.includes(word)) score += 1;
        if (negativeWords.includes(word)) score -= 1;
    });
    
    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, score / Math.max(words.length / 10, 1)));
}

function extractTopics(text: string): string[] {
    const topicKeywords = {
        'DeFi': ['defi', 'decentralized finance', 'yield', 'liquidity', 'staking', 'farming'],
        'Development': ['development', 'developer', 'coding', 'build', 'launch', 'release', 'update'],
        'Trading': ['trading', 'trade', 'buy', 'sell', 'price', 'market', 'volume'],
        'Partnerships': ['partnership', 'partner', 'collaboration', 'integrate', 'alliance'],
        'Ecosystem': ['ecosystem', 'community', 'adoption', 'users', 'growth'],
        'Technology': ['blockchain', 'smart contract', 'protocol', 'network', 'consensus'],
        'Governance': ['governance', 'voting', 'proposal', 'dao', 'decision'],
        'Security': ['security', 'audit', 'safe', 'secure', 'vulnerability']
    };
    
    const foundTopics = [];
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
        const hasKeyword = keywords.some(keyword => text.includes(keyword));
        if (hasKeyword) {
            foundTopics.push(topic);
        }
    }
    
    return foundTopics.slice(0, 5); // Limit to top 5 topics
}

function getSentimentLabel(sentiment: number): string {
    if (sentiment > 0.3) return "Positive 📈";
    if (sentiment < -0.3) return "Negative 📉";
    return "Neutral ➡️";
}