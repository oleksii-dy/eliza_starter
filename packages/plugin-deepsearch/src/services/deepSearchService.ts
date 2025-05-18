import type { HandlerCallback, IAgentRuntime } from '@elizaos/core';
import { Service, logger, ModelType, ServiceType } from '@elizaos/core';
import type { DeepSearchConfig } from '../config';
import { deepResearch } from '../research';

export interface DeepSearchAnswer {
  answer: string;
  citations: string[];
  thinking: unknown[];
}

export class DeepSearchService extends Service {
  static serviceType: string = 'deepsearch';
  capabilityDescription = 'Performs iterative web research';
  public config: DeepSearchConfig; // Changed to public

  constructor(runtime: IAgentRuntime, config?: DeepSearchConfig) {
    super(runtime);
    if (config) {
      this.config = config;
    } else {
      // Initialize with a default or expect runtime to set it
      this.config = {
        search_provider: 'firecrawl',
        token_budget: 16000,
        max_iterations: 3,
      };
      logger.warn(`DeepSearchService instantiated without explicit config. Using defaults.`);
    }
  }

  static async start(runtime: IAgentRuntime, initialConfig?: Partial<DeepSearchConfig>) {
    // The runtime is responsible for merging default, plugin-specific, and user configs.
    // This static start method can prepare an initial or default config if absolutely necessary
    // before the service instance is created by the runtime with the final merged config.
    // For now, we assume the plugin's defaultConfigSchema is the primary source for defaults.
    const defaultConfig: DeepSearchConfig = {
      search_provider: 'firecrawl',
      token_budget: 16000,
      max_iterations: 3,
      ...(initialConfig || {}),
    };
    // The actual service instance will be created by the runtime,
    // passing the fully resolved config to the constructor.
    // This static start is more of a factory/setup hook.
    // We return a new instance here as per the original structure, assuming the runtime
    // might call this static method to get an instance, providing its own config later or using this.
    return new DeepSearchService(runtime, defaultConfig);
  }

  async stop() {}

  async ask(
    question: string,
    opts: Record<string, unknown>,
    callback: HandlerCallback
  ): Promise<DeepSearchAnswer> {
    logger.debug(`DeepSearchService.ask called with question: ${question}`);
    const depth = Number(opts.depth ?? this.config.max_iterations ?? 2);
    const breadth = Number(opts.breadth ?? 3);

    const { learnings, visitedUrls } = await deepResearch(
      this.runtime,
      { question, depth, breadth },
      callback
    );

    const prompt = `Answer the question "${question}" using the following notes:\n${learnings.join('\n')}`;
    const answer = await this.runtime.useModel(ModelType.TEXT_SMALL, { prompt });

    return { answer, citations: visitedUrls, thinking: [] };
  }
}
