# Twitter Scraper

This directory contains scripts for scraping Twitter data using the `agent-twitter-client` package.

## Available Scripts

### scrape-bitcoin-tweets.mjs

This script searches for and collects the 100 most recent tweets containing the word "bitcoin". It saves these tweets to a JSON file for further analysis.

**Features:**
- Searches for tweets containing "bitcoin"
- Collects up to 100 recent tweets
- Saves tweets to `bitcoin-tweets.json` in this directory
- Includes tweet metadata such as author, likes, retweets, etc.

**Usage:**
```bash
node scrape-bitcoin-tweets.mjs
```

### analyze-bitcoin-tweets.mjs

This script analyzes the previously collected bitcoin tweets and provides insights.

**Features:**
- Identifies the most popular bitcoin tweets (by likes)
- Finds the most active users tweeting about bitcoin
- Analyzes common hashtags used with bitcoin
- Creates a timeline of recent bitcoin tweets

**Usage:**
```bash
node analyze-bitcoin-tweets.mjs
```

**Note:** You must run `scrape-bitcoin-tweets.mjs` first to collect the data before running the analysis.

## Requirements

- Valid Twitter credentials in the `.env` file at the project root:
  ```
  TWITTER_USERNAME=your_twitter_username
  TWITTER_PASSWORD=your_twitter_password
  ```

## Output Format

The output JSON file contains an array of tweet objects with the following structure:

```json
[
  {
    "id": "1234567890123456789",
    "username": "example_user",
    "text": "This is a tweet about #bitcoin",
    "createdAt": "2023-04-10T12:00:00Z",
    "retweetCount": 5,
    "likeCount": 10,
    "isRetweet": false,
    "isReply": false
  },
  // ...more tweets
]
``` 