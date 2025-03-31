import {
  ChannelType,
  type Entity,
  EventType,
  type IAgentRuntime,
  Role,
  type Room,
  Service,
  type UUID,
  type World,
  createUniqueUuid,
  logger,
} from '@elizaos/core';
import { type Context, Telegraf } from 'telegraf';
import { TELEGRAM_SERVICE_NAME } from './constants';
import { validateTelegramConfig } from './environment';
import { MessageManager } from './messageManager';
import { TelegramEventTypes, TelegramWorldPayload } from './types';

/**
 * Class representing a Telegram service that allows the agent to send and receive messages on Telegram.
 * @extends Service
 */

export class TelegramService extends Service {
  static serviceType = TELEGRAM_SERVICE_NAME;
  capabilityDescription = 'The agent is able to send and receive messages on telegram';
  private bot: Telegraf<Context>;
  public messageManager: MessageManager;
  private options;
  private knownChats: Map<string, any> = new Map();

  /**
   * Constructor for TelegramService class.
   * @param {IAgentRuntime} runtime - The runtime object for the agent.
   */
  constructor(runtime: IAgentRuntime) {
    super(runtime);
    logger.log('📱 Constructing new TelegramService...');
    this.options = {
      telegram: {
        apiRoot:
          runtime.getSetting('TELEGRAM_API_ROOT') ||
          process.env.TELEGRAM_API_ROOT ||
          'https://api.telegram.org',
      },
    };
    const botToken = runtime.getSetting('TELEGRAM_BOT_TOKEN');
    this.bot = new Telegraf(botToken, this.options);
    this.messageManager = new MessageManager(this.bot, this.runtime);
    logger.log('✅ TelegramService constructor completed');
  }

  /**
   * Starts the Telegram service for the given runtime.
   *
   * @param {IAgentRuntime} runtime - The agent runtime to start the Telegram service for.
   * @returns {Promise<TelegramService>} A promise that resolves with the initialized TelegramService.
   */
  static async start(runtime: IAgentRuntime): Promise<TelegramService> {
    await validateTelegramConfig(runtime);

    const maxRetries = 5;
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < maxRetries) {
      try {
        const service = new TelegramService(runtime);

        logger.success(
          `✅ Telegram client successfully started for character ${runtime.character.name}`
        );

        logger.log('🚀 Starting Telegram bot...');
        await service.initializeBot();
        service.setupMessageHandlers();

        // Wait for bot to be ready by testing getMe()
        await service.bot.telegram.getMe();

        return service;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.error(
          `Telegram initialization attempt ${retryCount + 1} failed: ${lastError.message}`
        );
        retryCount++;

        if (retryCount < maxRetries) {
          const delay = 2 ** retryCount * 1000; // Exponential backoff
          logger.info(`Retrying Telegram initialization in ${delay / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Telegram initialization failed after ${maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Stops the agent runtime.
   * @param {IAgentRuntime} runtime - The agent runtime to stop
   */
  static async stop(runtime: IAgentRuntime) {
    // Implement shutdown if necessary
    const tgClient = runtime.getService(TELEGRAM_SERVICE_NAME);
    if (tgClient) {
      await tgClient.stop();
    }
  }

  /**
   * Asynchronously stops the bot.
   *
   * @returns A Promise that resolves once the bot has stopped.
   */
  async stop(): Promise<void> {
    this.bot.stop();
  }

  /**
   * Initializes the Telegram bot by launching it, getting bot info, and setting up message manager.
   * @returns {Promise<void>} A Promise that resolves when the initialization is complete.
   */
  private async initializeBot(): Promise<void> {
    this.bot.launch({
      dropPendingUpdates: true,
      allowedUpdates: ['message', 'message_reaction'],
    });

    // Get bot info for identification purposes
    const botInfo = await this.bot.telegram.getMe();
    logger.log(`Bot info: ${JSON.stringify(botInfo)}`);

    // Handle sigint and sigterm signals to gracefully stop the bot
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
  }

  /**
   * Sets up message and reaction handlers for the bot.
   *
   * @private
   * @returns {void}
   */
  private setupMessageHandlers(): void {
    // Regular message handler
    this.bot.on('message', async (ctx) => {
      try {
        // First check if this is from an authorized chat
        if (!(await this.isGroupAuthorized(ctx))) return;

        // Handle the chat - this will either process a new chat or an existing one
        await this.handleNewChat(ctx);

        // Only after we've ensured all necessary entities and rooms exist,
        // process the actual message content
        await this.messageManager.handleMessage(ctx);
      } catch (error) {
        logger.error('Error handling message:', error);
      }
    });

    // Reaction handler
    this.bot.on('message_reaction', async (ctx) => {
      try {
        if (!(await this.isGroupAuthorized(ctx))) return;
        await this.messageManager.handleReaction(ctx);
      } catch (error) {
        logger.error('Error handling reaction:', error);
      }
    });
  }

  /**
   * Checks if a group is authorized, based on the TELEGRAM_ALLOWED_CHATS setting.
   * @param {Context} ctx - The context of the incoming update.
   * @returns {Promise<boolean>} A Promise that resolves with a boolean indicating if the group is authorized.
   */
  private async isGroupAuthorized(ctx: Context): Promise<boolean> {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return false;

    // Check authorization based on TELEGRAM_ALLOWED_CHATS setting
    const allowedChats = this.runtime.getSetting('TELEGRAM_ALLOWED_CHATS');
    if (!allowedChats) {
      return true; // If no setting, allow all chats
    }

    try {
      const allowedChatsList = JSON.parse(allowedChats as string);
      return allowedChatsList.includes(chatId);
    } catch (error) {
      logger.error('Error parsing TELEGRAM_ALLOWED_CHATS:', error);
      return false;
    }
  }

  /**
   * Gets chat title and channel type based on Telegram chat type
   * @param {any} chat - The Telegram chat object
   * @returns {Object} Object containing chatTitle and channelType
   */
  private getChatTypeInfo(chat: any): { chatTitle: string; channelType: ChannelType } {
    let chatTitle: string;
    let channelType: ChannelType;

    switch (chat.type) {
      case 'private':
        chatTitle = `Chat with ${chat.first_name || 'Unknown User'}`;
        channelType = ChannelType.DM;
        break;
      case 'group':
        chatTitle = chat.title || 'Unknown Group';
        channelType = ChannelType.GROUP;
        break;
      case 'supergroup':
        chatTitle = chat.title || 'Unknown Supergroup';
        channelType = ChannelType.GROUP;
        break;
      case 'channel':
        chatTitle = chat.title || 'Unknown Channel';
        channelType = ChannelType.FEED;
        break;
      default:
        chatTitle = 'Unknown Chat';
        channelType = ChannelType.GROUP;
    }

    return { chatTitle, channelType };
  }

  /**
   * Handles new chat discovery and emits WORLD_JOINED event
   * @param {Context} ctx - The context of the incoming update
   */
  private async handleNewChat(ctx: Context): Promise<void> {
    console.log('handleNewChat() call started');
    if (!ctx.chat) return;

    const chat = ctx.chat;
    const chatId = chat.id.toString();

    // If we already know this chat, handle it differently
    if (this.knownChats.has(chatId)) {
      await this.handleExistingChat(ctx);
      return;
    }

    // Mark this chat as known for future messages
    this.knownChats.set(chatId, chat);

    // Get chat title and channel type
    const { chatTitle, channelType } = this.getChatTypeInfo(chat);

    const worldId = createUniqueUuid(this.runtime, chatId) as UUID;
    const userId = createUniqueUuid(this.runtime, ctx.from.id.toString()) as UUID;

    let admins = [];
    let owner = null;
    if (chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel') {
      admins = await ctx.getChatAdministrators();
      owner = admins.find((admin) => admin.status === 'creator');
    }

    let ownerId = userId;

    if (owner) {
      ownerId = createUniqueUuid(this.runtime, String(owner.user.id)) as UUID;
    }

    // Build world representation
    const world: World = {
      id: worldId,
      name: chatTitle,
      agentId: this.runtime.agentId,
      serverId: chatId,
      metadata: {
        source: 'telegram',
        ownership: { ownerId },
        roles: {
          [ownerId]: Role.OWNER,
        },
      },
    };

    const entities = await this.buildStandardizedEntities(chat);

    const room = {
      id: createUniqueUuid(this.runtime, chatId) as UUID,
      name: chatTitle,
      source: 'telegram',
      type: chat.type === 'private' ? ChannelType.DM : ChannelType.GROUP,
      channelId: chatId,
      serverId: chatId,
      worldId,
    };

    // Create payload for world events
    const worldPayload = {
      runtime: this.runtime,
      world,
      rooms: [room],
      entities,
      source: 'telegram',
      onComplete: () => {
        const telegramWorldPayload: TelegramWorldPayload = {
          ...worldPayload,
          chat,
          botUsername: this.bot.botInfo.username,
        };

        if (chat.type === 'group' || chat.type === 'supergroup' || chat.type === 'channel') {
          this.runtime.emitEvent(TelegramEventTypes.WORLD_JOINED, telegramWorldPayload);
          this.setupEntityTracking(chat.id);
        }
      },
    };

    // Emit generic WORLD_JOINED event
    this.runtime.emitEvent(EventType.WORLD_JOINED, worldPayload);
  }

  /**
   * Handles messages in existing chats
   * @param {Context} ctx - The context of the incoming update
   */
  private async handleExistingChat(ctx: Context): Promise<void> {
    const chat = ctx.chat;
    const chatId = chat.id.toString();
    const worldId = createUniqueUuid(this.runtime, chatId) as UUID;

    // Check if this is a forum topic message
    // First ensure the message exists and is a supergroup
    const isSupergroup = chat.type === 'supergroup';
    const hasForum = isSupergroup && 'is_forum' in chat && chat.is_forum === true;
    const hasMessageThreadId = ctx.message && 'message_thread_id' in ctx.message;
    const isForumTopic = hasForum && hasMessageThreadId;

    if (isForumTopic) {
      await this.handleNewForumTopic(ctx, worldId);
    } else {
      await this.handleNewEntity(ctx, worldId);
    }
  }

  /**
   * Handles new forum topics in supergroups
   * @param {Context} ctx - The context of the incoming update
   * @param {UUID} worldId - The world ID for this chat
   */
  private async handleNewForumTopic(ctx: Context, worldId: UUID): Promise<void> {
    if (!ctx.message || !('message_thread_id' in ctx.message)) return;

    const chat = ctx.chat;
    const chatId = chat.id.toString();
    const topicId = ctx.message.message_thread_id.toString();

    // Create channelId for the topic and derive roomId
    const channelId = `${chatId}-${topicId}`;
    const roomId = createUniqueUuid(this.runtime, channelId) as UUID;

    // Default topic name
    let topicName = `Topic ${topicId}`;

    // Safely try to get the topic name using type casting for TypeScript
    try {
      // This is a safe operation but TypeScript doesn't know the structure
      // of forum topics, so we use a type assertion
      const message = ctx.message as any;
      if (message?.forum_topic_created?.name) {
        topicName = message.forum_topic_created.name;
      }
    } catch (error) {
      // If anything goes wrong, just use the default name
      logger.debug(`Could not get forum topic name: ${error.message}`);
    }

    // We need to call ensureRoomExists directly to set up the room with the correct name.
    // While ENTITY_JOINED would create the room, it doesn't allow us to specify the room name.
    // This ensures the forum topic room is created with its proper name before handling the entity.
    await this.runtime.ensureRoomExists({
      id: roomId,
      name: topicName,
      source: 'telegram',
      type: ChannelType.GROUP,
      channelId: channelId,
      serverId: chatId,
      worldId,
    });

    // Handle the entity in this new room
    await this.handleNewEntity(ctx, worldId, roomId);
  }

  /**
   * Handles new entities in existing chats
   * @param {Context} ctx - The context of the incoming update
   * @param {UUID} worldId - The world ID for this chat
   * @param {UUID} roomId - Optional room ID for forum topics
   */
  private async handleNewEntity(ctx: Context, worldId: UUID, roomId?: UUID): Promise<void> {
    if (!ctx.from) return;

    const chat = ctx.chat;
    const chatId = chat.id.toString();
    const entityId = createUniqueUuid(this.runtime, ctx.from.id.toString()) as UUID;

    // If no specific roomId provided, use the default chat room
    const targetRoomId = roomId || (createUniqueUuid(this.runtime, chatId) as UUID);

    // Get chat type for metadata
    const { channelType } = this.getChatTypeInfo(chat);

    // Emit ENTITY_JOINED event to ensure entity is synced
    this.runtime.emitEvent(EventType.ENTITY_JOINED, {
      runtime: this.runtime,
      entityId,
      serverId: chat.id, // chat.id is always worldId in telegram!
      roomId: targetRoomId,
      metadata: {
        type: channelType,
        joinedAt: Date.now(),
      },
      source: 'telegram',
    });
  }

  /**
   * Builds standardized entity representations from Telegram chat data
   * @param chat - The Telegram chat object
   * @returns Array of standardized Entity objects
   */
  private async buildStandardizedEntities(chat: any): Promise<Entity[]> {
    const entities: Entity[] = [];

    try {
      // For private chats, add the user
      if (chat.type === 'private' && chat.id) {
        const userId = createUniqueUuid(this.runtime, chat.id.toString()) as UUID;
        entities.push({
          id: userId,
          names: [chat.first_name || 'Unknown User'],
          agentId: this.runtime.agentId,
          metadata: {
            telegram: {
              id: chat.id.toString(),
              username: chat.username || 'unknown',
              name: chat.first_name || 'Unknown User',
            },
            source: 'telegram',
          },
        });
      } else if (chat.type === 'group' || chat.type === 'supergroup') {
        // For groups and supergroups, try to get member information
        try {
          // Get chat administrators (this is what's available through the Bot API)
          const admins = await this.bot.telegram.getChatAdministrators(chat.id);

          if (admins && admins.length > 0) {
            for (const admin of admins) {
              const userId = createUniqueUuid(this.runtime, admin.user.id.toString()) as UUID;
              entities.push({
                id: userId,
                names: [admin.user.first_name || admin.user.username || 'Unknown Admin'],
                agentId: this.runtime.agentId,
                metadata: {
                  telegram: {
                    id: admin.user.id.toString(),
                    username: admin.user.username || 'unknown',
                    name: admin.user.first_name || 'Unknown Admin',
                    isAdmin: true,
                    adminTitle:
                      admin.custom_title || (admin.status === 'creator' ? 'Owner' : 'Admin'),
                  },
                  source: 'telegram',
                  roles: [admin.status === 'creator' ? Role.OWNER : Role.ADMIN],
                },
              });
            }
          }
        } catch (error) {
          logger.warn(`Could not fetch administrators for chat ${chat.id}: ${error}`);
        }
      }
    } catch (error) {
      logger.error(
        `Error building standardized entities: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return entities;
  }

  /**
   * // TODO: this is not working imo. Please check I think we can get rid of this.
   *
   * Sets up tracking for new entities in a group chat to sync them as entities
   * @param {number} chatId - The Telegram chat ID to track entities for
   */
  private setupEntityTracking(chatId: number): void {
    // We'll maintain a set of entity IDs we've already synced
    const syncedEntityIds = new Set<string>();

    // Add handler to track new message authors
    this.bot.on('message', async (ctx) => {
      if (!ctx.chat || ctx.chat.id !== chatId || !ctx.from) return;

      const entityId = ctx.from.id.toString();
      if (syncedEntityIds.has(entityId)) return;

      // Add to synced set to avoid duplicate processing
      syncedEntityIds.add(entityId);

      // Sync this entity
      const entityUuid = createUniqueUuid(this.runtime, entityId) as UUID;
      const worldId = createUniqueUuid(this.runtime, chatId.toString()) as UUID;
      const chatIdStr = chatId.toString();

      try {
        // Create entity
        await this.runtime.ensureConnection({
          entityId: entityUuid,
          roomId: createUniqueUuid(this.runtime, chatIdStr),
          userName: ctx.from.username || ctx.from.first_name || 'Unknown Entity',
          name: ctx.from.first_name || ctx.from.username || 'Unknown Entity',
          source: 'telegram',
          channelId: chatIdStr,
          serverId: chatIdStr,
          type: ChannelType.GROUP,
          worldId,
        });

        // Create entity joined payload
        const entityJoinedPayload = {
          runtime: this.runtime,
          entityId: entityUuid,
          entity: {
            id: entityId,
            username: ctx.from.username || ctx.from.first_name || 'Unknown Entity',
            displayName: ctx.from.first_name || ctx.from.username || 'Unknown Entity',
          },
          worldId,
          source: 'telegram',
          metadata: {
            joinedAt: Date.now(),
          },
        };

        // Create Telegram-specific payload
        const telegramEntityJoinedPayload = {
          ...entityJoinedPayload,
          telegramUser: {
            id: ctx.from.id,
            username: ctx.from.username,
            first_name: ctx.from.first_name,
          },
        };

        // Emit generic ENTITY_JOINED event
        this.runtime.emitEvent(EventType.ENTITY_JOINED, entityJoinedPayload);

        // Emit platform-specific ENTITY_JOINED event
        this.runtime.emitEvent(TelegramEventTypes.ENTITY_JOINED, telegramEntityJoinedPayload);

        logger.info(
          `Tracked new Telegram entity: ${ctx.from.username || ctx.from.first_name || entityId}`
        );
      } catch (error) {
        logger.error(`Error syncing new Telegram entity ${entityId} from chat ${chatId}:`, error);
      }
    });

    // Track when entities leave chat (from service message)
    this.bot.on('left_chat_member', async (ctx) => {
      if (!ctx.message?.left_chat_member || ctx.chat?.id !== chatId) return;

      const leftUser = ctx.message.left_chat_member;
      const entityId = createUniqueUuid(this.runtime, leftUser.id.toString()) as UUID;
      const chatIdStr = chatId.toString();
      const worldId = createUniqueUuid(this.runtime, chatIdStr);

      try {
        // Get the entity
        const entity = await this.runtime.getEntityById(entityId);
        if (entity) {
          // Update entity metadata to show as inactive
          entity.metadata = {
            ...entity.metadata,
            status: 'INACTIVE',
            leftAt: Date.now(),
          };
          await this.runtime.updateEntity(entity);

          // Create entity left payload
          const entityLeftPayload = {
            runtime: this.runtime,
            entityId,
            entity: {
              id: leftUser.id.toString(),
              username: leftUser.username || leftUser.first_name || 'Unknown Entity',
              displayName: leftUser.first_name || leftUser.username || 'Unknown Entity',
            },
            worldId,
            source: 'telegram',
            metadata: {
              leftAt: Date.now(),
            },
          };

          // Create Telegram-specific payload
          const telegramEntityLeftPayload = {
            ...entityLeftPayload,
            telegramUser: {
              id: leftUser.id,
              username: leftUser.username,
              first_name: leftUser.first_name,
            },
          };

          // Emit generic ENTITY_LEFT event
          this.runtime.emitEvent(EventType.ENTITY_LEFT, entityLeftPayload);

          // Emit platform-specific ENTITY_LEFT event
          this.runtime.emitEvent(TelegramEventTypes.ENTITY_LEFT, telegramEntityLeftPayload);

          logger.info(
            `Entity ${leftUser.username || leftUser.first_name || leftUser.id} left chat ${chatId}`
          );
        }
      } catch (error) {
        logger.error(`Error handling Telegram entity leaving chat ${chatId}:`, error);
      }
    });
  }
}
