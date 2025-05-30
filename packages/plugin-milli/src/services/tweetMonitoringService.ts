import { IAgentRuntime, elizaLogger } from "@elizaos/core";
import { Scraper } from "agent-twitter-client";

export class TweetMonitoringService {
    private static instance: TweetMonitoringService;
    private intervalId?: NodeJS.Timeout;
    private runtime: IAgentRuntime;
    private scraper?: Scraper;

    static getInstance(): TweetMonitoringService {
        if (!TweetMonitoringService.instance) {
            TweetMonitoringService.instance = new TweetMonitoringService();
        }
        return TweetMonitoringService.instance;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        this.runtime = runtime;
        elizaLogger.info("Initializing Tweet Monitoring Service for Milli");
        
        // Initialize Twitter scraper
        this.scraper = new Scraper();
        
        // Try to login if credentials are available
        const twitterUsername = runtime.getSetting("TWITTER_USERNAME");
        const twitterPassword = runtime.getSetting("TWITTER_PASSWORD");
        
        if (twitterUsername && twitterPassword) {
            try {
                await this.scraper.login(twitterUsername, twitterPassword);
                elizaLogger.info("Tweet monitoring service logged into Twitter");
            } catch (error) {
                elizaLogger.warn("Failed to login to Twitter for monitoring, using public access:", error);
            }
        } else {
            elizaLogger.info("No Twitter credentials configured for monitoring, using public access");
        }
    }

    async start(): Promise<void> {
        elizaLogger.info("Starting Tweet Monitoring Service");
        
        const pollInterval = Number(this.runtime?.getSetting('TWEET_POLL_INTERVAL') || 300);
        const interval = pollInterval * 1000; // 5 minutes default
        
        // Start the monitoring loop
        const handleTweetLoop = () => {
            this.fetchAndProcessTweets();
            this.intervalId = setTimeout(handleTweetLoop, interval);
        };
        
        // Start immediately
        handleTweetLoop();
    }

    private async fetchAndProcessTweets(): Promise<void> {
        try {
            elizaLogger.debug("Tweet monitoring service running periodic check");
            
            // Get monitored accounts
            const accounts = this.runtime?.getSetting("TWEET_ACCOUNTS_TO_MONITOR")?.split(",") || 
                           ["seinetwork", "ElizaOSAI", "ai16zdao"];
            
            elizaLogger.debug(`Monitoring ${accounts.length} accounts: ${accounts.join(", ")}`);
            
            // Fetch tweets for each monitored account using our scraper
            if (!this.scraper) {
                elizaLogger.warn("Twitter scraper not initialized");
                return;
            }
            
            for (const account of accounts) {
                try {
                    elizaLogger.debug(`Fetching tweets for account: ${account}`);
                    
                    // Fetch recent tweets (last 10)
                    const tweets = [];
                    for await (const tweet of this.scraper.getTweets(account, 10)) {
                        tweets.push(tweet);
                        if (tweets.length >= 10) break;
                    }
                    
                    elizaLogger.debug(`Found ${tweets.length} tweets for ${account}`);
                    
                    // Process tweets for sentiment or other analysis
                    // This could trigger alerts, updates, or cache refreshes
                    
                } catch (error) {
                    elizaLogger.error(`Error fetching tweets for ${account}:`, error);
                }
            }
            
            // Invalidate cache to force fresh data on next request
            if (this.runtime?.cacheManager) {
                await this.runtime.cacheManager.delete("milli_community_summary");
                await this.runtime.cacheManager.delete("milli_community_stats");
            }
            
        } catch (error) {
            elizaLogger.error("Error in tweet monitoring service:", error);
        }
    }

    async stop(): Promise<void> {
        elizaLogger.info("Stopping Tweet Monitoring Service");
        
        if (this.intervalId) {
            clearTimeout(this.intervalId);
            this.intervalId = undefined;
        }
    }
}