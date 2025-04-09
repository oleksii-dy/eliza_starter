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

/**
 * Get Trades Action
 */
export const getTradesAction: Action = {
  name: 'GET_TRADES',
  similes: ['LIST_TRADES', 'SHOW_POSITIONS', 'VIEW_TRADES'],
  description: 'Gets a list of trades based on type and status',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    const content = message.content.text?.toLowerCase() || '';
    return content.includes('get') && content.includes('trades');
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
      logger.info('Handling GET_TRADES action');
      
      // Extract parameters from options
      const { 
        tradeDirection,
        status 
      } = options || {};

      // Get GTK service and client
      const gtkService = runtime.getService('gtk') as GTKService;
      const client = gtkService.getClient();

      // Get trades
      const trades = await client.getTrades(tradeDirection, status);

      // Create response
      let responseText: string;
      if (trades.length === 0) {
        responseText = 'No trades found with the specified criteria.';
      } else {
        responseText = `Found ${trades.length} trades:\n` + 
          trades.map(trade => 
            `ID: ${trade.id}, ${trade.tradeDirection} ${trade.targetTokenType}, ` +
            `Status: ${trade.status}, Leverage: ${trade.leverageQuantity}x, ` + 
            `Created: ${new Date(trade.createdAt).toLocaleString()}`
          ).join('\n');
      }

      const responseContent: Content = {
        text: responseText,
        actions: ['GET_TRADES'],
        source: message.content.source,
        data: { trades }
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in GET_TRADES action:', error);
      
      const errorContent: Content = {
        text: `Error getting trades: ${error.message}`,
        actions: ['GET_TRADES'],
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
          text: 'Get all my active trades',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Found 2 trades:\nID: 123, LONG btc, Status: ACTIVE, Leverage: 2x, Created: 4/1/2023, 10:30:00 AM\nID: 124, SHORT eth, Status: ACTIVE, Leverage: 3x, Created: 4/2/2023, 11:45:00 AM',
          actions: ['GET_TRADES'],
        },
      },
    ],
  ],
};
