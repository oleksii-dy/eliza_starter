export interface TweetSummary {
    account: string;
    tweetCount: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    keyTopics: string[];
    timestamp: Date;
}

export interface CommunityStats {
    totalTweets: number;
    sentimentScore: number;
    trendingTopics: string[];
    influencerActivity: string[];
}