import {
  type Action,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  composePromptFromState,
  ModelType,
  type TemplateType,
} from '@elizaos/core';
import { PolygonRpcService } from '../services/PolygonRpcService';

// Define the structure for checkpoint status information
interface CheckpointStatus {
  blockNumber: number;
  isCheckpointed: boolean;
  lastCheckpointedBlock: bigint;
}

// Define input schema for the LLM-extracted parameters
interface CheckpointParams {
  blockNumber: number;
}

// Define template for LLM parameter extraction
const checkpointTemplate = {
  name: 'Check Polygon Checkpoint Status',
  description:
    'Extracts parameters for checking if a Polygon L2 block has been checkpointed on Ethereum L1.',
  parameters: {
    type: 'object',
    properties: {
      blockNumber: {
        type: 'number',
        description: 'The L2 Polygon block number to check checkpoint status for.',
      },
    },
    required: ['blockNumber'],
  },
};

export const getCheckpointStatusAction: Action = {
  name: 'GET_CHECKPOINT_STATUS',
  similes: ['CHECK_CHECKPOINT', 'POLYGON_CHECKPOINT_STATE'],
  description: 'Checks if a Polygon L2 block has been checkpointed to Ethereum L1.',

  validate: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    logger.debug('Validating GET_CHECKPOINT_STATUS action...');

    // Check for required settings
    const requiredSettings = [
      'PRIVATE_KEY',
      'ETHEREUM_RPC_URL', // L1 RPC needed for checkpoint verification
      'POLYGON_RPC_URL', // L2 RPC for completeness
      'POLYGON_PLUGINS_ENABLED',
    ];

    for (const setting of requiredSettings) {
      if (!runtime.getSetting(setting)) {
        logger.error(
          `Required setting ${setting} not configured for GET_CHECKPOINT_STATUS action.`
        );
        return false;
      }
    }

    // Verify PolygonRpcService is available
    try {
      const service = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
      if (!service) {
        logger.error('PolygonRpcService not initialized.');
        return false;
      }
    } catch (error: unknown) {
      logger.error('Error accessing PolygonRpcService during validation:', error);
      return false;
    }

    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: unknown,
    callback: HandlerCallback | undefined,
    _responses: Memory[] | undefined
  ) => {
    logger.info('Handling GET_CHECKPOINT_STATUS action for message:', message.id);

    try {
      // Get the PolygonRpcService
      const polygonService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
      if (!polygonService) {
        throw new Error('PolygonRpcService not available');
      }

      // Extract parameters using LLM
      const prompt = composePromptFromState({
        state,
        template: checkpointTemplate as unknown as TemplateType,
      });

      const modelResponse = await runtime.useModel(ModelType.LARGE, { prompt });
      let params: CheckpointParams;

      try {
        const responseText = modelResponse || '';
        const jsonString = responseText.replace(/^```json\n?|\n?```$/g, '');
        params = JSON.parse(jsonString);
      } catch (error: unknown) {
        logger.error(
          'Failed to parse LLM response for checkpoint parameters:',
          modelResponse,
          error
        );
        throw new Error('Could not understand checkpoint parameters.');
      }

      if (params.blockNumber === undefined) {
        throw new Error('Block number parameter not extracted properly.');
      }

      logger.debug('Checkpoint parameters:', params);

      // Get latest L2 block number if needed for context
      const currentBlockNumber = await polygonService.getCurrentBlockNumber();

      // Get the last checkpoint block
      const lastCheckpointedBlock = await polygonService.getLastCheckpointedL2Block();

      // Check if the specified block is checkpointed
      const isCheckpointed = await polygonService.isL2BlockCheckpointed(params.blockNumber);

      // Build the status object
      const status: CheckpointStatus = {
        blockNumber: params.blockNumber,
        isCheckpointed,
        lastCheckpointedBlock,
      };

      // Prepare response message
      let responseMsg = `Polygon block ${params.blockNumber} ${isCheckpointed ? 'is' : 'is not'} checkpointed on Ethereum.`;
      responseMsg += ` Last checkpointed block: ${lastCheckpointedBlock.toString()}`;

      if (!isCheckpointed && params.blockNumber > Number(lastCheckpointedBlock)) {
        const blocksRemaining = params.blockNumber - Number(lastCheckpointedBlock);
        responseMsg += ` (${blocksRemaining} blocks pending)`;
      }

      if (params.blockNumber > currentBlockNumber) {
        responseMsg += ` Note: Block ${params.blockNumber} is in the future (current block: ${currentBlockNumber})`;
      }

      logger.info(responseMsg);

      // Format the response content
      const responseContent: Content = {
        text: responseMsg,
        actions: ['GET_CHECKPOINT_STATUS'],
        source: message.content.source,
        data: {
          blockNumber: params.blockNumber,
          currentBlockNumber,
          lastCheckpointedBlock: lastCheckpointedBlock.toString(),
          isCheckpointed,
        },
      };

      if (callback) {
        await callback(responseContent);
      }
      return responseContent;
    } catch (error: unknown) {
      // Handle errors
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error in GET_CHECKPOINT_STATUS handler:', errMsg, error);

      // Format error response
      const errorContent: Content = {
        text: `Error checking checkpoint status: ${errMsg}`,
        actions: ['GET_CHECKPOINT_STATUS'],
        source: message.content.source,
        data: { success: false, error: errMsg },
      };

      if (callback) {
        await callback(errorContent);
      }
      return errorContent;
    }
  },

  examples: [
    [
      {
        name: 'user',
        content: {
          text: 'Check if Polygon block 42000000 has been checkpointed',
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Has block 41500000 on Polygon been checkpointed to Ethereum yet?',
        },
      },
    ],
  ],
};
