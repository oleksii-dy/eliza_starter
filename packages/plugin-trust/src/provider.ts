import type { Provider, ProviderResult, IAgentRuntime, Memory, State } from '@elizaos/core';
import { TrustService } from './service';

export const trustProvider: Provider = {
  name: 'trust',
  description: 'Provides trust score for a user',
  dynamic: true,
  get: async (runtime: IAgentRuntime, message: Memory, _state: State): Promise<ProviderResult> => {
    const service = runtime.getService<TrustService>(TrustService.serviceType);
    const score = service?.getTrustScore(message.entityId) ?? 0;
    return {
      values: { trustScore: score },
      text: `User trust score is ${score.toFixed(2)}`,
    };
  },
};
