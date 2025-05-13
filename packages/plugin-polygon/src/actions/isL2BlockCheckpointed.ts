import { type Action, type IAgentRuntime, type Memory, type State, logger } from '@elizaos/core';
import { PolygonRpcService } from '../services/PolygonRpcService';

export const isL2BlockCheckpointedAction: Action = {
  name: 'IS_L2_BLOCK_CHECKPOINTED',
  description: 'Checks if a Polygon L2 block has been checkpointed on Ethereum L1.',
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: Record<string, unknown> | undefined
  ) => {
    const rpcService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
    if (!rpcService) throw new Error('PolygonRpcService not available');

    const l2BlockNumberInput = options?.l2BlockNumber as number | string | undefined;
    if (l2BlockNumberInput === undefined)
      throw new Error('L2 block number (l2BlockNumber) is required.');

    let l2BlockNumber: bigint;
    try {
      l2BlockNumber = BigInt(l2BlockNumberInput.toString());
      if (l2BlockNumber < 0n) throw new Error(); // Basic validation
    } catch {
      throw new Error('Invalid L2 block number format.');
    }

    logger.info(`Action: Checking checkpoint status for L2 block ${l2BlockNumber}`);
    const isCheckpointed = await rpcService.isL2BlockCheckpointed(l2BlockNumber);

    return {
      text: `L2 block ${l2BlockNumber} checkpointed status on L1: ${isCheckpointed}.`,
      actions: ['IS_L2_BLOCK_CHECKPOINTED'],
      data: { l2BlockNumber: l2BlockNumber.toString(), isCheckpointed },
    };
  },
  examples: [],
};
