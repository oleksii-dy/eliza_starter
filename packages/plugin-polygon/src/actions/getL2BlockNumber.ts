import type { Action, IAgentRuntime } from '@elizaos/core';
import { PolygonRpcService } from '../services/PolygonRpcService';

export const getL2BlockNumberAction: Action = {
  name: 'GET_L2_BLOCK_NUMBER',
  description: 'Gets the current block number on Polygon (L2).',
  validate: async () => true,
  handler: async (runtime: IAgentRuntime) => {
    const rpcService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
    if (!rpcService) throw new Error('PolygonRpcService not available');
    const blockNumber = await rpcService.getCurrentBlockNumber();
    return {
      text: `Current Polygon block number: ${blockNumber}`,
      actions: ['GET_L2_BLOCK_NUMBER'],
      data: { blockNumber },
    };
  },
  examples: [],
};
