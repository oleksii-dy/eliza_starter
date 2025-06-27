// Export all schema tables for external use
export { agentTable } from './agent.js';
export { cacheTable } from './cache.js';
export { channelTable } from './channel.js';
export { channelParticipantsTable } from './channelParticipant.js';
export { componentTable } from './component.js';
export { embeddingTable } from './embedding.js';
export { entityTable } from './entity.js';
export { logTable } from './log.js';
export { memoryTable } from './memory.js';
export { messageTable } from './message.js';
export { messageServerTable } from './messageServer.js';
export { participantTable } from './participant.js';
export { relationshipTable } from './relationship.js';
export { roomTable } from './room.js';
export { serverAgentsTable } from './serverAgent.js';
export { tasksTable } from './tasks.js';
export { worldTable } from './world.js';

// Export core schema
export { coreSchema } from './core.js';

// Re-export factory for external use
export { setDatabaseType, getSchemaFactory } from './factory.js';
export type { DatabaseType } from './factory.js';
