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
  private config: DeepSearchConfig;

  constructor(runtime: IAgentRuntime, config: DeepSearchConfig) {
    super(runtime);
    this.config = config;
  }

  static async start(runtime: IAgentRuntime) {
    const cfg = {
      search_provider: 'firecrawl',
      token_budget: 16000,
      max_iterations: 3,
      ...(runtime.getConfig('deepSearch') as Partial<DeepSearchConfig>),
    } as DeepSearchConfig;
    return new DeepSearchService(runtime, cfg);
  }

  async stop() {}

  async ask(
    question: string,
    opts: Record<string, unknown>,
    callback: HandlerCallback,
  ): Promise<DeepSearchAnswer> {
    logger.debug(`DeepSearchService.ask called with question: ${question}`);
    const depth = Number(opts.depth ?? this.config.max_iterations ?? 2);
    const breadth = Number(opts.breadth ?? 3);

    const { learnings, visitedUrls } = await deepResearch(
      this.runtime,
      { question, depth, breadth },
      callback,
    );

    const prompt = `Answer the question "${question}" using the following notes:\n${learnings.join('\n')}`;
    const answer = await this.runtime.useModel(ModelType.TEXT_SMALL, { prompt });

    return { answer, citations: visitedUrls, thinking: [] };
  }
}
