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
 * Get Trade Action
 */
export const getTradeAction: Action = {
  name: 'GET_TRADE',
  similes: ['TRADE_DETAILS', 'VIEW_TRADE', 'SHOW_TRADE'],
  description: 'Gets details of a specific trade by ID',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    const content = message.content.text?.toLowerCase() || '';
    return content.includes('get') && content.includes('trade') && content.includes('id');
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
      logger.info('Handling GET_TRADE action');
      
      // Extract trade ID from options
      const { tradeId } = options || {};
      
      if (!tradeId) {
        throw new Error('Trade ID is required to get trade details');
      }

      // Get GTK service and client
      const gtkService = runtime.getService('gtk') as GTKService;
      const client = gtkService.getClient();

      // Get trade details
      const trade = await client.getTrade(tradeId);

      // Create response
      let responseText: string;
      if (!trade) {
        responseText = `No trade found with ID ${tradeId}`;
      } else {
        responseText = `Trade #${trade.id} Details:\n` +
          `Type: ${trade.tradeDirection} ${trade.targetTokenType}\n` +
          `Status: ${trade.status}\n` +
          `Collateral: ${trade.collateralTokenAmount} ${trade.collateralTokenType}\n` +
          `Leverage: ${trade.leverageQuantity}x\n` +
          `Entry Price: ${trade.targetTokenPrice}\n` +
          `Created: ${new Date(trade.createdAt).toLocaleString()}\n` +
          `Trader: ${trade.traderAddress}`;
        
        if (trade.pandL) {
          responseText += `\nP&L: ${trade.pandL}`;
        }
      }

      const responseContent: Content = {
        text: responseText,
        actions: ['GET_TRADE'],
        source: message.content.source,
        data: { trade }
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in GET_TRADE action:', error);
      
      const errorContent: Content = {
        text: `Error getting trade details: ${error.message}`,
        actions: ['GET_TRADE'],
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
          text: 'Show me the details of trade ID 123',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Trade #123 Details:\nType: LONG btc\nStatus: ACTIVE\nCollateral: 0.01 uusdc\nLeverage: 2x\nEntry Price: 45000\nCreated: 4/1/2023, 10:30:00 AM\nTrader: sif1abc...\nP&L: +0.005',
          actions: ['GET_TRADE'],
        },
      },
    ],
  ],
};
