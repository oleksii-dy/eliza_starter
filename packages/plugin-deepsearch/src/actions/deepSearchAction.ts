import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from '@elizaos/core';
import { logger } from '@elizaos/core';
import { DeepSearchService } from '../services/deepSearchService';

/**
 * DeepSearch action entry point. This is a very lightweight wrapper around the
 * DeepSearchService which handles the iterative search loop. The service
 * streams intermediate thinking events via the provided callback.
 */
export const deepSearchAction: Action = {
  name: 'deepSearch',
  description: 'Iterative search→read→reason loop',
  similes: ['DEEPSEARCH', 'DEEP_RESEARCH'],
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    options: Record<string, unknown>,
    callback: HandlerCallback
  ) => {
    const service = runtime.getService<DeepSearchService>(DeepSearchService.serviceType);
    if (!service) {
      logger.error('DeepSearchService not registered');
      throw new Error('DeepSearchService not registered');
    }
    const result = await service.ask(message.content.text ?? '', options, callback);
    return {
      text: result.answer,
      actions: ['NONE'],
    };
  },
  examples: [],
};
