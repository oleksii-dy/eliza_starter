import type { Plugin } from '@elizaos/core';
import { defaultConfigSchema } from './config';
import { deepSearchAction } from './actions/deepSearchAction';
import { DeepSearchService } from './services/deepSearchService';
import { searchProvider } from './providers/searchProvider';
import { readerProvider } from './providers/readerProvider';
import { answerEvaluator } from './evaluators/answerEvaluator';

export const deepSearchPlugin: Plugin = {
  name: '@acme/plugin-deepsearch',
  description: 'Iterative search→read→reason loop for high-fidelity answers',
  config: defaultConfigSchema,
  actions: [deepSearchAction],
  services: [DeepSearchService],
  providers: [searchProvider, readerProvider],
  evaluators: [answerEvaluator],
};

export default deepSearchPlugin;
