import { type Action, type IAgentRuntime, type Memory, type State, logger } from '@elizaos/core';
import { PolygonRpcService } from '../services/PolygonRpcService';

export const restakeRewardsL1Action: Action = {
  name: 'RESTAKE_REWARDS_L1',
  description: 'Withdraws rewards and restakes them to the same validator on Ethereum L1.',
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: Record<string, unknown> | undefined
  ) => {
    const rpcService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
    if (!rpcService) throw new Error('PolygonRpcService not available');

    const validatorId = options?.validatorId as number | undefined;
    if (typeof validatorId !== 'number') throw new Error('Validator ID (number) is required.');

    logger.info(`Action: Restaking rewards for validator ${validatorId}`);
    const delegateTxHash = await rpcService.restakeRewards(validatorId);

    if (!delegateTxHash) {
      return {
        text: `No rewards found to restake for validator ${validatorId}.`,
        actions: ['RESTAKE_REWARDS_L1'],
        data: { validatorId, status: 'no_rewards' },
      };
    }

    return {
      text: `Restake operation initiated. Delegation transaction sent: ${delegateTxHash}. Check L1 explorer.`,
      actions: ['RESTAKE_REWARDS_L1'],
      data: {
        validatorId,
        transactionHash: delegateTxHash,
        status: 'initiated',
      },
    };
  },
  examples: [],
};
