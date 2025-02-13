import TwitterClientInterface from '@elizaos/client-twitter';

import { IAgentRuntime } from '@elizaos/core';

export interface SocialMetrics {
  followers: number;
  engagement: number;
  posts: number;
  sentiment?: number;  // -1 to 1 scale
  riskScore?: number; // 0 to 100 scale
}

// Define what we expect the manager to look like
interface TwitterManagerType {
  client: {
    init(): Promise<void>;
    fetchSearchTweets(query: string, limit: number, sortBy: 'Latest' | 'Popular'): Promise<{
      tweets: Array<{
        likes: number;
        retweets: number;
        replies: number;
        text: string;
      }>;
    }>;
  };
}

export class SocialAnalyzer {
  // Change the type to our interface instead of using InstanceType
  private twitterManager?: TwitterManagerType;

  constructor(
    private runtime?: IAgentRuntime
  ) {}

  private async initializeTwitter() {
    if (this.runtime && !this.twitterManager) {
      try {
        // Cast the result to our interface type
        const manager = await TwitterClientInterface.start(this.runtime) as TwitterManagerType;
        await manager.client.init();
        this.twitterManager = manager;
      } catch (error) {
        console.error('Failed to initialize Twitter client:', error);
      }
    }
  }

  async analyze(symbol: string): Promise<SocialMetrics> {
    try {
      if (!this.runtime) {
        throw new Error('Runtime is required for Twitter analysis');
      }

      await this.initializeTwitter();
      
      if (!this.twitterManager?.client) {
        throw new Error('Twitter client initialization failed');
      }

      // Use the client directly for searching tweets
      const searchResults = await this.twitterManager.client.fetchSearchTweets(
        symbol,
        100, // Last 100 tweets
        'Latest'
      );

      return {
        followers: 0, // We could get this from profile data if needed
        engagement: this.calculateEngagementFromTweets(searchResults.tweets),
        posts: searchResults.tweets.length,
        sentiment: await this.calculateSentiment(searchResults.tweets),
        riskScore: 50 // Default risk score
      };

    } catch (error: unknown) {
      this.handleAnalyzeError(error);
      return this.getDefaultMetrics();
    }
  }

  private calculateEngagementFromTweets(tweets: any[]): number {
    // Calculate engagement from likes, retweets, replies
    return tweets.reduce((total, tweet) => {
      return total + (
        (tweet.likes || 0) + 
        (tweet.retweets || 0) + 
        (tweet.replies || 0)
      );
    }, 0) / tweets.length || 0;
  }

  private async calculateSentiment(tweets: Array<{ text: string }>): Promise<number> {
    try {
      // Basic sentiment analysis using keyword matching
      const positiveWords = new Set([
        'bullish', 'moon', 'great', 'good', 'buy', 
        'potential', 'up', 'gain', 'profit', 'success'
      ]);
      
      const negativeWords = new Set([
        'bearish', 'dump', 'bad', 'sell', 'down', 
        'loss', 'crash', 'fail', 'scam', 'risk'
      ]);

      let totalSentiment = 0;

      for (const tweet of tweets) {
        const words = tweet.text.toLowerCase().split(/\s+/);
        let tweetSentiment = 0;

        for (const word of words) {
          if (positiveWords.has(word)) tweetSentiment += 1;
          if (negativeWords.has(word)) tweetSentiment -= 1;
        }

        totalSentiment += Math.max(-1, Math.min(1, tweetSentiment)); // Normalize to [-1, 1]
      }

      // Average sentiment across all tweets
      return tweets.length ? totalSentiment / tweets.length : 0;
    } catch (error) {
      console.error('Error calculating sentiment:', error);
      return 0; // Default neutral sentiment
    }
  }

  private getDefaultMetrics(): SocialMetrics {
    return {
      followers: 0,
      engagement: 0,
      posts: 0,
      sentiment: 0,
      riskScore: 50
    };
  }

  private handleAnalyzeError(error: unknown): void {
    if (error instanceof Error) {
      console.error(`Social analysis failed: ${error.message}`);
    } else if (typeof error === 'string') {
      console.error(`Social analysis failed: ${error}`);
    } else {
      console.error('Social analysis failed with unknown error');
    }
  }
}