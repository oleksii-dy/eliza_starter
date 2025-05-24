# @elizaos/plugin-milli

A comprehensive community sentiment tracking and tweet analysis plugin for Eliza agents, designed to monitor crypto ecosystem communities and provide real-time insights.

## Overview

The Milli plugin empowers Eliza agents to track community pulse across specialized blockchain networks, identify emerging narratives, and quantify social consensus in real-time. It filters out noise to surface meaningful insights from Twitter conversations.

## Features

### 🔍 **Real-Time Sentiment Analysis**

- Analyzes actual tweet content using crypto-aware sentiment dictionaries
- Provides topic-specific sentiment breakdowns (DeFi, Development, Trading, etc.)
- Generates actionable insights based on engagement patterns

### 📊 **Community Pulse Tracking**

- Monitors multiple Twitter accounts simultaneously
- Tracks engagement metrics (likes, retweets, replies)
- Identifies trending topics and community activity levels

### 📈 **Community Statistics**

- Real-time community metrics and growth indicators
- Engagement rate calculations and trend analysis
- Active contributor tracking and ranking

### 🛡️ **Robust Error Handling**

- Graceful fallbacks when Twitter API is unavailable
- Comprehensive logging for debugging and monitoring
- Rate limiting and caching for optimal performance

## Installation

```bash
pnpm install @elizaos/plugin-milli
```

## Configuration

### Environment Variables

Set up your Twitter credentials and monitoring preferences:

```bash
# Twitter API Credentials (required for real data)
TWITTER_USERNAME=your_twitter_username
TWITTER_PASSWORD=your_twitter_password
TWITTER_EMAIL=your_twitter_email
TWITTER_2FA_SECRET=your_2fa_secret  # Optional

# Plugin Configuration
TWEET_ACCOUNTS_TO_MONITOR=seinetwork,ElizaOSAI,ai16zdao
MAX_TWEETS_PER_ACCOUNT=10
SENTIMENT_ANALYSIS_DEPTH=basic
SENTIMENT_TIMEFRAME=24h
```

### Character Integration

Add the plugin to your character configuration:

```typescript
import { milliPlugin } from "@elizaos/plugin-milli";

export const yourCharacter = {
    name: "YourAgent",
    plugins: [milliPlugin],
    // ... other character config
};
```

## Usage

### Actions

The plugin provides two main actions that users can trigger:

#### 1. **Tweet Summarization** (`SUMMARIZE_TWEETS`)

**Trigger phrases:**

- "What's the latest community sentiment?"
- "Give me a community update"
- "What's happening in the community?"
- "Latest tweets summary"

**Response format:**

```
📊 **Community Pulse Update**

**@seinetwork** (8 recent tweets)
- Sentiment: Positive 📈
- Key topics: mainnet, development, partnerships

**@ElizaOSAI** (5 recent tweets)
- Sentiment: Neutral ➡️
- Key topics: AI, development, ecosystem

**Overall Community Sentiment**: Positive 📈
**Total Tweets Analyzed**: 24
**Trending Topics**: mainnet, DeFi, partnerships, development, ecosystem
```

#### 2. **Sentiment Analysis** (`ANALYZE_SENTIMENT`)

**Trigger phrases:**

- "What's the community sentiment right now?"
- "Analyze the mood"
- "How is the community feeling?"
- "Sentiment analysis"

**Response format:**

```
🔍 **Community Sentiment Analysis**

**Timeframe**: Last 24h
**Overall Sentiment**: Positive 📈 (72.3%)

**Breakdown by Topic**:
• DeFi: Positive 📈
• Development: Positive 📈
• Trading: Neutral ➡️

**Key Insights**:
• High community engagement with strong like activity
• Positive sentiment strongest in: DeFi, Development
• High recent activity indicates active community discussion
```

### Providers

The plugin includes two providers that automatically enrich conversation context:

#### 1. **Tweet Retrieval Provider**

- Continuously fetches and caches community summaries
- Provides real-time insights in conversation context
- Updates every 15 minutes

#### 2. **Community Stats Provider**

- Generates comprehensive community statistics
- Tracks engagement trends and network growth
- Updates every 30 minutes

## API Reference

### Actions

#### `summarizeTweetsAction`

- **Name**: `SUMMARIZE_TWEETS`
- **Description**: Fetch and summarize recent tweets from monitored accounts
- **Similes**: `["GET_TWEETS", "ANALYZE_TWEETS", "TWEET_SUMMARY", "COMMUNITY_UPDATE"]`

#### `analyzeSentimentAction`

- **Name**: `ANALYZE_SENTIMENT`
- **Description**: Analyze sentiment from recent community discussions and tweets
- **Similes**: `["SENTIMENT_ANALYSIS", "MOOD_CHECK", "COMMUNITY_FEELING"]`

### Providers

#### `tweetRetrievalProvider`

Provides cached community summaries including:

- Recent tweet counts
- Overall sentiment trends
- Active account monitoring
- Trending topics

#### `communityStatsProvider`

Provides detailed community statistics including:

- Active contributor counts
- Engagement metrics
- Sentiment trends
- Network activity indicators

## Data Sources

### Real Twitter Integration

- Uses `@elizaos/plugin-twitter` for authenticated API access
- Fetches actual tweets via `getUserTweets()` and `getProfile()`
- Processes real engagement metrics (likes, retweets, replies)

### Sentiment Analysis

- Crypto-aware sentiment dictionaries with 50+ positive/negative terms
- Keyword-based scoring with normalization
- Topic detection using blockchain-specific terminology

### Topic Detection

Automatically identifies and categorizes content by:

- **DeFi**: yield, liquidity, staking, farming
- **Development**: coding, building, launches, updates
- **Trading**: markets, prices, volume, trading
- **Partnerships**: collaborations, integrations, alliances
- **Ecosystem**: community, adoption, growth
- **Technology**: blockchain, smart contracts, protocols
- **Governance**: voting, proposals, DAOs
- **Security**: audits, safety, vulnerabilities

## Performance

### Caching Strategy

- **Tweet summaries**: 15-minute cache TTL
- **Community stats**: 30-minute cache TTL
- **Fallback responses**: No caching (always fresh)

### Rate Limiting

- Leverages built-in Twitter client rate limiting
- Request queuing with exponential backoff
- Concurrent account processing with limits

### Optimization

- Limits to 3-5 accounts per analysis for performance
- Configurable tweet counts (default: 10 per account)
- Efficient sentiment scoring algorithms

## Error Handling

The plugin includes comprehensive error handling:

### Graceful Fallbacks

- When Twitter API is unavailable: Shows informative fallback messages
- When accounts are inaccessible: Continues with available data
- When sentiment analysis fails: Returns neutral sentiment

### Logging

- Debug logging for cache hits/misses
- Info logging for successful operations
- Warning logging for API failures
- Error logging for critical failures

## Development

### Building the Plugin

```bash
cd packages/plugin-milli
pnpm build
```

### Testing

```bash
# Start agent with plugin
cd agent
pnpm start --character="milli.character.json"
```

### Extending the Plugin

#### Adding New Sentiment Terms

Edit the sentiment dictionaries in:

- `src/actions/summarizeTweets.ts` (lines 190-210)
- `src/actions/analyzeSentiment.ts` (lines 199-220)

#### Adding New Topics

Update topic detection in:

- `src/actions/summarizeTweets.ts` (`extractTopics()` function)
- `src/actions/analyzeSentiment.ts` (`detectTopicsInTweet()` function)

#### Modifying Cache TTL

Update cache settings in:

- `tweetRetrievalProvider.ts` (line 26)
- `communityStatsProvider.ts` (line 22)

## Troubleshooting

### Common Issues

#### Twitter Authentication Errors

```
Error: Twitter service not available
```

**Solution**: Ensure Twitter credentials are properly configured in environment variables.

#### No Data Returned

```
Community Summary: Twitter data temporarily unavailable
```

**Solution**: Check Twitter API rate limits and account access permissions.

#### Build Errors

```
Error: Cannot find module '@elizaos/plugin-twitter'
```

**Solution**: Ensure workspace dependencies are installed with `pnpm install`.

### Debug Mode

Enable debug logging by setting:

```bash
ELIZA_LOG_LEVEL=debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style

- Use TypeScript strict mode
- Follow existing naming conventions
- Add comprehensive error handling
- Include JSDoc comments for public functions

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

- GitHub Issues: [Report a bug](https://github.com/elizaos/eliza/issues)
- Documentation: [Eliza Documentation](https://elizaos.github.io/eliza/)
- Community: [Discord](https://discord.gg/elizaos)
