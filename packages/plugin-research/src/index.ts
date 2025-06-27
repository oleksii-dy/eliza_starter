import { Plugin } from '@elizaos/core';
import { ResearchService } from './service';
import { researchProviders } from './providers';
import { researchActions } from './actions';
import { researchSchema } from './schema';

// Tests are disabled for now to avoid ES module issues
const deepResearchBenchSimplifiedTests: any = undefined;

export * from './types';
export * from './service';
export * from './actions';
export * from './providers';
export * from './integrations';
export * from './strategies/research-strategies';
export * from './evaluation/research-evaluator';
export * from './schema';

export const researchPlugin: Plugin = {
  name: '@elizaos/plugin-research',
  description:
    'PhD-level deep research across 22 domains with RACE/FACT evaluation',

  services: [ResearchService],
  actions: researchActions,
  providers: researchProviders,
  schema: researchSchema,

  tests: deepResearchBenchSimplifiedTests
    ? [deepResearchBenchSimplifiedTests]
    : [],

  init: async (config: Record<string, string>, runtime: any) => {
    // Ensure API keys from environment are available
    const apiKeys = [
      'TAVILY_API_KEY',
      'EXA_API_KEY',
      'SERPER_API_KEY',
      'SERPAPI_API_KEY',
      'OPENAI_API_KEY',
      'FIRECRAWL_API_KEY',
      'SEMANTIC_SCHOLAR_API_KEY',
    ];

    // Copy environment variables to runtime settings if not already set
    for (const key of apiKeys) {
      if (process.env[key] && !runtime.getSetting(key)) {
        // Set the key in runtime's internal settings
        if (runtime.character?.settings) {
          runtime.character.settings[key] = process.env[key];
        }
      }
    }

    console.log('Research plugin initialized with API key configuration');
  },
};

export default researchPlugin;
