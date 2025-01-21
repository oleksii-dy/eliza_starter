import {
    composeContext,
    elizaLogger,
    generateText,
    ModelClass,
} from "@elizaos/core";
import { Scraper, SearchMode, Tweet } from "agent-twitter-client";
import {
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";

const maxContinuesInARow = 3;

export const cryptoNewsAction: Action = {
    name: "CRYPTO_NEWS",
    similes: [
        "CRYPTO_NEWS",
        "CRYPTO_NEWS_UPDATE",
        "NEW_IN_CRYPTO",
        "CURRENT_NEWS_IN_CRYPTO",
        "BLOCKCHAIN_NEWS",
        "CRYPTO_NEWS_INFO",
    ],
    description:
        "use this action when the message indicates current crypto news, trendy crypto news, important notice, or feature update in the crypto space.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const recentMessagesData = await runtime.messageManager.getMemories({
            roomId: message.roomId,
            count: 10,
            unique: false,
        });
        const agentMessages = recentMessagesData.filter(
            (m: { userId: any }) => m.userId === runtime.agentId
        );

        if (agentMessages) {
            const lastMessages = agentMessages.slice(0, maxContinuesInARow);
            if (lastMessages.length >= maxContinuesInARow) {
                const lastTimeAskedIsMoreThanAWeek = lastMessages.every(
                    (m) =>
                        Date.now() - m.createdAt >=
                        Date.now() - 1000 * 60 * 60 * 2
                );
                if (lastTimeAskedIsMoreThanAWeek) {
                    return false;
                }
            }
        }

        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        }
        state = await runtime.updateRecentMessageState(state);

        const twitterClient = new Scraper();
        callback({
            text: "Fetching News update...",
            action: "CRYPTO_NEWS",
            source: message.content.source,
        });
        await twitterClient.login("oleanji", "olabanji123");
        const TARGET_USERS = ["pear_protocol", "hufhaus9"];
        const MAX_TWEET_AGE_MS =
            options.maxTweetAgeMs || 30 * 24 * 60 * 60 * 1000;

        function refineNewsUpdate(tweets: Tweet[]): string {
            const pearMentions = tweets.filter(
                (tweet) =>
                    tweet.text.toLowerCase() ||
                    (tweet.quotedStatus &&
                        tweet.quotedStatus.text.toLowerCase()) ||
                    (tweet.retweetedStatus &&
                        tweet.retweetedStatus.text.toLowerCase())
            );

            if (pearMentions.length === 0) {
                return "There haven't been any significant updates about the Pear protocol recently.";
            }

            const recentTweets = pearMentions.slice(0, 10);

            console.log("recentTweets", recentTweets);

            const keyDetailsList = recentTweets.map((tweet) => {
                let tweetText = tweet.text;
                let username = tweet.username;
                let timestamp = tweet.timestamp;

                if (tweet.quotedStatus) {
                    tweetText = tweet.quotedStatus.text;
                    username = tweet.quotedStatus.username;
                    timestamp = tweet.quotedStatus.timestamp;
                } else if (tweet.retweetedStatus) {
                    tweetText = tweet.retweetedStatus.text;
                    username = tweet.retweetedStatus.username;
                    timestamp = tweet.retweetedStatus.timestamp;
                }

                return `@${username} tweeted on ${formatDate(timestamp)}: "${tweetText}"`;
            });
            const keyDetails = keyDetailsList.join("\n");
            console.log(keyDetailsList);

            const refinedUpdate = `I've seen a few updates about the Pear protocol recently: ${keyDetails} That covers the most notable tweets I could find about Pear. Let me know if you need anything else!`;

            return refinedUpdate;
        }

        function formatDate(timestamp: number): string {
            return new Date(timestamp * 1000).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
            });
        }

        elizaLogger.log("Processing target users:", TARGET_USERS);

        const newsUpdateTemplate = `
        Pear Protocol Recent News

        Here are some of the latest updates about the Pear protocol:

        Key Updates
        {{keyDetails}}

        That covers the most notable recent tweets I could find about Pear protocol. Let me know if you need any other information!

        `;

        let tweetsByUser: Tweet[] = [];

        for (const username of TARGET_USERS) {
            try {
                const userTweets = (
                    await twitterClient.fetchSearchTweets(
                        `from:${username}`,
                        2000,
                        SearchMode.Latest
                    )
                ).tweets;

                const validTweets = userTweets.filter((tweet) => {
                    const isRecent =
                        Date.now() - tweet.timestamp * 1000 < MAX_TWEET_AGE_MS;
                    return isRecent;
                });

                if (validTweets.length > 0) {
                    tweetsByUser = validTweets;
                    tweetsByUser.sort((a, b) => b.timestamp - a.timestamp);
                    elizaLogger.log(
                        `Found ${validTweets.length} valid tweets from ${username}`
                    );
                    break;
                }
            } catch (error) {
                elizaLogger.error(
                    `Error fetching tweets for ${username}:`,
                    error
                );
            }
        }

        if (tweetsByUser.length === 0) {
            elizaLogger.log("No relevant recent tweets found");
            callback(null);
            return true;
        }

        try {
            console.log("tweetsByUser", tweetsByUser);
            const refinedUpdate = refineNewsUpdate(tweetsByUser);

            const updateContent = composeContext({
                state,
                template: newsUpdateTemplate.replace(
                    "{{keyDetails}}",
                    refinedUpdate
                ),
            });

            const summary = await generateText({
                runtime,
                context: updateContent,
                modelClass: ModelClass.SMALL,
            });

            console.log(summary);

            const newMemory: Memory = {
                userId: message.userId,
                roomId: message.roomId,
                agentId: message.agentId,
                content: {
                    text: summary,
                    action: "PEAR_NEWS",
                    source: message.content.source,
                },
            };

            await runtime.messageManager.createMemory(newMemory);
            callback(newMemory.content);
        } catch (error) {
            elizaLogger.error(
                "Error refining tweets or saving to memory:",
                error
            );
            callback(null);
        }

        return true;
    },
    examples: [] as ActionExample[][],
} as Action;
