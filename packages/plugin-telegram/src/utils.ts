import type { TopicMetadata } from './types';
/**
 * Escapes Markdown special characters in the given text, excluding code blocks.
 * @param {string} text - The text to escape Markdown characters from.
 * @returns {string} The text with escaped Markdown characters.
 */
export function escapeMarkdown(text: string): string {
  // Don't escape if it's a code block
  if (text.startsWith('```') && text.endsWith('```')) {
    return text;
  }

  // Split the text by code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts
    .map((part, index) => {
      // If it's a code block (odd indices in the split result will be code blocks)
      if (index % 2 === 1) {
        return part;
      }
      // For regular text, only escape characters that need escaping in Markdown
      return (
        part
          // First preserve any intended inline code spans
          .replace(/`.*?`/g, (match) => match)
          // Then only escape the minimal set of special characters that need escaping in Markdown mode
          .replace(/([*_`\\])/g, '\\$1')
      );
    })
    .join('');
}

/**
 * Splits a message into chunks that fit within Telegram's message length limit
 */
/**
 * Splits a text message into chunks based on a maximum length for each chunk.
 *
 * @param {string} text - The text message to split.
 * @param {number} maxLength - The maximum length for each chunk (default is 4096).
 * @returns {string[]} An array containing the text message split into chunks.
 */
export function splitMessage(text: string, maxLength = 4096): string[] {
  const chunks: string[] = [];
  let currentChunk = '';

  const lines = text.split('\n');
  for (const line of lines) {
    if (currentChunk.length + line.length + 1 <= maxLength) {
      currentChunk += (currentChunk ? '\n' : '') + line;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = line;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

/**
 * Transforms a Telegram ID into a format suitable for UUID generation
 * @param id The Telegram ID to transform
 * @param type The type of entity (user, chat, message, etc.)
 * @returns A string that can be used to generate a UUID
 */
export function transformTelegramId(id: string, type: string): string {
  return `telegram-${type}-${id}`;
}

/**
 * Generates a room ID based on chat ID.
 * This ensures rooms have a consistent identifier across sessions.
 * For group chats, this generates the same ID for all participants.
 *
 * @param {string | number} chatId - The Telegram chat ID
 * @returns {string} A prefixed ID string suitable for UUID generation
 */
export function generateRoomId(chatId: string | number): string {
  return `room-${chatId}`;
}

/**
 * Generates a world ID based on user ID.
 * This implements the user-centric world model described in the documentation.
 *
 * @param {string | number} userId - The Telegram user ID
 * @returns {string} A prefixed ID string suitable for UUID generation
 */
export function generateWorldId(userId: string | number): string {
  return `world-${userId}`;
}

/**
 * Generates a reaction ID from message ID, user ID and timestamp.
 * This ensures reaction events have a unique identifier.
 *
 * @param {string | number} messageId - The message ID that was reacted to
 * @param {string | number} userId - The user ID who reacted
 * @param {number} timestamp - Timestamp when the reaction occurred
 * @returns {string} A prefixed ID string suitable for UUID generation
 */
export function generateReactionId(
  messageId: string | number,
  userId: string | number,
  timestamp: number
): string {
  return `reaction-${messageId}-${userId}-${timestamp}`;
}

/**
 * Checks if a chat is a forum based on its properties.
 * In Telegram, forums are special supergroups with the is_forum flag set to true.
 *
 * @param {Object} chat - The chat object to check
 * @returns {boolean} True if the chat is a forum, false otherwise
 */
export function isForum(chat: any): boolean {
  return chat?.type === 'supergroup' && chat?.is_forum === true;
}

/**
 * Generates a world ID for a forum supergroup.
 * Unlike user-centric worlds, forum supergroups get their own world.
 *
 * @param {string | number} groupId - The forum supergroup ID
 * @returns {string} A prefixed ID string suitable for UUID generation
 */
export function generateForumWorldId(groupId: string | number): string {
  return `forum-world-${groupId}`;
}

/**
 * Generates a room ID for a topic within a forum.
 *
 * @param {string | number} chatId - The forum supergroup ID
 * @param {string | number} topicId - The topic ID within the forum
 * @returns {string} A prefixed ID string suitable for UUID generation
 */
export function generateTopicRoomId(chatId: string | number, topicId: string | number): string {
  return `topic-room-${chatId}-${topicId}`;
}

/**
 * Determines if a topic in a forum is the "General" topic.
 * In Telegram, the General topic always has ID 1 and is treated specially.
 *
 * @param {string | number} topicId - The topic ID to check
 * @returns {boolean} True if this is the General topic, false otherwise
 */
export function isGeneralTopic(topicId: string | number): boolean {
  return topicId.toString() === '1';
}

/**
 * Determines the most appropriate world model to use based on the chat type.
 * This implements the dual world model architecture described in the documentation:
 * - User-centric: Standard chats, private messages, regular groups
 * - Forum-centric: Forum supergroups with topics
 *
 * @param {Object} chat - The chat object to analyze
 * @returns {'user-centric' | 'forum-centric'} The world model type to use
 */
export function determineWorldModel(chat: any): 'user-centric' | 'forum-centric' {
  if (isForum(chat)) {
    return 'forum-centric';
  }
  return 'user-centric';
}

/**
 * Generates a room name for a topic based on its attributes.
 *
 * @param {Object} topic - The topic information
 * @returns {string} A formatted room name for the topic
 */
export function generateTopicName(topic: any): string {
  // Handle icon_custom_emoji_id if present
  const emoji = topic.icon_custom_emoji_id ? '📌' : ''; // Default emoji if custom one exists
  const name = topic.name || 'Unnamed Topic';
  return emoji ? `${emoji} ${name}` : name;
}

/**
 * Extracts room metadata for a forum topic.
 *
 * @param {Object} topic - The topic information
 * @returns {TopicMetadata} Metadata object with topic-specific attributes
 */
export function extractTopicMetadata(topic: any): TopicMetadata {
  return {
    topicId: topic.message_thread_id?.toString(),
    iconColor: topic.icon_color,
    iconCustomEmojiId: topic.icon_custom_emoji_id,
    isPinned: topic.is_pinned || false,
    isHidden: false,
    isGeneral: isGeneralTopic(topic.message_thread_id),
    isTopic: true,
    isForumTopic: true,
    createdAt: topic.created_at || Date.now(),
    forumTopicCreated: topic.forum_topic_created || null,
  };
}
