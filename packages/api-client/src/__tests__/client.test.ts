import { describe, it, expect } from 'bun:test';
import { ElizaClient } from '../ElizaClient';
import { ApiClientConfig } from '../types/base';
import { AgentsService } from '../services/AgentsService';
import { MessagingService } from '../services/MessagingService';
import { MemoryService } from '../services/MemoryService';
import { AudioService } from '../services/AudioService';
import { MediaService } from '../services/MediaService';
import { ServerService } from '../services/ServerService';
import { SystemService } from '../services/SystemService';

describe('ElizaClient', () => {
  const config: ApiClientConfig = {
    baseUrl: 'http://localhost:3000',
    apiKey: 'test-key',
  };

  it('should create client with all services', () => {
    const client = new ElizaClient(config);

    expect(client.agents).toBeInstanceOf(AgentsService);
    expect(client.messaging).toBeInstanceOf(MessagingService);
    expect(client.memory).toBeInstanceOf(MemoryService);
    expect(client.audio).toBeInstanceOf(AudioService);
    expect(client.media).toBeInstanceOf(MediaService);
    expect(client.server).toBeInstanceOf(ServerService);
    expect(client.system).toBeInstanceOf(SystemService);
  });

  it('should create client using static create method', () => {
    const client = ElizaClient.create(config);

    expect(client).toBeInstanceOf(ElizaClient);
    expect(client.agents).toBeInstanceOf(AgentsService);
  });

  it('should pass config to all services', () => {
    const client = new ElizaClient(config);

    // Test that services are initialized with the same config
    // by checking they're defined (more detailed tests would check internals)
    expect(client.agents).toBeDefined();
    expect(client.messaging).toBeDefined();
    expect(client.memory).toBeDefined();
    expect(client.audio).toBeDefined();
    expect(client.media).toBeDefined();
    expect(client.server).toBeDefined();
    expect(client.system).toBeDefined();
  });
});
