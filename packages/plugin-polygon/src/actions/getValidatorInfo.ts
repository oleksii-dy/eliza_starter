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
import { formatUnits } from 'ethers';
import { PolygonRpcService, ValidatorStatus } from '../services/PolygonRpcService';
import {
  ValidationError,
  ServiceError,
  ContractError,
  formatErrorMessage,
  parseErrorMessage,
} from '../errors';

// Define input schema for the LLM-extracted parameters
interface ValidatorParams {
  validatorId: number;
}

// Define template for LLM parameter extraction
const validatorTemplate = {
  name: 'Get Validator Info',
  description: 'Extracts parameters for retrieving information about a Polygon validator.',
  parameters: {
    type: 'object',
    properties: {
      validatorId: {
        type: 'number',
        description: 'The ID of the validator to get information about.',
      },
    },
    required: ['validatorId'],
  },
};

export const getValidatorInfoAction: Action = {
  name: 'GET_VALIDATOR_INFO',
  similes: ['QUERY_VALIDATOR', 'VALIDATOR_DETAILS'],
  description: 'Retrieves information about a specific Polygon validator.',

  validate: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    logger.debug('Validating GET_VALIDATOR_INFO action...');

    // Check for required settings
    const requiredSettings = [
      'PRIVATE_KEY',
      'ETHEREUM_RPC_URL', // L1 RPC needed for validator info
      'POLYGON_RPC_URL', // L2 RPC for completeness
      'POLYGON_PLUGINS_ENABLED',
    ];

    for (const setting of requiredSettings) {
      if (!runtime.getSetting(setting)) {
        logger.error(`Required setting ${setting} not configured for GET_VALIDATOR_INFO action.`);
        return false;
      }
    }

    // Verify PolygonRpcService is available
    try {
      const service = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
      if (!service) {
        throw new ServiceError('PolygonRpcService not initialized', 'PolygonRpcService');
      }
    } catch (error: unknown) {
      const errorMsg = parseErrorMessage(error);
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
    logger.info('Handling GET_VALIDATOR_INFO action for message:', message.id);

    try {
      // Get the PolygonRpcService
      const polygonService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
      if (!polygonService) {
        throw new ServiceError('PolygonRpcService not available', 'PolygonRpcService');
      }

      // Extract parameters using LLM
      const prompt = composePromptFromState({
        state,
        template: validatorTemplate as unknown as TemplateType,
      });

      const modelResponse = await runtime.useModel(ModelType.LARGE, { prompt });
      let params: ValidatorParams;

      try {
        const responseText = modelResponse || '';
        const jsonString = responseText.replace(/^```json\n?|\n?```$/g, '');
        params = JSON.parse(jsonString);
      } catch (error: unknown) {
        const errorMsg = parseErrorMessage(error);
        logger.error(
          'Failed to parse LLM response for validator parameters:',
          modelResponse,
          error
        );
        throw new ValidationError(
          formatErrorMessage(
            'Parameter extraction',
            'Could not understand validator parameters',
            errorMsg
          )
        );
      }

      if (params.validatorId === undefined) {
        throw new ValidationError('Validator ID parameter not extracted properly');
      }

      if (typeof params.validatorId !== 'number' || params.validatorId <= 0) {
        throw new ValidationError(
          `Invalid validator ID: ${params.validatorId}. Must be a positive integer.`
        );
      }

      logger.debug('Validator parameters:', params);

      // Get validator information
      try {
        const validatorInfo = await polygonService.getValidatorInfo(params.validatorId);

        if (!validatorInfo) {
          throw new ContractError(
            `Validator with ID ${params.validatorId} not found or is inactive.`,
            'STAKE_MANAGER_ADDRESS_L1',
            'validators'
          );
        }

        // Format the validator status as a string
        const statusLabels = {
          [ValidatorStatus.Inactive]: 'Inactive',
          [ValidatorStatus.Active]: 'Active',
          [ValidatorStatus.Unbonding]: 'Unbonding',
          [ValidatorStatus.Jailed]: 'Jailed',
        };

        const statusLabel = statusLabels[validatorInfo.status] || 'Unknown';

        // Format total stake as human-readable MATIC
        const totalStakeMatic = formatUnits(validatorInfo.totalStake, 18);

        // Prepare response message
        const responseMsg = `Validator #${params.validatorId} Info:
- Status: ${statusLabel}
- Total Staked: ${totalStakeMatic} MATIC
- Commission Rate: ${validatorInfo.commissionRate * 100}%
- Signer Address: ${validatorInfo.signerAddress}
- Contract Address: ${validatorInfo.contractAddress}`;

        logger.info(`Retrieved validator info for validator ID ${params.validatorId}`);

        // Format the response content
        const responseContent: Content = {
          text: responseMsg,
          actions: ['GET_VALIDATOR_INFO'],
          source: message.content.source,
          data: {
            validatorId: params.validatorId,
            validator: {
              ...validatorInfo,
              status: statusLabel,
              totalStake: validatorInfo.totalStake.toString(),
              totalStakeFormatted: totalStakeMatic,
              activationEpoch: validatorInfo.activationEpoch.toString(),
              deactivationEpoch: validatorInfo.deactivationEpoch.toString(),
              jailEndEpoch: validatorInfo.jailEndEpoch.toString(),
              lastRewardUpdateEpoch: validatorInfo.lastRewardUpdateEpoch.toString(),
            },
          },
        };

        if (callback) {
          await callback(responseContent);
        }
        return responseContent;
      } catch (error: unknown) {
        // Check if this is already one of our custom errors
        if (
          error instanceof ContractError ||
          error instanceof ValidationError ||
          error instanceof ServiceError
        ) {
          throw error;
        }

        // Otherwise wrap in a ContractError
        const errorMsg = parseErrorMessage(error);
        throw new ContractError(
          formatErrorMessage(
            'Validator info retrieval',
            `Failed to get validator #${params.validatorId} info from Ethereum L1`,
            errorMsg
          ),
          'STAKE_MANAGER_ADDRESS_L1',
          'validators'
        );
      }
    } catch (error: unknown) {
      // Handle errors
      let errMsg: string;

      if (error instanceof Error) {
        errMsg = error.message;
      } else {
        errMsg = parseErrorMessage(error);
      }

      logger.error('Error in GET_VALIDATOR_INFO handler:', errMsg, error);

      // Format error response
      const errorContent: Content = {
        text: `Error retrieving validator information: ${errMsg}`,
        actions: ['GET_VALIDATOR_INFO'],
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
          text: 'Show details for Polygon validator 123',
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'What is the commission rate of validator ID 42?',
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Tell me about validator #56 on Polygon',
        },
      },
    ],
  ],
};
