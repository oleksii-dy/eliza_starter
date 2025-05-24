import { Provider, IAgentRuntime, Memory, State, elizaLogger } from "@elizaos/core";
import { TwitterService } from "@elizaos/plugin-twitter";

export const communityStatsProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        try {
            elizaLogger.debug("Community stats provider fetching metrics");
            
            // Get cached stats
            const cacheKey = "milli_community_stats";
            const cachedStats = await runtime.cacheManager?.get(cacheKey);
            
            if (cachedStats) {
                elizaLogger.debug("Returning cached community stats");
                return cachedStats;
            }
            
            // Generate fresh stats
            const stats = await generateCommunityStats(runtime);
            
            // Cache for 30 minutes
            if (runtime.cacheManager) {
                await runtime.cacheManager.set(cacheKey, stats);
            }
            
            return stats;
            
        } catch (error) {
            elizaLogger.error("Error in communityStatsProvider:", error);
            return "Community statistics temporarily unavailable.";
        }
    },
};

async function generateCommunityStats(runtime: IAgentRuntime): Promise<string> {
    try {
        elizaLogger.info("Generating fresh community statistics");
        
        // Get Twitter service for real data
        const twitterService = TwitterService.getInstance();
        if (!twitterService) {
            elizaLogger.warn("Twitter service not available, using fallback stats");
            return generateFallbackStats();
        }

        const twitterClientManager = twitterService.getClient(runtime.agentId, runtime.agentId);
        if (!twitterClientManager) {
            elizaLogger.warn("Twitter client not configured, using fallback stats");
            return generateFallbackStats();
        }

        const client = twitterClientManager.client;
        
        // Get monitored accounts
        const monitoredAccounts = runtime.getSetting("TWEET_ACCOUNTS_TO_MONITOR")?.split(",") || 
                                ["seinetwork", "ElizaOSAI", "ai16zdao"];
        
        // Collect real statistics from Twitter accounts
        let totalTweets = 0;
        let totalLikes = 0;
        let totalRetweets = 0;
        let totalReplies = 0;
        let allSentiments: number[] = [];
        const activeContributors: string[] = [];
        
        for (const account of monitoredAccounts.slice(0, 5)) { // Limit for performance
            try {
                const tweets = await fetchAccountStats(client, account, 10);
                if (tweets.length > 0) {
                    totalTweets += tweets.length;
                    
                    // Calculate engagement metrics
                    const accountMetrics = tweets.reduce((acc, tweet) => {
                        acc.likes += tweet.likes || 0;
                        acc.retweets += tweet.retweets || 0;
                        acc.replies += tweet.replies || 0;
                        return acc;
                    }, { likes: 0, retweets: 0, replies: 0 });
                    
                    totalLikes += accountMetrics.likes;
                    totalRetweets += accountMetrics.retweets;
                    totalReplies += accountMetrics.replies;
                    
                    // Analyze sentiment
                    const sentiment = calculateAccountSentiment(tweets);
                    allSentiments.push(sentiment);
                    
                    // Track active contributors
                    activeContributors.push(`@${account}`);
                }
            } catch (error) {
                elizaLogger.warn(`Failed to fetch stats for @${account}:`, error);
            }
        }
        
        // Calculate derived metrics
        const totalEngagement = totalLikes + totalRetweets + totalReplies;
        const engagementRate = totalTweets > 0 ? ((totalEngagement / totalTweets) * 100).toFixed(1) : "0.0";
        
        const avgSentiment = allSentiments.length > 0 
            ? allSentiments.reduce((sum, s) => sum + s, 0) / allSentiments.length 
            : 0;
        
        const sentimentTrend = getSentimentTrend(avgSentiment);
        
        // Estimate network growth based on engagement trends
        const networkGrowth = calculateNetworkGrowth(totalEngagement, totalTweets);
        
        return `Community Statistics (${new Date().toLocaleTimeString()}):
• Active contributors: ${activeContributors.length} accounts
• Recent tweets analyzed: ${totalTweets}
• Total engagement: ${totalEngagement.toLocaleString()} interactions
• Avg engagement rate: ${engagementRate}%
• Sentiment trend: ${sentimentTrend}
• Network activity: ${networkGrowth}
• Top contributors: ${activeContributors.slice(0, 3).join(", ")}`;
        
    } catch (error) {
        elizaLogger.error("Error generating community stats:", error);
        return generateFallbackStats();
    }
}

async function fetchAccountStats(client: any, username: string, maxTweets: number): Promise<any[]> {
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
                timestamp: parsed.timestamp
            };
        });
    } catch (error) {
        elizaLogger.warn(`Error fetching stats for @${username}:`, error);
        return [];
    }
}

function calculateAccountSentiment(tweets: any[]): number {
    if (tweets.length === 0) return 0;
    
    const allText = tweets.map(t => t.text.toLowerCase()).join(' ');
    const positive = ['good', 'great', 'awesome', 'bullish', 'pump', 'moon', 'gains', 'success', 'positive', 'excited'];
    const negative = ['bad', 'terrible', 'bearish', 'dump', 'crash', 'loss', 'fail', 'scam', 'worried', 'disappointed'];
    
    let score = 0;
    const words = allText.match(/\b\w+\b/g) || [];
    
    words.forEach(word => {
        if (positive.includes(word)) score += 1;
        if (negative.includes(word)) score -= 1;
    });
    
    return Math.max(-1, Math.min(1, score / Math.max(words.length / 20, 1)));
}

function getSentimentTrend(sentiment: number): string {
    if (sentiment > 0.2) return "📈 Rising (Positive)";
    if (sentiment < -0.2) return "📉 Declining (Negative)";
    return "➡️ Stable (Neutral)";
}

function calculateNetworkGrowth(totalEngagement: number, totalTweets: number): string {
    if (totalTweets === 0) return "No data";
    
    const engagementPerTweet = totalEngagement / totalTweets;
    
    if (engagementPerTweet > 50) return "🚀 High activity";
    if (engagementPerTweet > 20) return "📈 Growing";
    if (engagementPerTweet > 10) return "➡️ Steady";
    return "📉 Low activity";
}

function generateFallbackStats(): string {
    return `Community Statistics (${new Date().toLocaleTimeString()}):
• Twitter data temporarily unavailable
• Real-time stats will be available when Twitter is connected
• Please check back later for live community metrics`;
}