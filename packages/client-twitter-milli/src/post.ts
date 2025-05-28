import { Tweet } from "agent-twitter-client";
import {
    composeContext,
    getEmbeddingZeroVector,
    IAgentRuntime,
    stringToUuid,
    UUID,
    truncateToCompleteSentence,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import { ClientBase } from "./base.ts";
import { postActionResponseFooter } from "@elizaos/core";
import { DEFAULT_MAX_TWEET_LENGTH } from "./environment.ts";
import {
    Client,
    TextChannel,
} from "discord.js";

const MAX_TIMELINES_TO_FETCH = 15;

const twitterPostTemplate = `
# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}

# Task: Generate a post in the voice and style and perspective of {{agentName}} @{{twitterUserName}}.
Write a post that is {{adjective}} about {{topic}} (without mentioning {{topic}} directly), from the perspective of {{agentName}}. Do not add commentary or acknowledge this request, just write the post.
Your response should be 1, 2, or 3 sentences (choose the length at random).
Your response should not contain any questions. Brief, concise statements only. The total character count MUST be less than {{maxTweetLength}}. No emojis. Use \\n\\n (double spaces) between statements if there are multiple statements in your response.`;

export const twitterActionTemplate =
    `
# INSTRUCTIONS: Determine actions for {{agentName}} (@{{twitterUserName}}) based on:
{{bio}}
{{postDirections}}

Guidelines:
- ONLY engage with content that DIRECTLY relates to character's core interests
- Direct mentions are priority IF they are on-topic
- Skip ALL content that is:
  - Off-topic or tangentially related
  - From high-profile accounts unless explicitly relevant
  - Generic/viral content without specific relevance
  - Political/controversial unless central to character
  - Promotional/marketing unless directly relevant

Actions (respond only with tags):
[LIKE] - Perfect topic match AND aligns with character (9.8/10)
[RETWEET] - Exceptional content that embodies character's expertise (9.5/10)
[QUOTE] - Can add substantial domain expertise (9.5/10)
[REPLY] - Can contribute meaningful, expert-level insight (9.5/10)

Tweet:
{{currentTweet}}

# Respond with qualifying action tags only. Default to NO action unless extremely confident of relevance.` +
    postActionResponseFooter;

interface PendingTweet {
    cleanedContent: string;
    roomId: UUID;
    newTweetContent: string;
    discordMessageId: string;
    channelId: string;
    timestamp: number;
}

type PendingTweetApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export class TwitterPostClient {
    client: ClientBase;
    runtime: IAgentRuntime;
    twitterUsername: string;
    private isProcessing: boolean = false;
    private lastProcessTime: number = 0;
    private stopProcessingActions: boolean = false;
    private isDryRun: boolean;
    private discordClientForApproval: Client;
    private approvalRequired: boolean = false;
    private discordApprovalChannelId: string;
    private approvalCheckInterval: number;

    constructor(client: ClientBase, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
        this.twitterUsername = this.client.twitterConfig.TWITTER_USERNAME;
        this.isDryRun = this.client.twitterConfig.TWITTER_DRY_RUN;

        const targetUsers = this.client.twitterConfig.TWITTER_TARGET_USERS;
        if (targetUsers) {
            elizaLogger.log(`- Target Users: ${targetUsers}`);
        }

        if (this.isDryRun) {
            elizaLogger.log(
                "Twitter client initialized in dry run mode - no actual tweets should be posted"
            );
        }

        // Initialize Discord webhook
        const approvalRequired: boolean =
            this.runtime
                .getSetting("TWITTER_APPROVAL_ENABLED")
                ?.toLocaleLowerCase() === "true";
        if (approvalRequired) {
            const discordToken = this.runtime.getSetting(
                "TWITTER_APPROVAL_DISCORD_BOT_TOKEN"
            );
            const approvalChannelId = this.runtime.getSetting(
                "TWITTER_APPROVAL_DISCORD_CHANNEL_ID"
            );

            const APPROVAL_CHECK_INTERVAL =
                parseInt(
                    this.runtime.getSetting("TWITTER_APPROVAL_CHECK_INTERVAL")
                ) || 5 * 60 * 1000; // 5 minutes

            this.approvalCheckInterval = APPROVAL_CHECK_INTERVAL;

            if (!discordToken || !approvalChannelId) {
                throw new Error(
                    "TWITTER_APPROVAL_DISCORD_BOT_TOKEN and TWITTER_APPROVAL_DISCORD_CHANNEL_ID are required for approval workflow"
                );
            }

            this.approvalRequired = true;
            this.discordApprovalChannelId = approvalChannelId;
        }
    }


    async start() {
        if (!this.client.profile) {
            await this.client.init();
        }

        const generateNewTweetLoop = async () => {
            // Check for pending tweets first
            if (this.approvalRequired) await this.handlePendingTweet();

            const lastPost = await this.runtime.cacheManager.get<{
                timestamp: number;
            }>("twitter/" + this.twitterUsername + "/lastPost");

            const lastPostTimestamp = lastPost?.timestamp ?? 0;
            const minMinutes = this.client.twitterConfig.POST_INTERVAL_MIN;
            const maxMinutes = this.client.twitterConfig.POST_INTERVAL_MAX;
            const randomMinutes =
                Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) +
                minMinutes;
            const delay = randomMinutes * 60 * 1000;

            if (Date.now() > lastPostTimestamp + delay) {
                await this.generateNewTweet();
            }

            setTimeout(() => {
                generateNewTweetLoop(); // Set up next iteration
            }, delay);

            elizaLogger.log(`Next tweet scheduled in ${randomMinutes} minutes`);
        };


        if (this.client.twitterConfig.POST_IMMEDIATELY) {
            await this.generateNewTweet();
        }

        // Only start tweet generation loop if not in dry run mode
        generateNewTweetLoop();
        elizaLogger.log("Tweet generation loop started");

        // Start the pending tweet check loop if enabled
        if (this.approvalRequired) this.runPendingTweetCheckLoop();
    }

    private runPendingTweetCheckLoop() {
        setInterval(async () => {
            await this.handlePendingTweet();
        }, this.approvalCheckInterval);
    }

    createTweetObject(
        tweetResult: any,
        client: any,
        twitterUsername: string
    ): Tweet {
        return {
            id: tweetResult.rest_id,
            name: client.profile.screenName,
            username: client.profile.username,
            text: tweetResult.legacy.full_text,
            conversationId: tweetResult.legacy.conversation_id_str,
            createdAt: tweetResult.legacy.created_at,
            timestamp: new Date(tweetResult.legacy.created_at).getTime(),
            userId: client.profile.id,
            inReplyToStatusId: tweetResult.legacy.in_reply_to_status_id_str,
            permanentUrl: `https://twitter.com/${twitterUsername}/status/${tweetResult.rest_id}`,
            hashtags: [],
            mentions: [],
            photos: [],
            thread: [],
            urls: [],
            videos: [],
        } as Tweet;
    }

    async processAndCacheTweet(
        runtime: IAgentRuntime,
        client: ClientBase,
        tweet: Tweet,
        roomId: UUID,
        newTweetContent: string
    ) {
        // Cache the last post details
        await runtime.cacheManager.set(
            `twitter/${client.profile.username}/lastPost`,
            {
                id: tweet.id,
                timestamp: Date.now(),
            }
        );

        // Cache the tweet
        await client.cacheTweet(tweet);

        // Log the posted tweet
        elizaLogger.log(`Tweet posted:\n ${tweet.permanentUrl}`);

        // Ensure the room and participant exist
        await runtime.ensureRoomExists(roomId);
        await runtime.ensureParticipantInRoom(runtime.agentId, roomId);

        // Create a memory for the tweet
        await runtime.messageManager.createMemory({
            id: stringToUuid(tweet.id + "-" + runtime.agentId),
            userId: runtime.agentId,
            agentId: runtime.agentId,
            content: {
                text: newTweetContent.trim(),
                url: tweet.permanentUrl,
                source: "twitter",
            },
            roomId,
            embedding: getEmbeddingZeroVector(),
            createdAt: tweet.timestamp,
        });
    }

    async handleNoteTweet(
        client: ClientBase,
        content: string,
        tweetId?: string
    ) {
        try {
            const noteTweetResult = await client.requestQueue.add(
                async () =>
                    await client.twitterClient.sendNoteTweet(content, tweetId)
            );

            if (noteTweetResult.errors && noteTweetResult.errors.length > 0) {
                // Note Tweet failed due to authorization. Falling back to standard Tweet.
                const truncateContent = truncateToCompleteSentence(
                    content,
                    this.client.twitterConfig.MAX_TWEET_LENGTH
                );
                return await this.sendStandardTweet(
                    client,
                    truncateContent,
                    tweetId
                );
            } else {
                return noteTweetResult.data.notetweet_create.tweet_results
                    .result;
            }
        } catch (error) {
            throw new Error(`Note Tweet failed: ${error}`);
        }
    }

    async sendStandardTweet(
        client: ClientBase,
        content: string,
        tweetId?: string
    ) {
        try {
            const standardTweetResult = await client.requestQueue.add(
                async () =>
                    await client.twitterClient.sendTweet(content, tweetId)
            );
            const body = await standardTweetResult.json();
            if (!body?.data?.create_tweet?.tweet_results?.result) {
                console.error("Error sending tweet; Bad response:", body);
                return;
            }
            return body.data.create_tweet.tweet_results.result;
        } catch (error) {
            elizaLogger.error("Error sending standard Tweet:", error);
            throw error;
        }
    }

    async postTweet(
        runtime: IAgentRuntime,
        client: ClientBase,
        cleanedContent: string,
        roomId: UUID,
        newTweetContent: string,
        twitterUsername: string
    ) {
        try {
            elizaLogger.log(`Posting new tweet:\n`);

            let result;

            if (cleanedContent.length > DEFAULT_MAX_TWEET_LENGTH) {
                result = await this.handleNoteTweet(client, cleanedContent);
            } else {
                result = await this.sendStandardTweet(client, cleanedContent);
            }

            const tweet = this.createTweetObject(
                result,
                client,
                twitterUsername
            );

            await this.processAndCacheTweet(
                runtime,
                client,
                tweet,
                roomId,
                newTweetContent
            );
        } catch (error) {
            elizaLogger.error("Error sending tweet:", error);
        }
    }

    /**
     * Generates and posts a new tweet. If isDryRun is true, only logs what would have been posted.
     */
    async generateNewTweet() {
        elizaLogger.log("Generating new tweet");

        try {
            const roomId = stringToUuid(
                "twitter_generate_room-" + this.client.profile.username
            );
            await this.runtime.ensureUserExists(
                this.runtime.agentId,
                this.client.profile.username,
                this.runtime.character.name,
                "twitter"
            );

            const topics = this.runtime.character.topics.join(", ");

            const state = await this.runtime.composeState(
                {
                    userId: this.runtime.agentId,
                    roomId: roomId,
                    agentId: this.runtime.agentId,
                    content: {
                        text: topics || "",
                        action: "TWEET",
                    },
                },
                {
                    twitterUserName: this.client.profile.username,
                }
            );

            const context = composeContext({
                state,
                template:
                    this.runtime.character.templates?.twitterPostTemplate ||
                    twitterPostTemplate,
            });

            elizaLogger.debug("generate post prompt:\n" + context);

            // const newTweetContent = await generateText({
            //     runtime: this.runtime,
            //     context,
            //     modelClass: ModelClass.SMALL,
            // });

            const message = {
                id: stringToUuid("twitter_generate_room-" + this.client.profile.username),
                agentId: this.runtime.agentId,
                content: {
                    text: "Can you summarize what the Sei community is talking about lately?",
                },
                roomId,
                // Timestamps are in seconds, but we need them in milliseconds
                createdAt: Date.now(),
            };

            const newTweetContent = await this.runtime.processActions()

            // First attempt to clean content
            let cleanedContent = "";

            // Try parsing as JSON first
            try {
                const parsedResponse = JSON.parse(newTweetContent);
                if (parsedResponse.text) {
                    cleanedContent = parsedResponse.text;
                } else if (typeof parsedResponse === "string") {
                    cleanedContent = parsedResponse;
                }
            } catch (error) {
                error.linted = true; // make linter happy since catch needs a variable
                // If not JSON, clean the raw content
                cleanedContent = newTweetContent
                    .replace(/^\s*{?\s*"text":\s*"|"\s*}?\s*$/g, "") // Remove JSON-like wrapper
                    .replace(/^['"](.*)['"]$/g, "$1") // Remove quotes
                    .replace(/\\"/g, '"') // Unescape quotes
                    .replace(/\\n/g, "\n\n") // Unescape newlines, ensures double spaces
                    .trim();
            }

            if (!cleanedContent) {
                elizaLogger.error(
                    "Failed to extract valid content from response:",
                    {
                        rawResponse: newTweetContent,
                        attempted: "JSON parsing",
                    }
                );
                return;
            }

            // Truncate the content to the maximum tweet length specified in the environment settings, ensuring the truncation respects sentence boundaries.
            const maxTweetLength = this.client.twitterConfig.MAX_TWEET_LENGTH;
            if (maxTweetLength) {
                cleanedContent = truncateToCompleteSentence(
                    cleanedContent,
                    maxTweetLength
                );
            }

            const removeQuotes = (str: string) =>
                str.replace(/^['"](.*)['"]$/, "$1");

            const fixNewLines = (str: string) => str.replaceAll(/\\n/g, "\n\n"); //ensures double spaces

            // Final cleaning
            cleanedContent = removeQuotes(fixNewLines(cleanedContent));

            if (this.isDryRun) {
                elizaLogger.info(
                    `Dry run: would have posted tweet: ${cleanedContent}`
                );
                return;
            }

            try {
                if (this.approvalRequired) {
                    // Send for approval instead of posting directly
                    elizaLogger.log(
                        `Sending Tweet For Approval:\n ${cleanedContent}`
                    );
                    await this.sendForApproval(
                        cleanedContent,
                        roomId,
                        newTweetContent
                    );
                    elizaLogger.log("Tweet sent for approval");
                } else {
                    elizaLogger.log(`Posting new tweet:\n ${cleanedContent}`);
                    this.postTweet(
                        this.runtime,
                        this.client,
                        cleanedContent,
                        roomId,
                        newTweetContent,
                        this.twitterUsername
                    );
                }
            } catch (error) {
                elizaLogger.error("Error sending tweet:", error);
            }
        } catch (error) {
            elizaLogger.error("Error generating new tweet:", error);
        }
    }


    async stop() {
        this.stopProcessingActions = true;
    }

    private async sendForApproval(
        cleanedContent: string,
        roomId: UUID,
        newTweetContent: string
    ): Promise<string | null> {
        try {
            const embed = {
                title: "New Tweet Pending Approval",
                description: cleanedContent,
                fields: [
                    {
                        name: "Character",
                        value: this.client.profile.username,
                        inline: true,
                    },
                    {
                        name: "Length",
                        value: cleanedContent.length.toString(),
                        inline: true,
                    },
                ],
                footer: {
                    text: "Reply with '👍' to post or '❌' to discard, This will automatically expire and remove after 24 hours if no response received",
                },
                timestamp: new Date().toISOString(),
            };

            const channel = await this.discordClientForApproval.channels.fetch(
                this.discordApprovalChannelId
            );

            if (!channel || !(channel instanceof TextChannel)) {
                throw new Error("Invalid approval channel");
            }

            const message = await channel.send({ embeds: [embed] });

            // Store the pending tweet
            const pendingTweetsKey = `twitter/${this.client.profile.username}/pendingTweet`;
            const currentPendingTweets =
                (await this.runtime.cacheManager.get<PendingTweet[]>(
                    pendingTweetsKey
                )) || [];
            // Add new pending tweet
            currentPendingTweets.push({
                cleanedContent,
                roomId,
                newTweetContent,
                discordMessageId: message.id,
                channelId: this.discordApprovalChannelId,
                timestamp: Date.now(),
            });

            // Store updated array
            await this.runtime.cacheManager.set(
                pendingTweetsKey,
                currentPendingTweets
            );

            return message.id;
        } catch (error) {
            elizaLogger.error(
                "Error Sending Twitter Post Approval Request:",
                error
            );
            return null;
        }
    }

    private async checkApprovalStatus(
        discordMessageId: string
    ): Promise<PendingTweetApprovalStatus> {
        try {
            // Fetch message and its replies from Discord
            const channel = await this.discordClientForApproval.channels.fetch(
                this.discordApprovalChannelId
            );

            elizaLogger.log(`channel ${JSON.stringify(channel)}`);

            if (!(channel instanceof TextChannel)) {
                elizaLogger.error("Invalid approval channel");
                return "PENDING";
            }

            // Fetch the original message and its replies
            const message = await channel.messages.fetch(discordMessageId);

            // Look for thumbs up reaction ('👍')
            const thumbsUpReaction = message.reactions.cache.find(
                (reaction) => reaction.emoji.name === "👍"
            );

            // Look for reject reaction ('❌')
            const rejectReaction = message.reactions.cache.find(
                (reaction) => reaction.emoji.name === "❌"
            );

            // Check if the reaction exists and has reactions
            if (rejectReaction) {
                const count = rejectReaction.count;
                if (count > 0) {
                    return "REJECTED";
                }
            }

            // Check if the reaction exists and has reactions
            if (thumbsUpReaction) {
                // You might want to check for specific users who can approve
                // For now, we'll return true if anyone used thumbs up
                const count = thumbsUpReaction.count;
                if (count > 0) {
                    return "APPROVED";
                }
            }

            return "PENDING";
        } catch (error) {
            elizaLogger.error("Error checking approval status:", error);
            return "PENDING";
        }
    }

    private async cleanupPendingTweet(discordMessageId: string) {
        const pendingTweetsKey = `twitter/${this.client.profile.username}/pendingTweet`;
        const currentPendingTweets =
            (await this.runtime.cacheManager.get<PendingTweet[]>(
                pendingTweetsKey
            )) || [];

        // Remove the specific tweet
        const updatedPendingTweets = currentPendingTweets.filter(
            (tweet) => tweet.discordMessageId !== discordMessageId
        );

        if (updatedPendingTweets.length === 0) {
            await this.runtime.cacheManager.delete(pendingTweetsKey);
        } else {
            await this.runtime.cacheManager.set(
                pendingTweetsKey,
                updatedPendingTweets
            );
        }
    }

    private async handlePendingTweet() {
        elizaLogger.log("Checking Pending Tweets...");
        const pendingTweetsKey = `twitter/${this.client.profile.username}/pendingTweet`;
        const pendingTweets =
            (await this.runtime.cacheManager.get<PendingTweet[]>(
                pendingTweetsKey
            )) || [];

        for (const pendingTweet of pendingTweets) {
            // Check if tweet is older than 24 hours
            const isExpired =
                Date.now() - pendingTweet.timestamp > 24 * 60 * 60 * 1000;

            if (isExpired) {
                elizaLogger.log("Pending tweet expired, cleaning up");

                // Notify on Discord about expiration
                try {
                    const channel =
                        await this.discordClientForApproval.channels.fetch(
                            pendingTweet.channelId
                        );
                    if (channel instanceof TextChannel) {
                        const originalMessage = await channel.messages.fetch(
                            pendingTweet.discordMessageId
                        );
                        await originalMessage.reply(
                            "This tweet approval request has expired (24h timeout)."
                        );
                    }
                } catch (error) {
                    elizaLogger.error(
                        "Error sending expiration notification:",
                        error
                    );
                }

                await this.cleanupPendingTweet(pendingTweet.discordMessageId);
                return;
            }

            // Check approval status
            elizaLogger.log("Checking approval status...");
            const approvalStatus: PendingTweetApprovalStatus =
                await this.checkApprovalStatus(pendingTweet.discordMessageId);

            if (approvalStatus === "APPROVED") {
                elizaLogger.log("Tweet Approved, Posting");
                await this.postTweet(
                    this.runtime,
                    this.client,
                    pendingTweet.cleanedContent,
                    pendingTweet.roomId,
                    pendingTweet.newTweetContent,
                    this.twitterUsername
                );

                // Notify on Discord about posting
                try {
                    const channel =
                        await this.discordClientForApproval.channels.fetch(
                            pendingTweet.channelId
                        );
                    if (channel instanceof TextChannel) {
                        const originalMessage = await channel.messages.fetch(
                            pendingTweet.discordMessageId
                        );
                        await originalMessage.reply(
                            "Tweet has been posted successfully! ✅"
                        );
                    }
                } catch (error) {
                    elizaLogger.error(
                        "Error sending post notification:",
                        error
                    );
                }

                await this.cleanupPendingTweet(pendingTweet.discordMessageId);
            } else if (approvalStatus === "REJECTED") {
                elizaLogger.log("Tweet Rejected, Cleaning Up");
                await this.cleanupPendingTweet(pendingTweet.discordMessageId);
                // Notify about Rejection of Tweet
                try {
                    const channel =
                        await this.discordClientForApproval.channels.fetch(
                            pendingTweet.channelId
                        );
                    if (channel instanceof TextChannel) {
                        const originalMessage = await channel.messages.fetch(
                            pendingTweet.discordMessageId
                        );
                        await originalMessage.reply(
                            "Tweet has been rejected! ❌"
                        );
                    }
                } catch (error) {
                    elizaLogger.error(
                        "Error sending rejection notification:",
                        error
                    );
                }
            }
        }
    }
}
