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
import { parseUnits } from 'ethers';
import { PolygonRpcService } from '../services/PolygonRpcService';

// Define input schema for the LLM-extracted parameters
interface DelegateParams {
  validatorId: number;
  amount: string; // Amount in MATIC (human-readable, will be converted to Wei)
}

// Define template for LLM parameter extraction
const delegateTemplate = {
  name: 'Delegate MATIC',
  description: 'Extracts parameters for delegating MATIC tokens to a validator on Polygon.',
  parameters: {
    type: 'object',
    properties: {
      validatorId: {
        type: 'number',
        description: 'The ID of the validator to delegate to.',
      },
      amount: {
        type: 'string',
        description: 'Amount of MATIC to delegate (e.g., "10" or "5.5").',
      },
    },
    required: ['validatorId', 'amount'],
  },
};

export const delegatePolygonAction: Action = {
  name: 'DELEGATE_POLYGON',
  similes: ['STAKE_MATIC', 'BOND_MATIC'], // Example similes
  description: 'Delegates (stakes) MATIC tokens to a validator on the Polygon network.',

  validate: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    logger.debug('Validating DELEGATE_POLYGON action...');

    // Check for required settings
    const requiredSettings = [
      'PRIVATE_KEY',
      'ETHEREUM_RPC_URL', // L1 RPC needed for delegation
      'POLYGON_RPC_URL', // L2 RPC for completeness
      'POLYGON_PLUGINS_ENABLED',
    ];

    for (const setting of requiredSettings) {
      if (!runtime.getSetting(setting)) {
        logger.error(`Required setting ${setting} not configured for DELEGATE_POLYGON action.`);
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
    logger.info('Handling DELEGATE_POLYGON action for message:', message.id);

    try {
      // Get the PolygonRpcService
      const polygonService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
      if (!polygonService) {
        throw new Error('PolygonRpcService not available');
      }

      // Extract parameters using LLM
      const prompt = composePromptFromState({
        state,
        template: delegateTemplate as unknown as TemplateType,
      });

      const modelResponse = await runtime.useModel(ModelType.LARGE, { prompt });
      let params: DelegateParams;

      try {
        const responseText = modelResponse || '';
        const jsonString = responseText.replace(/^```json\n?|\n?```$/g, '');
        params = JSON.parse(jsonString);
      } catch (error: unknown) {
        logger.error(
          'Failed to parse LLM response for delegation parameters:',
          modelResponse,
          error
        );
        throw new Error('Could not understand delegation parameters.');
      }

      if (!params.validatorId || !params.amount) {
        throw new Error('Incomplete delegation parameters extracted.');
      }

      logger.debug('Delegation parameters:', params);

      // Convert amount from MATIC to Wei
      const amountWei = parseUnits(params.amount, 18);

      // Perform the delegation using the service
      const txHash = await polygonService.delegate(params.validatorId, amountWei);

      // Prepare success response
      const successMsg = `Successfully initiated delegation of ${params.amount} MATIC to validator ${params.validatorId}. Transaction hash: ${txHash}`;
      logger.info(successMsg);

      // Format the response content
      const responseContent: Content = {
        text: successMsg,
        actions: ['DELEGATE_POLYGON'],
        source: message.content.source,
        data: {
          transactionHash: txHash,
          status: 'pending',
          validatorId: params.validatorId,
          amount: params.amount,
          amountWei: amountWei.toString(),
        },
      };

      if (callback) {
        await callback(responseContent);
      }
      return responseContent;
    } catch (error: unknown) {
      // Handle errors
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error in DELEGATE_POLYGON handler:', errMsg, error);

      // Format error response
      const errorContent: Content = {
        text: `Error delegating MATIC: ${errMsg}`,
        actions: ['DELEGATE_POLYGON'],
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
          text: 'I want to delegate 10 MATIC to validator 123 on Polygon',
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Stake 5.5 MATIC with the Polygon validator ID 42',
        },
      },
    ],
  ],
};
