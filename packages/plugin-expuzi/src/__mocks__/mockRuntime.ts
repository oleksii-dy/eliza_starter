import { 
  IAgentRuntime, 
  Memory, 
  State, 
  DatabaseAdapter,
  ModelProvider,
  ImageModelProvider,
  VisionModelProvider,
  Character
} from '@elizaos/core';

export class MockRuntime implements IAgentRuntime {
  // Required properties from error message
  modelProvider: ModelProvider = {} as ModelProvider;
  imageModelProvider: ImageModelProvider = {} as ImageModelProvider;
  imageVisionModelProvider: VisionModelProvider = {} as VisionModelProvider;
  character: Character = {} as Character;

  // Previously defined properties
  agentId: string = 'mock1-mock2-mock3-mock4-mock5';
  serverUrl: string = 'http://mock-server';
  databaseAdapter: DatabaseAdapter = {} as DatabaseAdapter;
  token: string = 'mock-token';
  
  constructor(private config: Record<string, any> = {}) {}

  // Required methods with basic implementations
  async processActions(
    message: Memory,
    responses: Memory[],
    state: State,
    callback: (response: any) => Promise<Memory[]>
  ): Promise<void> {
    return Promise.resolve();
  }

  getSetting(key: string): string {
    return this.config[key] ?? '';
  }

  async getState(): Promise<State> {
    return {
      userId: 'mock-user',
      agentId: this.agentId,
      roomId: 'mock-room',
      messageId: 'mock-message',
      timestamp: Date.now(),
      bio: '',
      lore: '',
      messageDirections: '',
      postDirections: '',
      actors: '',
      recentMessages: '',
      recentMessagesData: []
    };
  }

  async saveMemory(): Promise<void> {
    return Promise.resolve();
  }

  async getMemories(): Promise<Memory[]> {
    return [];
  }

  // Add more mock implementations as needed based on your usage
  // These can be added incrementally as you use more features
}