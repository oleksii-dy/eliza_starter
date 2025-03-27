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
import {
  determineWorldModel,
  extractTopicMetadata,
  generateForumWorldId,
  generateRoomId,
  generateTopicName,
  generateTopicRoomId,
  generateWorldId,
  isForum,
  transformTelegramId,
  isGeneralTopic,
} from './utils';
import { TelegramEventTypes, TopicMetadata, CachedChatData } from './types';

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
  private knownChats: Map<string, CachedChatData> = new Map();

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
   * Checks if a chat is authorized based on the TELEGRAM_ALLOWED_CHATS setting.
   * @param {Context} ctx - The context of the incoming update.
   * @returns {Promise<boolean>} A Promise that resolves with a boolean indicating if the chat is authorized.
   */
  private async isChatAuthorized(ctx: Context): Promise<boolean> {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return false;

    // Get topic ID if available for forum chats
    const topicId = ctx.message?.message_thread_id?.toString();

    // Use topic-specific cache key for forum messages
    const cacheKey =
      topicId && isForum(ctx.chat)
        ? `telegram:chat:${chatId}:topic:${topicId}`
        : `telegram:chat:${chatId}`;

    // Check if we already know this chat
    const cachedData = this.knownChats.get(cacheKey);
    if (cachedData) {
      // No longer updating lastInteraction
      return cachedData.isAuthorized;
    }

    // Try to get from persistent cache
    try {
      const persistedCache = (await this.runtime.getCache(cacheKey)) as CachedChatData | null;

      if (
        persistedCache &&
        typeof persistedCache === 'object' &&
        'isAuthorized' in persistedCache
      ) {
        this.knownChats.set(cacheKey, persistedCache);
        return persistedCache.isAuthorized;
      }
    } catch (error) {
      logger.warn(`Error getting cache for chat ${chatId}: ${error}`);
    }

    // Check against allowed chats setting
    const allowedChats = this.runtime.getSetting('TELEGRAM_ALLOWED_CHATS');
    let isAuthorized = true; // Default to true if no restriction is set

    if (allowedChats) {
      try {
        const allowedChatsList = JSON.parse(allowedChats as string);
        isAuthorized = allowedChatsList.includes(chatId);
      } catch (error) {
        logger.error('Error parsing TELEGRAM_ALLOWED_CHATS:', error);
        isAuthorized = false;
      }
    }

    // Initialize cache
    const newCachedData: CachedChatData = {
      isAuthorized,
    };

    this.knownChats.set(cacheKey, newCachedData);

    // Store in database cache for persistence across restarts
    await this.runtime.setCache(cacheKey, newCachedData);

    return isAuthorized;
  }

  /**
   * Gets or creates a world for a user
   * @param {Context} ctx - The context of the incoming update
   * @returns {Promise<World>} - The created or retrieved world
   */
  private async ensureUserWorld(ctx: Context): Promise<World> {
    const userId = ctx.from.id.toString();
    const worldIdStr = generateWorldId(userId);
    const worldId = createUniqueUuid(this.runtime, worldIdStr) as UUID;

    // Try to get existing world
    let world = await this.runtime.getWorld(worldId);

    // If world doesn't exist, create it
    if (!world) {
      const entityIdStr = transformTelegramId(userId, 'user');
      const entityId = createUniqueUuid(this.runtime, entityIdStr) as UUID;
      const worldName = `${ctx.from.first_name || ctx.from.username || 'Unknown User'}'s World`;

      world = {
        id: worldId,
        name: worldName,
        agentId: this.runtime.agentId,
        serverId: userId,
        metadata: {
          source: 'telegram',
          ownership: { ownerId: entityId },
          roles: {
            [entityId]: Role.OWNER,
          },
        },
      };

      logger.info(`Creating new world: ${worldName} (${worldId})`);
    }

    return world;
  }

  /**
   * Gets or creates a room within a world for a specific chat
   * @param {Context} ctx - The context of the incoming update
   * @param {UUID} worldId - The world ID the room belongs to
   * @returns {Promise<Room>} - The created or retrieved room
   */
  private async ensureUserRoom(ctx: Context, worldId: UUID): Promise<Room> {
    const chat = ctx.chat;
    const chatId = chat.id.toString();

    // Generate room ID from chat ID only to ensure all users see the same room
    const roomIdStr = generateRoomId(chatId);
    const roomId = createUniqueUuid(this.runtime, roomIdStr) as UUID;

    // Determine chat title and channel type
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

    // Try to get existing room
    let room = await this.runtime.getRoom(roomId);

    // If room doesn't exist, create it
    if (!room) {
      room = {
        id: roomId,
        name: chatTitle,
        source: 'telegram',
        type: channelType,
        channelId: chatId,
        // Set serverId for all chat types to ensure role provider can find the world
        serverId: chatId,
        // Associate with the world for this user
        worldId: worldId,
      };

      // For groups, add member count if available
      if (chat.type === 'group' || chat.type === 'supergroup') {
        try {
          const chatInfo = await this.bot.telegram.getChat(chat.id);
          if (chatInfo && 'member_count' in chatInfo) {
            room.metadata = {
              ...room.metadata,
              memberCount: chatInfo.member_count,
            };
          }
        } catch (countError) {
          logger.warn(`Could not get member count for chat ${chatId}: ${countError}`);
        }
      }

      logger.info(`Creating new room: ${chatTitle} (${roomId})`);
    }

    return room;
  }

  /**
   * Gets or creates an entity for a user
   * @param {Context} ctx - The context of the incoming update
   * @returns {Promise<Entity>} - The created or retrieved entity
   */
  private async ensureUserEntity(ctx: Context): Promise<Entity> {
    if (!ctx.from) {
      throw new Error('Cannot create entity: no user information available');
    }

    const userId = ctx.from.id.toString();
    const entityIdStr = transformTelegramId(userId, 'user');
    const entityId = createUniqueUuid(this.runtime, entityIdStr) as UUID;

    // Try to get existing entity
    let entity = await this.runtime.getEntityById(entityId);

    // If entity doesn't exist, create it
    if (!entity) {
      entity = {
        id: entityId,
        names: [ctx.from.first_name || ctx.from.username || 'Unknown User'],
        agentId: this.runtime.agentId,
        metadata: {
          telegram: {
            id: userId,
            username: ctx.from.username || 'unknown',
            name: ctx.from.first_name || 'Unknown User',
          },
          source: 'telegram',
          roles: [Role.OWNER],
        },
      };

      // Create the entity in the database
      // await this.runtime.createEntity(entity);
      logger.debug(`Creating new entity: ${entity.names[0]} (${entityId})`);
    }

    return entity;
  }

  /**
   * Gets other entities in a group chat (for groups and supergroups)
   * @param {Context} ctx - The context of the incoming update
   * @returns {Promise<Entity[]>} - Array of other entities in the chat
   */
  private async getGroupEntities(ctx: Context): Promise<Entity[]> {
    const chat = ctx.chat;
    if (!chat || (chat.type !== 'group' && chat.type !== 'supergroup')) {
      return [];
    }

    const entities: Entity[] = [];

    try {
      // Get chat administrators
      const admins = await this.bot.telegram.getChatAdministrators(chat.id);
      const currentUserId = ctx.from?.id.toString();

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          // Skip if it's the same user who triggered this event
          if (admin.user.id.toString() === currentUserId) continue;

          const adminIdStr = transformTelegramId(admin.user.id.toString(), 'user');
          const adminId = createUniqueUuid(this.runtime, adminIdStr) as UUID;

          entities.push({
            id: adminId,
            names: [admin.user.first_name || admin.user.username || 'Unknown Admin'],
            agentId: this.runtime.agentId,
            metadata: {
              telegram: {
                id: admin.user.id.toString(),
                username: admin.user.username || 'unknown',
                name: admin.user.first_name || 'Unknown Admin',
                isAdmin: true,
                adminTitle: admin.custom_title || (admin.status === 'creator' ? 'Owner' : 'Admin'),
              },
              source: 'telegram',
              roles: [admin.status === 'creator' ? Role.ADMIN : Role.NONE],
            },
          });
        }
      }
    } catch (error) {
      logger.warn(`Could not fetch administrators for chat ${chat.id}: ${error}`);
    }

    return entities;
  }

  /**
   * Function to safely get chat title
   * @param {any} chat - The chat object
   * @returns {string} - The safe chat title
   */
  private getChatTitle(chat: any): string {
    if (chat.type === 'private') {
      return `Chat with ${chat.first_name || 'Unknown User'}`;
    }
    return chat.title || 'Unknown Chat';
  }

  /**
   * Handle setup for a new interaction
   * @param {Context} ctx - The context of the incoming update
   * @returns {Promise<{ success: boolean, roomId?: UUID, entityId?: UUID }>} - Result with roomId and entityId if successful
   */
  private async setupInteraction(
    ctx: Context
  ): Promise<{ success: boolean; roomId?: UUID; entityId?: UUID }> {
    try {
      if (!this.validateContext(ctx)) {
        return { success: false };
      }

      const chatId = ctx.chat.id.toString();
      const topicId = ctx.message?.message_thread_id?.toString();

      // Generate a cache key that includes the topic ID for forum messages
      const cacheKey = this.generateCacheKey(chatId, ctx.chat, topicId);

      // Check chat authorization
      if (!(await this.isChatAuthorized(ctx))) {
        logger.warn(`Unauthorized chat: ${chatId}`);
        return { success: false };
      }

      // Get cached chat data or create empty object
      const cachedData = this.knownChats.get(cacheKey) || { isAuthorized: true };

      // Create entity for the current user
      const entity = await this.ensureUserEntity(ctx);
      const entityId = entity.id;

      // Check if we can use cached data
      const cachedResult = await this.tryUseCachedData(cachedData, chatId, topicId);
      if (cachedResult.success) {
        return cachedResult;
      }

      // Prepare world and room based on chat type
      const result = await this.prepareWorldAndRoom(ctx, entity);
      if (!result.success) {
        return { success: false };
      }

      // Store updated cache data
      await this.updateCache(cacheKey, result.worldId, result.roomId, entityId);

      return { success: true, roomId: result.roomId, entityId };
    } catch (error) {
      logger.error(
        `Error in setupInteraction: ${error instanceof Error ? error.message : String(error)}`
      );
      return { success: false };
    }
  }

  /**
   * Validates that the context has all required data
   * @param {Context} ctx - The context to validate
   * @returns {boolean} - Whether the context is valid
   */
  private validateContext(ctx: Context): boolean {
    if (!ctx.chat || !ctx.from) {
      logger.error('Missing chat or user information');
      return false;
    }
    return true;
  }

  /**
   * Generates a cache key for the chat
   * @param {string} chatId - The chat ID
   * @param {any} chat - The chat object
   * @param {string | undefined} topicId - The topic ID if available
   * @returns {string} - The cache key
   */
  private generateCacheKey(chatId: string, chat: any, topicId?: string): string {
    return topicId && isForum(chat)
      ? `telegram:chat:${chatId}:topic:${topicId}`
      : `telegram:chat:${chatId}`;
  }

  /**
   * Attempts to use cached data if available and valid
   * @param {CachedChatData} cachedData - The cached data
   * @param {string} chatId - The chat ID
   * @param {string | undefined} topicId - The topic ID if available
   * @returns {Promise<{ success: boolean, roomId?: UUID, entityId?: UUID }>} - Result with cached data if successful
   */
  private async tryUseCachedData(
    cachedData: CachedChatData,
    chatId: string,
    topicId?: string
  ): Promise<{ success: boolean; roomId?: UUID; entityId?: UUID }> {
    if (cachedData.worldId && cachedData.roomId && cachedData.entityId) {
      logger.debug(`Using cached IDs for chat ${chatId}${topicId ? ` topic ${topicId}` : ''}`);

      // Verify these IDs still exist in the database
      const [world, room, entity] = await Promise.all([
        this.runtime.getWorld(cachedData.worldId),
        this.runtime.getRoom(cachedData.roomId),
        this.runtime.getEntityById(cachedData.entityId),
      ]);

      // If all entities exist, we can return immediately
      if (world && room && entity) {
        return {
          success: true,
          roomId: cachedData.roomId,
          entityId: cachedData.entityId,
        };
      }

      logger.debug(`Some cached entities missing for chat ${chatId}, recreating...`);
    }

    return { success: false };
  }

  /**
   * Updates the cache with new data
   * @param {string} cacheKey - The cache key
   * @param {UUID} worldId - The world ID
   * @param {UUID} roomId - The room ID
   * @param {UUID} entityId - The entity ID
   * @returns {Promise<void>}
   */
  private async updateCache(
    cacheKey: string,
    worldId: UUID,
    roomId: UUID,
    entityId: UUID
  ): Promise<void> {
    const cachedData: CachedChatData = {
      isAuthorized: true,
      worldId,
      roomId,
      entityId,
    };

    this.knownChats.set(cacheKey, cachedData);
    await this.runtime.setCache(cacheKey, cachedData);
  }

  /**
   * Prepare world and room based on chat type
   * @param {Context} ctx - The context of the incoming update
   * @param {Entity} entity - The user entity
   * @returns {Promise<{ success: boolean, worldId?: UUID, roomId?: UUID }>} - Result with world and room IDs
   */
  private async prepareWorldAndRoom(
    ctx: Context,
    entity: Entity
  ): Promise<{ success: boolean; worldId?: UUID; roomId?: UUID }> {
    try {
      const worldModel = determineWorldModel(ctx.chat);

      // Branch based on world model
      if (worldModel === 'forum-centric' && isForum(ctx.chat)) {
        return this.prepareForumCentricWorld(ctx, entity);
      } else {
        return this.prepareUserCentricWorld(ctx, entity);
      }
    } catch (error) {
      logger.error(
        `Error in prepareWorldAndRoom: ${error instanceof Error ? error.message : String(error)}`
      );
      return { success: false };
    }
  }

  /**
   * Build standardized entities for a Telegram chat
   * @param {Context} ctx - The context of the incoming update
   * @param {Entity} currentEntity - The current user entity who triggered this event
   * @returns {Promise<{entities: Entity[], ownerEntityId: UUID}>} - List of entities and the owner entity ID
   */
  private async buildStandardizedEntities(
    ctx: Context,
    currentEntity: Entity
  ): Promise<{ entities: Entity[]; ownerEntityId: UUID }> {
    const chat = ctx.chat;
    const currentUserId = ctx.from?.id.toString();
    const currentEntityId = currentEntity.id;

    // Start with the current user entity
    const entities: Entity[] = [currentEntity];
    let ownerEntityId = currentEntityId; // Default to current user

    try {
      if (chat.type === 'group' || chat.type === 'supergroup') {
        // Get chat administrators
        const admins = await this.bot.telegram.getChatAdministrators(chat.id);

        if (admins && admins.length > 0) {
          // First pass: find the owner
          for (const admin of admins) {
            if (admin.status === 'creator') {
              const adminIdStr = transformTelegramId(admin.user.id.toString(), 'user');
              const adminId = createUniqueUuid(this.runtime, adminIdStr) as UUID;

              // If this is the current user, update their role instead of creating duplicate
              if (admin.user.id.toString() === currentUserId) {
                ownerEntityId = currentEntityId;
                // Update current entity metadata to reflect ownership
                currentEntity.metadata = {
                  ...currentEntity.metadata,
                  telegram: {
                    ...currentEntity.metadata?.telegram,
                    isAdmin: true,
                    adminTitle: 'Owner',
                  },
                  roles: [Role.OWNER],
                };
              } else {
                ownerEntityId = adminId;

                // Create entity for the owner
                entities.push({
                  id: adminId,
                  names: [admin.user.first_name || admin.user.username || 'Unknown Owner'],
                  agentId: this.runtime.agentId,
                  metadata: {
                    telegram: {
                      id: admin.user.id.toString(),
                      username: admin.user.username || 'unknown',
                      name: admin.user.first_name || 'Unknown Owner',
                      isAdmin: true,
                      adminTitle: 'Owner',
                    },
                    source: 'telegram',
                    roles: [Role.OWNER],
                  },
                });
              }
              break; // Found the owner, exit the loop
            }
          }

          // Second pass: add other admins
          for (const admin of admins) {
            // Skip the owner (already added) and current user (already in entities list)
            if (admin.status === 'creator' || admin.user.id.toString() === currentUserId) continue;

            const adminIdStr = transformTelegramId(admin.user.id.toString(), 'user');
            const adminId = createUniqueUuid(this.runtime, adminIdStr) as UUID;

            entities.push({
              id: adminId,
              names: [admin.user.first_name || admin.user.username || 'Unknown Admin'],
              agentId: this.runtime.agentId,
              metadata: {
                telegram: {
                  id: admin.user.id.toString(),
                  username: admin.user.username || 'unknown',
                  name: admin.user.first_name || 'Unknown Admin',
                  isAdmin: true,
                  adminTitle: admin.custom_title || 'Admin',
                },
                source: 'telegram',
                roles: [Role.ADMIN],
              },
            });
          }

          // If current user isn't an admin, make sure they have the right role
          if (!admins.some((admin) => admin.user.id.toString() === currentUserId)) {
            currentEntity.metadata = {
              ...currentEntity.metadata,
              roles: [Role.NONE],
            };
          }
        }
      } else if (chat.type === 'private') {
        // In private chats, the user is always the owner
        ownerEntityId = currentEntityId;
        currentEntity.metadata = {
          ...currentEntity.metadata,
          roles: [Role.OWNER],
        };
      }
    } catch (error) {
      logger.warn(`Could not build standardized entities for chat ${chat.id}: ${error}`);
    }

    return { entities, ownerEntityId };
  }

  /**
   * Prepare a forum-centric world and room
   * @param {Context} ctx - The context of the incoming update
   * @param {Entity} entity - The user entity
   * @returns {Promise<{ success: boolean, worldId?: UUID, roomId?: UUID }>} - Result with world and room IDs
   */
  private async prepareForumCentricWorld(
    ctx: Context,
    entity: Entity
  ): Promise<{ success: boolean; worldId?: UUID; roomId?: UUID }> {
    try {
      const chatId = ctx.chat.id.toString();
      const entityId = entity.id;

      // Create forum world
      const forumWorldIdStr = generateForumWorldId(chatId);
      const worldId = createUniqueUuid(this.runtime, forumWorldIdStr) as UUID;

      // Get standardized entities and find owner
      const { entities: standardizedEntities, ownerEntityId } =
        await this.buildStandardizedEntities(ctx, entity);

      // Create roles map with correct owner
      const worldRoles = {};

      // Set the found owner
      worldRoles[ownerEntityId] = Role.OWNER;

      // Add roles for all other entities
      for (const e of standardizedEntities) {
        if (e.id !== ownerEntityId) {
          if (e.metadata?.telegram?.isAdmin) {
            worldRoles[e.id] = Role.ADMIN;
          } else {
            worldRoles[e.id] = Role.NONE;
          }
        }
      }

      // Prepare forum world
      const world = {
        id: worldId,
        name: `${this.getChatTitle(ctx.chat)} World`,
        agentId: this.runtime.agentId,
        serverId: chatId,
        metadata: {
          source: 'telegram',
          isForum: true,
          ownership: { ownerId: ownerEntityId },
          roles: worldRoles,
        },
      };

      // Create appropriate room based on whether it's a topic
      const { roomId, room } = await this.createForumRoom(ctx, worldId);

      // Build standardized data structure similar to Discord
      const standardizedRooms = await this.buildStandardizedForumRooms(ctx.chat, worldId);

      // Prepare the complete standardized data structure
      const standardizedData = {
        runtime: this.runtime,
        world: world,
        rooms: standardizedRooms,
        entities: standardizedEntities,
        source: 'telegram',
        entityId: ownerEntityId, // Set the actual owner entity ID here
      };

      // Emit world joined event with complete structure
      await this.runtime.emitEvent(EventType.WORLD_JOINED, standardizedData);

      const ownerEntity = standardizedEntities.find((e) => e.metadata?.roles?.includes(Role.OWNER));

      await this.runtime.emitEvent('TELEGRAM_SERVER_CONNECTED', {
        serverId: chatId,
        serverName: `${this.getChatTitle(ctx.chat)} World`,
        chatType: 'supergroup',
        worldId: worldId,
        ownerId: ownerEntity?.metadata?.telegram?.id || '',
        ownerUsername: ownerEntity?.metadata?.telegram?.username || '',
      });

      return { success: true, worldId, roomId };
    } catch (error) {
      logger.error(
        `Error in prepareForumCentricWorld: ${error instanceof Error ? error.message : String(error)}`
      );
      return { success: false };
    }
  }

  /**
   * Build standardized rooms for a forum chat
   * @param {any} chat - The forum chat object
   * @param {UUID} worldId - The world ID
   * @returns {Promise<any[]>} - An array of standardized room objects
   */
  private async buildStandardizedForumRooms(chat: any, worldId: UUID): Promise<any[]> {
    const rooms = [];
    const chatId = chat.id.toString();

    try {
      // Add general room for the forum
      const generalRoomIdStr = generateRoomId(chatId);
      const generalRoomId = createUniqueUuid(this.runtime, generalRoomIdStr) as UUID;
      rooms.push({
        id: generalRoomId,
        name: `${this.getChatTitle(chat)} (General)`,
        source: 'telegram',
        type: ChannelType.GROUP,
        channelId: chatId,
        serverId: chatId,
        worldId: worldId,
        metadata: {
          isGeneral: true,
        },
      });

      // Try to get forum topics if available
      if (isForum(chat)) {
        try {
          // Safely try to get forum topics with type assertion
          const telegramApi = this.bot.telegram as any;
          if (
            typeof telegramApi.getForumTopicInfo === 'function' &&
            typeof telegramApi.getForumTopics === 'function'
          ) {
            const forumTopics = await telegramApi.getForumTopics(parseInt(chatId));

            if (forumTopics && forumTopics.topics && Array.isArray(forumTopics.topics)) {
              for (const topic of forumTopics.topics) {
                if (!topic.message_thread_id) continue;

                const topicId = topic.message_thread_id.toString();
                const topicRoomIdStr = generateTopicRoomId(chatId, topicId);
                const topicRoomId = createUniqueUuid(this.runtime, topicRoomIdStr) as UUID;

                const topicName = generateTopicName(topic);
                const topicMetadata = extractTopicMetadata(topic);

                rooms.push({
                  id: topicRoomId,
                  name: topicName,
                  source: 'telegram',
                  type: ChannelType.FORUM,
                  channelId: topicId,
                  serverId: chatId,
                  worldId: worldId,
                  metadata: {
                    ...topicMetadata,
                    topicId,
                    parentChatId: chatId,
                    isTopic: true,
                  },
                });
              }
            }
          }
        } catch (error) {
          logger.warn(`Could not get forum topics: ${error}`);
          // Continue with just the general room if we can't get topics
        }
      }
    } catch (error) {
      logger.error(`Error building standardized forum rooms: ${error}`);
    }

    return rooms;
  }

  /**
   * Create a room for a forum
   * @param {Context} ctx - The context of the incoming update
   * @param {UUID} worldId - The world ID
   * @returns {Promise<{ roomId: UUID, room: Room }>} - The room ID and room object
   */
  private async createForumRoom(
    ctx: Context,
    worldId: UUID
  ): Promise<{ roomId: UUID; room: Room }> {
    // Get the chatId and topicId
    const chatId = ctx.chat.id.toString();
    const topicId = ctx.message?.message_thread_id?.toString();

    logger.debug(
      `Creating forum room for chat ${chatId}${topicId ? ` with topic ${topicId}` : ''}`
    );

    let roomId: UUID;
    let room: Room;

    if (topicId) {
      // Create room for this specific topic
      const topicRoomIdStr = generateTopicRoomId(chatId, topicId);
      roomId = createUniqueUuid(this.runtime, topicRoomIdStr) as UUID;

      // Try to get topic information if available
      const { topicName, topicMetadata } = await this.getTopicInfo(chatId, topicId);

      // Prepare topic room
      room = {
        id: roomId,
        name: topicName,
        source: 'telegram',
        type: ChannelType.FORUM,
        channelId: topicId, // Use just the topic ID as it's unique within a forum
        serverId: chatId,
        worldId: worldId,
        metadata: {
          ...topicMetadata,
          topicId,
          parentChatId: chatId,
          isTopic: true, // Add explicit flag for topic rooms
        },
      };

      logger.debug(`Created forum topic room: ${topicName} (${roomId}) for topic ${topicId}`);
    } else {
      // Default to general room for the forum
      const generalRoomIdStr = generateRoomId(chatId);
      roomId = createUniqueUuid(this.runtime, generalRoomIdStr) as UUID;

      // Prepare general room
      room = {
        id: roomId,
        name: `${this.getChatTitle(ctx.chat)} (General)`,
        source: 'telegram',
        type: ChannelType.GROUP,
        channelId: chatId,
        serverId: chatId,
        worldId: worldId,
        metadata: {
          isGeneral: true, // Add flag for general forum room
        },
      };

      logger.debug(`Created general forum room: ${room.name} (${roomId})`);
    }

    return { roomId, room };
  }

  /**
   * Get topic information
   * @param {string} chatId - The chat ID
   * @param {string} topicId - The topic ID
   * @returns {Promise<{ topicName: string; topicMetadata: TopicMetadata }>} - Topic name and metadata
   */
  private async getTopicInfo(
    chatId: string,
    topicId: string
  ): Promise<{ topicName: string; topicMetadata: TopicMetadata }> {
    let topicName = `Topic ${topicId}`;
    let topicMetadata: TopicMetadata = {
      topicId,
      isGeneral: isGeneralTopic(topicId),
      isTopic: true,
      isForumTopic: true,
      createdAt: Date.now(),
    };

    try {
      // Safely try to get forum topic info with type assertion
      const telegramApi = this.bot.telegram as any;
      if (typeof telegramApi.getForumTopicInfo === 'function') {
        const forumTopicInfo = await telegramApi.getForumTopicInfo(
          parseInt(chatId),
          parseInt(topicId)
        );

        if (forumTopicInfo) {
          // If it's the general topic (ID 1), use a special name
          if (isGeneralTopic(topicId)) {
            topicName = 'General';
            topicMetadata = {
              ...topicMetadata,
              iconColor: forumTopicInfo.icon_color,
              iconCustomEmojiId: forumTopicInfo.icon_custom_emoji_id,
            };
          } else {
            topicName = generateTopicName(forumTopicInfo);
            topicMetadata = {
              ...topicMetadata,
              ...extractTopicMetadata(forumTopicInfo),
            };
          }
        }
      }
    } catch (error) {
      logger.warn(`Could not get forum topic info: ${error}`);
      // Even if we fail to get topic info, we still return basic metadata
    }

    return { topicName, topicMetadata };
  }

  /**
   * Prepare a user-centric world and room
   * @param {Context} ctx - The context of the incoming update
   * @param {Entity} entity - The user entity
   * @returns {Promise<{ success: boolean, worldId?: UUID, roomId?: UUID }>} - Result with world and room IDs
   */
  private async prepareUserCentricWorld(
    ctx: Context,
    entity: Entity
  ): Promise<{ success: boolean; worldId?: UUID; roomId?: UUID }> {
    try {
      const chatId = ctx.chat.id.toString();
      const entityId = entity.id;

      // Get or create world for the current user
      const world = await this.ensureUserWorld(ctx);
      const worldId = world.id;

      // Generate room ID consistently for this chat
      const roomIdStr = generateRoomId(chatId);
      const roomId = createUniqueUuid(this.runtime, roomIdStr) as UUID;

      // Get or create the room
      const room = await this.ensureUserRoom(ctx, world.id);

      // For group chats, also create a group chat world
      if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        await this.createGroupChatWorld(ctx, entity);
      }

      // Get standardized entities
      const { entities: standardizedEntities, ownerEntityId } =
        await this.buildStandardizedEntities(ctx, entity);

      // Emit world joined event
      await this.emitWorldJoinedEvent(world, room, entity, standardizedEntities);

      return { success: true, worldId, roomId };
    } catch (error) {
      logger.error(
        `Error in prepareUserCentricWorld: ${error instanceof Error ? error.message : String(error)}`
      );
      return { success: false };
    }
  }

  /**
   * Create a group chat world
   * @param {Context} ctx - The context of the incoming update
   * @param {Entity} entity - The user entity
   * @returns {Promise<void>}
   */
  private async createGroupChatWorld(ctx: Context, entity: Entity): Promise<void> {
    const chatId = ctx.chat.id.toString();
    const entityId = entity.id;

    // Generate world ID from chat ID for the group chat world
    const groupWorldIdStr = generateWorldId(chatId);
    const groupWorldId = createUniqueUuid(this.runtime, groupWorldIdStr) as UUID;

    // Get standardized entities and find owner
    const { entities: standardizedEntities, ownerEntityId } = await this.buildStandardizedEntities(
      ctx,
      entity
    );

    // Create roles map with correct owner
    const worldRoles = {};

    // Set the found owner
    worldRoles[ownerEntityId] = Role.OWNER;

    // Add roles for all other entities
    for (const e of standardizedEntities) {
      if (e.id !== ownerEntityId) {
        if (e.metadata?.telegram?.isAdmin) {
          worldRoles[e.id] = Role.ADMIN;
        } else {
          worldRoles[e.id] = Role.NONE;
        }
      }
    }

    // Prepare group world
    const groupWorld = {
      id: groupWorldId,
      name: `${this.getChatTitle(ctx.chat)} World`,
      agentId: this.runtime.agentId,
      serverId: chatId,
      metadata: {
        source: 'telegram',
        ownership: { ownerId: ownerEntityId },
        roles: worldRoles,
      },
    };

    // Generate room ID consistently for this chat
    const roomIdStr = generateRoomId(chatId);
    const roomId = createUniqueUuid(this.runtime, roomIdStr) as UUID;
    const room = await this.ensureUserRoom(ctx, groupWorldId);

    // Emit a separate WORLD_JOINED event for the group world
    const groupWorldPayload = {
      runtime: this.runtime,
      world: groupWorld,
      rooms: [room], // Use the same room for now
      entities: standardizedEntities,
      source: 'telegram',
    };

    // Emit group world joined event
    await this.runtime.emitEvent(EventType.WORLD_JOINED, groupWorldPayload);
  }

  /**
   * Emit the WORLD_JOINED event
   * This function is no longer used by prepareForumCentricWorld as it now builds and emits a complete standardized structure
   * @param {World} world - The world object
   * @param {Room} room - The room object
   * @param {Entity} entity - The entity object
   * @param {Entity[]} otherEntities - Other entities in the chat
   * @returns {Promise<void>}
   */
  private async emitWorldJoinedEvent(
    world: World,
    room: Room,
    entity: Entity,
    otherEntities: Entity[]
  ): Promise<void> {
    // Prepare payload for WORLD_JOINED event
    const worldPayload = {
      runtime: this.runtime,
      world: world,
      rooms: [room],
      entities: otherEntities,
      source: 'telegram',
    };

    // Emit WORLD_JOINED event to ensure everything is set up in the database
    await this.runtime.emitEvent(EventType.WORLD_JOINED, worldPayload);
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
        // Handle the interaction setup
        const setupResult = await this.setupInteraction(ctx);
        if (!setupResult.success) {
          return;
        }

        // Pass the established room and entity IDs directly
        if (setupResult.roomId && setupResult.entityId) {
          await this.messageManager.handleMessage(ctx, setupResult.roomId, setupResult.entityId);
        }
      } catch (error) {
        logger.error(
          `Error handling message: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    // Reaction handler
    this.bot.on('message_reaction', async (ctx) => {
      try {
        // Handle the interaction setup
        const setupResult = await this.setupInteraction(ctx);
        if (!setupResult.success) {
          return;
        }

        // Pass the established room and entity IDs directly
        if (setupResult.roomId && setupResult.entityId) {
          await this.messageManager.handleReaction(ctx, setupResult.roomId, setupResult.entityId);
        }
      } catch (error) {
        logger.error(
          `Error handling reaction: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    // Channel post handler
    this.bot.on('channel_post', async (ctx) => {
      try {
        // Handle the interaction setup to register the channel
        const setupResult = await this.setupInteraction(ctx);
        if (!setupResult.success) {
          return;
        }

        logger.info(`Registered channel ${ctx.chat.id}`);
      } catch (error) {
        logger.error(
          `Error handling channel post: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }
}
