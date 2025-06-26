// Main client
export { ElizaClient } from './ElizaClient';

// Base types
export * from './types/base';

// Domain types
export * from './types/agents';
export * from './types/messaging';
export * from './types/memory';
export * from './types/audio';
export * from './types/media';
export * from './types/server';
export * from './types/system';

// Services (for advanced usage)
export { AgentsService } from './services/AgentsService';
export { MessagingService } from './services/MessagingService';
export { MemoryService } from './services/MemoryService';
export { AudioService } from './services/AudioService';
export { MediaService } from './services/MediaService';
export { ServerService } from './services/ServerService';
export { SystemService } from './services/SystemService';

// Base client and error
export { BaseApiClient, ApiError } from './lib/BaseClient';
