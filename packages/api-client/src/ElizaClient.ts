import { ApiClientConfig } from './types/base';
import { AgentsService } from './services/AgentsService';
import { MessagingService } from './services/MessagingService';
import { MemoryService } from './services/MemoryService';
import { AudioService } from './services/AudioService';
import { MediaService } from './services/MediaService';
import { ServerService } from './services/ServerService';
import { SystemService } from './services/SystemService';

export class ElizaClient {
  public readonly agents: AgentsService;
  public readonly messaging: MessagingService;
  public readonly memory: MemoryService;
  public readonly audio: AudioService;
  public readonly media: MediaService;
  public readonly server: ServerService;
  public readonly system: SystemService;

  constructor(config: ApiClientConfig) {
    // Initialize all services with the same config
    this.agents = new AgentsService(config);
    this.messaging = new MessagingService(config);
    this.memory = new MemoryService(config);
    this.audio = new AudioService(config);
    this.media = new MediaService(config);
    this.server = new ServerService(config);
    this.system = new SystemService(config);
  }

  /**
   * Create a new ElizaClient instance
   */
  static create(config: ApiClientConfig): ElizaClient {
    return new ElizaClient(config);
  }
}
