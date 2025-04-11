import fs from 'fs';
import path from 'path';

// Define paths
const OUTPUT_DIR = path.join(process.cwd(), "twitter-scraper");
const TWEETS_FILE = path.join(OUTPUT_DIR, "bitcoin-tweets.json");

/**
 * Analyzes bitcoin tweets and provides some basic insights
 */
function analyzeBitcoinTweets() {
  console.log("Analyzing Bitcoin tweets...");
  
  try {
    // Check if the tweets file exists
    if (!fs.existsSync(TWEETS_FILE)) {
      console.error(`Error: The file ${TWEETS_FILE} does not exist.`);
      console.log("Please run 'node scrape-bitcoin-tweets.mjs' first to collect tweets.");
      return;
    }
    
    // Read the tweets file
    const tweetsData = fs.readFileSync(TWEETS_FILE, 'utf8');
    const tweets = JSON.parse(tweetsData);
    
    // Check if we have tweets to analyze
    if (!tweets || tweets.length === 0) {
      console.log("No tweets found to analyze.");
      return;
    }
    
    console.log(`Found ${tweets.length} Bitcoin-related tweets to analyze.\n`);
    
    // Perform basic analysis
    
    // 1. Most popular tweets (by likes)
    const popularTweets = [...tweets].sort((a, b) => b.likeCount - a.likeCount).slice(0, 5);
    
    console.log("TOP 5 MOST POPULAR BITCOIN TWEETS (by likes):");
    popularTweets.forEach((tweet, index) => {
      console.log(`${index + 1}. @${tweet.username}: "${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}"`);
      console.log(`   Likes: ${tweet.likeCount} | Retweets: ${tweet.retweetCount} | ID: ${tweet.id}`);
    });
    
    // 2. Most active users
    const userTweetCounts = {};
    tweets.forEach(tweet => {
      userTweetCounts[tweet.username] = (userTweetCounts[tweet.username] || 0) + 1;
    });
    
    const mostActiveUsers = Object.entries(userTweetCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    console.log("\nMOST ACTIVE USERS TWEETING ABOUT BITCOIN:");
    mostActiveUsers.forEach((user, index) => {
      console.log(`${index + 1}. @${user[0]}: ${user[1]} tweets`);
    });
    
    // 3. Common hashtags
    const hashtagRegex = /#(\w+)/g;
    const hashtags = {};
    
    tweets.forEach(tweet => {
      const matches = tweet.text.match(hashtagRegex);
      if (matches) {
        matches.forEach(tag => {
          // Remove the # and convert to lowercase
          const cleanTag = tag.substring(1).toLowerCase();
          // Skip 'bitcoin' as it's our search term
          if (cleanTag !== 'bitcoin') {
            hashtags[cleanTag] = (hashtags[cleanTag] || 0) + 1;
          }
        });
      }
    });
    
    const topHashtags = Object.entries(hashtags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    console.log("\nTOP HASHTAGS USED WITH #BITCOIN:");
    topHashtags.forEach((tag, index) => {
      console.log(`${index + 1}. #${tag[0]}: ${tag[1]} occurrences`);
    });
    
    // 4. Time analysis (if createdAt is available)
    const tweetsWithDates = tweets.filter(tweet => tweet.createdAt);
    if (tweetsWithDates.length > 0) {
      const dateFormat = new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log("\nRECENT BITCOIN TWEET TIMELINE:");
      tweetsWithDates
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .forEach((tweet, index) => {
          const date = new Date(tweet.createdAt);
          console.log(`${index + 1}. ${dateFormat.format(date)} - @${tweet.username}`);
        });
    }
    
    console.log("\nAnalysis complete!");
    
  } catch (error) {
    console.error("Error analyzing tweets:", error);
  }
}

// Run the analysis
analyzeBitcoinTweets(); 