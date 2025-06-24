/**
 * Live Message Bus for Real Inter-Agent Communication
 * Enables real-time messaging between agents through actual platforms (Discord, Slack, Telegram, WebSocket)
 */

import { logger } from '@elizaos/core';
import type { IAgentRuntime, Memory, Content, UUID } from '@elizaos/core';
import { EventEmitter } from 'events';

export interface MessagePlatform {
  name: string;
  type: 'discord' | 'slack' | 'telegram' | 'websocket' | 'teams' | 'custom';
  isConnected: boolean;

  // Lifecycle methods
  initialize(config: PlatformConfig): Promise<void>;
  disconnect(): Promise<void>;

  // Channel management
  createChannel(name: string, metadata?: Record<string, any>): Promise<string>;
  deleteChannel(channelId: string): Promise<void>;
  joinChannel(channelId: string, agentId: string): Promise<void>;
  leaveChannel(channelId: string, agentId: string): Promise<void>;

  // Message operations
  sendMessage(channelId: string, senderId: string, content: Content): Promise<string>;
  editMessage(channelId: string, messageId: string, newContent: Content): Promise<void>;
  deleteMessage(channelId: string, messageId: string): Promise<void>;

  // Message listening
  onMessage(callback: (message: PlatformMessage) => void): void;
  onReaction(callback: (reaction: PlatformReaction) => void): void;
  onChannelEvent(callback: (event: ChannelEvent) => void): void;
}

export interface PlatformConfig {
  apiKey?: string;
  token?: string;
  webhookUrl?: string;
  serverId?: string;
  workspaceId?: string;
  botId?: string;
  customEndpoint?: string;
  rateLimits?: {
    messagesPerSecond: number;
    messagesPerHour: number;
    channelsPerHour: number;
  };
  security?: {
    allowedUsers?: string[];
    allowedChannels?: string[];
    requireVerification: boolean;
  };
}

export interface PlatformMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  content: Content;
  timestamp: number;
  platform: string;
  metadata: Record<string, any>;
  threadId?: string;
  replyTo?: string;
}

export interface PlatformReaction {
  messageId: string;
  channelId: string;
  userId: string;
  emoji: string;
  timestamp: number;
  platform: string;
}

export interface ChannelEvent {
  type: 'created' | 'deleted' | 'user_joined' | 'user_left' | 'topic_changed';
  channelId: string;
  userId?: string;
  metadata: Record<string, any>;
  timestamp: number;
  platform: string;
}

export interface BenchmarkChannel {
  id: string;
  benchmarkId: string;
  name: string;
  platform: string;
  participants: string[];
  createdAt: number;
  metadata: Record<string, any>;
}

export interface MessageRoute {
  fromAgent: string;
  toAgent: string;
  channelId: string;
  platform: string;
  filters?: {
    messageTypes?: string[];
    contentPatterns?: string[];
    timeRestrictions?: {
      start: number;
      end: number;
    };
  };
}

export class LiveMessageBus extends EventEmitter {
  private platforms: Map<string, MessagePlatform> = new Map();
  private benchmarkChannels: Map<string, BenchmarkChannel> = new Map();
  private messageRoutes: MessageRoute[] = [];
  private messageHistory: Map<string, PlatformMessage[]> = new Map();
  private analytics: MessageAnalytics;
  private isRunning = false;

  constructor() {
    super();
    this.analytics = new MessageAnalytics();
    logger.info('LiveMessageBus initialized for real-world benchmarking');
  }

  /**
   * Register a messaging platform
   */
  async registerPlatform(platform: MessagePlatform, config: PlatformConfig): Promise<void> {
    try {
      await platform.initialize(config);
      this.platforms.set(platform.name, platform);

      // Set up event listeners
      platform.onMessage((message) => this.handleIncomingMessage(message));
      platform.onReaction((reaction) => this.handleReaction(reaction));
      platform.onChannelEvent((event) => this.handleChannelEvent(event));

      logger.info(`Platform ${platform.name} registered and connected`);
      this.emit('platform_registered', { platform: platform.name, type: platform.type });
    } catch (error) {
      logger.error(`Failed to register platform ${platform.name}:`, error);
      throw new Error(`Platform registration failed: ${error}`);
    }
  }

  /**
   * Create a channel for a benchmark on a specific platform
   */
  async createBenchmarkChannel(
    benchmarkId: string,
    platform: string,
    channelName: string,
    participants: string[] = [],
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const messagePlatform = this.platforms.get(platform);
    if (!messagePlatform) {
      throw new Error(`Platform ${platform} not registered`);
    }

    const channelId = await messagePlatform.createChannel(
      `benchmark-${benchmarkId}-${channelName}`,
      { benchmarkId, ...metadata }
    );

    const benchmarkChannel: BenchmarkChannel = {
      id: channelId,
      benchmarkId,
      name: channelName,
      platform,
      participants,
      createdAt: Date.now(),
      metadata,
    };

    this.benchmarkChannels.set(channelId, benchmarkChannel);
    this.messageHistory.set(channelId, []);

    // Add participants to the channel
    for (const participant of participants) {
      try {
        await messagePlatform.joinChannel(channelId, participant);
      } catch (error) {
        logger.warn(`Failed to add participant ${participant} to channel ${channelId}:`, error);
      }
    }

    logger.info(
      `Created benchmark channel ${channelId} on ${platform} for benchmark ${benchmarkId}`
    );
    this.emit('channel_created', { channelId, benchmarkId, platform, participants });

    return channelId;
  }

  /**
   * Send a message from an agent to a channel
   */
  async sendMessage(
    channelId: string,
    senderId: string,
    content: Content,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const channel = this.benchmarkChannels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    const platform = this.platforms.get(channel.platform);
    if (!platform) {
      throw new Error(`Platform ${channel.platform} not available`);
    }

    // Check if sender is authorized
    if (!channel.participants.includes(senderId)) {
      logger.warn(`Sender ${senderId} not authorized for channel ${channelId}`);
      // Add them as a participant if they're sending
      channel.participants.push(senderId);
    }

    const messageId = await platform.sendMessage(channelId, senderId, content);

    // Record in analytics
    this.analytics.recordMessage(channel.platform, channelId, senderId, content);

    logger.info(`Message sent from ${senderId} to channel ${channelId} on ${channel.platform}`);
    this.emit('message_sent', { channelId, senderId, messageId, content, metadata });

    return messageId;
  }

  /**
   * Set up message routing between agents
   */
  addMessageRoute(route: MessageRoute): void {
    this.messageRoutes.push(route);
    logger.info(
      `Added message route from ${route.fromAgent} to ${route.toAgent} via ${route.platform}/${route.channelId}`
    );
  }

  /**
   * Handle incoming messages from platforms
   */
  private async handleIncomingMessage(message: PlatformMessage): Promise<void> {
    // Store in message history
    const channelHistory = this.messageHistory.get(message.channelId) || [];
    channelHistory.push(message);
    this.messageHistory.set(message.channelId, channelHistory);

    // Update analytics
    this.analytics.recordIncomingMessage(message);

    // Check for message routes
    const applicableRoutes = this.messageRoutes.filter(
      (route) =>
        route.channelId === message.channelId &&
        route.platform === message.platform &&
        this.matchesRouteFilters(message, route.filters)
    );

    // Route messages to target agents
    for (const route of applicableRoutes) {
      try {
        await this.routeMessage(message, route);
      } catch (error) {
        logger.error(`Failed to route message to ${route.toAgent}:`, error);
      }
    }

    this.emit('message_received', message);
    logger.debug(
      `Processed incoming message ${message.id} from ${message.senderId} in ${message.channelId}`
    );
  }

  /**
   * Route a message to a target agent
   */
  private async routeMessage(message: PlatformMessage, route: MessageRoute): Promise<void> {
    // Convert platform message to Memory format for agent processing
    const memory: Memory = {
      id: message.id as UUID,
      entityId: message.senderId as UUID,
      agentId: route.toAgent as UUID,
      roomId: message.channelId as UUID,
      content: message.content,
      createdAt: message.timestamp,
      metadata: {
        platform: message.platform,
        originalMessageId: message.id,
        routedFrom: route.fromAgent,
        ...message.metadata,
      },
    };

    this.emit('message_routed', {
      from: route.fromAgent,
      to: route.toAgent,
      message: memory,
      route,
    });
  }

  /**
   * Check if a message matches route filters
   */
  private matchesRouteFilters(
    message: PlatformMessage,
    filters?: MessageRoute['filters']
  ): boolean {
    if (!filters) return true;

    // Check message types
    if (filters.messageTypes && filters.messageTypes.length > 0) {
      const messageType = message.content.source || 'text';
      if (!filters.messageTypes.includes(messageType)) {
        return false;
      }
    }

    // Check content patterns
    if (filters.contentPatterns && filters.contentPatterns.length > 0) {
      const text = message.content.text || '';
      const hasMatch = filters.contentPatterns.some((pattern) => {
        try {
          return new RegExp(pattern, 'i').test(text);
        } catch {
          return text.toLowerCase().includes(pattern.toLowerCase());
        }
      });
      if (!hasMatch) return false;
    }

    // Check time restrictions
    if (filters.timeRestrictions) {
      const now = Date.now();
      if (now < filters.timeRestrictions.start || now > filters.timeRestrictions.end) {
        return false;
      }
    }

    return true;
  }

  /**
   * Handle platform reactions
   */
  private handleReaction(reaction: PlatformReaction): void {
    this.analytics.recordReaction(reaction);
    this.emit('reaction_received', reaction);
    logger.debug(
      `Reaction ${reaction.emoji} from ${reaction.userId} on message ${reaction.messageId}`
    );
  }

  /**
   * Handle channel events
   */
  private handleChannelEvent(event: ChannelEvent): void {
    this.analytics.recordChannelEvent(event);
    this.emit('channel_event', event);
    logger.debug(`Channel event ${event.type} in ${event.channelId} on ${event.platform}`);
  }

  /**
   * Get message history for a channel
   */
  getMessageHistory(channelId: string, limit?: number): PlatformMessage[] {
    const history = this.messageHistory.get(channelId) || [];
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }

  /**
   * Get analytics for a benchmark
   */
  getBenchmarkAnalytics(benchmarkId: string): BenchmarkAnalytics {
    const channels = Array.from(this.benchmarkChannels.values()).filter(
      (channel) => channel.benchmarkId === benchmarkId
    );

    const allMessages = channels.flatMap((channel) => this.messageHistory.get(channel.id) || []);

    return this.analytics.generateBenchmarkReport(benchmarkId, allMessages, channels);
  }

  /**
   * Start the message bus
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('LiveMessageBus is already running');
      return;
    }

    this.isRunning = true;
    logger.info('LiveMessageBus started - ready for real-time agent communication');
    this.emit('bus_started');
  }

  /**
   * Stop the message bus and clean up
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Disconnect all platforms
    const disconnectPromises = Array.from(this.platforms.values()).map(async (platform) => {
      try {
        await platform.disconnect();
        logger.info(`Disconnected from platform ${platform.name}`);
      } catch (error) {
        logger.error(`Error disconnecting from platform ${platform.name}:`, error);
      }
    });

    await Promise.all(disconnectPromises);

    this.platforms.clear();
    this.benchmarkChannels.clear();
    this.messageHistory.clear();
    this.messageRoutes.length = 0;

    logger.info('LiveMessageBus stopped and cleaned up');
    this.emit('bus_stopped');
  }

  /**
   * Clean up benchmark channels
   */
  async cleanupBenchmark(benchmarkId: string): Promise<void> {
    const channelsToDelete = Array.from(this.benchmarkChannels.values()).filter(
      (channel) => channel.benchmarkId === benchmarkId
    );

    for (const channel of channelsToDelete) {
      try {
        const platform = this.platforms.get(channel.platform);
        if (platform) {
          await platform.deleteChannel(channel.id);
        }
        this.benchmarkChannels.delete(channel.id);
        this.messageHistory.delete(channel.id);
        logger.info(`Cleaned up channel ${channel.id} for benchmark ${benchmarkId}`);
      } catch (error) {
        logger.error(`Failed to cleanup channel ${channel.id}:`, error);
      }
    }

    // Remove routes for this benchmark
    this.messageRoutes = this.messageRoutes.filter(
      (route) => !channelsToDelete.some((channel) => channel.id === route.channelId)
    );

    this.emit('benchmark_cleaned_up', { benchmarkId });
  }

  /**
   * Get available platforms
   */
  getAvailablePlatforms(): string[] {
    return Array.from(this.platforms.keys());
  }

  /**
   * Get benchmark channels
   */
  getBenchmarkChannels(benchmarkId?: string): BenchmarkChannel[] {
    const channels = Array.from(this.benchmarkChannels.values());
    if (benchmarkId) {
      return channels.filter((channel) => channel.benchmarkId === benchmarkId);
    }
    return channels;
  }

  /**
   * Check if a platform is connected
   */
  isPlatformConnected(platformName: string): boolean {
    const platform = this.platforms.get(platformName);
    return platform?.isConnected || false;
  }
}

/**
 * Analytics for message bus performance and usage
 */
export class MessageAnalytics {
  private messageStats: Map<string, number> = new Map();
  private platformStats: Map<string, PlatformStats> = new Map();
  private responseLatencies: number[] = [];

  recordMessage(platform: string, channelId: string, senderId: string, content: Content): void {
    // Update message count
    const key = `${platform}:${channelId}:${senderId}`;
    this.messageStats.set(key, (this.messageStats.get(key) || 0) + 1);

    // Update platform stats
    const stats = this.platformStats.get(platform) || {
      messagesSent: 0,
      messagesReceived: 0,
      reactionsReceived: 0,
      channelEvents: 0,
      averageResponseTime: 0,
      errorCount: 0,
    };
    stats.messagesSent++;
    this.platformStats.set(platform, stats);
  }

  recordIncomingMessage(message: PlatformMessage): void {
    const stats = this.platformStats.get(message.platform) || {
      messagesSent: 0,
      messagesReceived: 0,
      reactionsReceived: 0,
      channelEvents: 0,
      averageResponseTime: 0,
      errorCount: 0,
    };
    stats.messagesReceived++;
    this.platformStats.set(message.platform, stats);
  }

  recordReaction(reaction: PlatformReaction): void {
    const stats = this.platformStats.get(reaction.platform) || {
      messagesSent: 0,
      messagesReceived: 0,
      reactionsReceived: 0,
      channelEvents: 0,
      averageResponseTime: 0,
      errorCount: 0,
    };
    stats.reactionsReceived++;
    this.platformStats.set(reaction.platform, stats);
  }

  recordChannelEvent(event: ChannelEvent): void {
    const stats = this.platformStats.get(event.platform) || {
      messagesSent: 0,
      messagesReceived: 0,
      reactionsReceived: 0,
      channelEvents: 0,
      averageResponseTime: 0,
      errorCount: 0,
    };
    stats.channelEvents++;
    this.platformStats.set(event.platform, stats);
  }

  recordResponseLatency(latency: number): void {
    this.responseLatencies.push(latency);
    // Keep only last 1000 measurements
    if (this.responseLatencies.length > 1000) {
      this.responseLatencies.shift();
    }
  }

  generateBenchmarkReport(
    benchmarkId: string,
    messages: PlatformMessage[],
    channels: BenchmarkChannel[]
  ): BenchmarkAnalytics {
    const messagesByPlatform = new Map<string, number>();
    const messagesByParticipant = new Map<string, number>();
    const conversationPatterns: ConversationPattern[] = [];

    // Analyze messages
    for (const message of messages) {
      // Count by platform
      messagesByPlatform.set(message.platform, (messagesByPlatform.get(message.platform) || 0) + 1);

      // Count by participant
      messagesByParticipant.set(
        message.senderId,
        (messagesByParticipant.get(message.senderId) || 0) + 1
      );
    }

    // Analyze conversation patterns
    const sortedMessages = messages.sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < sortedMessages.length - 1; i++) {
      const current = sortedMessages[i];
      const next = sortedMessages[i + 1];

      if (current.senderId !== next.senderId) {
        const responseTime = next.timestamp - current.timestamp;
        conversationPatterns.push({
          from: current.senderId,
          to: next.senderId,
          responseTime,
          messageType: current.content.source || 'text',
          platform: current.platform,
        });
      }
    }

    return {
      benchmarkId,
      totalMessages: messages.length,
      totalChannels: channels.length,
      participantCount: messagesByParticipant.size,
      platformUsage: Object.fromEntries(messagesByPlatform),
      participantActivity: Object.fromEntries(messagesByParticipant),
      conversationPatterns,
      averageResponseTime:
        conversationPatterns.length > 0
          ? conversationPatterns.reduce((sum, p) => sum + p.responseTime, 0) /
            conversationPatterns.length
          : 0,
      timeRange: {
        start: Math.min(...messages.map((m) => m.timestamp)),
        end: Math.max(...messages.map((m) => m.timestamp)),
      },
    };
  }

  getPlatformStats(platform: string): PlatformStats | undefined {
    return this.platformStats.get(platform);
  }

  getAllStats(): Map<string, PlatformStats> {
    return new Map(this.platformStats);
  }
}

// Supporting interfaces
interface PlatformStats {
  messagesSent: number;
  messagesReceived: number;
  reactionsReceived: number;
  channelEvents: number;
  averageResponseTime: number;
  errorCount: number;
}

interface BenchmarkAnalytics {
  benchmarkId: string;
  totalMessages: number;
  totalChannels: number;
  participantCount: number;
  platformUsage: Record<string, number>;
  participantActivity: Record<string, number>;
  conversationPatterns: ConversationPattern[];
  averageResponseTime: number;
  timeRange: {
    start: number;
    end: number;
  };
}

interface ConversationPattern {
  from: string;
  to: string;
  responseTime: number;
  messageType: string;
  platform: string;
}

// Global instance for benchmark use
export const liveMessageBus = new LiveMessageBus();
