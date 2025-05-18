import {
  type Action,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  composePrompt,
  ModelType,
  composePromptFromState,
  parseJSONObjectFromText,
} from '@elizaos/core';
import { ethers, parseUnits } from 'ethers';
import { PolygonRpcService } from '../services/PolygonRpcService';
import { ConfigService } from '../services/ConfigService';
import { delegateL1Template } from '../templates';
import { parseErrorMessage } from '../errors';

// Define input schema for the LLM-extracted parameters
interface DelegateL1Params {
  validatorId?: number;
  amountWei?: string; // Amount in smallest unit (Wei)
  error?: string;
}

// Helper function to extract params from text if LLM fails
// This is a simplified example; a more robust regex might be needed.
function extractParamsFromText(text: string): Partial<DelegateL1Params> {
  const params: Partial<DelegateL1Params> = {};

  // Extract validator ID (positive integer)
  const validatorIdMatch = text.match(/validator(?: id)?\\s*[:#]?\\s*(\\d+)/i);
  if (validatorIdMatch?.[1]) {
    const id = Number.parseInt(validatorIdMatch[1], 10);
    if (id > 0) {
      params.validatorId = id;
    }
  }

  // Extract amount (e.g., "10", "5.5", "100 MATIC", "0.25 ether")
  // This regex looks for a number (int or float) optionally followed by "MATIC", "ETH", or "ether"
  const amountMatch = text.match(/(\\d*\\.?\\d+)\\s*(?:MATIC|ETH|ether)?/i);
  if (amountMatch?.[1]) {
    try {
      // Convert to Wei. Assumes 18 decimal places for MATIC/ETH.
      params.amountWei = parseUnits(amountMatch[1], 18).toString();
    } catch (e) {
      logger.warn(`Could not parse amount from text: ${amountMatch[1]}`, e);
    }
  }

  return params;
}

export const delegateL1Action: Action = {
  name: 'DELEGATE_L1',
  similes: ['STAKE_L1_MATIC', 'DELEGATE_TO_VALIDATOR_L1', 'STAKE_ON_ETHEREUM_L1'],
  description:
    'Delegates (stakes) MATIC/POL tokens to a specified Polygon validator on the Ethereum L1 network.',
  validate: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    logger.debug('Validating DELEGATE_L1 action...');

    try {
      // Get config service
      const configService = runtime.getService<ConfigService>(ConfigService.serviceType);
      if (!configService) {
        logger.error('ConfigService not available for delegateL1Action.');
        return false;
      }

      // Check required settings
      const requiredSettings = ['PRIVATE_KEY', 'ETHEREUM_RPC_URL', 'POLYGON_PLUGINS_ENABLED'];
      
      for (const setting of requiredSettings) {
        const value = configService.get(setting);
        if (!value) {
          logger.error(`Required setting ${setting} not configured for delegateL1Action.`);
          return false;
        }
      }

      // Check if PolygonRpcService is available
      const polygonRpcService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
      if (!polygonRpcService) {
        logger.error('PolygonRpcService not initialized for delegateL1Action.');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error in delegateL1Action.validate:', error);
      return false;
    }
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: unknown,
    callback: HandlerCallback | undefined,
    _recentMessages: Memory[] | undefined
  ) => {
    logger.info('Handling DELEGATE_L1 action for message:', message.id);
    const rawMessageText = message.content.text || '';
    let params: DelegateL1Params | null = null;

    try {
      const polygonService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
      if (!polygonService) {
        throw new Error('PolygonRpcService not available');
      }

      const prompt = composePromptFromState({
        state,
        template: delegateL1Template,
      });

      // Try using parseJSONObjectFromText with TEXT_SMALL model
      try {
        const result = await runtime.useModel(ModelType.TEXT_SMALL, {
          prompt,
        });

        params = parseJSONObjectFromText(result) as DelegateL1Params;
        logger.debug('DELEGATE_L1: Extracted params via TEXT_SMALL:', params);

        // Check if the model response contains an error
        if (params.error) {
          logger.warn(`DELEGATE_L1: Model responded with error: ${params.error}`);
          throw new Error(params.error);
        }
      } catch (e) {
        logger.warn(
          'DELEGATE_L1: Failed to parse JSON from model response, trying manual extraction',
          e
        );

        // Fallback to manual extraction from raw message text
        const manualParams = extractParamsFromText(rawMessageText);
        if (manualParams.validatorId && manualParams.amountWei) {
          params = {
            validatorId: manualParams.validatorId,
            amountWei: manualParams.amountWei,
          };
          logger.debug('DELEGATE_L1: Extracted params via manual text parsing:', params);
        } else {
          throw new Error('Could not determine validator ID or amount from the message.');
        }
      }

      // Validate the extracted parameters
      if (!params?.validatorId || !params.amountWei) {
        throw new Error('Validator ID or amount is missing after extraction attempts.');
      }

      const { validatorId, amountWei } = params;
      logger.debug(`DELEGATE_L1 parameters: validatorId: ${validatorId}, amountWei: ${amountWei}`);

      // Convert the amount to BigInt for the service
      const amountBigInt = BigInt(amountWei);
      const txHash = await polygonService.delegate(validatorId, amountBigInt);
      const amountFormatted = ethers.formatEther(amountWei);

      const successMsg = `Successfully initiated delegation of ${amountFormatted} MATIC to validator ${validatorId}. Transaction hash: ${txHash}`;
      logger.info(successMsg);

      const responseContent: Content = {
        text: successMsg,
        actions: ['DELEGATE_L1'],
        source: message.content.source,
        data: {
          transactionHash: txHash,
          status: 'pending',
          validatorId: validatorId,
          amountDelegatedMatic: amountFormatted,
          amountDelegatedWei: amountWei,
        },
      };

      if (callback) {
        await callback(responseContent);
      }
      return responseContent;
    } catch (error: unknown) {
      const parsedError = parseErrorMessage(error);
      logger.error('Error in DELEGATE_L1 handler:', parsedError);

      const errorContent: Content = {
        text: `Error delegating MATIC (L1): ${parsedError.message}`,
        actions: ['DELEGATE_L1'],
        source: message.content.source,
        data: {
          success: false,
          error: parsedError.message,
          details: parsedError.details,
        },
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
          text: 'I want to delegate 10 MATIC to validator 123 on L1',
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Stake 5.5 MATIC with the Polygon validator ID 42 for L1 staking',
        },
      },
    ],
  ],
};
