/**
 * ElizaOS Server Package
 * 
 * Clean entry point that exports public API components.
 * All implementation details are contained in their respective modules.
 */

// Export main server class
export { Server, AgentServer } from './server/server.js';

// Export server factory and types
export { 
  createElizaServer, 
  type ServerFactoryOptions,
  type ElizaServerInstance 
} from './server/factory.js';

// Export server types
export type { 
  ServerOptions, 
  ServerMiddleware 
} from './types/server.js';

// Export additional types for external usage
export * from './types/messaging.js';

// Export character loader utilities
export {
  tryLoadFile,
  loadCharactersFromUrl,
  jsonToCharacter,
  loadCharacter,
  loadCharacterTryPath,
  hasValidRemoteUrls,
  loadCharacters,
} from './utils/character-loader.js';

// Export utility functions that might be useful externally
export { expandTildePath, resolvePgliteDir } from './server/server.js';