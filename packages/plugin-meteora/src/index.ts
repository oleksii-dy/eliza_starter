import type { Plugin, IAgentRuntime } from '@elizaos/core';
import { MeteoraService } from './services/srv_meteora';
import { managePositions } from './actions/managePositions';
import { meteoraPositionProvider } from './providers/positionProvider';
import { meteoraManagePositionActionRetriggerEvaluator } from './evaluators/repositionEvaluator';

export const meteoraPlugin: Plugin = {
  name: 'meteoraOS',
  description: 'Meteora plugin',
  actions: [managePositions],
  evaluators: [meteoraManagePositionActionRetriggerEvaluator],
  providers: [meteoraPositionProvider],
  services: [MeteoraService],
  init: async (_, runtime: IAgentRuntime) => {
    console.log('meteora init');
    // Add any initialization logic
    console.log('meteora init done');
  },
};

export default meteoraPlugin;
