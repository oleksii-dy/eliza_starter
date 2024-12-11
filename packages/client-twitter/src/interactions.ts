import { SearchMode, Tweet } from "agent-twitter-client";
import {
    composeContext,
    generateMessageResponse,
    generateShouldRespond,
    messageCompletionFooter,
    shouldRespondFooter,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    stringToUuid,
    elizaLogger,
    getEmbeddingZeroVector,
} from "@ai16z/eliza";
import { ClientBase } from "./base";
import { buildConversationThread, sendTweet, wait } from "./utils.ts";

export const twitterMessageHandlerTemplate =
    `
# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

{{recentPosts}}

# Task: Generate a post/reply in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}) while using the thread of tweets as additional context:
Current Post:
{{currentPost}}

Thread of Tweets You Are Replying To:
{{formattedConversation}}

{{actions}}

# Task: Generate a post in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}). You MUST include an action if the current post text includes a prompt that is similar to one of the available actions mentioned here:
{{actionNames}}

Here is the current post text again. Remember to include an action if the current post text includes a prompt that asks for one of the available actions mentioned above (does not need to be exact):
{{currentPost}}
` + messageCompletionFooter;

export const twitterShouldRespondTemplate =
    `# INSTRUCTIONS: Determine if {{agentName}} (@{{twitterUserName}}) should respond to the message and participate in the conversation. Do not comment. Just respond with "true" or "false".

Response options are RESPOND, IGNORE and STOP .

If the (@{{twitterUserName}}) is @jlwhoo7 in the message, {{agentName}} should respond, regardless of the content of the message.

{{agentName}} should respond to messages that are directed at them, or participate in conversations that are interesting or relevant to their background, IGNORE messages that are irrelevant to them, and should STOP if the conversation is concluded.

{{agentName}} is in a room with other users and wants to be conversational, but not annoying.
{{agentName}} must RESPOND to messages that are directed at them, a command towards them, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting or relevant, {{agentName}} should IGNORE.
Unless directly RESPONDing to a user, {{agentName}} should IGNORE messages that are very short or do not contain much information.
If a user asks {{agentName}} to stop talking, {{agentName}} should STOP.
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, {{agentName}} should STOP.

{{recentPosts}}

IMPORTANT: {{agentName}} (aka @{{twitterUserName}}) is particularly sensitive about being annoying, so if there is any doubt, it is better to IGNORE than to RESPOND.

{{currentPost}}

Thread of Tweets You Are Replying To:

{{formattedConversation}}

# INSTRUCTIONS: Respond with [RESPOND] if {{agentName}} should respond, or [IGNORE] if {{agentName}} should not respond to the last message and [STOP] if {{agentName}} should stop participating in the conversation.
` + shouldRespondFooter;


export const TwitterShouldResponseReasoning = `
# Response Reasoning for {{agentName}} (@{{twitterUserName}})

Current decision: [{{decision}}]

Reasoning based on the following criteria:

RESPOND if:
- The message directly mentions or addresses {{agentName}}
- The topic aligns with {{agentName}}'s expertise or background
- The conversation is relevant and engaging
- There's meaningful content to respond to

IGNORE if:
- The message is not directed at {{agentName}}
- The topic is outside {{agentName}}'s expertise
- The message is too short or lacks substance
- {{agentName}}'s input wouldn't add value
- There's uncertainty about whether to engage (err on the side of caution)

STOP if:
- The conversation has reached a natural conclusion
- A user has requested {{agentName}} to stop participating
- {{agentName}} has already made their point
- The conversation has moved to topics outside {{agentName}}'s scope

Based on the current context:
{{reasoningExplanation}}
`

export class TwitterInteractionClient {
    client: ClientBase;
    runtime: IAgentRuntime;

    constructor(client: ClientBase, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
    }

    async start() {
        const handleTwitterInteractionsLoop = () => {
            this.handleTwitterInteractions();
            setTimeout(
                handleTwitterInteractionsLoop,
                Number(
                    this.runtime.getSetting("TWITTER_POLL_INTERVAL") || 120
                ) * 1000 // Default to 2 minutes
            );
        };
        handleTwitterInteractionsLoop();
    }

    async handleTwitterInteractions() {
        elizaLogger.info("========= TWITTER INTERACTIONS START =========");
        elizaLogger.log("Checking Twitter interactions");

        const twitterUsername = this.client.profile.username;
        try {
            // Check for mentions
            elizaLogger.debug(`Fetching tweets mentioning @${twitterUsername}`);
            const tweetCandidates = (
                await this.client.fetchSearchTweets(
                    `@${twitterUsername}`,
                    20,
                    SearchMode.Latest
                )
            ).tweets;

            elizaLogger.info(`Found ${tweetCandidates.length} tweet candidates`);

            const uniqueTweetCandidates = [...new Set(tweetCandidates)];
            uniqueTweetCandidates
                .sort((a, b) => a.id.localeCompare(b.id))
                .filter((tweet) => tweet.userId !== this.client.profile.id);

            for (const tweet of uniqueTweetCandidates) {
                if (
                    !this.client.lastCheckedTweetId ||
                    BigInt(tweet.id) > this.client.lastCheckedTweetId
                ) {
                    // Generate the tweetId UUID the same way it's done in handleTweet
                    const tweetId = stringToUuid(
                        tweet.id + "-" + this.runtime.agentId
                    );

                    // Check if we've already processed this tweet
                    const existingResponse =
                        await this.runtime.messageManager.getMemoryById(
                            tweetId
                        );

                    if (existingResponse) {
                        elizaLogger.log(
                            `Already responded to tweet ${tweet.id}, skipping`
                        );
                        continue;
                    }
                    elizaLogger.log("New Tweet found", tweet.permanentUrl);

                    const roomId = stringToUuid(
                        tweet.conversationId + "-" + this.runtime.agentId
                    );

                    const userIdUUID =
                        tweet.userId === this.client.profile.id
                            ? this.runtime.agentId
                            : stringToUuid(tweet.userId!);

                    await this.runtime.ensureConnection(
                        userIdUUID,
                        roomId,
                        tweet.username,
                        tweet.name,
                        "twitter"
                    );

                    const thread = await buildConversationThread(
                        tweet,
                        this.client
                    );

                    const message = {
                        content: { text: tweet.text },
                        agentId: this.runtime.agentId,
                        userId: userIdUUID,
                        roomId,
                    };

                    await this.handleTweet({
                        tweet,
                        message,
                        thread,
                    });

                    // Update the last checked tweet ID after processing each tweet
                    this.client.lastCheckedTweetId = BigInt(tweet.id);
                }
            }

            // Save the latest checked tweet ID to the file
            await this.client.cacheLatestCheckedTweetId();

            elizaLogger.log("Completed checking for new tweets");
        } catch (error) {
            elizaLogger.error("Error handling Twitter interactions:", error);
        }
    }

    private async handleTweet({
        tweet,
        message,
        thread,
    }: {
        tweet: Tweet;
        message: Memory;
        thread: Tweet[];
    }) {

        if (tweet.userId === this.client.profile.id) {
            elizaLogger.debug("Skipping own tweet");
            return;
        }

        if (!message.content.text) {
            elizaLogger.log("Skipping Tweet with no text", tweet.id);
            return;
        }

        elizaLogger.info("========= SMART STATS CHECK START =========");
        // Add smart stats check here
        const tweetAuthor = tweet.username;
        if (tweetAuthor) {
            elizaLogger.info(`Checking smart stats for tweet author: @${tweetAuthor}`);
            try {
                const config = this.client.getSmartReplyConfig();
                elizaLogger.debug('Smart Reply Config:', config);

                const hasEnoughSmartFollowers = await this.checkSmartStats(tweetAuthor);
                elizaLogger.info(`Smart stats result for @${tweetAuthor}: ${hasEnoughSmartFollowers}`);
                if (!hasEnoughSmartFollowers) {
                    elizaLogger.info(`Smart stats check failed for @${tweetAuthor} - ignoring tweet`);
                    // Create a memory record of the ignored tweet
                    const tweetId = stringToUuid(tweet.id + "-" + this.runtime.agentId);
                    await this.runtime.messageManager.createMemory({
                        id: tweetId,
                        agentId: this.runtime.agentId,
                        content: {
                            text: tweet.text,
                            action: "IGNORE",
                            metadata: {
                                reason: "insufficient_smart_followers",
                                username: tweetAuthor
                            }
                        },
                        userId: stringToUuid(tweet.userId as string),
                        roomId: stringToUuid(tweet.conversationId),
                        createdAt: tweet.timestamp * 1000,
                    });
                    return;
                }
                elizaLogger.debug(`Smart stats check passed for @${tweetAuthor}`);
            } catch (error) {
                elizaLogger.error(`Error checking smart stats for @${tweetAuthor}:`, error);
            }
        }

        const formatTweet = (tweet: Tweet) => {
            return `  ID: ${tweet.id}
  From: ${tweet.name} (@${tweet.username})
  Text: ${tweet.text}`;
        };
        const currentPost = formatTweet(tweet);

        elizaLogger.debug("Thread: ", thread);
        const formattedConversation = thread
            .map(
                (tweet) => `@${tweet.username} (${new Date(
                    tweet.timestamp * 1000
                ).toLocaleString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "short",
                    day: "numeric",
                })}):
        ${tweet.text}`
            )
            .join("\n\n");

        elizaLogger.debug("formattedConversation: ", formattedConversation);

        let state = await this.runtime.composeState(message, {
            twitterClient: this.client.twitterClient,
            twitterUserName: this.runtime.getSetting("TWITTER_USERNAME"),
            currentPost,
            formattedConversation,
        });

        // check if the tweet exists, save if it doesn't
        const tweetId = stringToUuid(tweet.id + "-" + this.runtime.agentId);
        const tweetExists =
            await this.runtime.messageManager.getMemoryById(tweetId);

        if (!tweetExists) {
            elizaLogger.log("tweet does not exist, saving");
            const userIdUUID = stringToUuid(tweet.userId as string);
            const roomId = stringToUuid(tweet.conversationId);

            const message = {
                id: tweetId,
                agentId: this.runtime.agentId,
                content: {
                    text: tweet.text,
                    url: tweet.permanentUrl,
                    inReplyTo: tweet.inReplyToStatusId
                        ? stringToUuid(
                              tweet.inReplyToStatusId +
                                  "-" +
                                  this.runtime.agentId
                          )
                        : undefined,
                },
                userId: userIdUUID,
                roomId,
                createdAt: tweet.timestamp * 1000,
            };
            this.client.saveRequestMessage(message, state);
        }

        const context = composeContext({
            state,
            template:
                this.runtime.character.templates
                    ?.twitterMessageHandlerTemplate ||
                this.runtime.character?.templates?.messageHandlerTemplate ||
                twitterMessageHandlerTemplate,
        });

        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        const removeQuotes = (str: string) =>
            str.replace(/^['"](.*)['"]$/, "$1");

        const stringId = stringToUuid(tweet.id + "-" + this.runtime.agentId);

        response.inReplyTo = stringId;

        response.text = removeQuotes(response.text);

        if (response.text) {
            try {
                const callback: HandlerCallback = async (response: Content) => {
                    const memories = await sendTweet(
                        this.client,
                        response,
                        message.roomId,
                        this.runtime.getSetting("TWITTER_USERNAME"),
                        tweet.id
                    );
                    return memories;
                };

                const responseMessages = await callback(response);

                state = (await this.runtime.updateRecentMessageState(
                    state
                )) as State;

                for (const responseMessage of responseMessages) {
                    if (
                        responseMessage ===
                        responseMessages[responseMessages.length - 1]
                    ) {
                        responseMessage.content.action = response.action;
                    } else {
                        responseMessage.content.action = "CONTINUE";
                    }
                    await this.runtime.messageManager.createMemory(
                        responseMessage
                    );
                }

                await this.runtime.evaluate(message, state);

                await this.runtime.processActions(
                    message,
                    responseMessages,
                    state
                );

                const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${tweet.id} - ${tweet.username}: ${tweet.text}\nAgent's Output:\n${response.text}`;

                await this.runtime.cacheManager.set(
                    `twitter/tweet_generation_${tweet.id}.txt`,
                    responseInfo
                );
                await wait();
            } catch (error) {
                elizaLogger.error(`Error sending response tweet: ${error}`);
            }
        }
    }

    async buildConversationThread(
        tweet: Tweet,
        maxReplies: number = 10
    ): Promise<Tweet[]> {
        const thread: Tweet[] = [];
        const visited: Set<string> = new Set();

        async function processThread(currentTweet: Tweet, depth: number = 0) {
            elizaLogger.log("Processing tweet:", {
                id: currentTweet.id,
                inReplyToStatusId: currentTweet.inReplyToStatusId,
                depth: depth,
            });

            if (!currentTweet) {
                elizaLogger.log("No current tweet found for thread building");
                return;
            }

            if (depth >= maxReplies) {
                elizaLogger.log("Reached maximum reply depth", depth);
                return;
            }

            // Handle memory storage
            const memory = await this.runtime.messageManager.getMemoryById(
                stringToUuid(currentTweet.id + "-" + this.runtime.agentId)
            );
            if (!memory) {
                const roomId = stringToUuid(
                    currentTweet.conversationId + "-" + this.runtime.agentId
                );
                const userId = stringToUuid(currentTweet.userId);

                await this.runtime.ensureConnection(
                    userId,
                    roomId,
                    currentTweet.username,
                    currentTweet.name,
                    "twitter"
                );

                this.runtime.messageManager.createMemory({
                    id: stringToUuid(
                        currentTweet.id + "-" + this.runtime.agentId
                    ),
                    agentId: this.runtime.agentId,
                    content: {
                        text: currentTweet.text,
                        source: "twitter",
                        url: currentTweet.permanentUrl,
                        inReplyTo: currentTweet.inReplyToStatusId
                            ? stringToUuid(
                                  currentTweet.inReplyToStatusId +
                                      "-" +
                                      this.runtime.agentId
                              )
                            : undefined,
                    },
                    createdAt: currentTweet.timestamp * 1000,
                    roomId,
                    userId:
                        currentTweet.userId === this.twitterUserId
                            ? this.runtime.agentId
                            : stringToUuid(currentTweet.userId),
                    embedding: getEmbeddingZeroVector(),
                });
            }

            if (visited.has(currentTweet.id)) {
                elizaLogger.log("Already visited tweet:", currentTweet.id);
                return;
            }

            visited.add(currentTweet.id);
            thread.unshift(currentTweet);

            elizaLogger.debug("Current thread state:", {
                length: thread.length,
                currentDepth: depth,
                tweetId: currentTweet.id,
            });

            if (currentTweet.inReplyToStatusId) {
                elizaLogger.log(
                    "Fetching parent tweet:",
                    currentTweet.inReplyToStatusId
                );
                try {
                    const parentTweet = await this.twitterClient.getTweet(
                        currentTweet.inReplyToStatusId
                    );

                    if (parentTweet) {
                        elizaLogger.log("Found parent tweet:", {
                            id: parentTweet.id,
                            text: parentTweet.text?.slice(0, 50),
                        });
                        await processThread(parentTweet, depth + 1);
                    } else {
                        elizaLogger.log(
                            "No parent tweet found for:",
                            currentTweet.inReplyToStatusId
                        );
                    }
                } catch (error) {
                    elizaLogger.log("Error fetching parent tweet:", {
                        tweetId: currentTweet.inReplyToStatusId,
                        error,
                    });
                }
            } else {
                elizaLogger.log(
                    "Reached end of reply chain at:",
                    currentTweet.id
                );
            }
        }

        // Need to bind this context for the inner function
        await processThread.bind(this)(tweet, 0);

        elizaLogger.debug("Final thread built:", {
            totalTweets: thread.length,
            tweetIds: thread.map((t) => ({
                id: t.id,
                text: t.text?.slice(0, 50),
            })),
        });

        return thread;
    }

    /**
     * Checks if a user has sufficient smart followers using Elfa API
     * @param username Twitter username to check
     * @returns Promise<boolean> true if user has enough smart followers or if check is disabled
     */
    private async checkSmartStats(username: string): Promise<boolean> {
        elizaLogger.info(`[SmartStats] Starting check for @${username}`);

        if (!username) {
            elizaLogger.warn("[SmartStats] No username provided");
            return true;
        }

        // Get smart reply configuration with validation
        const { enabled: isSmartRepliesEnabled, apiKey: elfaApiKey, error } = this.client.getSmartReplyConfig();

        // Get threshold from character settings
        const threshold = parseInt(this.runtime.getSetting("SMART_FOLLOWERS_THRESHOLD") || "10");

        elizaLogger.debug(`[SmartStats] Configuration:
            Enabled: ${isSmartRepliesEnabled}
            Username: ${username}
            Threshold: ${threshold}
        `);

        // Handle configuration errors
        if (error) {
            elizaLogger.warn(`[SmartStats] Configuration error: ${error}`);
            return true;
        }

        if (!isSmartRepliesEnabled) {
            elizaLogger.info("[SmartStats] Smart replies disabled - allowing all responses");
            return true;
        }

        try {
            const response = await fetch(
                `https://api.elfa.ai/v1/account/smart-stats?username=${encodeURIComponent(username)}`,
                {
                    headers: {
                        'accept': 'application/json',
                        'x-elfa-api-key': elfaApiKey
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.error || response.statusText;
                elizaLogger.error(`[SmartStats] API error (${response.status}):`, errorMessage);

                switch (response.status) {
                    case 401:
                        elizaLogger.error("[SmartStats] Invalid API key");
                        return true;
                    case 404:
                        elizaLogger.warn("[SmartStats] User not found");
                        return true;
                    case 429:
                        elizaLogger.warn("[SmartStats] Rate limit exceeded");
                        return true;
                    default:
                        return true;
                }
            }

            // Validate response data
            if (!data || typeof data.smartFollowersCount !== 'number') {
                elizaLogger.error("[SmartStats] Invalid API response format:", data);
                return true;
            }

            // Check if the user has enough smart followers. If not, return true to allow all responses
            const shouldRespond = data.smartFollowersCount >= threshold;
            elizaLogger.info(`[SmartStats] Results for @${username}:
                Smart Followers: ${data.smartFollowersCount}
                Should Respond: ${shouldRespond}
                Threshold: ${threshold}
            `);

            return shouldRespond;
        } catch (error) {
            elizaLogger.error("[SmartStats] Error checking stats:", {
                error: error.message,
                type: error.name,
                stack: error.stack
            });

            // Handle specific error types
            if (error.name === 'AbortError') {
                elizaLogger.warn("[SmartStats] Request timeout");
            } else if (error.name === 'TypeError') {
                elizaLogger.warn("[SmartStats] Network or parsing error");
            }

            return true;
        }
    }
}
