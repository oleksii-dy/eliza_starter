import {
    type Evaluator,
    type IAgentRuntime,
    type Memory,
    type State,
    composePrompt,
    ModelType,
    logger,
    ChannelType,
} from '@elizaos/core';

const chatTitleTemplate = `
Based on the conversation below, generate a short, descriptive title for this chat. The title should capture the main topic or theme of the discussion.

Rules:
- Keep it concise (3-6 words)
- Make it descriptive and specific
- Avoid generic terms like "Chat" or "Conversation"
- Focus on the main topic, activity, or subject matter
- Use natural language, not hashtags or symbols

Examples:
- "React Component Help"
- "Weekend Trip Planning"
- "Database Design Discussion"
- "Recipe Exchange"
- "Career Advice Session"

Recent conversation:
{{recentMessages}}

Respond with just the title, nothing else.
`;

async function handler(runtime: IAgentRuntime, message: Memory, state?: State) {
    try {
        logger.info(`[ChatTitleEvaluator] Processing message in room ${message.roomId}`);

        // Get the room details to find the channel ID
        const room = await runtime.getRoom(message.roomId);
        if (!room) {
            logger.warn(`[ChatTitleEvaluator] Room ${message.roomId} not found`);
            return;
        }

        logger.info(`[ChatTitleEvaluator] Room details - ID: ${room.id}, channelId: ${room.channelId}, type: ${room.type}`);

        // Only process DM channels or GROUP channels with 2 participants (1-on-1 conversations)
        let isOneOnOneConversation = room.type === ChannelType.DM;

        if (room.type === ChannelType.GROUP) {
            // For GROUP channels, check if it's actually a 1-on-1 conversation
            try {
                const participants = await runtime.getParticipantsForRoom(message.roomId);
                isOneOnOneConversation = participants.length === 2;
                logger.info(`[ChatTitleEvaluator] GROUP room has ${participants.length} participants: ${participants.join(', ')}`);
            } catch (error) {
                logger.warn(`[ChatTitleEvaluator] Could not get participants for room ${message.roomId}:`, error);
                // Fallback: assume it's not 1-on-1 if we can't get participant count
                isOneOnOneConversation = false;
            }
        } else if (room.type === ChannelType.DM) {
            logger.info(`[ChatTitleEvaluator] DM room detected`);
        }

        if (!isOneOnOneConversation) {
            logger.info(`[ChatTitleEvaluator] Skipping room type: ${room.type} (not a 1-on-1 conversation)`);
            return;
        }

        const channelId = room.channelId;

        if (!channelId) {
            logger.warn(`[ChatTitleEvaluator] No channelId found for room ${message.roomId}. Room details:`, room);
            return;
        }

        // Count messages to determine cache key
        const messageCount = await runtime.countMemories(message.roomId, true, 'messages');

        // Check if we've already updated the title for this specific message count
        const titleUpdatedKey = `${message.roomId}-title-updated-${messageCount}`;
        const alreadyUpdated = await runtime.getCache<boolean>(titleUpdatedKey);
        if (alreadyUpdated) {
            logger.debug(`[ChatTitleEvaluator] Title already updated for room ${message.roomId} at ${messageCount} messages`);
            return;
        }

        // Get recent messages to analyze
        const messages = await runtime.getMemories({
            roomId: message.roomId,
            tableName: 'messages',
            count: 15, // Get a few extra messages for better context
        });

        logger.info(`[ChatTitleEvaluator] Found ${messages.length} messages in room ${message.roomId}, total count: ${messageCount}`);

        if (messageCount < 10) {
            logger.debug(`[ChatTitleEvaluator] Only ${messageCount} messages, need at least 10`);
            return;
        }

        // Compose the conversation context
        const recentMessages = messages
            .reverse() // Show in chronological order
            .map((msg) => {
                const isUser = msg.entityId !== runtime.agentId;
                const role = isUser ? 'User' : 'Agent';
                return `${role}: ${msg.content.text}`;
            })
            .join('\n');

        logger.info(`[ChatTitleEvaluator] Generating title for conversation with ${messages.length} messages`);

        // Generate a title using the LLM
        const context = composePrompt({
            state: { recentMessages },
            template: chatTitleTemplate,
        });

        const newTitle = await runtime.useModel(ModelType.TEXT_SMALL, {
            prompt: context,
            temperature: 0.3, // Use low temperature for consistent titles
            maxTokens: 50, // Keep titles short
        });

        if (!newTitle || newTitle.trim().length === 0) {
            logger.warn(`[ChatTitleEvaluator] Failed to generate title for room ${message.roomId}`);
            return;
        }

        const cleanTitle = newTitle.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present

        logger.info(`[ChatTitleEvaluator] Generated title: "${cleanTitle}" for room ${message.roomId}`);

        // Update the channel name via the REST API
        try {
            // Get the central message server URL from runtime settings
            const centralServerUrl = runtime.getSetting('CENTRAL_MESSAGE_SERVER_URL') || 'http://localhost:3000';

            logger.info(`[ChatTitleEvaluator] Attempting to update channel ${channelId} with title "${cleanTitle}" at ${centralServerUrl}`);

            const response = await fetch(`${centralServerUrl}/api/messaging/central-channels/${channelId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: cleanTitle,
                }),
            });

            logger.info(`[ChatTitleEvaluator] API response status: ${response.status}`);

            if (response.ok) {
                // Mark as updated to avoid repeated processing
                await runtime.setCache(titleUpdatedKey, true);

                logger.info(`[ChatTitleEvaluator] Successfully updated channel title to: "${cleanTitle}"`);
            } else {
                const errorText = await response.text();
                logger.error(`[ChatTitleEvaluator] Failed to update channel ${channelId}: ${response.status} ${errorText}`);
            }
        } catch (error) {
            logger.error(`[ChatTitleEvaluator] Error updating channel ${channelId}:`, error);
        }

    } catch (error) {
        logger.error('[ChatTitleEvaluator] Error in handler:', error);
    }
}

export const chatTitleEvaluator: Evaluator = {
    name: 'CHAT_TITLE_UPDATER',
    similes: ['UPDATE_CHAT_TITLE', 'RENAME_CHAT', 'TITLE_GENERATOR'],
    description: 'Automatically updates DM chat titles based on conversation topic after 10 messages',
    alwaysRun: true,

    validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
        try {
            logger.info(`[ChatTitleEvaluator] Processing message in room ${message.roomId}`);

            // Only run for DM channels or GROUP channels with 2 participants (1-on-1 conversations)
            const room = await runtime.getRoom(message.roomId);
            if (!room) {
                logger.debug(`[ChatTitleEvaluator] Room not found: ${message.roomId}`);
                return false;
            }

            // Check if it's a DM or a 1-on-1 GROUP conversation
            let isOneOnOneConversation = room.type === ChannelType.DM;

            if (room.type === ChannelType.GROUP) {
                // For GROUP channels, check if it's actually a 1-on-1 conversation
                try {
                    const participants = await runtime.getParticipantsForRoom(message.roomId);
                    isOneOnOneConversation = participants.length === 2;
                    logger.debug(`[ChatTitleEvaluator] GROUP room has ${participants.length} participants`);
                } catch (error) {
                    logger.warn(`[ChatTitleEvaluator] Could not get participants for room ${message.roomId}:`, error);
                    // Fallback: assume it's not 1-on-1 if we can't get participant count
                    isOneOnOneConversation = false;
                }
            }

            if (!isOneOnOneConversation) {
                logger.debug(`[ChatTitleEvaluator] Skipping room type: ${room.type} (not a 1-on-1 conversation)`);
                return false;
            }

            // Count messages first to check if we should process
            const messageCount = await runtime.countMemories(message.roomId, true, 'messages');
            logger.info(`[ChatTitleEvaluator] Message count for room ${message.roomId}: ${messageCount}`);

            // Check if title was already updated for this specific message count
            const titleUpdatedKey = `${message.roomId}-title-updated-${messageCount}`;
            const alreadyUpdated = await runtime.getCache<boolean>(titleUpdatedKey);
            if (alreadyUpdated) {
                logger.debug(`[ChatTitleEvaluator] Title already updated for room ${message.roomId} at ${messageCount} messages`);
                return false;
            }

            // Trigger at every 10th message (10, 20, 30, etc.)
            let shouldTrigger = messageCount > 0 && messageCount % 10 === 0;

            // Fallback: if we're past a multiple of 10 and haven't updated recently, trigger anyway
            if (!shouldTrigger && messageCount >= 10) {
                const lastMultipleOf10 = Math.floor(messageCount / 10) * 10;
                const fallbackKey = `${message.roomId}-title-updated-${lastMultipleOf10}`;
                const lastUpdate = await runtime.getCache<boolean>(fallbackKey);
                if (!lastUpdate) {
                    logger.info(`[ChatTitleEvaluator] Fallback trigger: missed update at ${lastMultipleOf10} messages, triggering now at ${messageCount}`);
                    shouldTrigger = true;
                }
            }

            logger.info(`[ChatTitleEvaluator] Should trigger: ${shouldTrigger} (messageCount: ${messageCount}, messageCount % 10: ${messageCount % 10})`);
            return shouldTrigger;
        } catch (error) {
            logger.error('[ChatTitleEvaluator] Error in validate:', error);
            return false;
        }
    },

    handler,

    examples: [
        {
            prompt: `Agent Name: ElizaBot
Room Type: DM
Message Count: 10
Current conversation about React development`,
            messages: [
                {
                    name: 'User',
                    content: {
                        text: 'Hi! I need help with React components',
                    },
                },
                {
                    name: 'ElizaBot',
                    content: {
                        text: 'I\'d be happy to help! What specific aspect of React components are you working with?',
                    },
                },
                {
                    name: 'User',
                    content: {
                        text: 'I\'m trying to understand how to pass props between components',
                    },
                },
                {
                    name: 'ElizaBot',
                    content: {
                        text: 'Props are a fundamental concept in React. Let me show you how they work...',
                    },
                },
                {
                    name: 'User',
                    content: {
                        text: 'That makes sense! Can you show me an example with a child component?',
                    },
                },
            ],
            outcome: `Chat title updated to: "React Props Tutorial"`,
        },
        {
            prompt: `Agent Name: ElizaBot
Room Type: DM
Message Count: 10
Current conversation about travel planning`,
            messages: [
                {
                    name: 'User',
                    content: {
                        text: 'I want to plan a trip to Japan next spring',
                    },
                },
                {
                    name: 'ElizaBot',
                    content: {
                        text: 'Japan in spring is beautiful! Are you interested in seeing the cherry blossoms?',
                    },
                },
                {
                    name: 'User',
                    content: {
                        text: 'Yes! Which cities would be best for that?',
                    },
                },
                {
                    name: 'ElizaBot',
                    content: {
                        text: 'Tokyo, Kyoto, and Osaka are excellent choices for cherry blossom viewing...',
                    },
                },
            ],
            outcome: `Chat title updated to: "Japan Spring Travel"`,
        },
    ],
}; 