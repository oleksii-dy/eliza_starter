import { Service } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import { World } from './core/World';

export class HyperfyService extends Service {
  static serviceName = 'hyperfy';

  private world: World | null = null;
  private connected: boolean = false;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<HyperfyService> {
    const service = new HyperfyService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize the Hyperfy world
      // For now, we'll create a basic world instance
      this.world = new World();
      this.connected = true;

      if (this.runtime) {
        console.log('HyperfyService initialized successfully');
      }
    } catch (error) {
      if (this.runtime) {
        console.error('Failed to initialize HyperfyService:', error);
      }
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected && this.world !== null;
  }

  getWorld(): World | null {
    return this.world;
  }

  async stop(): Promise<void> {
    this.connected = false;
    this.world = null;

    if (this.runtime) {
      console.log('HyperfyService stopped');
    }
  }

  get capabilityDescription(): string {
    return 'Provides integration with Hyperfy virtual world system for RPG functionality';
  }
}
