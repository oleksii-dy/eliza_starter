import { Service, ServiceType, type IAgentRuntime } from '@elizaos/core';
import { AgentKit } from '@coinbase/agentkit';

export class AgentKitService extends Service {
  static readonly serviceType = ServiceType.WALLET;
  private agentkit: AgentKit | null = null;
  runtime: IAgentRuntime;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.runtime = runtime;
  }

  static async start(runtime: IAgentRuntime): Promise<AgentKitService> {
    const service = new AgentKitService(runtime);
    await service.initialize();
    return service;
  }

  async stop(): Promise<void> {
    this.agentkit = null;
    console.info('[AgentKit] Service stopped');
  }

  async initialize(): Promise<void> {
    try {
      const runtime = this.runtime;
      const cdpApiKeyId = runtime?.getSetting('CDP_API_KEY_NAME') || process.env.CDP_API_KEY_NAME;
      const cdpApiKeyPrivate =
        runtime?.getSetting('CDP_API_KEY_PRIVATE_KEY') || process.env.CDP_API_KEY_PRIVATE_KEY;

      if (!cdpApiKeyId || !cdpApiKeyPrivate) {
        throw new Error('[AgentKit] Missing required CDP API credentials');
      }

      console.info('[AgentKit] Initializing CDP AgentKit...');

      // Create AgentKit instance using the simplified API
      this.agentkit = await AgentKit.from({
        cdpApiKeyId,
        cdpApiKeySecret: cdpApiKeyPrivate,
      });

      console.info('[AgentKit] Service initialized successfully');

      // Log wallet address if available
      try {
        const wallet = (this.agentkit as { wallet?: { address?: string } }).wallet;
        if (wallet?.address) {
          console.info(`[AgentKit] Wallet address: ${wallet.address}`);
        }
      } catch {
        // Ignore if wallet structure is different
      }
    } catch (error) {
      console.error('[AgentKit] Failed to initialize service:', error);
      throw error;
    }
  }

  getAgentKit(): AgentKit {
    if (!this.agentkit) {
      throw new Error('AgentKit service not initialized');
    }
    return this.agentkit;
  }

  isReady(): boolean {
    return this.agentkit !== null;
  }

  get capabilityDescription(): string {
    return 'CDP AgentKit service for blockchain interactions';
  }
}
