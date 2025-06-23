import { elizaLogger } from '@elizaos/core';
import type {
  ConversationThread,
  TrackedUser,
  DiscordMessage,
  InstructionExample,
  ConversationContext,
  GenerationConfig,
  PersonalityProfile
} from '../types/discord-types.js';

/**
 * Formats Discord conversations into instruction tuning examples
 * Similar to RecentMessagesProvider format but for training data
 */
export class InstructionFormatter {
  private config: GenerationConfig;

  constructor(config: GenerationConfig) {
    this.config = config;
  }

  /**
   * Generate instruction tuning examples from conversations
   */
  async generateInstructionExamples(
    conversations: ConversationThread[]
    users: TrackedUser[]
  ): Promise<InstructionExample[]> {
    elizaLogger.info('🎯 Generating instruction tuning examples...');
    
    const userMap = new Map(users.map(u => [u.userId, u]));
    const examples: InstructionExample[] = [];
    
    for (const conversation of conversations) {
      // Generate examples for each tracked user in the conversation
      const conversationExamples = await this.generateConversationExamples(
        conversation,
        userMap
      );
      
      examples.push(...conversationExamples);
    }
    
    // Filter and limit examples
    const filteredExamples = examples.filter(ex => 
      ex.metadata.qualityScore >= this.config.minQualityScore
    );
    
    // Balance examples per user if configured
    const balancedExamples = this.config.balanceUserExamples
      ? this.balanceUserExamples(filteredExamples, users)
      : filteredExamples;
    
    // Limit total examples
    const limitedExamples = balancedExamples.slice(0, this.config.maxExamples);
    
    elizaLogger.info(`✅ Generated ${limitedExamples.length} instruction examples`);
    
    return limitedExamples;
  }

  /**
   * Generate instruction examples from a single conversation
   */
  private async generateConversationExamples(
    conversation: ConversationThread,
    userMap: Map<string, TrackedUser>
  ): Promise<InstructionExample[]> {
    const examples: InstructionExample[] = [];
    
    for (let i = 1; i < conversation.messages.length; i++) {
      const targetMessage = conversation.messages[i];
      const targetUser = userMap.get(targetMessage.author.id);
      
      // Only generate examples for tracked users
      if (!targetUser) continue;
      
      // Skip very short or low-quality messages
      if (targetMessage.content.trim().length < 10) continue;
      
      // Create conversation context
      const context = this.createConversationContext(
        conversation,
        i,
        targetUser
      );
      
      // Generate instruction example
      const example = this.createInstructionExample(context);
      if (example) {
        examples.push(example);
      }
    }
    
    return examples;
  }

  /**
   * Create conversation context for instruction generation
   */
  private createConversationContext(
    conversation: ConversationThread,
    targetIndex: number,
    targetUser: TrackedUser
  ): ConversationContext {
    const targetMessage = conversation.messages[targetIndex];
    
    // Get context window of previous messages
    const startIndex = Math.max(0, targetIndex - this.config.contextWindow);
    const contextMessages = conversation.messages.slice(startIndex, targetIndex);
    
    // Get previous speakers for context
    const previousSpeakers = [
      ...new Set(contextMessages.map(m => m.author.username))
    ];
    
    return {
      threadId: conversation.id,
      messages: contextMessages,
      targetMessage,
      targetUser,
      contextWindow: this.config.contextWindow,
      previousSpeakers,
      topicContext: this.extractTopicContext(contextMessages),
      channelContext: conversation.channelName
    };
  }

  /**
   * Extract topic context from messages
   */
  private extractTopicContext(messages: DiscordMessage[]): string | undefined {
    // Simple topic extraction - look for common keywords/themes
    const allText = messages.map(m => m.content).join(' ').toLowerCase();
    
    const topics = [
      'development', 'coding', 'programming', 'bug', 'feature',
      'eliza', 'agent', 'ai', 'model', 'training',
      'discord', 'bot', 'server', 'channel',
      'help', 'question', 'problem', 'solution',
      'update', 'release', 'version', 'deploy'
    ];
    
    const foundTopics = topics.filter(topic => allText.includes(topic));
    
    return foundTopics.length > 0 ? foundTopics[0] : undefined;
  }

  /**
   * Create instruction tuning example from context
   */
  private createInstructionExample(context: ConversationContext): InstructionExample | null {
    try {
      const systemPrompt = this.createSystemPrompt(context.targetUser);
      const userPrompt = this.createUserPrompt(context);
      const assistantResponse = this.formatAssistantResponse(context.targetMessage);
      
      const example: InstructionExample = {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: assistantResponse }
        ],
        metadata: {
          userId: context.targetUser.userId,
          username: context.targetUser.username,
          conversationId: context.threadId,
          messageId: context.targetMessage.id,
          timestamp: context.targetMessage.timestamp,
          channelId: context.targetMessage.channel_id,
          channelName: context.channelContext,
          qualityScore: this.calculateExampleQuality(context),
          contextLength: context.messages.length
        }
      };
      
      return example;
    } catch (error) {
      elizaLogger.warn('Error creating instruction example:', error);
      return null;
    }
  }

  /**
   * Create system prompt with personality information
   */
  private createSystemPrompt(user: TrackedUser): string {
    let prompt = `You are ${user.displayName} (${user.username}) in a Discord conversation.`;
    
    if (this.config.personalityInSystem && user.personalityProfile) {
      const personality = user.personalityProfile;
      
      prompt += ` Your communication style is ${personality.emotionalTone}`;
      
      if (personality.communicationStyle.length > 0) {
        prompt += ` and you tend to be ${personality.communicationStyle.join(', ')}`;
      }
      
      if (personality.expertise.length > 0) {
        prompt += `. You have expertise in ${personality.expertise.join(', ')}`;
      }
      
      if (personality.commonPhrases.length > 0) {
        prompt += `. You often use phrases like: ${personality.commonPhrases.slice(0, 3).join(', ')}`;
      }
    }
    
    prompt += '. Respond naturally as this person would in this conversation context.';
    
    return prompt;
  }

  /**
   * Create user prompt with conversation context
   */
  private createUserPrompt(context: ConversationContext): string {
    let prompt = 'Based on the following conversation, write the next message from the perspective of ' +
                `${context.targetUser.displayName}:\n\n`;
    
    // Add channel context if configured
    if (this.config.includeChannelContext && context.channelContext) {
      prompt += `[Channel: #${context.channelContext}]\n`;
    }
    
    // Add time context if configured
    if (this.config.includeTimeContext) {
      const time = new Date(context.targetMessage.timestamp).toLocaleString();
      prompt += `[Time: ${time}]\n`;
    }
    
    // Add conversation context
    if (context.messages.length > 0) {
      prompt += 'Conversation:\n';
      
      for (const message of context.messages) {
        const displayName = message.author.global_name || message.author.username;
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        
        prompt += `[${timestamp}] ${displayName}: ${this.cleanMessageContent(message.content)}\n`;
      }
    }
    
    prompt += `\nWrite the next message as ${context.targetUser.displayName}:`;
    
    return prompt;
  }

  /**
   * Format the assistant response (target message)
   */
  private formatAssistantResponse(message: DiscordMessage): string {
    return this.cleanMessageContent(message.content);
  }

  /**
   * Clean message content for training
   */
  private cleanMessageContent(content: string): string {
    return content
      .trim()
      // Remove Discord mentions but keep the text readable
      .replace(/<@!?(\d+)>/g, '@user')
      .replace(/<#(\d+)>/g, '#channel')
      .replace(/<@&(\d+)>/g, '@role')
      // Remove Discord emojis but keep Unicode emojis
      .replace(/<a?:\w+:\d+>/g, ':emoji:')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate quality score for instruction example
   */
  private calculateExampleQuality(context: ConversationContext): number {
    let score = 0;
    
    // Score based on context length
    score += Math.min(context.messages.length / this.config.contextWindow, 1) * 0.3;
    
    // Score based on target message quality
    const messageLength = context.targetMessage.content.length;
    score += Math.min(messageLength / 100, 1) * 0.3;
    
    // Score based on conversation flow
    if (context.messages.length > 0) {
      const lastMessage = context.messages[context.messages.length - 1];
      const timeDiff = new Date(context.targetMessage.timestamp).getTime() - 
                      new Date(lastMessage.timestamp).getTime();
      const minutes = timeDiff / (1000 * 60);
      
      // Prefer quick responses (within 30 minutes)
      score += minutes <= 30 ? 0.2 : 0.1;
    }
    
    // Score based on speaker diversity
    const uniqueSpeakers = new Set(context.messages.map(m => m.author.id));
    score += Math.min(uniqueSpeakers.size / 3, 1) * 0.2;
    
    return Math.min(score, 1);
  }

  /**
   * Balance examples per user to ensure fair representation
   */
  private balanceUserExamples(examples: InstructionExample[] users: TrackedUser[]): InstructionExample[] {
    const examplesPerUser = Math.floor(this.config.maxExamples / users.length);
    const userExamples = new Map<string, InstructionExample[]>();
    
    // Group examples by user
    for (const example of examples) {
      const userId = example.metadata.userId;
      if (!userExamples.has(userId)) {
        userExamples.set(userId, []);
      }
      userExamples.get(userId)!.push(example);
    }
    
    // Take top examples per user
    const balanced: InstructionExample[] = [];
    
    for (const [userId, userExs] of userExamples) {
      // Sort by quality score
      const sorted = userExs.sort((a, b) => b.metadata.qualityScore - a.metadata.qualityScore);
      // Take up to the limit per user
      balanced.push(...sorted.slice(0, examplesPerUser));
    }
    
    return balanced;
  }

  /**
   * Convert examples to JSONL format
   */
  formatAsJSONL(examples: InstructionExample[]): string {
    return examples.map(example => JSON.stringify(example)).join('\n');
  }

  /**
   * Split examples into train/validation/test sets
   */
  splitExamples(examples: InstructionExample[]): {
    train: InstructionExample[];
    validation: InstructionExample[];
    test: InstructionExample[];
  } {
    const shuffled = this.config.shuffleData 
      ? this.shuffleArray([...examples])
      : [...examples];
    
    const [trainRatio, valRatio, testRatio] = this.config.splitRatio;
    const total = shuffled.length;
    
    const trainSize = Math.floor(total * trainRatio);
    const valSize = Math.floor(total * valRatio);
    
    return {
      train: shuffled.slice(0, trainSize),
      validation: shuffled.slice(trainSize, trainSize + valSize),
      test: shuffled.slice(trainSize + valSize)
    };
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}