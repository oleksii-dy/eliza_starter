import { getElizaCharacter } from '@/src/characters/eliza';
import { 
  createElizaServer, 
  jsonToCharacter, 
  loadCharacterTryPath,
  findNextAvailablePort,
  type ServerFactoryOptions 
} from '@elizaos/server';
import { configureDatabaseSettings, resolvePgliteDir } from '@/src/utils';
import { type Character, type ProjectAgent, logger } from '@elizaos/core';
import { startAgent, stopAgent } from './agent-start';

/**
 * Server start options
 */
export interface ServerStartOptions {
  configure?: boolean;
  port?: number;
  characters?: Character[];
  projectAgents?: ProjectAgent[];
}

/**
 * Start the agents and server
 *
 * Uses the new factory pattern to create a configured server instance and starts the specified agents or default Eliza character.
 */
export async function startAgents(options: ServerStartOptions): Promise<void> {
  // Create server using the factory pattern with CLI-specific configuration
  const serverInstance = await createElizaServer({
    port: options.port,
    configure: options.configure,
    configureDatabaseFn: configureDatabaseSettings,
    resolveDataDirFn: resolvePgliteDir,
  });

  // Get the underlying server for compatibility with agent-start functions
  const server = serverInstance.server;

  // Add character loading functions to server for compatibility
  server.startAgent = (character: Character) => startAgent(character, server);
  server.stopAgent = (runtime: any) => stopAgent(runtime, server);
  server.loadCharacterTryPath = loadCharacterTryPath;
  server.jsonToCharacter = jsonToCharacter;

  // Start the server (port already resolved by factory)
  const serverOptions = serverInstance.getServerOptions();
  logger.info(`Starting server on ${serverOptions.host}:${serverOptions.port}`);
  serverInstance.start();

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
  // Default fallback to Eliza character
  else {
    const elizaCharacter = getElizaCharacter();
    await startAgent(elizaCharacter, server);
  }
}
