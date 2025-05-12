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
import { formatUnits, Wallet } from 'ethers';
import { PolygonRpcService } from '../services/PolygonRpcService';

// Define input schema for the LLM-extracted parameters
interface DelegatorParams {
  validatorId: number;
  delegatorAddress?: string; // Optional, will default to agent's address
}

// Define template for LLM parameter extraction
const delegatorTemplate = {
  name: 'Get Delegator Info',
  description: 'Extracts parameters for retrieving staking information about a delegator.',
  parameters: {
    type: 'object',
    properties: {
      validatorId: {
        type: 'number',
        description: 'The ID of the validator to check delegation for.',
      },
      delegatorAddress: {
        type: 'string',
        description:
          "Optional: The address of the delegator. If not provided, the agent's own address will be used.",
      },
    },
    required: ['validatorId'],
  },
};

export const getDelegatorInfoAction: Action = {
  name: 'GET_DELEGATOR_INFO',
  similes: ['QUERY_STAKE', 'DELEGATOR_DETAILS', 'GET_MY_STAKE'],
  description:
    'Retrieves staking information for a specific delegator address (defaults to agent wallet).',

  validate: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    logger.debug('Validating GET_DELEGATOR_INFO action...');

    // Check for required settings
    const requiredSettings = [
      'PRIVATE_KEY',
      'ETHEREUM_RPC_URL', // L1 RPC needed for delegator info
      'POLYGON_RPC_URL', // L2 RPC for completeness
      'POLYGON_PLUGINS_ENABLED',
    ];

    for (const setting of requiredSettings) {
      if (!runtime.getSetting(setting)) {
        logger.error(`Required setting ${setting} not configured for GET_DELEGATOR_INFO action.`);
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
    logger.info('Handling GET_DELEGATOR_INFO action for message:', message.id);

    try {
      // Get the PolygonRpcService
      const polygonService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
      if (!polygonService) {
        throw new Error('PolygonRpcService not available');
      }

      // Extract parameters using LLM
      const prompt = composePromptFromState({
        state,
        template: delegatorTemplate as unknown as TemplateType,
      });

      const modelResponse = await runtime.useModel(ModelType.LARGE, { prompt });
      let params: DelegatorParams;

      try {
        const responseText = modelResponse || '';
        const jsonString = responseText.replace(/^```json\n?|\n?```$/g, '');
        params = JSON.parse(jsonString);
      } catch (error: unknown) {
        logger.error(
          'Failed to parse LLM response for delegator parameters:',
          modelResponse,
          error
        );
        throw new Error('Could not understand delegator parameters.');
      }

      if (params.validatorId === undefined) {
        throw new Error('Validator ID parameter not extracted properly.');
      }

      // If delegatorAddress wasn't specified, use the agent's address
      let delegatorAddress = params.delegatorAddress;
      if (!delegatorAddress) {
        // Get the agent's address from the private key
        const privateKey = runtime.getSetting('PRIVATE_KEY');
        if (!privateKey) {
          throw new Error('Private key not available');
        }

        // Create a wallet from the private key to get the address
        const wallet = new Wallet(privateKey);
        delegatorAddress = wallet.address;
        logger.debug(`Using agent's address as delegator: ${delegatorAddress}`);
      }

      logger.debug('Delegator parameters:', {
        validatorId: params.validatorId,
        delegatorAddress,
      });

      // Get delegator information
      const delegatorInfo = await polygonService.getDelegatorInfo(
        params.validatorId,
        delegatorAddress
      );

      if (!delegatorInfo) {
        throw new Error(
          `No delegation found for address ${delegatorAddress} with validator ID ${params.validatorId}.`
        );
      }

      // Format amounts as human-readable MATIC
      const delegatedMatic = formatUnits(delegatorInfo.delegatedAmount, 18);
      const pendingRewardsMatic = formatUnits(delegatorInfo.pendingRewards, 18);

      // Prepare response message
      const responseMsg = `Delegation Info for address ${delegatorAddress} with validator ${params.validatorId}:
- Delegated Amount: ${delegatedMatic} MATIC
- Pending Rewards: ${pendingRewardsMatic} MATIC`;

      logger.info(
        `Retrieved delegator info for address ${delegatorAddress} with validator ${params.validatorId}`
      );

      // Format the response content
      const responseContent: Content = {
        text: responseMsg,
        actions: ['GET_DELEGATOR_INFO'],
        source: message.content.source,
        data: {
          validatorId: params.validatorId,
          delegatorAddress,
          delegation: {
            delegatedAmount: delegatorInfo.delegatedAmount.toString(),
            delegatedAmountFormatted: delegatedMatic,
            pendingRewards: delegatorInfo.pendingRewards.toString(),
            pendingRewardsFormatted: pendingRewardsMatic,
          },
        },
      };

      if (callback) {
        await callback(responseContent);
      }
      return responseContent;
    } catch (error: unknown) {
      // Handle errors
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Error in GET_DELEGATOR_INFO handler:', errMsg, error);

      // Format error response
      const errorContent: Content = {
        text: `Error retrieving delegator information: ${errMsg}`,
        actions: ['GET_DELEGATOR_INFO'],
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
          text: 'Show my delegation details for validator 123',
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'How much is address 0x1234... delegating to validator 42?',
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Check my pending rewards from validator 56',
        },
      },
    ],
  ],
};
