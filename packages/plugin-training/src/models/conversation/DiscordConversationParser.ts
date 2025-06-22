import { elizaLogger, type Memory, type Character, type IAgentRuntime, type UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

/**
 * DiscordConversationParser - Parses Discord conversation exports into training data
 * 
 * This parser converts Discord JSON exports into ElizaOS-compatible training data
 * for the conversation/reply model. It creates character profiles for each user
 * and formats conversations exactly like our current prompt structure.
 */

export interface DiscordMessage {
  id: string;
  timestamp: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    bot: boolean;
    avatar?: string;
  };
  content: string;
  attachments: any[];
  embeds: any[];
  mentions: Array<{ id: string; username: string }>;
  reference?: { messageId: string };
  reactions: Array<{ emoji: string; count: number }>;
  url: string;
}

export interface DiscordConversationExport {
  guild: {
    id: string;
    name: string;
  };
  channel: {
    id: string;
    name: string;
    type: string;
  };
  messages: DiscordMessage[];
  metadata: {
    exportedAt: string;
    totalMessages: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

export interface ConversationTrainingExample {
  input: {
    messageHistory: Array<{
      entityId: string;
      content: { text: string; source: string };
      timestamp: number;
    }>;
    contextState: {
      roomId: string;
      worldId: string;
      participants: string[];
      channelInfo: {
        name: string;
        type: string;
      };
    };
    targetUser: {
      entityId: string;
      username: string;
      displayName: string;
      characterProfile: Character;
    };
    currentMessage: {
      text: string;
      timestamp: number;
      inReplyTo?: string;
      mentions: string[];
    };
  };
  output: {
    response: {
      text: string;
      actions?: string[];
      thinking?: string;
    };
    reasoning: string;
    confidence: number;
  };
  metadata: {
    conversationId: string;
    messageId: string;
    responseType: string;
    contextLength: number;
    userId: string;
  };
}

export class DiscordConversationParser {
  private userProfiles: Map<string, Character> = new Map();
  private entityIdMap: Map<string, UUID> = new Map();
  private conversationHistory: Map<string, DiscordMessage[]> = new Map();

  constructor(private runtime?: IAgentRuntime) {}

  /**
   * Parse a Discord conversation export file
   */
  async parseConversationFile(filePath: string): Promise<ConversationTrainingExample[]> {
    try {
      elizaLogger.info(`📖 Parsing Discord conversation: ${filePath}`);
      
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const conversationData: DiscordConversationExport = JSON.parse(fileContent);
      
      return await this.parseConversation(conversationData);
      
    } catch (error) {
      elizaLogger.error(`❌ Failed to parse conversation file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Parse conversation data into training examples
   */
  async parseConversation(conversationData: DiscordConversationExport): Promise<ConversationTrainingExample[]> {
    const examples: ConversationTrainingExample[] = [];
    
    // Sort messages chronologically
    const sortedMessages = conversationData.messages.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Generate user profiles for all participants
    await this.generateUserProfiles(sortedMessages);
    
    // Create entity ID mappings
    this.createEntityMappings(sortedMessages, conversationData);

    // Process messages in conversation context windows
    for (let i = 0; i < sortedMessages.length; i++) {
      const currentMessage = sortedMessages[i];
      
      // Skip bot messages for now (we'll train on human responses)
      if (currentMessage.author.bot) {
        continue;
      }

      // Get conversation context (previous 10 messages)
      const contextStart = Math.max(0, i - 10);
      const messageHistory = sortedMessages.slice(contextStart, i);
      
      // Skip if insufficient context
      if (messageHistory.length < 2) {
        continue;
      }

      // Create training example
      const example = await this.createTrainingExample(
        currentMessage,
        messageHistory,
        conversationData,
        i
      );
      
      if (example) {
        examples.push(example);
      }
    }

    elizaLogger.info(`✅ Generated ${examples.length} training examples from conversation`);
    return examples;
  }

  /**
   * Generate character profiles for all users in the conversation
   */
  private async generateUserProfiles(messages: DiscordMessage[]): Promise<void> {
    const userMessageMap = new Map<string, DiscordMessage[]>();
    
    // Group messages by user
    for (const message of messages) {
      if (message.author.bot) continue;
      
      const userId = message.author.id;
      if (!userMessageMap.has(userId)) {
        userMessageMap.set(userId, []);
      }
      userMessageMap.get(userId)!.push(message);
    }

    // Generate profiles for each user
    for (const [userId, userMessages] of userMessageMap) {
      const profile = await this.generateUserProfile(userId, userMessages);
      this.userProfiles.set(userId, profile);
    }

    elizaLogger.info(`👥 Generated ${this.userProfiles.size} user profiles`);
  }

  /**
   * Generate a character profile for a specific user
   */
  private async generateUserProfile(userId: string, messages: DiscordMessage[]): Promise<Character> {
    const firstMessage = messages[0];
    const user = firstMessage.author;
    
    // Analyze user's message patterns
    const messageAnalysis = this.analyzeUserMessages(messages);
    
    // Extract topics and interests
    const topics = this.extractTopics(messages);
    
    // Extract communication style
    const style = this.analyzeWritingStyle(messages);
    
    // Create character profile
    const character: Character = {
      name: user.displayName || user.username,
      username: user.username,
      bio: [
        `Discord user active in tech/AI communities`,
        `Communication style: ${messageAnalysis.style}`,
        `Average message length: ${messageAnalysis.avgLength} characters`,
        `Typical response time: ${messageAnalysis.avgResponseTime}`,
        `Primary interests: ${topics.slice(0, 3).join(', ')}`,
      ],
      system: `You are ${user.displayName || user.username}, a Discord community member. 
Respond naturally as this user would, maintaining their communication style and interests.
${style.description}`,
      messageExamples: this.createMessageExamples(messages),
      postExamples: messages.slice(0, 5).map(msg => msg.content).filter(content => content.length > 0),
      topics: topics,
      adjectives: style.adjectives,
      knowledge: [],
      plugins: [],
      settings: {
        discordUserId: userId,
        averageMessageLength: messageAnalysis.avgLength,
        responseTimePattern: messageAnalysis.responsePattern,
      },
      secrets: {},
      style: {
        all: style.patterns,
        chat: style.chatPatterns,
        post: style.postPatterns,
      },
    };

    return character;
  }

  /**
   * Analyze user's messaging patterns
   */
  private analyzeUserMessages(messages: DiscordMessage[]) {
    const lengths = messages.map(msg => msg.content.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    
    // Analyze response timing
    const responseTimes: number[] = [];
    for (let i = 1; i < messages.length; i++) {
      const prevTime = new Date(messages[i - 1].timestamp).getTime();
      const currentTime = new Date(messages[i].timestamp).getTime();
      responseTimes.push(currentTime - prevTime);
    }
    
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    // Classify communication style
    const shortMessages = messages.filter(msg => msg.content.length < 50).length;
    const longMessages = messages.filter(msg => msg.content.length > 200).length;
    const questionsAsked = messages.filter(msg => msg.content.includes('?')).length;
    
    let style = 'conversational';
    if (shortMessages / messages.length > 0.7) style = 'concise';
    if (longMessages / messages.length > 0.3) style = 'detailed';
    if (questionsAsked / messages.length > 0.4) style = 'inquisitive';

    return {
      avgLength: Math.round(avgLength),
      avgResponseTime: this.formatResponseTime(avgResponseTime),
      style,
      responsePattern: this.classifyResponsePattern(responseTimes),
    };
  }

  /**
   * Extract topics from user messages
   */
  private extractTopics(messages: DiscordMessage[]): string[] {
    const allText = messages.map(msg => msg.content).join(' ').toLowerCase();
    
    // Common tech/AI topics
    const topicKeywords = {
      'artificial-intelligence': ['ai', 'llm', 'gpt', 'claude', 'model', 'training', 'machine learning'],
      'programming': ['code', 'coding', 'python', 'javascript', 'typescript', 'react', 'node'],
      'blockchain': ['crypto', 'blockchain', 'ethereum', 'bitcoin', 'defi', 'nft', 'solana'],
      'development': ['dev', 'development', 'api', 'framework', 'library', 'github'],
      'discord-bots': ['bot', 'discord', 'eliza', 'agent', 'automation'],
      'gaming': ['game', 'gaming', 'play', 'steam', 'fps', 'mmo'],
      'technology': ['tech', 'software', 'hardware', 'computer', 'server'],
      'community': ['community', 'help', 'support', 'question', 'discussion'],
    };

    const topics: string[] = [];
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const matches = keywords.filter(keyword => allText.includes(keyword)).length;
      if (matches >= 2) {
        topics.push(topic);
      }
    }

    return topics.length > 0 ? topics : ['general-discussion', 'community-member'];
  }

  /**
   * Analyze writing style patterns
   */
  private analyzeWritingStyle(messages: DiscordMessage[]) {
    const allText = messages.map(msg => msg.content).join(' ');
    
    // Analyze patterns
    const usesEmojis = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(allText);
    const usesCaps = /[A-Z]{3,}/.test(allText);
    const usesSlang = /\b(lol|lmao|tbh|imo|btw|ngl)\b/i.test(allText);
    const formal = /\b(however|furthermore|therefore|consequently)\b/i.test(allText);
    const technical = /\b(function|variable|parameter|algorithm|implementation)\b/i.test(allText);
    
    const adjectives: string[] = [];
    const patterns: string[] = [];
    const chatPatterns: string[] = [];
    const postPatterns: string[] = [];
    
    if (usesEmojis) {
      adjectives.push('expressive');
      patterns.push('Uses emojis frequently');
      chatPatterns.push('Include emojis when appropriate');
    }
    
    if (usesCaps) {
      adjectives.push('emphatic');
      patterns.push('Uses caps for emphasis');
      chatPatterns.push('Use caps sparingly for emphasis');
    }
    
    if (usesSlang) {
      adjectives.push('casual');
      patterns.push('Uses internet slang');
      chatPatterns.push('Use casual internet expressions');
    }
    
    if (formal) {
      adjectives.push('articulate');
      patterns.push('Uses formal language structures');
      postPatterns.push('Maintain formal tone in longer messages');
    }
    
    if (technical) {
      adjectives.push('technical');
      patterns.push('Uses technical terminology');
      postPatterns.push('Include relevant technical details');
    }

    // Default patterns if none detected
    if (patterns.length === 0) {
      adjectives.push('conversational', 'friendly');
      patterns.push('Maintains natural conversation flow');
      chatPatterns.push('Respond naturally and helpfully');
    }

    return {
      adjectives: adjectives.length > 0 ? adjectives : ['helpful', 'friendly'],
      patterns: patterns.length > 0 ? patterns : ['Natural conversational style'],
      chatPatterns: chatPatterns.length > 0 ? chatPatterns : ['Respond naturally'],
      postPatterns: postPatterns.length > 0 ? postPatterns : ['Keep responses relevant'],
      description: `Communication style is ${adjectives.join(' and ')}. ${patterns.join('. ')}.`,
    };
  }

  /**
   * Create message examples for character
   */
  private createMessageExamples(messages: DiscordMessage[]): Array<Array<{ name: string; content: { text: string } }>> {
    const examples: Array<Array<{ name: string; content: { text: string } }>> = [];
    
    // Find conversation pairs (question/response patterns)
    for (let i = 1; i < Math.min(messages.length, 10); i++) {
      const prevMsg = messages[i - 1];
      const currentMsg = messages[i];
      
      // Look for natural conversation flow
      if (prevMsg.content.length > 10 && currentMsg.content.length > 10) {
        examples.push([
          {
            name: 'user',
            content: { text: prevMsg.content },
          },
          {
            name: currentMsg.author.displayName || currentMsg.author.username,
            content: { text: currentMsg.content },
          },
        ]);
      }
      
      if (examples.length >= 5) break;
    }

    // Add single message examples if not enough pairs
    while (examples.length < 3) {
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      if (randomMsg.content.length > 20) {
        examples.push([
          {
            name: 'user',
            content: { text: 'What do you think about this?' },
          },
          {
            name: randomMsg.author.displayName || randomMsg.author.username,
            content: { text: randomMsg.content },
          },
        ]);
      }
    }

    return examples;
  }

  /**
   * Create entity ID mappings
   */
  private createEntityMappings(messages: DiscordMessage[], conversationData: DiscordConversationExport): void {
    const userIds = new Set(messages.map(msg => msg.author.id));
    
    for (const userId of userIds) {
      // Create deterministic UUID based on Discord user ID
      const entityId = this.runtime 
        ? this.createUniqueUuid(this.runtime, userId)
        : uuidv4() as UUID;
      this.entityIdMap.set(userId, entityId);
    }

    elizaLogger.info(`🔗 Created entity mappings for ${userIds.size} users`);
  }

  /**
   * Create a training example from a message and its context
   */
  private async createTrainingExample(
    currentMessage: DiscordMessage,
    messageHistory: DiscordMessage[],
    conversationData: DiscordConversationExport,
    messageIndex: number
  ): Promise<ConversationTrainingExample | null> {
    try {
      const userId = currentMessage.author.id;
      const userProfile = this.userProfiles.get(userId);
      const entityId = this.entityIdMap.get(userId);
      
      if (!userProfile || !entityId) {
        return null;
      }

      // Convert message history to ElizaOS format
      const formattedHistory = messageHistory.map(msg => ({
        entityId: this.entityIdMap.get(msg.author.id) || (uuidv4() as UUID),
        content: {
          text: msg.content,
          source: 'discord' as const,
        },
        timestamp: new Date(msg.timestamp).getTime(),
      }));

      // Extract potential actions from the message
      const actions = this.extractActions(currentMessage);
      
      // Generate thinking process for complex responses
      const thinking = this.generateThinking(currentMessage, messageHistory);

      // Create the training example
      const example: ConversationTrainingExample = {
        input: {
          messageHistory: formattedHistory,
          contextState: {
            roomId: this.createUniqueUuid(this.runtime, conversationData.channel.id),
            worldId: this.createUniqueUuid(this.runtime, conversationData.guild.id),
            participants: Array.from(this.entityIdMap.values()),
            channelInfo: {
              name: conversationData.channel.name,
              type: conversationData.channel.type,
            },
          },
          targetUser: {
            entityId,
            username: currentMessage.author.username,
            displayName: currentMessage.author.displayName,
            characterProfile: userProfile,
          },
          currentMessage: {
            text: currentMessage.content,
            timestamp: new Date(currentMessage.timestamp).getTime(),
            inReplyTo: currentMessage.reference?.messageId,
            mentions: currentMessage.mentions.map(m => m.id),
          },
        },
        output: {
          response: {
            text: currentMessage.content,
            actions: actions.length > 0 ? actions : undefined,
            thinking: thinking,
          },
          reasoning: this.generateReasoning(currentMessage, messageHistory),
          confidence: this.calculateConfidence(currentMessage, messageHistory),
        },
        metadata: {
          conversationId: `${conversationData.guild.id}-${conversationData.channel.id}`,
          messageId: currentMessage.id,
          responseType: this.classifyResponseType(currentMessage),
          contextLength: messageHistory.length,
          userId: userId,
        },
      };

      return example;
      
    } catch (error) {
      elizaLogger.warn(`Failed to create training example for message ${currentMessage.id}:`, error);
      return null;
    }
  }

  /**
   * Extract potential actions from a message
   */
  private extractActions(message: DiscordMessage): string[] {
    const content = message.content.toLowerCase();
    const actions: string[] = [];

    // Pattern matching for common actions
    if (content.includes('going to') || content.includes("i'll") || content.includes('will do')) {
      actions.push('ANNOUNCE_INTENTION');
    }
    
    if (content.includes('brb') || content.includes('be right back') || content.includes('going away')) {
      actions.push('SET_AWAY_STATUS');
    }
    
    if (content.includes('check this out') || content.includes('look at this') || message.attachments.length > 0) {
      actions.push('SHARE_CONTENT');
    }
    
    if (content.includes('question') || content.includes('help') || content.includes('how do')) {
      actions.push('REQUEST_HELP');
    }
    
    if (content.includes('thanks') || content.includes('thank you')) {
      actions.push('EXPRESS_GRATITUDE');
    }

    return actions;
  }

  /**
   * Generate thinking process for complex responses
   */
  private generateThinking(currentMessage: DiscordMessage, history: DiscordMessage[]): string | undefined {
    // Only generate thinking for longer, more complex messages
    if (currentMessage.content.length < 100) {
      return undefined;
    }

    const content = currentMessage.content;
    const hasQuestion = content.includes('?');
    const hasExplanation = content.length > 200;
    const hasCode = /```/.test(content) || /`[^`]+`/.test(content);
    const hasReference = currentMessage.reference !== null;

    if (!hasQuestion && !hasExplanation && !hasCode && !hasReference) {
      return undefined;
    }

    let thinking = '';

    if (hasReference && history.length > 0) {
      thinking += 'The user is responding to a previous message. I should consider the context. ';
    }

    if (hasQuestion) {
      thinking += 'The user is asking a question, so I should provide a helpful and informative response. ';
    }

    if (hasCode) {
      thinking += 'There is code involved, so I should be technical and precise. ';
    }

    if (hasExplanation) {
      thinking += 'This requires a detailed explanation, so I should be thorough and clear. ';
    }

    return thinking.trim() || undefined;
  }

  /**
   * Generate reasoning for the response
   */
  private generateReasoning(currentMessage: DiscordMessage, history: DiscordMessage[]): string {
    const factors: string[] = [];
    
    if (currentMessage.content.includes('?')) {
      factors.push('responding to question');
    }
    
    if (currentMessage.reference) {
      factors.push('replying to previous message');
    }
    
    if (currentMessage.mentions.length > 0) {
      factors.push('mentioning other users');
    }
    
    if (currentMessage.content.length > 200) {
      factors.push('providing detailed response');
    }
    
    if (history.length > 5) {
      factors.push('continuing ongoing conversation');
    }

    return factors.length > 0 
      ? `Response generated based on: ${factors.join(', ')}`
      : 'Natural conversation response';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(currentMessage: DiscordMessage, history: DiscordMessage[]): number {
    let confidence = 0.7; // Base confidence
    
    // Higher confidence for responses to questions
    if (currentMessage.content.includes('?')) confidence += 0.1;
    
    // Higher confidence for replies
    if (currentMessage.reference) confidence += 0.1;
    
    // Higher confidence with more context
    if (history.length > 5) confidence += 0.1;
    
    // Lower confidence for very short responses
    if (currentMessage.content.length < 20) confidence -= 0.2;
    
    return Math.min(Math.max(confidence, 0.1), 0.95);
  }

  /**
   * Classify the type of response
   */
  private classifyResponseType(message: DiscordMessage): string {
    const content = message.content.toLowerCase();
    
    if (content.includes('?')) return 'question';
    if (message.reference) return 'reply';
    if (message.attachments.length > 0) return 'media_share';
    if (/```/.test(message.content)) return 'code_share';
    if (content.length > 500) return 'detailed_explanation';
    if (content.length < 20) return 'brief_response';
    
    return 'general_message';
  }

  // Helper methods
  private createUniqueUuid(runtime: IAgentRuntime | undefined, input: string): UUID {
    if (runtime) {
      // Use the actual createUniqueUuid function if runtime available
      return require('@elizaos/core').createUniqueUuid(runtime, input);
    }
    // Fallback to deterministic UUID generation
    return uuidv4() as UUID;
  }

  private formatResponseTime(ms: number): string {
    if (ms < 1000) return 'immediate';
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  }

  private classifyResponsePattern(responseTimes: number[]): string {
    if (responseTimes.length === 0) return 'unknown';
    
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    if (avgTime < 30000) return 'very_active'; // < 30s
    if (avgTime < 300000) return 'active'; // < 5m
    if (avgTime < 1800000) return 'moderate'; // < 30m
    return 'casual'; // > 30m
  }

  /**
   * Export all user profiles generated during parsing
   */
  getUserProfiles(): Map<string, Character> {
    return this.userProfiles;
  }

  /**
   * Export entity ID mappings
   */
  getEntityMappings(): Map<string, UUID> {
    return this.entityIdMap;
  }
}