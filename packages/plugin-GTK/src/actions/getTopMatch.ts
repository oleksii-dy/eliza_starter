import {
  type Action,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { GTKService } from '../service';
import { DEFAULT_COLLATERAL_TYPE } from '../constants';

/**
 * Get Top Match Action
 */
export const getTopMatchAction: Action = {
  name: 'GET_TOP_MATCH',
  similes: ['FIND_MATCH', 'LIQUIDITY_CHECK', 'MATCH_COLLATERAL'],
  description: 'Gets the top match amount for a given collateral type',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    const content = message.content.text?.toLowerCase() || '';
    return content.includes('top') && content.includes('match');
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ) => {
    try {
      logger.info('Handling GET_TOP_MATCH action');
      
      // Extract parameters from options
      const { 
        collateralType = DEFAULT_COLLATERAL_TYPE,
        collateralAmount = 10
      } = options || {};

      // Get GTK service and client
      const gtkService = runtime.getService('gtk') as GTKService;
      const client = gtkService.getClient();

      // Get top match
      const topMatch = await client.getTopMatch(
        collateralType, 
        collateralAmount
      );

      // Create response
      const responseContent: Content = {
        text: topMatch !== null
          ? `Top match found: ${topMatch} USD for ${collateralAmount} ${collateralType}`
          : `No match found for ${collateralAmount} ${collateralType}`,
        actions: ['GET_TOP_MATCH'],
        source: message.content.source,
        data: { topMatch }
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in GET_TOP_MATCH action:', error);
      
      const errorContent: Content = {
        text: `Error finding top match: ${error.message}`,
        actions: ['GET_TOP_MATCH'],
        source: message.content.source,
      };
      
      await callback(errorContent);
      return errorContent;
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Find the top match for 10 USDC',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Top match found: 15 USD for 10 uusdc',
          actions: ['GET_TOP_MATCH'],
        },
      },
    ],
  ],
};
