import { DatabaseAdapter, logger, type UUID } from '@elizaos/core';
import type {
  CentralRootMessage,
  MessageChannel,
  MessageServer,
  MessageServiceStructure,
} from '../types/messaging.js';
import internalMessageBus from '../utils/bus.js';

/**
 * DatabaseService - Handles all database operations
 * Extracted from AgentServer to follow Single Responsibility Principle
 */
export class DatabaseService {
  constructor(private database: DatabaseAdapter) {}

  /**
   * Get the database adapter
   */
  public getDatabase(): DatabaseAdapter {
    return this.database;
  }

  // ===============================
  // Server Operations
  // ===============================

  async createServer(
    data: Omit<MessageServer, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MessageServer> {
    return (this.database as any).createMessageServer(data);
  }

  async getServers(): Promise<MessageServer[]> {
    return (this.database as any).getMessageServers();
  }

  async getServerById(serverId: UUID): Promise<MessageServer | null> {
    return (this.database as any).getMessageServerById(serverId);
  }

  async getServerBySourceType(sourceType: string): Promise<MessageServer | null> {
    const servers = await (this.database as any).getMessageServers();
    const filtered = servers.filter((s: MessageServer) => s.sourceType === sourceType);
    return filtered.length > 0 ? filtered[0] : null;
  }

  // ===============================
  // Channel Operations
  // ===============================

  async createChannel(
    data: Omit<MessageChannel, 'id' | 'createdAt' | 'updatedAt'> & { id?: UUID },
    participantIds?: UUID[]
  ): Promise<MessageChannel> {
    return (this.database as any).createChannel(data, participantIds);
  }

  async addParticipantsToChannel(channelId: UUID, userIds: UUID[]): Promise<void> {
    return (this.database as any).addChannelParticipants(channelId, userIds);
  }

  async getChannelsForServer(serverId: UUID): Promise<MessageChannel[]> {
    return (this.database as any).getChannelsForServer(serverId);
  }

  async getChannelDetails(channelId: UUID): Promise<MessageChannel | null> {
    return (this.database as any).getChannelDetails(channelId);
  }

  async getChannelParticipants(channelId: UUID): Promise<UUID[]> {
    return (this.database as any).getChannelParticipants(channelId);
  }

  async updateChannel(
    channelId: UUID,
    updates: { name?: string; participantCentralUserIds?: UUID[]; metadata?: any }
  ): Promise<MessageChannel> {
    return (this.database as any).updateChannel(channelId, updates);
  }

  async deleteChannel(channelId: UUID): Promise<void> {
    return (this.database as any).deleteChannel(channelId);
  }

  async findOrCreateCentralDmChannel(
    user1Id: UUID,
    user2Id: UUID,
    messageServerId: UUID
  ): Promise<MessageChannel> {
    return (this.database as any).findOrCreateDmChannel(user1Id, user2Id, messageServerId);
  }

  // ===============================
  // Message Operations
  // ===============================

  async createMessage(
    data: Omit<CentralRootMessage, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CentralRootMessage> {
    const createdMessage = await (this.database as any).createMessage(data);

    // Get the channel details to find the server ID
    const channel = await this.getChannelDetails(createdMessage.channelId);
    if (channel) {
      // Emit to internal message bus for agent consumption
      const messageForBus: MessageServiceStructure = {
        id: createdMessage.id,
        channel_id: createdMessage.channelId,
        server_id: channel.messageServerId,
        author_id: createdMessage.authorId,
        content: createdMessage.content,
        raw_message: createdMessage.rawMessage,
        source_id: createdMessage.sourceId,
        source_type: createdMessage.sourceType,
        in_reply_to_message_id: createdMessage.inReplyToRootMessageId,
        created_at: createdMessage.createdAt.getTime(),
        metadata: createdMessage.metadata,
      };

      internalMessageBus.emit('new_message', messageForBus);
      logger.info(`[DatabaseService] Published message ${createdMessage.id} to internal message bus`);
    }

    return createdMessage;
  }

  async deleteMessage(messageId: UUID): Promise<void> {
    return (this.database as any).deleteMessage(messageId);
  }

  async getMessagesForChannel(
    channelId: UUID,
    limit: number = 50,
    beforeTimestamp?: Date
  ): Promise<CentralRootMessage[]> {
    return (this.database as any).getMessagesForChannel(channelId, limit, beforeTimestamp);
  }

  async clearChannelMessages(channelId: UUID): Promise<void> {
    // Get all messages for the channel and delete them one by one
    const messages = await (this.database as any).getMessagesForChannel(channelId, 1000);
    for (const message of messages) {
      await (this.database as any).deleteMessage(message.id);
    }
    logger.info(`[DatabaseService] Cleared all messages for central channel: ${channelId}`);
  }

  // ===============================
  // Server-Agent Association Operations
  // ===============================

  async addAgentToServer(serverId: UUID, agentId: UUID): Promise<void> {
    // First, verify the server exists
    const server = await this.getServerById(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    return (this.database as any).addAgentToServer(serverId, agentId);
  }

  async removeAgentFromServer(serverId: UUID, agentId: UUID): Promise<void> {
    return (this.database as any).removeAgentFromServer(serverId, agentId);
  }

  async getAgentsForServer(serverId: UUID): Promise<UUID[]> {
    return (this.database as any).getAgentsForServer(serverId);
  }

  async getServersForAgent(agentId: UUID): Promise<UUID[]> {
    // This method isn't directly supported in the adapter, so we need to implement it differently
    const servers = await (this.database as any).getMessageServers();
    const serverIds = [];
    for (const server of servers) {
      const agents = await (this.database as any).getAgentsForServer(server.id);
      if (agents.includes(agentId)) {
        serverIds.push(server.id as never);
      }
    }
    return serverIds;
  }

  // ===============================
  // Utility Methods
  // ===============================

  async removeParticipantFromChannel(): Promise<void> {
    // Since we don't have a direct method for this, we'll need to handle it at the channel level
    logger.warn(
      `[DatabaseService] Remove participant operation not directly supported in database adapter`
    );
  }

  async close(): Promise<void> {
    if (this.database) {
      try {
        await this.database.close();
        logger.info('[DatabaseService] Database closed');
      } catch (error) {
        logger.error('[DatabaseService] Error closing database:', error);
        throw error;
      }
    }
  }
}