/**
 * Discord Platform Adapter for LiveMessageBus
 * Integrates with Discord for real agent messaging
 */

import { logger } from '@elizaos/core';
import type { Content } from '@elizaos/core';
import type {
  MessagePlatform,
  PlatformConfig,
  PlatformMessage,
  PlatformReaction,
  ChannelEvent,
} from '../LiveMessageBus.js';

export class DiscordPlatform implements MessagePlatform {
  name = 'discord';
  type = 'discord' as const;
  isConnected = false;

  private client: any; // Discord.js client
  private token: string = '';
  private channels: Map<string, any> = new Map();
  private messageCallbacks: ((message: PlatformMessage) => void)[] = [];
  private reactionCallbacks: ((reaction: PlatformReaction) => void)[] = [];
  private eventCallbacks: ((event: ChannelEvent) => void)[] = [];

  async initialize(config: PlatformConfig): Promise<void> {
    try {
      // Import Discord.js dynamically
      const Discord = await import('discord.js');

      this.token = config.token || config.apiKey || '';
      if (!this.token) {
        throw new Error('Discord token is required');
      }

      // Create Discord client with necessary intents
      this.client = new Discord.Client({
        intents: [
          Discord.GatewayIntentBits.Guilds,
          Discord.GatewayIntentBits.GuildMessages,
          Discord.GatewayIntentBits.MessageContent,
          Discord.GatewayIntentBits.GuildMessageReactions,
        ],
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Login to Discord
      await this.client.login(this.token);

      this.isConnected = true;
      logger.info('Discord platform connected successfully');
    } catch (error) {
      logger.error('Failed to initialize Discord platform:', error);
      throw new Error(`Discord initialization failed: ${error}`);
    }
  }

  private setupEventHandlers(): void {
    this.client.on('ready', () => {
      logger.info(`Discord bot logged in as ${this.client.user?.tag}`);
    });

    this.client.on('messageCreate', (discordMessage: any) => {
      // Skip bot messages to avoid loops
      if (discordMessage.author.bot) {
        return;
      }

      const platformMessage: PlatformMessage = {
        id: discordMessage.id,
        channelId: discordMessage.channel.id,
        senderId: discordMessage.author.id,
        senderName: discordMessage.author.displayName || discordMessage.author.username,
        content: {
          text: discordMessage.content,
          source: 'discord',
          attachments:
            discordMessage.attachments?.map((attachment: any) => ({
              url: attachment.url,
              name: attachment.name,
              type: attachment.contentType,
            })) || [],
        },
        timestamp: discordMessage.createdTimestamp,
        platform: 'discord',
        metadata: {
          guildId: discordMessage.guild?.id,
          channelName: discordMessage.channel.name,
          authorTag: discordMessage.author.tag,
        },
        threadId: discordMessage.thread?.id,
        replyTo: discordMessage.reference?.messageId,
      };

      // Notify all message callbacks
      this.messageCallbacks.forEach((callback) => {
        try {
          callback(platformMessage);
        } catch (error) {
          logger.error('Error in Discord message callback:', error);
        }
      });
    });

    this.client.on('messageReactionAdd', (reaction: any, user: any) => {
      if (user.bot) {
        return;
      }

      const platformReaction: PlatformReaction = {
        messageId: reaction.message.id,
        channelId: reaction.message.channel.id,
        userId: user.id,
        emoji: reaction.emoji.name || reaction.emoji.id,
        timestamp: Date.now(),
        platform: 'discord',
      };

      this.reactionCallbacks.forEach((callback) => {
        try {
          callback(platformReaction);
        } catch (error) {
          logger.error('Error in Discord reaction callback:', error);
        }
      });
    });

    this.client.on('channelCreate', (channel: any) => {
      const event: ChannelEvent = {
        type: 'created',
        channelId: channel.id,
        metadata: {
          name: channel.name,
          type: channel.type,
          guildId: channel.guild?.id,
        },
        timestamp: Date.now(),
        platform: 'discord',
      };

      this.eventCallbacks.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          logger.error('Error in Discord channel event callback:', error);
        }
      });
    });

    this.client.on('guildMemberAdd', (member: any) => {
      const event: ChannelEvent = {
        type: 'user_joined',
        channelId: member.guild.systemChannel?.id || '',
        userId: member.user.id,
        metadata: {
          username: member.user.username,
          displayName: member.displayName,
          guildId: member.guild.id,
        },
        timestamp: Date.now(),
        platform: 'discord',
      };

      this.eventCallbacks.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          logger.error('Error in Discord member join callback:', error);
        }
      });
    });

    this.client.on('error', (error: any) => {
      logger.error('Discord client error:', error);
    });

    this.client.on('disconnect', () => {
      this.isConnected = false;
      logger.warn('Discord client disconnected');
    });
  }

  async createChannel(name: string, metadata: Record<string, any> = {}): Promise<string> {
    try {
      if (!this.isConnected) {
        throw new Error('Discord client not connected');
      }

      // Get the first available guild (server)
      const guild = this.client.guilds.cache.first();
      if (!guild) {
        throw new Error('No Discord guild available');
      }

      // Create a text channel
      const channel = await guild.channels.create({
        name: name.toLowerCase().replace(/\s+/g, '-'),
        type: 0, // GUILD_TEXT
        topic: metadata.description || `Benchmark channel: ${name}`,
      });

      this.channels.set(channel.id, channel);

      logger.info(`Created Discord channel: ${channel.name} (${channel.id})`);
      return channel.id;
    } catch (error) {
      logger.error('Failed to create Discord channel:', error);
      throw new Error(`Failed to create Discord channel: ${error}`);
    }
  }

  async deleteChannel(channelId: string): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel && channel.deletable) {
        await channel.delete();
        this.channels.delete(channelId);
        logger.info(`Deleted Discord channel: ${channelId}`);
      }
    } catch (error) {
      logger.error(`Failed to delete Discord channel ${channelId}:`, error);
      throw new Error(`Failed to delete Discord channel: ${error}`);
    }
  }

  async joinChannel(channelId: string, agentId: string): Promise<void> {
    // Discord bots are automatically in all channels they have access to
    // This is mainly for tracking purposes
    logger.debug(`Agent ${agentId} joining Discord channel ${channelId}`);
  }

  async leaveChannel(channelId: string, agentId: string): Promise<void> {
    // Discord bots can't leave individual channels
    // This is mainly for tracking purposes
    logger.debug(`Agent ${agentId} leaving Discord channel ${channelId}`);
  }

  async sendMessage(channelId: string, _senderId: string, content: Content): Promise<string> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Invalid Discord channel: ${channelId}`);
      }

      const messageOptions: any = {
        content: content.text || '',
      };

      // Handle attachments if present
      if (content.attachments && content.attachments.length > 0) {
        messageOptions.files = content.attachments.map((attachment: any) => ({
          attachment: attachment.url || attachment.data,
          name: attachment.name,
        }));
      }

      // Handle embeds for rich content
      if ((content.metadata as any)?.embed) {
        messageOptions.embeds = [(content.metadata as any).embed];
      }

      const sentMessage = await channel.send(messageOptions);

      logger.debug(`Sent Discord message: ${sentMessage.id} in channel ${channelId}`);
      return sentMessage.id;
    } catch (error) {
      logger.error(`Failed to send Discord message to ${channelId}:`, error);
      throw new Error(`Failed to send Discord message: ${error}`);
    }
  }

  async editMessage(channelId: string, messageId: string, newContent: Content): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Invalid Discord channel: ${channelId}`);
      }

      const message = await channel.messages.fetch(messageId);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      await message.edit({
        content: newContent.text || '',
      });

      logger.debug(`Edited Discord message: ${messageId}`);
    } catch (error) {
      logger.error(`Failed to edit Discord message ${messageId}:`, error);
      throw new Error(`Failed to edit Discord message: ${error}`);
    }
  }

  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Invalid Discord channel: ${channelId}`);
      }

      const message = await channel.messages.fetch(messageId);
      if (message && message.deletable) {
        await message.delete();
        logger.debug(`Deleted Discord message: ${messageId}`);
      }
    } catch (error) {
      logger.error(`Failed to delete Discord message ${messageId}:`, error);
      throw new Error(`Failed to delete Discord message: ${error}`);
    }
  }

  onMessage(callback: (message: PlatformMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  onReaction(callback: (reaction: PlatformReaction) => void): void {
    this.reactionCallbacks.push(callback);
  }

  onChannelEvent(callback: (event: ChannelEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.destroy();
        this.isConnected = false;
        this.channels.clear();
        this.messageCallbacks.length = 0;
        this.reactionCallbacks.length = 0;
        this.eventCallbacks.length = 0;
        logger.info('Discord platform disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting Discord platform:', error);
      throw error;
    }
  }

  // Helper methods for Discord-specific functionality
  async addReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel && channel.isTextBased()) {
        const message = await channel.messages.fetch(messageId);
        if (message) {
          await message.react(emoji);
        }
      }
    } catch (error) {
      logger.error(`Failed to add reaction to Discord message ${messageId}:`, error);
    }
  }

  async setChannelTopic(channelId: string, topic: string): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel && 'setTopic' in channel) {
        await channel.setTopic(topic);
      }
    } catch (error) {
      logger.error(`Failed to set Discord channel topic for ${channelId}:`, error);
    }
  }

  async inviteToChannel(channelId: string, _userId: string): Promise<string | null> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel && 'createInvite' in channel) {
        const invite = await channel.createInvite({
          maxAge: 86400, // 24 hours
          maxUses: 1,
          unique: true,
        });
        return invite.url;
      }
      return null;
    } catch (error) {
      logger.error(`Failed to create Discord invite for ${channelId}:`, error);
      return null;
    }
  }
}
