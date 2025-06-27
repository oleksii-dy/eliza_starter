import { getElizaCharacter } from '@/src/characters/eliza';
// Dynamic imports for utilities that may not be properly exported
let jsonToCharacter: any;
let loadCharacterTryPath: any;
import { configureDatabaseSettings, findNextAvailablePort, resolvePgliteDir } from '@/src/utils';
import { logger, type Character, type ProjectAgent } from '@elizaos/core';
import { startAgent, stopAgent } from './agent-start';
import { gracefulShutdownHandler } from '@/src/utils/graceful-shutdown';
import { LogArchiver } from '@/src/utils/log-archiver';
import { getTempLogPath } from '../../../utils/log-archiver';

// Dynamic loader for server utilities
async function loadServerUtilities() {
  if (!jsonToCharacter || !loadCharacterTryPath) {
    try {
      const serverModule = (await import('@elizaos/server')) as any;
      jsonToCharacter = (serverModule as any).jsonToCharacter;
      loadCharacterTryPath = (serverModule as any).loadCharacterTryPath;
    } catch (error) {
      logger.warn('Could not load server utilities:', error);
    }
  }
}

/**
 * Server start options
 */
export interface ServerStartOptions {
  configure?: boolean;
  port?: number;
  characters?: Character[];
  projectAgents?: ProjectAgent[];
  timeout?: number; // Duration in seconds to run before shutdown
  testMode?: boolean; // Run in test mode (exits after initialization)
  autonomous?: boolean; // Enable autonomous mode
  adminPort?: number; // Admin interface port
  saveLogsTo?: string; // Directory to save logs
}

/**
 * Start the agents and server
 *
 * Initializes the database, creates the server instance, configures port settings, and starts the specified agents or default Eliza character.
 */
export async function startAgents(options: ServerStartOptions): Promise<void> {
  const startTime = new Date();
  logger.info(`🚀 Starting ElizaOS at ${startTime.toISOString()}`);

  // Setup log archiver with start time
  const logArchiver = new LogArchiver();
  logArchiver.setStartTime(startTime);

  // Setup autonomous mode environment variables if enabled
  if (options.autonomous) {
    logger.info('🤖 Autonomous mode enabled');
    if (!process.env.AUTONOMOUS_FILE_LOGGING) {
      process.env.AUTONOMOUS_FILE_LOGGING = 'true';
    }
    if (!process.env.AUTONOMOUS_LOG_DIR) {
      process.env.AUTONOMOUS_LOG_DIR = getTempLogPath('autonomy');
    }
    if (!process.env.AUTONOMOUS_LOOP_INTERVAL) {
      process.env.AUTONOMOUS_LOOP_INTERVAL = '5000'; // 5 seconds default
    }
  }

  const postgresUrl = await configureDatabaseSettings(options.configure);
  if (postgresUrl) {
    process.env.POSTGRES_URL = postgresUrl;
  }

  const pgliteDataDir = postgresUrl ? undefined : await resolvePgliteDir();

  const { default: AgentServer } = (await import('@elizaos/server')) as any;
  const server = new AgentServer() as any;
  await server.initialize({ dataDir: pgliteDataDir, postgresUrl: postgresUrl || undefined });

  // Load server utilities dynamically
  await loadServerUtilities();

  server.startAgent = (character: any) => startAgent(character, server);
  server.stopAgent = (runtime: any) => stopAgent(runtime, server);
  server.loadCharacterTryPath = loadCharacterTryPath;
  server.jsonToCharacter = jsonToCharacter;

  // Setup graceful shutdown handler
  gracefulShutdownHandler.setServer(server);

  const desiredPort = options.port || Number.parseInt(process.env.SERVER_PORT || '3000', 10);
  const serverPort = await findNextAvailablePort(desiredPort);
  if (serverPort !== desiredPort) {
    logger.warn(`Port ${desiredPort} is in use, using port ${serverPort} instead`);
  }
  process.env.SERVER_PORT = serverPort.toString();
  server.start(serverPort);

  // Setup admin interface if enabled
  if (options.adminPort) {
    logger.info(`🔧 Admin interface will be available on port ${options.adminPort}`);
    // Store admin port for autonomous plugin to use
    process.env.AUTONOMOUS_API_PORT = options.adminPort.toString();
  }

  // Setup timeout if specified
  if (options.timeout) {
    logger.info(`⏰ Server will shutdown after ${options.timeout} seconds`);
    gracefulShutdownHandler.setupTimeout(options.timeout, options);
  }

  // If we have project agents, start them with their init functions
  if (options.projectAgents && options.projectAgents.length > 0) {
    for (const projectAgent of options.projectAgents) {
      await startAgent(
        projectAgent.character,
        server,
        projectAgent.init,
        projectAgent.plugins || []
      );
    }
  }
  // If we have standalone characters, start them
  else if (options.characters && options.characters.length > 0) {
    for (const character of options.characters) {
      await startAgent(character, server);
    }
  }
  // Default fallback to Eliza character with autonomy plugin if autonomous mode
  else {
    const elizaCharacter = getElizaCharacter();

    // Add autonomy plugin if autonomous mode is enabled
    if (options.autonomous) {
      if (!elizaCharacter.plugins) {
        elizaCharacter.plugins = [];
      }
      if (!elizaCharacter.plugins.includes('@elizaos/plugin-autonomy')) {
        elizaCharacter.plugins.push('@elizaos/plugin-autonomy');
      }
      logger.info('🤖 Added autonomy plugin to character');
    }

    await startAgent(elizaCharacter, server);
  }

  logger.info(`✅ ElizaOS started successfully on port ${serverPort}`);
  if (options.timeout) {
    logger.info(`⏰ Will shutdown automatically in ${options.timeout} seconds`);
  }
  if (options.saveLogsTo) {
    logger.info(`📁 Logs will be saved to: ${options.saveLogsTo}`);
  }

  // If in test mode, exit after successful initialization
  if (options.testMode) {
    logger.info('🧪 Test mode: Server initialized successfully, shutting down...');
    await server.stop();
    logger.info('✅ Test mode completed successfully');
    process.exit(0);
  }
}
