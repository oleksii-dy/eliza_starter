import { promises as fs } from 'fs';
import path from 'path';
import { elizaLogger } from '@elizaos/core';
import type {
  DiscordMessage,
  DiscordChannel,
  ConversationThread,
  TrackedUser,
  ExtractionConfig,
  ExtractionStats
} from '../types/discord-types.js';

/**
 * Extracts and processes Discord conversation data from JSON exports
 */
export class DiscordExtractor {
  private config: ExtractionConfig;
  private stats: ExtractionStats = {
    totalMessages: 0,
    filteredMessages: 0,
    totalConversations: 0,
    qualityConversations: 0,
    totalUsers: 0,
    trackedUsers: 0,
    channelsCovered: 0,
    dateRange: { earliest: '', latest: '' },
    averageConversationLength: 0,
    averageQualityScore: 0
  };

  constructor(config: ExtractionConfig) {
    this.config = config;
  }

  /**
   * Extract Discord conversations from the knowledge repository
   */
  async extractConversations(): Promise<{
    conversations: ConversationThread[];
    users: TrackedUser[];
    stats: ExtractionStats;
  }> {
    elizaLogger.info('🔍 Starting Discord conversation extraction...');
    
    // Ensure output directory exists
    await fs.mkdir(this.config.outputDir, { recursive: true });
    
    // Try to find raw Discord JSON files first
    const discordFiles = await this.findDiscordFiles();
    elizaLogger.info(`📁 Found ${discordFiles.length} Discord export files`);
    
    // Extract all messages
    const allMessages: DiscordMessage[] = [];
    const channels: Map<string, DiscordChannel> = new Map();
    
    if (discordFiles.length > 0) {
      // Process raw Discord files
      elizaLogger.info(`📁 Processing ${discordFiles.length} Discord export files...`);
      for (const file of discordFiles) {
        const { messages, channel } = await this.processDiscordFile(file);
        elizaLogger.debug(`  ${path.basename(file)}: ${messages.length} messages`);
        allMessages.push(...messages);
        if (channel) {
          channels.set(channel.id, channel);
        }
      }
    }
    
    // Always try fallback to processed summary files if no raw messages found
    if (allMessages.length === 0) {
      elizaLogger.info('🔄 No raw Discord messages found, processing summary files...');
      const summaryFiles = await this.findProcessedSummaryFiles(this.config.repoPath);
      elizaLogger.info(`📄 Found ${summaryFiles.length} processed summary files`);
      
      for (const file of summaryFiles) {
        const messages = await this.extractFromProcessedSummary(file);
        elizaLogger.debug(`  ${path.basename(file)}: ${messages.length} synthetic messages`);
        allMessages.push(...messages);
        
        // Create synthetic channel data
        const channelId = messages[0]?.channel_id || 'unknown';
        if (!channels.has(channelId)) {
          channels.set(channelId, {
            id: channelId,
            name: path.basename(file, '.json'),
            type: 0,
            guild_id: 'elizaos'
          });
        }
      }
    }
    
    this.stats.totalMessages = allMessages.length;
    elizaLogger.info(`📧 Extracted ${allMessages.length} total messages`);
    
    if (allMessages.length === 0) {
      elizaLogger.warn('⚠️ No messages found in knowledge repository');
      return {
        conversations: [],
        users: [],
        stats: this.stats
      };
    }
    
    // Filter and clean messages
    const cleanMessages = await this.filterMessages(allMessages);
    this.stats.filteredMessages = cleanMessages.length;
    elizaLogger.info(`✅ Filtered to ${cleanMessages.length} quality messages`);
    
    // Track users and build profiles
    const users = await this.analyzeUsers(cleanMessages);
    this.stats.totalUsers = users.length;
    
    // Filter to top users
    const topUsers = users
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, this.config.topUserCount);
    this.stats.trackedUsers = topUsers.length;
    
    elizaLogger.info(`👥 Tracking top ${topUsers.length} users`);
    
    // Extract conversations from tracked users
    const conversations = await this.extractConversationThreads(cleanMessages, topUsers, channels);
    this.stats.totalConversations = conversations.length;
    
    // Filter for quality conversations
    const qualityConversations = conversations.filter(
      conv => conv.qualityScore >= this.config.minQualityScore
    );
    this.stats.qualityConversations = qualityConversations.length;
    
    // Update final stats
    this.updateStats(qualityConversations);
    
    elizaLogger.info(`🎯 Extracted ${qualityConversations.length} quality conversations`);
    
    return {
      conversations: qualityConversations,
      users: topUsers,
      stats: this.stats
    };
  }

  /**
   * Find Discord JSON export files in the repository
   */
  private async findDiscordFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const searchPaths = [
      path.join(this.config.repoPath, 'discord'),
      path.join(this.config.repoPath, 'data/discord'),
      path.join(this.config.repoPath, 'exports/discord'),
      this.config.repoPath // Also search root
    ];
    
    for (const searchPath of searchPaths) {
      try {
        const items = await fs.readdir(searchPath, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(searchPath, item.name);
          
          if (item.isDirectory()) {
            // Recursively search subdirectories
            const subFiles = await this.findDiscordFilesInDirectory(fullPath);
            files.push(...subFiles);
          } else if (item.name.endsWith('.json') && this.isDiscordExportFile(item.name)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Directory doesn't exist, skip
        continue;
      }
    }
    
    return files;
  }

  /**
   * Find processed summary files in the knowledge repository
   */
  private async findProcessedSummaryFiles(repoPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const searchPaths = [
      path.join(repoPath, 'ai-news/elizaos/discord/json'),
      path.join(repoPath, 'archive/elizaos-dev/json'),
      path.join(repoPath, 'archive/daily-elizaos/json'),
      path.join(repoPath, 'archive/elizaos'),
    ];
    
    for (const searchPath of searchPaths) {
      try {
        const items = await fs.readdir(searchPath, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(searchPath, item.name);
          
          if (item.isDirectory()) {
            // Recursively search subdirectories
            const subFiles = await this.findProcessedSummaryFilesInDirectory(fullPath);
            files.push(...subFiles);
          } else if (item.name.endsWith('.json')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Directory doesn't exist, skip
        continue;
      }
    }
    
    return files;
  }

  /**
   * Recursively find processed summary files in a directory
   */
  private async findProcessedSummaryFilesInDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          const subFiles = await this.findProcessedSummaryFilesInDirectory(fullPath);
          files.push(...subFiles);
        } else if (item.name.endsWith('.json')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      elizaLogger.warn(`Error reading directory ${dirPath}:`, error);
    }
    
    return files;
  }

  /**
   * Extract synthetic Discord messages from processed summary files
   */
  private async extractFromProcessedSummary(filePath: string): Promise<DiscordMessage[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      const messages: DiscordMessage[] = [];
      
      // Handle different summary formats
      if (data.categories && Array.isArray(data.categories)) {
        // Format like: ai-news/elizaos/discord/json files
        for (const category of data.categories) {
          if (category.summary) {
            // Extract interactions from the summary text
            const extractedMessages = this.extractMessagesFromSummaryText(
              category.summary,
              category.channelId || 'unknown',
              category.channelName || 'unknown',
              data.date || Date.now()
            );
            messages.push(...extractedMessages);
          }
        }
      } else if (data.type === 'dailySummary') {
        // Format like: archive/daily-elizaos/json files
        for (const category of data.categories || []) {
          if (category.content && Array.isArray(category.content)) {
            for (const item of category.content) {
              if (item.text) {
                const extractedMessages = this.extractMessagesFromSummaryText(
                  item.text,
                  'summary',
                  category.title || 'general',
                  data.date || Date.now()
                );
                messages.push(...extractedMessages);
              }
            }
          }
        }
      }
      
      return messages;
    } catch (error) {
      elizaLogger.error(`Error extracting from summary file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Extract synthetic messages from summary text using patterns
   */
  private extractMessagesFromSummaryText(
    summaryText: string,
    channelId: string,
    channelName: string,
    timestamp: number
  ): DiscordMessage[] {
    const messages: DiscordMessage[] = [];
    
    // Extract FAQ interactions
    const faqMatches = summaryText.match(/Q: (.+?) \(asked by ([^)]+)\) A: (.+?) \(answered by ([^)]+)\)/g);
    if (faqMatches) {
      for (let i = 0; i < faqMatches.length; i++) {
        const match = faqMatches[i];
        const questionMatch = match.match(/Q: (.+?) \(asked by ([^)]+)\)/);
        const answerMatch = match.match(/A: (.+?) \(answered by ([^)]+)\)/);
        
        if (questionMatch && answerMatch) {
          const [, question, asker] = questionMatch;
          const [, answer, responder] = answerMatch;
          
          // Create synthetic question message
          messages.push({
            id: `synthetic-q-${timestamp}-${i}`,
            content: question,
            timestamp: new Date(timestamp + i * 60000).toISOString(),
            author: {
              id: this.normalizeUsername(asker),
              username: asker.replace('@', ''),
              global_name: asker.replace('@', ''),
              discriminator: '0001',
              bot: false
            },
            channel_id: channelId,
            type: 0
          });
          
          // Create synthetic answer message
          messages.push({
            id: `synthetic-a-${timestamp}-${i}`,
            content: answer,
            timestamp: new Date(timestamp + i * 60000 + 30000).toISOString(),
            author: {
              id: this.normalizeUsername(responder),
              username: responder.replace('@', ''),
              global_name: responder.replace('@', ''),
              discriminator: '0001',
              bot: false
            },
            channel_id: channelId,
            type: 0
          });
        }
      }
    }
    
    // Extract help interactions
    const helpMatches = summaryText.match(/Helper: ([^|]+) \| Helpee: ([^|]+) \| Context: ([^|]+) \| Resolution: (.+)/g);
    if (helpMatches) {
      for (let i = 0; i < helpMatches.length; i++) {
        const match = helpMatches[i];
        const helpMatch = match.match(/Helper: ([^|]+) \| Helpee: ([^|]+) \| Context: ([^|]+) \| Resolution: (.+)/);
        
        if (helpMatch) {
          const [, helper, helpee, context, resolution] = helpMatch;
          
          // Create help request message
          messages.push({
            id: `synthetic-help-req-${timestamp}-${i}`,
            content: `I need help with: ${context}`,
            timestamp: new Date(timestamp + messages.length * 120000).toISOString(),
            author: {
              id: this.normalizeUsername(helpee),
              username: helpee.replace('@', ''),
              global_name: helpee.replace('@', ''),
              discriminator: '0001',
              bot: false
            },
            channel_id: channelId,
            type: 0
          });
          
          // Create help response message
          messages.push({
            id: `synthetic-help-resp-${timestamp}-${i}`,
            content: resolution,
            timestamp: new Date(timestamp + messages.length * 120000 + 60000).toISOString(),
            author: {
              id: this.normalizeUsername(helper),
              username: helper.replace('@', ''),
              global_name: helper.replace('@', ''),
              discriminator: '0001',
              bot: false
            },
            channel_id: channelId,
            type: 0
          });
        }
      }
    }
    
    return messages;
  }

  /**
   * Normalize username to create consistent user IDs
   */
  private normalizeUsername(username: string): string {
    return username
      .replace(/[@\[\]()]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Recursively find Discord JSON files in a directory
   */
  private async findDiscordFilesInDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          const subFiles = await this.findDiscordFilesInDirectory(fullPath);
          files.push(...subFiles);
        } else if (item.name.endsWith('.json') && this.isDiscordExportFile(item.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      elizaLogger.warn(`Error reading directory ${dirPath}:`, error);
    }
    
    return files;
  }

  /**
   * Check if a file name indicates a Discord export
   */
  private isDiscordExportFile(filename: string): boolean {
    const patterns = [
      /messages\.json$/,
      /channel.*\.json$/,
      /discord.*\.json$/,
      /\d+\.json$/, // Channel ID files
    ];
    
    return patterns.some(pattern => pattern.test(filename.toLowerCase()));
  }

  /**
   * Process a single Discord JSON export file
   */
  private async processDiscordFile(filePath: string): Promise<{
    messages: DiscordMessage[];
    channel?: DiscordChannel;
  }> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      // Handle different Discord export formats
      let messages: DiscordMessage[] = [];
      let channel: DiscordChannel | undefined;
      
      if (Array.isArray(data)) {
        // Direct array of messages
        messages = data;
      } else if (data.messages && Array.isArray(data.messages)) {
        // Object with messages array
        messages = data.messages;
        channel = data.channel;
      } else if (data.data && Array.isArray(data.data)) {
        // Some exports use 'data' field
        messages = data.data;
        channel = data.channel || data.guild;
      }
      
      // Validate and clean messages
      const validMessages = messages.filter(this.isValidMessage.bind(this));
      
      elizaLogger.debug(`📄 Processed ${filePath}: ${validMessages.length}/${messages.length} valid messages`);
      
      return { messages: validMessages, channel };
    } catch (error) {
      elizaLogger.error(`Error processing Discord file ${filePath}:`, error);
      return { messages: [] };
    }
  }

  /**
   * Validate that a message has required fields
   */
  private isValidMessage(message: any): message is DiscordMessage {
    return (
      message &&
      typeof message.id === 'string' &&
      typeof message.content === 'string' &&
      typeof message.timestamp === 'string' &&
      message.author &&
      typeof message.author.id === 'string' &&
      typeof message.author.username === 'string'
    );
  }

  /**
   * Filter messages based on configuration criteria
   */
  private async filterMessages(messages: DiscordMessage[]): Promise<DiscordMessage[]> {
    return messages.filter(message => {
      // Exclude bots if configured
      if (this.config.excludeBots && message.author.bot) {
        return false;
      }
      
      // Exclude system messages if configured
      if (this.config.excludeSystemMessages && message.type !== 0) {
        return false;
      }
      
      // Content length requirements
      const contentLength = message.content.trim().length;
      if (contentLength < this.config.minContentLength || 
          contentLength > this.config.maxContentLength) {
        return false;
      }
      
      // Exclude URL-only messages if configured
      if (this.config.excludeUrls && this.isUrlOnlyMessage(message.content)) {
        return false;
      }
      
      // Exclude attachment-only messages if configured
      if (this.config.excludeAttachmentOnly && 
          !message.content.trim() && 
          message.attachments && 
          message.attachments.length > 0) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Check if message contains only URLs
   */
  private isUrlOnlyMessage(content: string): boolean {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex) || [];
    const contentWithoutUrls = content.replace(urlRegex, '').trim();
    
    return urls.length > 0 && contentWithoutUrls.length === 0;
  }

  /**
   * Analyze users and build activity profiles
   */
  private async analyzeUsers(messages: DiscordMessage[]): Promise<TrackedUser[]> {
    const userMap = new Map<string, TrackedUser>();
    
    for (const message of messages) {
      const userId = message.author.id;
      const username = message.author.username;
      const displayName = message.author.global_name || username;
      
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          username,
          displayName,
          discriminator: message.author.discriminator,
          messageCount: 0,
          conversationCount: 0,
          averageMessageLength: 0,
          conversationFrequency: 0,
          firstSeen: message.timestamp,
          lastSeen: message.timestamp,
          channelActivity: {},
          timeActivity: {}
        });
      }
      
      const user = userMap.get(userId)!;
      user.messageCount++;
      user.lastSeen = message.timestamp;
      
      // Track channel activity
      if (!user.channelActivity[message.channel_id]) {
        user.channelActivity[message.channel_id] = 0;
      }
      user.channelActivity[message.channel_id]++;
      
      // Track time activity (hour of day)
      const hour = new Date(message.timestamp).getHours().toString();
      if (!user.timeActivity[hour]) {
        user.timeActivity[hour] = 0;
      }
      user.timeActivity[hour]++;
    }
    
    // Calculate additional metrics
    for (const user of userMap.values()) {
      const totalLength = messages
        .filter(m => m.author.id === user.userId)
        .reduce((sum, m) => sum + m.content.length, 0);
      
      user.averageMessageLength = totalLength / user.messageCount;
      
      const daysDiff = (new Date(user.lastSeen).getTime() - new Date(user.firstSeen).getTime()) / (1000 * 60 * 60 * 24);
      user.conversationFrequency = user.messageCount / Math.max(daysDiff, 1);
    }
    
    return Array.from(userMap.values())
      .filter(user => user.messageCount >= this.config.minUserMessages);
  }

  /**
   * Extract conversation threads from messages
   */
  private async extractConversationThreads(
    messages: DiscordMessage[],
    trackedUsers: TrackedUser[],
    channels: Map<string, DiscordChannel>
  ): Promise<ConversationThread[]> {
    const trackedUserIds = new Set(trackedUsers.map(u => u.userId));
    
    // Group messages by channel
    const messagesByChannel = new Map<string, DiscordMessage[]>();
    
    for (const message of messages) {
      if (!messagesByChannel.has(message.channel_id)) {
        messagesByChannel.set(message.channel_id, []);
      }
      messagesByChannel.get(message.channel_id)!.push(message);
    }
    
    const conversations: ConversationThread[] = [];
    
    for (const [channelId, channelMessages] of messagesByChannel) {
      // Sort messages by timestamp
      channelMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Thread messages into conversations
      const threaded = this.threadMessages(channelMessages, trackedUserIds);
      
      for (const thread of threaded) {
        const channel = channels.get(channelId);
        const qualityScore = this.calculateConversationQuality(thread, trackedUsers);
        
        conversations.push({
          id: `${channelId}-${thread[0].id}`,
          messages: thread,
          participants: [...new Set(thread.map(m => m.author.id))],
          channelId,
          channelName: channel?.name,
          startTime: thread[0].timestamp,
          endTime: thread[thread.length - 1].timestamp,
          messageCount: thread.length,
          averageGapMinutes: this.calculateAverageGap(thread),
          qualityScore
        });
      }
    }
    
    return conversations.filter(conv => 
      conv.messageCount >= this.config.minConversationLength &&
      (!this.config.requireMultipleSpeakers || conv.participants.length > 1)
    );
  }

  /**
   * Thread individual messages into conversation groups
   */
  private threadMessages(messages: DiscordMessage[], trackedUserIds: Set<string>): DiscordMessage[][] {
    const threads: DiscordMessage[][] = [];
    let currentThread: DiscordMessage[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const prevMessage = i > 0 ? messages[i - 1] : null;
      
      // Check if this starts a new conversation thread
      const shouldStartNewThread = this.shouldStartNewThread(message, prevMessage);
      
      if (shouldStartNewThread && currentThread.length >= this.config.minMessages) {
        // Only include threads with tracked users
        if (currentThread.some(m => trackedUserIds.has(m.author.id))) {
          threads.push(currentThread);
        }
        currentThread = [];
      }
      
      currentThread.push(message);
    }
    
    // Add final thread if it meets criteria
    if (currentThread.length >= this.config.minMessages &&
        currentThread.some(m => trackedUserIds.has(m.author.id))) {
      threads.push(currentThread);
    }
    
    return threads;
  }

  /**
   * Determine if a message should start a new conversation thread
   */
  private shouldStartNewThread(message: DiscordMessage, prevMessage: DiscordMessage | null): boolean {
    if (!prevMessage) return true;
    
    // Check time gap
    const timeDiff = new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff > this.config.maxGapHours) {
      return true;
    }
    
    // Check for topic changes (basic heuristics)
    if (message.content.startsWith('@everyone') || message.content.startsWith('@here')) {
      return true;
    }
    
    // Check for thread/channel changes
    if (message.thread?.id !== prevMessage.thread?.id) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate conversation quality score
   */
  private calculateConversationQuality(messages: DiscordMessage[], trackedUsers: TrackedUser[]): number {
    let score = 0;
    
    // Base score for message count
    score += Math.min(messages.length / 10, 1) * 0.3;
    
    // Score for multiple participants
    const uniqueParticipants = new Set(messages.map(m => m.author.id));
    score += Math.min(uniqueParticipants.size / 3, 1) * 0.2;
    
    // Score for tracked user participation
    const trackedUserIds = new Set(trackedUsers.map(u => u.userId));
    const trackedParticipants = [...uniqueParticipants].filter(id => trackedUserIds.has(id));
    score += (trackedParticipants.length / uniqueParticipants.size) * 0.3;
    
    // Score for content quality
    const avgContentLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    score += Math.min(avgContentLength / 100, 1) * 0.2;
    
    return Math.min(score, 1);
  }

  /**
   * Calculate average time gap between messages in minutes
   */
  private calculateAverageGap(messages: DiscordMessage[]): number {
    if (messages.length < 2) return 0;
    
    let totalGap = 0;
    for (let i = 1; i < messages.length; i++) {
      const gap = new Date(messages[i].timestamp).getTime() - new Date(messages[i - 1].timestamp).getTime();
      totalGap += gap;
    }
    
    return totalGap / (messages.length - 1) / (1000 * 60); // Convert to minutes
  }

  /**
   * Update extraction statistics
   */
  private updateStats(conversations: ConversationThread[]): void {
    if (conversations.length === 0) return;
    
    this.stats.channelsCovered = new Set(conversations.map(c => c.channelId)).size;
    
    const timestamps = conversations.flatMap(c => [c.startTime, c.endTime]);
    this.stats.dateRange.earliest = timestamps.sort()[0];
    this.stats.dateRange.latest = timestamps.sort().reverse()[0];
    
    this.stats.averageConversationLength = conversations.reduce((sum, c) => sum + c.messageCount, 0) / conversations.length;
    this.stats.averageQualityScore = conversations.reduce((sum, c) => sum + c.qualityScore, 0) / conversations.length;
  }

  /**
   * Save extraction results to files
   */
  async saveResults(
    conversations: ConversationThread[],
    users: TrackedUser[],
    stats: ExtractionStats
  ): Promise<void> {
    // Save conversations
    await fs.writeFile(
      path.join(this.config.outputDir, 'conversations.json'),
      JSON.stringify(conversations, null, 2)
    );
    
    // Save user profiles
    await fs.writeFile(
      path.join(this.config.outputDir, 'users.json'),
      JSON.stringify(users, null, 2)
    );
    
    // Save extraction statistics
    await fs.writeFile(
      path.join(this.config.outputDir, 'stats.json'),
      JSON.stringify(stats, null, 2)
    );
    
    elizaLogger.info(`💾 Saved extraction results to ${this.config.outputDir}`);
  }
}