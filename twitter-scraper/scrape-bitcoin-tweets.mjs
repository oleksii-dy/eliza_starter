import { Scraper } from "agent-twitter-client";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables from .env file
dotenv.config();

// Constants
const SEARCH_TERM = "bitcoin";
const MAX_TWEETS = 100;
const OUTPUT_DIR = path.join(process.cwd(), "twitter-scraper");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "bitcoin-tweets.json");

// List of popular cryptocurrency Twitter accounts to scrape
const CRYPTO_ACCOUNTS = [
  "bitcoin",         // Bitcoin's official account
  "cz_binance",      // Binance CEO
  "VitalikButerin",  // Ethereum co-founder
  "SatoshiLite",     // Litecoin creator
  "coinbase",        // Coinbase exchange
  "binance",         // Binance exchange
  "BlockchainAssn",  // Blockchain Association
  "CoinMarketCap",   // CoinMarketCap
  "bitcoinmagazine", // Bitcoin Magazine
  "DocumentingBTC",  // Documenting Bitcoin
  "APompliano",      // Anthony Pompliano
  "michaeljburry",   // Michael Burry
  "saylor",          // Michael Saylor
  "aantonop",        // Andreas Antonopoulos
  "CryptoHayes"      // Arthur Hayes
];

/**
 * Main function to scrape tweets containing 'bitcoin'
 */
async function scrapeBitcoinTweets() {
  console.log("Starting Bitcoin tweet scraper...");
  console.log(`Will scrape up to ${MAX_TWEETS} recent tweets containing "${SEARCH_TERM}" from crypto-related accounts`);
  console.log(`Tweets will be saved to: ${OUTPUT_FILE}`);
  
  try {
    // Create the output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log(`Created directory: ${OUTPUT_DIR}`);
    }
    
    // Create a new instance of the Twitter Scraper
    const scraper = new Scraper();
    console.log("Scraper instance created");
    
    // Log in to Twitter using environment variables
    console.log("Attempting to log in with credentials from .env file");
    await scraper.login(
      process.env.TWITTER_USERNAME,
      process.env.TWITTER_PASSWORD
    );
    
    // Check if login was successful
    if (await scraper.isLoggedIn()) {
      console.log("Logged in successfully!");
      
      // Initialize array to store the fetched tweets
      let bitcoinTweets = [];
      
      // Initialize an empty file to ensure it exists
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(bitcoinTweets, null, 2));
      console.log(`Initialized empty output file at ${OUTPUT_FILE}`);
      
      // Track total number of bitcoin tweets found
      let totalBitcoinTweets = 0;
      
      // Loop through each crypto account and fetch their tweets
      for (const account of CRYPTO_ACCOUNTS) {
        // Break if we've collected enough tweets
        if (totalBitcoinTweets >= MAX_TWEETS) {
          break;
        }
        
        console.log(`Fetching tweets from @${account}...`);
        
        try {
          // Get tweets from this account
          const accountTweets = scraper.getTweets(account, 50); // Fetch 50 recent tweets per account
          
          // Process tweets from this account
          for await (const tweet of accountTweets) {
            // Break if we've collected enough tweets
            if (totalBitcoinTweets >= MAX_TWEETS) {
              break;
            }
            
            // Only include tweets that contain our search term
            if (tweet.text && tweet.text.toLowerCase().includes(SEARCH_TERM.toLowerCase())) {
              console.log(`---- Bitcoin Tweet ${totalBitcoinTweets + 1} ----`);
              console.log("Tweet ID:", tweet.id);
              console.log("Author:", tweet.username || account);
              console.log("Text:", tweet.text);
              console.log("Created At:", tweet.createdAt || "Unknown");
              console.log("Retweets:", tweet.retweetCount || 0);
              console.log("Likes:", tweet.likeCount || 0);
              console.log("----------------");
              
              // Add tweet to our collection
              bitcoinTweets.push({
                id: tweet.id,
                username: tweet.username || account,
                text: tweet.text,
                createdAt: tweet.createdAt,
                retweetCount: tweet.retweetCount || 0,
                likeCount: tweet.likeCount || 0,
                isRetweet: tweet.isRetweet || false,
                isReply: tweet.isReply || false
              });
              
              // Save progress after each tweet
              fs.writeFileSync(
                OUTPUT_FILE,
                JSON.stringify(bitcoinTweets, null, 2)
              );
              console.log(`Saved bitcoin tweet ${tweet.id} to ${OUTPUT_FILE}`);
              
              totalBitcoinTweets++;
            }
          }
          
          console.log(`Found ${bitcoinTweets.length} bitcoin tweets so far...`);
          
        } catch (accountError) {
          console.error(`Error fetching tweets from @${account}:`, accountError.message);
          // Continue with the next account
          continue;
        }
      }
      
      console.log(`Total Bitcoin tweets saved: ${bitcoinTweets.length}`);
      console.log(`All tweets fetched and saved to ${OUTPUT_FILE}`);
      
      // Log out from Twitter
      await scraper.logout();
      console.log("Logged out successfully!");
    } else {
      console.error("Login failed. Please check your Twitter credentials in the .env file.");
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

// Execute the main function
scrapeBitcoinTweets(); 