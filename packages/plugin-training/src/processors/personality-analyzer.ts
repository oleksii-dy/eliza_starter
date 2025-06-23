import { elizaLogger } from '@elizaos/core';
import type {
  TrackedUser,
  DiscordMessage,
  ConversationThread,
  PersonalityProfile,
  ResponsePattern,
  UserRelationship
} from '../types/discord-types.js';

/**
 * Analyzes user personalities from Discord conversation patterns
 */
export class PersonalityAnalyzer {
  
  /**
   * Analyze personality profiles for tracked users
   */
  async analyzePersonalities(
    users: TrackedUser[]
    conversations: ConversationThread[]
    allMessages: DiscordMessage[]
  ): Promise<TrackedUser[]> {
    elizaLogger.info('🧠 Analyzing user personalities...');
    
    const enhancedUsers = [...users];
    
    for (const user of enhancedUsers) {
      elizaLogger.debug(`Analyzing personality for ${user.username}...`);
      
      // Get user's messages
      const userMessages = allMessages.filter(m => m.author.id === user.userId);
      
      // Get user's conversations
      const userConversations = conversations.filter(c => 
        c.participants.includes(user.userId)
      );
      
      // Build personality profile
      user.personalityProfile = await this.buildPersonalityProfile(
        user,
        userMessages,
        userConversations,
        allMessages
      );
      
      // Analyze relationships
      user.relationships = await this.analyzeRelationships(
        user,
        userMessages,
        userConversations
      );
    }
    
    elizaLogger.info(`✅ Analyzed personalities for ${enhancedUsers.length} users`);
    
    return enhancedUsers;
  }

  /**
   * Build comprehensive personality profile for a user
   */
  private async buildPersonalityProfile(
    user: TrackedUser,
    userMessages: DiscordMessage[]
    userConversations: ConversationThread[]
    allMessages: DiscordMessage[]
  ): Promise<PersonalityProfile> {
    
    // Analyze communication style
    const communicationStyle = this.analyzeCommunicationStyle(userMessages);
    
    // Extract preferred topics
    const preferredTopics = this.extractPreferredTopics(userMessages);
    
    // Find common phrases
    const commonPhrases = this.extractCommonPhrases(userMessages);
    
    // Analyze response patterns
    const responsePatterns = this.analyzeResponsePatterns(
      user,
      userMessages,
      userConversations,
      allMessages
    );
    
    // Determine emotional tone
    const emotionalTone = this.determineEmotionalTone(userMessages);
    
    // Calculate engagement level
    const engagementLevel = this.calculateEngagementLevel(user, userConversations);
    
    // Assess helpfulness and leadership
    const helpfulness = this.assessHelpfulness(userMessages);
    const leadership = this.assessLeadership(userMessages, userConversations);
    
    // Identify expertise areas
    const expertise = this.identifyExpertise(userMessages);
    
    return {
      communicationStyle,
      preferredTopics,
      commonPhrases,
      responsePatterns,
      emotionalTone,
      engagementLevel,
      helpfulness,
      leadership,
      expertise
    };
  }

  /**
   * Analyze communication style traits
   */
  private analyzeCommunicationStyle(messages: DiscordMessage[]): string[] {
    const styles: string[] = [];
    const totalMessages = messages.length;
    
    // Analyze message characteristics
    let shortMessages = 0;
    let longMessages = 0;
    let questionCount = 0;
    let exclamationCount = 0;
    let codeBlocks = 0;
    let emojiCount = 0;
    
    for (const message of messages) {
      const content = message.content;
      const length = content.length;
      
      if (length < 20) shortMessages++;
      if (length > 100) longMessages++;
      if (content.includes('?')) questionCount++;
      if (content.includes('!')) exclamationCount++;
      if (content.includes('```') || content.includes('`')) codeBlocks++;
      if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(content)) {
        emojiCount++;
      }
    }
    
    // Determine style traits
    if (shortMessages / totalMessages > 0.6) styles.push('concise');
    if (longMessages / totalMessages > 0.3) styles.push('detailed');
    if (questionCount / totalMessages > 0.4) styles.push('inquisitive');
    if (exclamationCount / totalMessages > 0.3) styles.push('enthusiastic');
    if (codeBlocks / totalMessages > 0.2) styles.push('technical');
    if (emojiCount / totalMessages > 0.4) styles.push('expressive');
    
    return styles;
  }

  /**
   * Extract preferred topics from messages
   */
  private extractPreferredTopics(messages: DiscordMessage[]): string[] {
    const topicKeywords = {
      'development': ['code', 'dev', 'programming', 'software', 'build', 'deploy', 'git', 'repo'],
      'ai': ['ai', 'ml', 'model', 'training', 'neural', 'llm', 'gpt', 'claude'],
      'eliza': ['eliza', 'agent', 'character', 'plugin', 'action', 'provider'],
      'discord': ['discord', 'bot', 'server', 'channel', 'message', 'webhook'],
      'blockchain': ['crypto', 'blockchain', 'defi', 'nft', 'token', 'smart contract'],
      'gaming': ['game', 'gaming', 'play', 'player', 'level', 'rpg'],
      'music': ['music', 'song', 'album', 'artist', 'band', 'listen'],
      'art': ['art', 'design', 'creative', 'draw', 'paint', 'visual'],
      'science': ['science', 'research', 'study', 'experiment', 'data', 'analysis'],
      'business': ['business', 'market', 'startup', 'company', 'strategy', 'growth']
    };
    
    const allText = messages.map(m => m.content.toLowerCase()).join(' ');
    const topicScores: Record<string, number> = {};
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      topicScores[topic] = keywords.reduce((score, keyword) => {
        const matches = (allText.match(new RegExp(keyword, 'g')) || []).length;
        return score + matches;
      }, 0);
    }
    
    // Return topics with significant mentions
    return Object.entries(topicScores)
      .filter(([_, score]) => score > 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  /**
   * Extract common phrases and expressions
   */
  private extractCommonPhrases(messages: DiscordMessage[]): string[] {
    const phrases: Record<string, number> = {};
    
    for (const message of messages) {
      const content = message.content.toLowerCase();
      
      // Extract common patterns
      const patterns = [
        /\b(thanks?|thank you|ty)\b/g,
        /\b(please|pls)\b/g,
        /\b(hello|hi|hey)\b/g,
        /\b(good morning|good afternoon|good evening)\b/g,
        /\b(lol|lmao|haha)\b/g,
        /\b(awesome|amazing|great|cool)\b/g,
        /\b(makes sense|got it|i see)\b/g,
        /\b(let me know|lmk)\b/g,
        /\b(no problem|np|no worries)\b/g,
        /\b(by the way|btw)\b/g
      ];
      
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            phrases[match] = (phrases[match] || 0) + 1;
          }
        }
      }
    }
    
    // Return most common phrases
    return Object.entries(phrases)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase]) => phrase);
  }

  /**
   * Analyze response patterns
   */
  private analyzeResponsePatterns(
    user: TrackedUser,
    userMessages: DiscordMessage[]
    userConversations: ConversationThread[]
    allMessages: DiscordMessage[]
  ): ResponsePattern[] {
    const patterns: ResponsePattern[] = [];
    
    // Analyze question responses
    const questionResponses = this.analyzeQuestionResponses(user, allMessages);
    if (questionResponses.frequency > 0.1) {
      patterns.push(questionResponses);
    }
    
    // Analyze greeting patterns
    const greetingPattern = this.analyzeGreetingPatterns(userMessages);
    if (greetingPattern.frequency > 0.05) {
      patterns.push(greetingPattern);
    }
    
    // Analyze help-offering patterns
    const helpPattern = this.analyzeHelpPatterns(userMessages);
    if (helpPattern.frequency > 0.1) {
      patterns.push(helpPattern);
    }
    
    return patterns;
  }

  private analyzeQuestionResponses(user: TrackedUser, allMessages: DiscordMessage[]): ResponsePattern {
    let questionCount = 0;
    let responseCount = 0;
    const examples: string[] = [];
    
    // Find questions directed at or mentioning the user
    for (let i = 0; i < allMessages.length - 1; i++) {
      const message = allMessages[i];
      const nextMessage = allMessages[i + 1];
      
      if (message.content.includes('?') && 
          nextMessage.author.id === user.userId &&
          message.author.id !== user.userId) {
        questionCount++;
        
        // Check if user responded helpfully
        if (nextMessage.content.length > 20) {
          responseCount++;
          if (examples.length < 3) {
            examples.push(nextMessage.content.slice(0, 100));
          }
        }
      }
    }
    
    return {
      trigger: 'questions',
      pattern: 'helpful responses to questions',
      frequency: questionCount > 0 ? responseCount / questionCount : 0,
      examples
    };
  }

  private analyzeGreetingPatterns(messages: DiscordMessage[]): ResponsePattern {
    const greetingCount = messages.filter(m => 
      /\b(hello|hi|hey|good morning|good afternoon|good evening)\b/i.test(m.content)
    ).length;
    
    const examples = messages
      .filter(m => /\b(hello|hi|hey)\b/i.test(m.content))
      .slice(0, 3)
      .map(m => m.content);
    
    return {
      trigger: 'greetings',
      pattern: 'friendly greetings',
      frequency: greetingCount / messages.length,
      examples
    };
  }

  private analyzeHelpPatterns(messages: DiscordMessage[]): ResponsePattern {
    const helpCount = messages.filter(m => 
      /\b(help|assist|support|let me|i can|try this|here's how)\b/i.test(m.content)
    ).length;
    
    const examples = messages
      .filter(m => /\b(help|let me|try this)\b/i.test(m.content))
      .slice(0, 3)
      .map(m => m.content.slice(0, 100));
    
    return {
      trigger: 'help_requests',
      pattern: 'offers assistance',
      frequency: helpCount / messages.length,
      examples
    };
  }

  /**
   * Determine emotional tone
   */
  private determineEmotionalTone(messages: DiscordMessage[]): PersonalityProfile['emotionalTone'] {
    const allText = messages.map(m => m.content.toLowerCase()).join(' ');
    
    const toneIndicators = {
      casual: ['lol', 'yeah', 'nah', 'gonna', 'wanna', 'kinda'],
      formal: ['certainly', 'regarding', 'furthermore', 'additionally', 'nevertheless'],
      friendly: ['thanks', 'awesome', 'great', 'nice', 'cool', 'sweet'],
      technical: ['function', 'method', 'algorithm', 'implementation', 'architecture'],
      humorous: ['lmao', 'haha', 'funny', 'joke', 'lol', '😂', '🤣']
    };
    
    const scores: Record<string, number> = {};
    
    for (const [tone, indicators] of Object.entries(toneIndicators)) {
      scores[tone] = indicators.reduce((score, indicator) => {
        return score + (allText.match(new RegExp(indicator, 'g')) || []).length;
      }, 0);
    }
    
    // Return tone with highest score
    const topTone = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])[0];
    
    return topTone[0] as PersonalityProfile['emotionalTone'];
  }

  /**
   * Calculate engagement level
   */
  private calculateEngagementLevel(
    user: TrackedUser,
    userConversations: ConversationThread[]
  ): PersonalityProfile['engagementLevel'] {
    const avgMessagesPerConversation = user.messageCount / Math.max(userConversations.length, 1);
    
    if (avgMessagesPerConversation > 10) return 'high';
    if (avgMessagesPerConversation > 3) return 'medium';
    return 'low';
  }

  /**
   * Assess helpfulness score
   */
  private assessHelpfulness(messages: DiscordMessage[]): number {
    const helpfulPatterns = [
      /\bhelp\b/i,
      /\btry this\b/i,
      /\blet me\b/i,
      /\bhere's how\b/i,
      /\byou can\b/i,
      /\bi suggest\b/i,
      /\brecommend\b/i
    ];
    
    const helpfulMessages = messages.filter(m => 
      helpfulPatterns.some(pattern => pattern.test(m.content))
    ).length;
    
    return Math.min(helpfulMessages / messages.length * 2, 1);
  }

  /**
   * Assess leadership score
   */
  private assessLeadership(
    messages: DiscordMessage[]
    userConversations: ConversationThread[]
  ): number {
    let leadershipScore = 0;
    
    // Check for initiative-taking patterns
    const initiativePatterns = [
      /\blet's\b/i,
      /\bwe should\b/i,
      /\bi think we\b/i,
      /\bhow about\b/i,
      /\bwhat if\b/i
    ];
    
    const initiativeMessages = messages.filter(m => 
      initiativePatterns.some(pattern => pattern.test(m.content))
    ).length;
    
    leadershipScore += Math.min(initiativeMessages / messages.length * 2, 0.5);
    
    // Check for conversation starting
    const conversationStarters = userConversations.filter(conv => 
      conv.messages[0]?.author.id === messages[0]?.author.id
    ).length;
    
    leadershipScore += Math.min(conversationStarters / userConversations.length, 0.5);
    
    return Math.min(leadershipScore, 1);
  }

  /**
   * Identify expertise areas
   */
  private identifyExpertise(messages: DiscordMessage[]): string[] {
    const expertiseKeywords = {
      'JavaScript': ['javascript', 'js', 'node', 'npm', 'react', 'vue', 'angular'],
      'Python': ['python', 'py', 'django', 'flask', 'pandas', 'numpy'],
      'TypeScript': ['typescript', 'ts', 'type', 'interface', 'enum'],
      'AI/ML': ['ai', 'ml', 'machine learning', 'neural', 'model', 'training'],
      'Discord': ['discord', 'bot', 'guild', 'channel', 'webhook', 'api'],
      'Blockchain': ['blockchain', 'crypto', 'ethereum', 'solana', 'defi'],
      'DevOps': ['docker', 'kubernetes', 'ci/cd', 'deployment', 'aws', 'azure'],
      'Design': ['design', 'ui', 'ux', 'figma', 'photoshop', 'css']
    };
    
    const allText = messages.map(m => m.content.toLowerCase()).join(' ');
    const expertiseScores: Record<string, number> = {};
    
    for (const [area, keywords] of Object.entries(expertiseKeywords)) {
      expertiseScores[area] = keywords.reduce((score, keyword) => {
        const matches = (allText.match(new RegExp(keyword, 'g')) || []).length;
        return score + matches;
      }, 0);
    }
    
    // Return areas with significant expertise indicators
    return Object.entries(expertiseScores)
      .filter(([_, score]) => score > 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([area]) => area);
  }

  /**
   * Analyze user relationships
   */
  private async analyzeRelationships(
    user: TrackedUser,
    userMessages: DiscordMessage[]
    userConversations: ConversationThread[]
  ): Promise<UserRelationship[]> {
    const relationships = new Map<string, UserRelationship>();
    
    // Analyze interactions with other users
    for (const conversation of userConversations) {
      for (const message of conversation.messages) {
        if (message.author.id === user.userId) continue;
        
        const targetUserId = message.author.id;
        const targetUsername = message.author.username;
        
        if (!relationships.has(targetUserId)) {
          relationships.set(targetUserId, {
            targetUserId,
            targetUsername,
            relationshipType: 'frequent_interaction',
            interactionCount: 0,
            positiveInteractions: 0,
            lastInteraction: message.timestamp,
            topics: []
          });
        }
        
        const relationship = relationships.get(targetUserId)!;
        relationship.interactionCount++;
        relationship.lastInteraction = message.timestamp;
        
        // Check for positive interaction indicators
        const positivePatterns = [
          /\bthanks?\b/i,
          /\bawesome\b/i,
          /\bgreat\b/i,
          /\bnice\b/i,
          /\bhelpful\b/i
        ];
        
        if (positivePatterns.some(pattern => pattern.test(message.content))) {
          relationship.positiveInteractions++;
        }
      }
    }
    
    // Filter to significant relationships
    return Array.from(relationships.values())
      .filter(rel => rel.interactionCount >= 3)
      .sort((a, b) => b.interactionCount - a.interactionCount)
      .slice(0, 10);
  }
}