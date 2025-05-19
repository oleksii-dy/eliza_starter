import { Service, IAgentRuntime, logger } from '@elizaos/core';

export class MeteoraService extends Service {
  private isRunning = false;

  static serviceType = 'METEORA_SERVICE';
  capabilityDescription = 'Provides Meteora DEX integration for LP management';

  constructor(public runtime: IAgentRuntime) {
    super(runtime);
    console.log('METEORA_SERVICE cstr');
  }

  static async start(runtime: IAgentRuntime) {
    console.log('METEORA_SERVICE trying to start');
    const service = new MeteoraService(runtime);
    await service.start();
    return service;
  }

  async start() {
    console.log('METEORA_SERVICE trying to start');
  }

  async stop() {
    console.log('METEORA_SERVICE trying to stop');
  }
}
