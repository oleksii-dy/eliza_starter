import type {
  Action,
  Content,
  GenerateTextParams,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  Plugin,
  Provider,
  ProviderResult,
  State,
} from '@elizaos/core';
import { ModelType, Service, logger } from '@elizaos/core';
import { z } from 'zod';

const configSchema = z.object({});

export class ScenarioService extends Service {
  static serviceType = 'scenario';
  capabilityDescription = 'Service for running scenarios.';
  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime) {
    logger.info('Starting scenario service...');
    const service = new ScenarioService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('Stopping scenario service...');
    const service = runtime.getService(ScenarioService.serviceType);
    if (!service) {
      throw new Error('Scenario service not found');
    }
    service.stop();
  }

  async stop() {
    logger.info('Scenario service stopped.');
  }
}

export const scenarioPlugin: Plugin = {
  name: 'plugin-scenario',
  description: 'Plugin for running scenarios.',
  config: {},
  async init(config: Record<string, string>) {
    logger.info('Initializing scenario plugin...');
    try {
      await configSchema.parseAsync(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid plugin configuration: ${error.errors.map((e) => e.message).join(', ')}`
        );
      }
      throw error;
    }
  },
  services: [ScenarioService],
  actions: [],
  providers: [],
  tests: [],
};

export default scenarioPlugin; 