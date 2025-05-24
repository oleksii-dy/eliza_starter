import { Action, IAgentRuntime, Memory, HandlerCallback, State, elizaLogger } from "@elizaos/core";
import { TwitterService } from "@elizaos/plugin-twitter";

export const analyzeSentimentAction: Action = {
    name: "ANALYZE_SENTIMENT",
    description: "Analyze sentiment from recent community discussions and tweets",
    similes: ["SENTIMENT_ANALYSIS", "MOOD_CHECK", "COMMUNITY_FEELING"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const text = message.content.text.toLowerCase();
        return text.includes("sentiment") ||
               text.includes("mood") ||
               text.includes("feeling") ||
               text.includes("opinion") ||
               text.includes("attitude");
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        try {
            elizaLogger.info("Starting sentiment analysis for Milli agent");
            
            // Get sentiment analysis settings
            const analysisDepth = runtime.getSetting("SENTIMENT_ANALYSIS_DEPTH") || "basic";
            const timeframe = runtime.getSetting("SENTIMENT_TIMEFRAME") || "24h";
            
            // Perform real sentiment analysis using Twitter data
            const sentimentData = await performSentimentAnalysis(runtime, analysisDepth, timeframe);
            
            let responseText = "🔍 **Community Sentiment Analysis**\n\n";
            responseText += `**Timeframe**: Last ${timeframe}\n`;
            responseText += `**Overall Sentiment**: ${getSentimentLabel(sentimentData.overall)} (${(sentimentData.overall * 100).toFixed(1)}%)\n\n`;
            
            responseText += "**Breakdown by Topic**:\n";
            for (const [topic, sentiment] of Object.entries(sentimentData.topics)) {
                responseText += `• ${topic}: ${getSentimentLabel(sentiment as number)}\n`;
            }
            
            responseText += `\n**Key Insights**:\n`;
            responseText += `• ${sentimentData.insights.join('\n• ')}`;
            
            elizaLogger.info("Sentiment analysis completed");
            callback({ text: responseText }, []);
            
        } catch (error) {
            elizaLogger.error("Error in analyzeSentimentAction:", error);
            callback({ 
                text: "I encountered an error while analyzing community sentiment. Please try again later." 
            }, []);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "What's the community sentiment right now?" },
            },
            {
                user: "{{agentName}}",
                content: { 
                    text: "🔍 **Community Sentiment Analysis**\n\n**Overall Sentiment**: Positive 📈 (72.3%)\n\n**Breakdown by Topic**:\n• DeFi: Positive 📈\n• Development: Positive 📈\n• Trading: Neutral ➡️\n\n**Key Insights**:\n• Strong optimism around recent announcements\n• Increased discussion volume\n• Growing developer interest"
                },
            },
        ],
    ],
};

async function performSentimentAnalysis(runtime: IAgentRuntime, _depth: string, _timeframe: string): Promise<any> {
    try {
        elizaLogger.info("Performing real sentiment analysis on Twitter data");
        
        // Get Twitter service for real data
        const twitterService = TwitterService.getInstance();
        if (!twitterService) {
            elizaLogger.warn("Twitter service not available for sentiment analysis");
            return generateFallbackSentimentData();
        }

        const twitterClientManager = twitterService.getClient(runtime.agentId, runtime.agentId);
        if (!twitterClientManager) {
            elizaLogger.warn("Twitter client not configured for sentiment analysis");
            return generateFallbackSentimentData();
        }

        const client = twitterClientManager.client;
        
        // Get monitored accounts
        const monitoredAccounts = runtime.getSetting("TWEET_ACCOUNTS_TO_MONITOR")?.split(",") || 
                                ["seinetwork", "ElizaOSAI", "ai16zdao"];
        
        // Collect tweets for sentiment analysis
        const allTweets: any[] = [];
        const topicTweets: Record<string, any[]> = {};
        
        for (const account of monitoredAccounts.slice(0, 3)) { // Limit for performance
            try {
                const tweets = await fetchTweetsForSentiment(client, account, 15);
                allTweets.push(...tweets);
                
                // Categorize tweets by topic
                tweets.forEach(tweet => {
                    const detectedTopics = detectTopicsInTweet(tweet.text);
                    detectedTopics.forEach(topic => {
                        if (!topicTweets[topic]) topicTweets[topic] = [];
                        topicTweets[topic].push(tweet);
                    });
                });
                
            } catch (error) {
                elizaLogger.warn(`Failed to fetch tweets for sentiment from @${account}:`, error);
            }
        }
        
        // Analyze overall sentiment
        const overall = calculateOverallSentiment(allTweets);
        
        // Analyze sentiment by topic
        const topicSentiments: Record<string, number> = {};
        for (const [topic, tweets] of Object.entries(topicTweets)) {
            if (tweets.length > 0) {
                topicSentiments[topic] = calculateOverallSentiment(tweets);
            }
        }
        
        // Generate insights based on real data
        const insights = generateRealInsights(allTweets, topicSentiments);
        
        return {
            overall,
            topics: topicSentiments,
            insights
        };
        
    } catch (error) {
        elizaLogger.error("Error in sentiment analysis:", error);
        return generateFallbackSentimentData();
    }
}

async function fetchTweetsForSentiment(client: any, username: string, maxTweets: number): Promise<any[]> {
    try {
        const profile = await client.twitterClient.getProfile(username);
        if (!profile?.userId) return [];
        
        const userTweets = await client.twitterClient.getUserTweets(profile.userId, maxTweets);
        if (!userTweets?.tweets) return [];
        
        return userTweets.tweets.map((tweet: any) => {
            const parsed = client.parseTweet(tweet);
            return {
                text: parsed.text,
                likes: parsed.likes || 0,
                retweets: parsed.retweets || 0,
                replies: parsed.replies || 0,
                timestamp: parsed.timestamp,
                username: parsed.username
            };
        });
    } catch (error) {
        elizaLogger.warn(`Error fetching sentiment tweets for @${username}:`, error);
        return [];
    }
}

function detectTopicsInTweet(text: string): string[] {
    const lowercaseText = text.toLowerCase();
    const topics = [];
    
    if (lowercaseText.includes('defi') || lowercaseText.includes('yield') || lowercaseText.includes('liquidity')) {
        topics.push('DeFi');
    }
    if (lowercaseText.includes('develop') || lowercaseText.includes('build') || lowercaseText.includes('code')) {
        topics.push('Development');
    }
    if (lowercaseText.includes('trade') || lowercaseText.includes('market') || lowercaseText.includes('price')) {
        topics.push('Trading');
    }
    if (lowercaseText.includes('partner') || lowercaseText.includes('collab') || lowercaseText.includes('alliance')) {
        topics.push('Partnerships');
    }
    if (lowercaseText.includes('ecosystem') || lowercaseText.includes('community') || lowercaseText.includes('adoption')) {
        topics.push('Ecosystem');
    }
    
    return topics.length > 0 ? topics : ['General'];
}

function calculateOverallSentiment(tweets: any[]): number {
    if (tweets.length === 0) return 0;
    
    const sentiments = tweets.map(tweet => analyzeTweetSentiment(tweet.text));
    return sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
}

function analyzeTweetSentiment(text: string): number {
    const positiveWords = [
        'great', 'awesome', 'excellent', 'amazing', 'fantastic', 'love', 'best', 'perfect',
        'bullish', 'moon', 'pump', 'gains', 'profit', 'success', 'winning', 'excited',
        'optimistic', 'positive', 'good', 'strong', 'solid', 'promising', 'breakthrough',
        'innovation', 'revolutionary', 'incredible', 'outstanding', 'impressive', 'thrilled'
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

function generateRealInsights(tweets: any[], topicSentiments: Record<string, number>): string[] {
    const insights = [];
    
    if (tweets.length > 0) {
        // Engagement insights
        const avgLikes = tweets.reduce((sum, t) => sum + t.likes, 0) / tweets.length;
        const avgRetweets = tweets.reduce((sum, t) => sum + t.retweets, 0) / tweets.length;
        
        if (avgLikes > 50) {
            insights.push("High community engagement with strong like activity");
        } else if (avgLikes > 10) {
            insights.push("Moderate community engagement observed");
        } else {
            insights.push("Community engagement is currently low");
        }
        
        if (avgRetweets > 10) {
            insights.push("Content is being actively shared and amplified");
        }
        
        // Topic insights
        const positiveTopics = Object.entries(topicSentiments)
            .filter(([_, sentiment]) => sentiment > 0.3)
            .map(([topic, _]) => topic);
            
        if (positiveTopics.length > 0) {
            insights.push(`Positive sentiment strongest in: ${positiveTopics.join(", ")}`);
        }
        
        // Time-based insights
        const recentTweets = tweets.filter(t => {
            const tweetAge = Date.now() - new Date(t.timestamp).getTime();
            return tweetAge < 24 * 60 * 60 * 1000; // Last 24 hours
        });
        
        if (recentTweets.length > tweets.length * 0.7) {
            insights.push("High recent activity indicates active community discussion");
        }
    }
    
    if (insights.length === 0) {
        insights.push("Limited data available for comprehensive analysis");
    }
    
    return insights.slice(0, 4); // Limit to top 4 insights
}

function generateFallbackSentimentData(): any {
    return {
        overall: 0,
        topics: {},
        insights: ["Twitter data temporarily unavailable for sentiment analysis", "Please check back later for real-time sentiment data"]
    };
}

function getSentimentLabel(sentiment: number): string {
    if (sentiment > 0.3) return "Positive 📈";
    if (sentiment < -0.3) return "Negative 📉";
    return "Neutral ➡️";
}