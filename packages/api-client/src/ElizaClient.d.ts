import { ApiClientConfig } from './types/base';
import { AgentsService } from './services/AgentsService';
import { MessagingService } from './services/MessagingService';
import { MemoryService } from './services/MemoryService';
import { AudioService } from './services/AudioService';
import { MediaService } from './services/MediaService';
import { ServerService } from './services/ServerService';
import { SystemService } from './services/SystemService';
export declare class ElizaClient {
    readonly agents: AgentsService;
    readonly messaging: MessagingService;
    readonly memory: MemoryService;
    readonly audio: AudioService;
    readonly media: MediaService;
    readonly server: ServerService;
    readonly system: SystemService;
    constructor(config: ApiClientConfig);
    /**
     * Create a new ElizaClient instance
     */
    static create(config: ApiClientConfig): ElizaClient;
}
