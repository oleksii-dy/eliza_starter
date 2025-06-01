import { logger, type UUID, ChannelType } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import type {
  MessageChannel,
  MessageServer,
  CentralRootMessage,
  MessageServiceStructure,
} from '../types';

interface RetentionConfig {
  maxMessagesPerChannel: number;
  maxTotalMessages: number;
  messageRetentionTime: number; // in milliseconds
  cleanupInterval: number; // how often to run cleanup
}

/**
 * Fast in-memory store for messages, channels, and servers
 * Replaces PGLite with pure memory storage for maximum performance
 * Includes automatic cleanup and retention policies to prevent memory leaks
 */
export class InMemoryMessageStore {
  private servers: Map<UUID, MessageServer> = new Map();
  private channels: Map<UUID, MessageChannel> = new Map();
  private messages: Map<UUID, CentralRootMessage> = new Map();
  private channelParticipants: Map<UUID, Set<UUID>> = new Map(); // channelId -> Set<userId>
  private serverAgents: Map<UUID, Set<UUID>> = new Map(); // serverId -> Set<agentId>

  // Index for faster lookups
  private messagesByChannel: Map<UUID, UUID[]> = new Map(); // channelId -> messageIds[]
  private channelsByServer: Map<UUID, UUID[]> = new Map(); // serverId -> channelIds[]
  private serversByAgent: Map<UUID, Set<UUID>> = new Map(); // agentId -> Set<serverId>

  // Cleanup timer
  private cleanupTimer: NodeJS.Timeout | null = null;

  // Retention configuration
  private readonly retentionConfig: RetentionConfig = {
    maxMessagesPerChannel: 1000, // Keep last 1000 messages per channel
    maxTotalMessages: 50000, // Keep max 50k messages total
    messageRetentionTime: 24 * 60 * 60 * 1000, // 24 hours
    cleanupInterval: 5 * 60 * 1000, // Run cleanup every 5 minutes
  };

  constructor() {
    // Create default server on initialization
    this.ensureDefaultServer();
    // Start automatic cleanup
    this.startCleanup();
  }

  private ensureDefaultServer(): void {
    if (!this.servers.has('0' as UUID)) {
      const now = new Date();
      this.servers.set('0' as UUID, {
        id: '0' as UUID,
        name: 'Default Server',
        sourceType: 'eliza_default',
        createdAt: now,
        updatedAt: now,
      });
      this.serverAgents.set('0' as UUID, new Set());
      this.channelsByServer.set('0' as UUID, []);
      logger.info('[MemoryStore] Default server created with ID: 0');
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.retentionConfig.cleanupInterval);

    logger.info('[MemoryStore] Automatic cleanup started');
  }

  private performCleanup(): void {
    const startTime = Date.now();
    let removedMessages = 0;
    let removedChannels = 0;

    // 1. Remove old messages (older than retention time)
    const cutoffTime = new Date(Date.now() - this.retentionConfig.messageRetentionTime);

    for (const [messageId, message] of this.messages.entries()) {
      if (message.createdAt < cutoffTime) {
        this.messages.delete(messageId);

        // Remove from channel index
        const channelMessages = this.messagesByChannel.get(message.channelId);
        if (channelMessages) {
          const index = channelMessages.indexOf(messageId);
          if (index > -1) {
            channelMessages.splice(index, 1);
          }
        }

        removedMessages++;
      }
    }

    // 2. Enforce per-channel message limit
    for (const [channelId, messageIds] of this.messagesByChannel.entries()) {
      if (messageIds.length > this.retentionConfig.maxMessagesPerChannel) {
        // Sort by timestamp and keep only the newest
        const sortedMessages = messageIds
          .map((id) => ({ id, message: this.messages.get(id)! }))
          .filter((item) => item.message) // Filter out any undefined
          .sort((a, b) => b.message.createdAt.getTime() - a.message.createdAt.getTime());

        // Keep only the newest messages
        const toKeep = sortedMessages.slice(0, this.retentionConfig.maxMessagesPerChannel);
        const toKeepIds = new Set(toKeep.map((item) => item.id));

        // Remove old messages
        for (const messageId of messageIds) {
          if (!toKeepIds.has(messageId)) {
            this.messages.delete(messageId);
            removedMessages++;
          }
        }

        // Update the channel's message list
        this.messagesByChannel.set(channelId, Array.from(toKeepIds));
      }
    }

    // 3. Enforce total message limit
    if (this.messages.size > this.retentionConfig.maxTotalMessages) {
      // Get all messages sorted by date
      const allMessages = Array.from(this.messages.entries()).sort(
        (a, b) => b[1].createdAt.getTime() - a[1].createdAt.getTime()
      );

      // Keep only the newest
      const toKeep = allMessages.slice(0, this.retentionConfig.maxTotalMessages);
      const toKeepIds = new Set(toKeep.map(([id]) => id));

      // Remove oldest messages
      for (const [messageId] of allMessages) {
        if (!toKeepIds.has(messageId)) {
          const message = this.messages.get(messageId);
          if (message) {
            this.messages.delete(messageId);

            // Remove from channel index
            const channelMessages = this.messagesByChannel.get(message.channelId);
            if (channelMessages) {
              const index = channelMessages.indexOf(messageId);
              if (index > -1) {
                channelMessages.splice(index, 1);
              }
            }

            removedMessages++;
          }
        }
      }
    }

    // 4. Clean up empty channels (no messages and no participants)
    for (const [channelId, channel] of this.channels.entries()) {
      const messages = this.messagesByChannel.get(channelId) || [];
      const participants = this.channelParticipants.get(channelId) || new Set();

      if (
        messages.length === 0 &&
        participants.size === 0 &&
        channel.createdAt < cutoffTime &&
        channel.type !== ChannelType.DM
      ) {
        // Don't auto-delete DM channels

        // Remove channel
        this.channels.delete(channelId);
        this.messagesByChannel.delete(channelId);
        this.channelParticipants.delete(channelId);

        // Remove from server index
        const serverChannels = this.channelsByServer.get(channel.messageServerId);
        if (serverChannels) {
          const index = serverChannels.indexOf(channelId);
          if (index > -1) {
            serverChannels.splice(index, 1);
          }
        }

        removedChannels++;
      }
    }

    const duration = Date.now() - startTime;

    if (removedMessages > 0 || removedChannels > 0) {
      logger.info(
        `[MemoryStore] Cleanup completed in ${duration}ms: ` +
          `removed ${removedMessages} messages, ${removedChannels} channels. ` +
          `Current: ${this.messages.size} messages, ${this.channels.size} channels`
      );
    }
  }

  // Server methods
  async createServer(
    data: Omit<MessageServer, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MessageServer> {
    const id = uuidv4() as UUID;
    const now = new Date();
    const server: MessageServer = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.servers.set(id, server);
    this.serverAgents.set(id, new Set());
    this.channelsByServer.set(id, []);

    logger.debug(`[MemoryStore] Created server: ${id}`);
    return server;
  }

  async getServers(): Promise<MessageServer[]> {
    return Array.from(this.servers.values());
  }

  async getServerById(id: UUID): Promise<MessageServer | null> {
    return this.servers.get(id) || null;
  }

  async getServerBySourceType(sourceType: string): Promise<MessageServer | null> {
    for (const server of this.servers.values()) {
      if (server.sourceType === sourceType) {
        return server;
      }
    }
    return null;
  }

  // Channel methods
  async createChannel(
    data: Omit<MessageChannel, 'id' | 'createdAt' | 'updatedAt'>,
    participantIds?: UUID[]
  ): Promise<MessageChannel> {
    const id = uuidv4() as UUID;
    const now = new Date();
    const channel: MessageChannel = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.channels.set(id, channel);

    // Add to server's channel list
    const serverChannels = this.channelsByServer.get(data.messageServerId) || [];
    serverChannels.push(id);
    this.channelsByServer.set(data.messageServerId, serverChannels);

    // Initialize message list for channel
    this.messagesByChannel.set(id, []);

    // Add participants if provided
    if (participantIds && participantIds.length > 0) {
      this.channelParticipants.set(id, new Set(participantIds));
    } else {
      this.channelParticipants.set(id, new Set());
    }

    logger.debug(`[MemoryStore] Created channel: ${id} on server ${data.messageServerId}`);
    return channel;
  }

  async getChannelsForServer(serverId: UUID): Promise<MessageChannel[]> {
    const channelIds = this.channelsByServer.get(serverId) || [];
    return channelIds.map((id) => this.channels.get(id)!).filter(Boolean);
  }

  async getChannelDetails(channelId: UUID): Promise<MessageChannel | null> {
    return this.channels.get(channelId) || null;
  }

  async getChannelParticipants(channelId: UUID): Promise<UUID[]> {
    const participants = this.channelParticipants.get(channelId) || new Set();
    return Array.from(participants);
  }

  async addParticipantsToChannel(channelId: UUID, userIds: UUID[]): Promise<void> {
    const participants = this.channelParticipants.get(channelId) || new Set();
    userIds.forEach((id) => participants.add(id));
    this.channelParticipants.set(channelId, participants);
  }

  async removeParticipantFromChannel(channelId: UUID, userId: UUID): Promise<void> {
    const participants = this.channelParticipants.get(channelId);
    if (participants) {
      participants.delete(userId);
    }
  }

  async findOrCreateDmChannel(
    user1Id: UUID,
    user2Id: UUID,
    serverId: UUID
  ): Promise<MessageChannel> {
    const ids = [user1Id, user2Id].sort();
    const dmChannelName = `DM-${ids[0]}-${ids[1]}`;

    // Look for existing DM channel
    for (const channel of this.channels.values()) {
      if (
        channel.type === ChannelType.DM &&
        channel.name === dmChannelName &&
        channel.messageServerId === serverId
      ) {
        return channel;
      }
    }

    // Create new DM channel
    return this.createChannel(
      {
        messageServerId: serverId,
        name: dmChannelName,
        type: ChannelType.DM,
        metadata: { user1: ids[0], user2: ids[1] },
      },
      ids
    );
  }

  // Message methods
  async createMessage(
    data: Omit<CentralRootMessage, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CentralRootMessage> {
    const id = uuidv4() as UUID;
    const now = new Date();
    const message: CentralRootMessage = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.messages.set(id, message);

    // Add to channel's message list
    const channelMessages = this.messagesByChannel.get(data.channelId) || [];
    channelMessages.push(id);
    this.messagesByChannel.set(data.channelId, channelMessages);

    logger.debug(`[MemoryStore] Created message: ${id} in channel ${data.channelId}`);
    return message;
  }

  async getMessagesForChannel(
    channelId: UUID,
    limit: number = 50,
    beforeTimestamp?: Date
  ): Promise<CentralRootMessage[]> {
    const messageIds = this.messagesByChannel.get(channelId) || [];

    let messages = messageIds
      .map((id) => this.messages.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort newest first

    // Filter by timestamp if provided
    if (beforeTimestamp) {
      messages = messages.filter((msg) => msg.createdAt < beforeTimestamp);
    }

    // Apply limit
    messages = messages.slice(0, limit);

    // Return in chronological order
    return messages.reverse();
  }

  async deleteMessage(messageId: UUID): Promise<void> {
    const message = this.messages.get(messageId);
    if (message) {
      // Remove from messages map
      this.messages.delete(messageId);

      // Remove from channel's message list
      const channelMessages = this.messagesByChannel.get(message.channelId);
      if (channelMessages) {
        const index = channelMessages.indexOf(messageId);
        if (index > -1) {
          channelMessages.splice(index, 1);
        }
      }

      logger.debug(`[MemoryStore] Deleted message: ${messageId}`);
    }
  }

  async clearChannelMessages(channelId: UUID): Promise<void> {
    const messageIds = this.messagesByChannel.get(channelId) || [];

    // Delete all messages
    messageIds.forEach((id) => this.messages.delete(id));

    // Clear the channel's message list
    this.messagesByChannel.set(channelId, []);

    logger.debug(`[MemoryStore] Cleared all messages in channel: ${channelId}`);
  }

  // Server-Agent association methods
  async addAgentToServer(serverId: UUID, agentId: UUID): Promise<void> {
    // Add to server's agent set
    const serverAgentSet = this.serverAgents.get(serverId) || new Set();
    serverAgentSet.add(agentId);
    this.serverAgents.set(serverId, serverAgentSet);

    // Add to agent's server set
    const agentServerSet = this.serversByAgent.get(agentId) || new Set();
    agentServerSet.add(serverId);
    this.serversByAgent.set(agentId, agentServerSet);

    logger.debug(`[MemoryStore] Added agent ${agentId} to server ${serverId}`);
  }

  async removeAgentFromServer(serverId: UUID, agentId: UUID): Promise<void> {
    // Remove from server's agent set
    const serverAgentSet = this.serverAgents.get(serverId);
    if (serverAgentSet) {
      serverAgentSet.delete(agentId);
    }

    // Remove from agent's server set
    const agentServerSet = this.serversByAgent.get(agentId);
    if (agentServerSet) {
      agentServerSet.delete(serverId);
    }

    logger.debug(`[MemoryStore] Removed agent ${agentId} from server ${serverId}`);
  }

  async getAgentsForServer(serverId: UUID): Promise<UUID[]> {
    const agents = this.serverAgents.get(serverId) || new Set();
    return Array.from(agents);
  }

  async getServersForAgent(agentId: UUID): Promise<UUID[]> {
    const servers = this.serversByAgent.get(agentId) || new Set();
    return Array.from(servers);
  }

  // Utility methods
  getStats() {
    const messageAges = Array.from(this.messages.values()).map(
      (m) => Date.now() - m.createdAt.getTime()
    );

    return {
      servers: this.servers.size,
      channels: this.channels.size,
      messages: this.messages.size,
      totalParticipants: Array.from(this.channelParticipants.values()).reduce(
        (sum, set) => sum + set.size,
        0
      ),
      totalAgents: this.serversByAgent.size,
      oldestMessageAge: messageAges.length > 0 ? Math.max(...messageAges) : 0,
      averageMessageAge:
        messageAges.length > 0 ? messageAges.reduce((a, b) => a + b, 0) / messageAges.length : 0,
    };
  }

  clear() {
    this.servers.clear();
    this.channels.clear();
    this.messages.clear();
    this.channelParticipants.clear();
    this.serverAgents.clear();
    this.messagesByChannel.clear();
    this.channelsByServer.clear();
    this.serversByAgent.clear();

    // Recreate default server
    this.ensureDefaultServer();
  }

  // Cleanup when shutting down
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}
