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
import { DEFAULT_TARGET_TOKEN } from '../constants';

/**
 * Get Interest Rate Action
 */
export const getInterestRateAction: Action = {
  name: 'GET_INTEREST_RATE',
  similes: ['CHECK_INTEREST', 'INTEREST_RATE'],
  description: 'Gets the current interest rate for a specific token',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    const content = message.content.text?.toLowerCase() || '';
    return content.includes('interest') && content.includes('rate');
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
      logger.info('Handling GET_INTEREST_RATE action');
      
      // Extract token type from options
      const { targetTokenType = DEFAULT_TARGET_TOKEN } = options || {};

      // Get GTK service and client
      const gtkService = runtime.getService('gtk') as GTKService;
      const client = gtkService.getClient();

      // Get interest rate
      const interestRate = await client.getCurrentInterestRate(targetTokenType);

      // Create response
      const responseContent: Content = {
        text: `Current interest rate for ${targetTokenType}: ${interestRate}%`,
        actions: ['GET_INTEREST_RATE'],
        source: message.content.source,
        data: { interestRate }
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in GET_INTEREST_RATE action:', error);
      
      const errorContent: Content = {
        text: `Error getting interest rate: ${error.message}`,
        actions: ['GET_INTEREST_RATE'],
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
          text: 'What is the current interest rate for BTC?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Current interest rate for btc: 0.5%',
          actions: ['GET_INTEREST_RATE'],
        },
      },
    ],
  ],
};
