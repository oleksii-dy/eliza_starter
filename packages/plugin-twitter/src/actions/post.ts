import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    composeContext,
    elizaLogger,
    ModelClass,
    generateText,
    stringToUuid,
} from "@elizaos/core";
import { tweetTemplate } from "../templates";

function truncateToCompleteSentence(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }

    // Attempt to truncate at the last period within the limit
    const lastPeriodIndex = text.lastIndexOf(".", maxLength - 1);
    if (lastPeriodIndex !== -1) {
        const truncatedAtPeriod = text.slice(0, lastPeriodIndex + 1).trim();
        if (truncatedAtPeriod.length > 0) {
            return truncatedAtPeriod;
        }
    }

    // If no period, truncate to the nearest whitespace
    const lastSpaceIndex = text.lastIndexOf(" ", maxLength - 1);
    if (lastSpaceIndex !== -1) {
        const truncatedAtSpace = text.slice(0, lastSpaceIndex).trim();
        if (truncatedAtSpace.length > 0) {
            return truncatedAtSpace + "...";
        }
    }

    // Fallback: Hard truncate and add ellipsis
    const hardTruncated = text.slice(0, maxLength - 3).trim();
    return hardTruncated + "...";
}

async function postTweet(
    runtime: IAgentRuntime,
    content: string
): Promise<boolean> {
    try {
        const twitterClient = runtime.clients.twitter;
        if (!twitterClient) {
            elizaLogger.error("Twitter client not found in runtime");
            return false;
        }

        const roomId = stringToUuid(
            "twitter_generate_room-" + twitterClient.client.profile.username
        );

        // Create tweet using the client's postTweet method
        await twitterClient.post.postTweet(
            runtime,
            twitterClient.client,
            content,
            roomId,
            content, // newTweetContent same as content since we already generated it
            twitterClient.client.profile.username
        );

        return true;
    } catch (error) {
        elizaLogger.error("Error posting tweet:", error);
        return false;
    }
}

export const postAction: Action = {
    name: "POST_TWEET",
    similes: ["TWEET", "POST", "SEND_TWEET"],
    description: "Post a tweet to Twitter",
    validate: async (runtime: IAgentRuntime) => {
        const twitterClient = runtime.clients.twitter;
        return !!twitterClient;
    },
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state?: State
    ): Promise<boolean> => {
        try {
            const context = composeContext({
                state,
                template: tweetTemplate,
            });

            // Generate tweet content
            const newTweetContent = await generateText({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            // Clean up the content
            let cleanedContent = newTweetContent
                .replace(/^\s*{?\s*"text":\s*"|"\s*}?\s*$/g, "") // Remove JSON-like wrapper
                .replace(/^['"](.*)['"]$/g, "$1") // Remove quotes
                .replace(/\\"/g, '"') // Unescape quotes
                .replace(/\\n/g, "\n\n") // Unescape newlines
                .trim();

            if (!cleanedContent) {
                elizaLogger.error("No valid content generated for tweet");
                return false;
            }

            // Handle truncation
            const maxTweetLength = 280; // or get from config
            cleanedContent = truncateToCompleteSentence(
                cleanedContent,
                maxTweetLength
            );

            // Check for dry run mode
            if (process.env.TWITTER_DRY_RUN?.toLowerCase() === "true") {
                elizaLogger.info(
                    `Dry run: would have posted tweet: ${cleanedContent}`
                );
                return true;
            }

            return await postTweet(runtime, cleanedContent);
        } catch (error) {
            elizaLogger.error("Error in post action:", error);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "You should tweet that" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll share this update with my followers right away!",
                    action: "POST_TWEET",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Post this tweet" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll post that as a tweet now.",
                    action: "POST_TWEET",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Share that on Twitter" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll share this message on Twitter.",
                    action: "POST_TWEET",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Post that on X" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll post this message on X right away.",
                    action: "POST_TWEET",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "You should put that on X dot com" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I'll put this message up on X.com now.",
                    action: "POST_TWEET",
                },
            },
        ],
    ],
};
