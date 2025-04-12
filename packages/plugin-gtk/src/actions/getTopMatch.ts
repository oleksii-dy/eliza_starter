import {
  type Action,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
  ModelType,
} from '@elizaos/core';
import { GTKService } from '../service';
import { DEFAULT_COLLATERAL_TYPE } from '../constants';
import { composeContext } from '../utils';
import { topMatchTemplate } from '../templates';
import { TopMatchSchema, type TopMatchContent } from '../types';

/**
 * Get Top Match Action
 */
export const getTopMatchAction: Action = {
  name: 'GET_TOP_MATCH',
  similes: ['FIND_MATCH', 'LIQUIDITY_CHECK', 'MATCH_COLLATERAL'],
  description: 'Gets the top match amount for a given collateral type',

  validate: async (runtime: IAgentRuntime) => {
    // Check if required plugin values are present
    return !!(
      runtime.getSetting('API_KEY') &&
      runtime.getSetting('MNEMONIC') &&
      (runtime.getSetting('NETWORK') || 'mainnet')
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback,
  ) => {
    try {
      elizaLogger.info('Handling GET_TOP_MATCH action');
      
      // Compose context from state and template
      const context = composeContext({
        state,
        template: topMatchTemplate,
        userMessage: message.content.text || '',
      });

      // Use LLM to extract parameters
      const extractedObject = await runtime.useModel(
        ModelType.OBJECT_LARGE,
        {
          prompt: context,
          schema: TopMatchSchema,
        }
      );

      // Extract collateral type and amount
      const { collateralType = DEFAULT_COLLATERAL_TYPE, collateralAmount = 10 } = 
        (extractedObject as TopMatchContent) || {};

      // Get GTK service and client
      const gtkService = runtime.getService('gtk') as GTKService;
      const client = gtkService.getClient();

      // Get top match
      const topMatch = await client.getTopMatch(
        collateralType as any, 
        collateralAmount
      );

      // Create response
      const responseContent: Content = {
        text: topMatch !== null
          ? `Top match found: ${topMatch} USD for ${collateralAmount} ${collateralType}`
          : `No match found for ${collateralAmount} ${collateralType}`,
        actions: ['GET_TOP_MATCH'],
        source: message.content.source,
        data: { topMatch, collateralType, collateralAmount }
      };

      callback(responseContent);
      return responseContent;
    } catch (error) {
      elizaLogger.error('Error in GET_TOP_MATCH action:', error);
      
      const errorContent: Content = {
        text: `Error finding top match: ${error.message || String(error)}`,
        actions: ['GET_TOP_MATCH'],
        source: message.content.source,
      };
      
      callback(errorContent);
      return errorContent;
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Find the top match for 10 USDC',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Top match found: 15 USD for 10 USDC',
          actions: ['GET_TOP_MATCH'],
        },
      },
    ],
  ],
};
