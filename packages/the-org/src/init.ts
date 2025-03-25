import {
  type Action,
  ChannelType,
  type Evaluator,
  type IAgentRuntime,
  type OnboardingConfig,
  type Provider,
  Role,
  type UUID,
  type World,
  createUniqueUuid,
  initializeOnboarding,
  logger,
} from '@elizaos/core';
import type { Guild } from 'discord.js';

/**
 * Initializes the character with the provided runtime, configuration, actions, providers, and evaluators.
 * Registers actions, providers, and evaluators to the runtime. Registers runtime events for "DISCORD_WORLD_JOINED" and "DISCORD_SERVER_CONNECTED".
 *
 * @param {Object} param - Object containing runtime, config, actions, providers, and evaluators.
 * @param {IAgentRuntime} param.runtime - The runtime instance to use.
 * @param {OnboardingConfig} param.config - The configuration for onboarding.
 * @param {Action[]} [param.actions] - Optional array of actions to register.
 * @param {Provider[]} [param.providers] - Optional array of providers to register.
 * @param {Evaluator[]} [param.evaluators] - Optional array of evaluators to register.
 */
export const initCharacter = async ({
  runtime,
  config,
  actions,
  providers,
  evaluators,
}: {
  runtime: IAgentRuntime;
  config: OnboardingConfig;
  actions?: Action[];
  providers?: Provider[];
  evaluators?: Evaluator[];
}): Promise<void> => {
  if (actions) {
    for (const action of actions) {
      runtime.registerAction(action);
    }
  }

  if (providers) {
    for (const provider of providers) {
      runtime.registerProvider(provider);
    }
  }

  if (evaluators) {
    for (const evaluator of evaluators) {
      runtime.registerEvaluator(evaluator);
    }
  }

  // Register runtime events
  runtime.registerEvent('DISCORD_WORLD_JOINED', async (params: { server: Guild }) => {
    // TODO: Save settings config to runtime
    await initializeAllSystems(runtime, [params.server], config);
  });

  // when booting up into a server we're in, fire a connected event
  runtime.registerEvent('DISCORD_SERVER_CONNECTED', async (params: { server: Guild }) => {
    await initializeAllSystems(runtime, [params.server], config);
  });

  // Handle Telegram forum worlds
  runtime.registerEvent(
    'TELEGRAM_WORLD_JOINED',
    async (params: { world: World; entityId: UUID }) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Only handle forum-centric worlds
      if (params.world?.metadata?.isForum) {
        console.log('TELEGRAM_WORLD_JOINED INITIALIZING ONBOARDING');
        await initializeOnboarding(runtime, params.world, config);

        // Start onboarding DM with the forum owner
        if (params.world?.metadata?.ownership?.ownerId) {
          console.log('TELEGRAM_WORLD_JOINED STARTING ONBOARDING DM');
          console.log('params.world', params.world);
          await startTelegramOnboardingDM(
            runtime,
            params.world,
            params.world.metadata.ownership.ownerId as UUID
          );
        }
      }
    }
  );
};

/**
 * Initializes all systems for the given servers with the provided runtime, servers, and onboarding configuration.
 *
 * @param {IAgentRuntime} runtime - The runtime object that provides functionalities for the agent.
 * @param {Guild[]} servers - The list of servers to initialize systems for.
 * @param {OnboardingConfig} config - The configuration settings for onboarding.
 * @returns {Promise<void>} - A Promise that resolves when all systems have been initialized.
 */
export async function initializeAllSystems(
  runtime: IAgentRuntime,
  servers: Guild[],
  config: OnboardingConfig
): Promise<void> {
  // TODO: Remove this
  // wait 2 seconds
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    for (const server of servers) {
      const worldId = createUniqueUuid(runtime, server.id);
      const ownerId = createUniqueUuid(runtime, server.ownerId);

      const existingWorld = await runtime.getWorld(worldId);
      if (!existingWorld) {
        logger.debug('Onboarding not initialized for server', server.id);
        continue;
      }
      if (existingWorld?.metadata?.settings) {
        logger.debug('Onboarding already initialized for server', server.id);
        continue;
      }

      // Initialize onboarding for this server
      const world: World = {
        id: worldId,
        name: server.name,
        serverId: server.id,
        agentId: runtime.agentId,
        metadata: {
          roles: {
            [ownerId]: Role.OWNER,
          },
          ownership: {
            ownerId: ownerId,
          },
        },
      };
      await runtime.ensureWorldExists(world);
      await initializeOnboarding(runtime, world, config);
      await startOnboardingDM(runtime, server, worldId);
      console.log('world', world);
    }
  } catch (error) {
    logger.error('Error initializing systems:', error);
    throw error;
  }
}

/**
 * Starts the settings DM with the server owner
 */
export async function startOnboardingDM(
  runtime: IAgentRuntime,
  guild: Guild,
  worldId: UUID
): Promise<void> {
  logger.info('startOnboardingDM - worldId', worldId);
  try {
    const owner = await guild.members.fetch(guild.ownerId);
    if (!owner) {
      logger.error(`Could not fetch owner with ID ${guild.ownerId} for server ${guild.id}`);
      throw new Error(`Could not fetch owner with ID ${guild.ownerId}`);
    }

    const onboardingMessages = [
      'Hi! I need to collect some information to get set up. Is now a good time?',
      'Hey there! I need to configure a few things. Do you have a moment?',
      'Hello! Could we take a few minutes to get everything set up?',
    ];

    const randomMessage = onboardingMessages[Math.floor(Math.random() * onboardingMessages.length)];
    const msg = await owner.send(randomMessage);
    const roomId = createUniqueUuid(runtime, msg.channel.id);

    await runtime.ensureRoomExists({
      id: roomId,
      name: `Chat with ${owner.user.username}`,
      source: 'discord',
      type: ChannelType.DM,
      channelId: msg.channelId,
      serverId: guild.id,
      worldId: worldId,
    });

    const entity = await runtime.getEntityById(runtime.agentId);

    if (!entity) {
      await runtime.createEntity({
        id: runtime.agentId,
        names: [runtime.character.name],
        agentId: runtime.agentId,
      });
    }
    // Create memory of the initial message
    await runtime.createMemory(
      {
        agentId: runtime.agentId,
        entityId: runtime.agentId,
        roomId: roomId,
        content: {
          text: randomMessage,
          actions: ['BEGIN_ONBOARDING'],
        },
        createdAt: Date.now(),
      },
      'messages'
    );

    logger.info(`Started settings DM with owner ${owner.id} for server ${guild.id}`);
  } catch (error) {
    logger.error(`Error starting DM with owner: ${error}`);
    throw error;
  }
}

/**
 * Starts the settings DM with the Telegram forum owner
 */
export async function startTelegramOnboardingDM(
  runtime: IAgentRuntime,
  world: World,
  ownerId: UUID
): Promise<void> {
  logger.info('startTelegramOnboardingDM - worldId', world.id);
  try {
    // Get the entity for the owner
    const ownerEntity = await runtime.getEntityById(ownerId);
    if (!ownerEntity) {
      logger.error(`Could not fetch owner entity with ID ${ownerId}`);
      throw new Error(`Could not fetch owner entity with ID ${ownerId}`);
    }

    // Need the Telegram user ID to send a DM
    if (!ownerEntity.metadata?.telegram?.userId) {
      logger.warn(`Owner entity ${ownerId} doesn't have a Telegram userId`);
      return;
    }

    const telegramUserId = ownerEntity.metadata.telegram.userId.toString();

    // Get a telegram service if available
    const telegramService = runtime.getService('telegram');
    if (!telegramService) {
      logger.error('Telegram service not available');
      return;
    }

    const onboardingMessages = [
      'Hi! I need to collect some information to get set up for your forum. Is now a good time?',
      'Hey there! I need to configure a few things for your forum. Do you have a moment?',
      'Hello! Could we take a few minutes to set up everything for your forum?',
    ];

    const randomMessage = onboardingMessages[Math.floor(Math.random() * onboardingMessages.length)];

    // Create a DM room
    const dmRoomId = createUniqueUuid(runtime, `private_${telegramUserId}`);

    await runtime.ensureRoomExists({
      id: dmRoomId,
      name: `Chat with ${ownerEntity.metadata.telegram.firstName || ownerEntity.names[0] || 'Owner'}`,
      source: 'telegram',
      type: ChannelType.DM,
      channelId: telegramUserId,
      serverId: world.serverId,
      worldId: world.id,
      metadata: {
        isOnboarding: true,
      },
    });

    // Send the initial message using the Telegram service
    // We need to cast to any since we don't have the specific type
    // This is safe because we're only using known properties
    const tgService = telegramService as any;
    if (tgService.messageManager && typeof tgService.messageManager.sendMessage === 'function') {
      await tgService.messageManager.sendMessage(telegramChatId, randomMessage);
    } else {
      logger.error('Telegram message manager not available or sendMessage not a function');
      return;
    }

    // Create memory of the initial message
    await runtime.createMemory(
      {
        agentId: runtime.agentId,
        entityId: runtime.agentId,
        roomId: dmRoomId,
        content: {
          text: randomMessage,
          actions: ['BEGIN_ONBOARDING'],
          source: 'telegram',
          channelType: ChannelType.DM,
        },
        createdAt: Date.now(),
      },
      'messages'
    );

    logger.info(
      `Started settings DM with Telegram owner ${telegramUserId} for forum ${world.serverId}`
    );
  } catch (error) {
    logger.error(`Error starting DM with Telegram owner: ${error}`);
    // Don't rethrow here since this is not a critical error
  }
}
