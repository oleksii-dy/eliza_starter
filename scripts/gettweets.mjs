import { Scraper } from "agent-twitter-client";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// Create an absolute path for the tweets file
const currentDir = process.cwd();
const TWEETS_FILE = path.join(currentDir, "tweets.json");

console.log("Starting tweet scraper...");
console.log("Tweets will be saved to:", TWEETS_FILE);

(async () => {
    try {
        // Create a new instance of the Scraper
        const scraper = new Scraper();
        console.log("Scraper instance created");

        // Log in to Twitter using the configured environment variables
        console.log("Attempting to log in with credentials from .env file");
        await scraper.login(
            process.env.TWITTER_USERNAME,
            process.env.TWITTER_PASSWORD
        );

        // Check if login was successful
        if (await scraper.isLoggedIn()) {
            console.log("Logged in successfully!");

            // Fetch all tweets for the user
            console.log("Fetching tweets for pmarca");
            const tweets = scraper.getTweets("pmarca", 2000);

            // Initialize an empty array to store the fetched tweets
            let fetchedTweets = [];

            // Load existing tweets from the JSON file if it exists
            if (fs.existsSync(TWEETS_FILE)) {
                console.log("Loading existing tweets from", TWEETS_FILE);
                const fileContent = fs.readFileSync(TWEETS_FILE, "utf-8");
                fetchedTweets = JSON.parse(fileContent);
                console.log(`Loaded ${fetchedTweets.length} existing tweets`);
            } else {
                console.log("No existing tweets file found, creating new one");
            }

            // Create an empty file to ensure it exists
            fs.writeFileSync(TWEETS_FILE, JSON.stringify(fetchedTweets, null, 2));
            console.log("Initial tweet file created at", TWEETS_FILE);

            // Fetch and process tweets
            console.log("Starting to process tweets...");
            let tweetCount = 0;
            
            for await (const tweet of tweets) {
                tweetCount++;
                if (tweetCount % 10 === 0) {
                    console.log(`Processed ${tweetCount} tweets so far...`);
                }

                console.log("--------------------");
                console.log("Tweet ID:", tweet.id);
                console.log("Text:", tweet.text);
                console.log("Created At:", tweet.createdAt);
                console.log("Retweets:", tweet.retweetCount);
                console.log("Likes:", tweet.likeCount);
                console.log("--------------------");

                // Add the new tweet to the fetched tweets array
                fetchedTweets.push(tweet);

                // Save the updated fetched tweets to the JSON file
                fs.writeFileSync(
                    TWEETS_FILE,
                    JSON.stringify(fetchedTweets, null, 2)
                );
                console.log(`Saved tweet ${tweet.id} to ${TWEETS_FILE}`);
            }

            console.log(`Total tweets saved: ${fetchedTweets.length}`);
            console.log("All tweets fetched and saved to", TWEETS_FILE);

            // Log out from Twitter
            await scraper.logout();
            console.log("Logged out successfully!");
        } else {
            console.log("Login failed. Please check your credentials.");
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
})();
