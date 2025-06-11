import { type IAgentRuntime, logger, Service } from "@elizaos/core";

export class LevvaService extends Service {
  static serviceType = 'levva';
  capabilityDescription =
    'Levva service should analyze the user\'s portfolio, suggest earning strategies, swap crypto assets, etc.';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime) {
    logger.info('*** Starting Levva service ***');
    const service = new LevvaService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('*** Stopping Levva service ***');
    // get the service from the runtime
    const service = runtime.getService(LevvaService.serviceType);
    if (!service) {
      throw new Error('Levva service not found');
    }
    service.stop();
  }

  async stop() {
    logger.info('*** Stopping levva service instance ***');
  }
}