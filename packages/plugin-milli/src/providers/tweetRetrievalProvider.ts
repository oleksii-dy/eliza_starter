import { Provider, IAgentRuntime, Memory, State, elizaLogger } from "@elizaos/core";
import { Scraper } from "agent-twitter-client";

export const tweetRetrievalProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        try {
            elizaLogger.debug("Tweet retrieval provider fetching community data");
            
            // Get cached or recent tweet summaries
            const cacheKey = "milli_community_summary";
            const cachedSummary = await runtime.cacheManager?.get(cacheKey);
            
            if (cachedSummary) {
                elizaLogger.debug("Returning cached community summary");
                return cachedSummary;
            }
            
            // Get monitored accounts
            const monitoredAccounts = runtime.getSetting("TWEET_ACCOUNTS_TO_MONITOR")?.split(",") || 
                                    ["seinetwork", "ElizaOSAI", "ai16zdao"];
            
            // Generate fresh summary
            const summary = await generateCommunitySummary(runtime, monitoredAccounts);
            
            // Cache for 15 minutes
            if (runtime.cacheManager) {
                await runtime.cacheManager.set(cacheKey, summary);
            }
            
            return summary;
            
        } catch (error) {
            elizaLogger.error("Error in tweetRetrievalProvider:", error);
            return "Recent community activity data is temporarily unavailable.";
        }
    },
};

async function generateCommunitySummary(runtime: IAgentRuntime, accounts: string[]): Promise<string> {
    try {
        elizaLogger.info("Generating fresh community summary");
        
        // Initialize Twitter scraper
        const scraper = new Scraper();
        
        // Try to login if credentials are available
        const twitterUsername = runtime.getSetting("TWITTER_USERNAME");
        const twitterPassword = runtime.getSetting("TWITTER_PASSWORD");
        
        if (twitterUsername && twitterPassword) {
            try {
                await scraper.login(twitterUsername, twitterPassword);
                elizaLogger.debug("Logged into Twitter for community summary");
            } catch (error) {
                elizaLogger.warn("Failed to login to Twitter, using public access:", error);
            }
        }
        
        // Fetch real data from Twitter accounts
        let totalTweets = 0;
        let allSentiments: number[] = [];
        let allTopics = new Set<string>();
        
        for (const account of accounts.slice(0, 3)) { // Limit to 3 accounts for performance
            try {
                const tweets = await fetchAccountSummary(scraper, account, 5);
                totalTweets += tweets.length;
                
                // Analyze tweets
                const analysis = analyzeAccountData(tweets);
                allSentiments.push(analysis.sentiment);
                analysis.topics.forEach(topic => allTopics.add(topic));
                
            } catch (error) {
                elizaLogger.warn(`Failed to fetch data for @${account}:`, error);
            }
        }
        
        const averageSentiment = allSentiments.length > 0 
            ? allSentiments.reduce((sum, s) => sum + s, 0) / allSentiments.length 
            : 0;
        
        const sentimentLabel = getSentimentLabel(averageSentiment);
        const topTopics = Array.from(allTopics).slice(0, 3);
        
        return `Community Summary (${new Date().toLocaleTimeString()}):
• ${totalTweets} recent tweets analyzed
• Overall sentiment: ${sentimentLabel}
• Active accounts: ${accounts.length}
• Trending: ${topTopics.length > 0 ? topTopics.join(", ") : "general discussion"}
• Last updated: ${new Date().toLocaleTimeString()}`;
        
    } catch (error) {
        elizaLogger.error("Error generating community summary:", error);
        return generateFallbackSummary(accounts);
    }
}

async function fetchAccountSummary(scraper: Scraper, username: string, maxTweets: number): Promise<any[]> {
    try {
        const tweets = [];
        for await (const tweet of scraper.getTweets(username, maxTweets)) {
            tweets.push({
                text: tweet.text,
                timestamp: tweet.timestamp,
                likes: tweet.likes || 0,
                retweets: tweet.retweets || 0
            });
            
            if (tweets.length >= maxTweets) break;
        }
        
        return tweets;
    } catch (error) {
        elizaLogger.warn(`Error fetching summary for @${username}:`, error);
        return [];
    }
}

function analyzeAccountData(tweets: any[]): { sentiment: number; topics: string[] } {
    if (tweets.length === 0) return { sentiment: 0, topics: [] };
    
    const allText = tweets.map(t => t.text.toLowerCase()).join(' ');
    
    // Basic sentiment analysis
    const sentiment = analyzeSentiment(allText);
    
    // Extract topics
    const topics = extractTopicsFromText(allText);
    
    return { sentiment, topics };
}

function analyzeSentiment(text: string): number {
    const positive = ['good', 'great', 'awesome', 'bullish', 'pump', 'moon', 'gains', 'success'];
    const negative = ['bad', 'terrible', 'bearish', 'dump', 'crash', 'loss', 'fail', 'scam'];
    
    let score = 0;
    const words = text.match(/\b\w+\b/g) || [];
    
    words.forEach(word => {
        if (positive.includes(word)) score += 1;
        if (negative.includes(word)) score -= 1;
    });
    
    return Math.max(-1, Math.min(1, score / Math.max(words.length / 20, 1)));
}

function extractTopicsFromText(text: string): string[] {
    const topics = [];
    if (text.includes('defi') || text.includes('yield')) topics.push('DeFi');
    if (text.includes('develop') || text.includes('build')) topics.push('Development');
    if (text.includes('trade') || text.includes('market')) topics.push('Trading');
    if (text.includes('partner') || text.includes('collab')) topics.push('Partnerships');
    if (text.includes('ecosystem') || text.includes('community')) topics.push('Ecosystem');
    
    return topics.slice(0, 3);
}

function generateFallbackSummary(accounts: string[]): string {
    return `Community Summary (${new Date().toLocaleTimeString()}):
• Twitter data temporarily unavailable
• Monitoring ${accounts.length} accounts
• Please check back later for live updates`;
}

function getSentimentLabel(sentiment: number): string {
    if (sentiment > 0.3) return "Positive 📈";
    if (sentiment < -0.3) return "Negative 📉";
    return "Neutral ➡️";
}