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
import { TradeDirectionEnum, TradeStatusEnum } from '@sifchain/gtk-api';
import { z } from 'zod';
import { composeContext } from '../utils';
import { getTradesTemplate } from '../templates';

// Define schema for get trades parameters
const GetTradesSchema = z.object({
  tradeDirection: z.enum(['LONG', 'SHORT']).optional().describe('Filter by trade direction'),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'LIQUIDATED']).optional().describe('Filter by trade status')
});

type GetTradesContent = z.infer<typeof GetTradesSchema>;

/**
 * Get Trades Action
 */
export const getTradesAction: Action = {
  name: 'GET_TRADES',
  similes: ['LIST_TRADES', 'SHOW_POSITIONS', 'VIEW_TRADES'],
  description: 'Gets a list of trades based on type and status',

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
      elizaLogger.info('Handling GET_TRADES action');
      
      // Compose context from state and template
      const context = composeContext({
        state,
        template: getTradesTemplate,
        userMessage: message.content.text || '',
      });

      // Use LLM to extract parameters
      const extractedObject = await runtime.useModel(
        ModelType.OBJECT_LARGE,
        {
          prompt: context,
          schema: GetTradesSchema,
        }
      );

      // Extract parameters
      const { tradeDirection: extractedDirection, status: extractedStatus } = 
        (extractedObject as GetTradesContent) || {};
      
      // Convert string enums to actual enum values
      let tradeDirection = undefined;
      if (extractedDirection === 'LONG') {
        tradeDirection = TradeDirectionEnum.LONG;
      } else if (extractedDirection === 'SHORT') {
        tradeDirection = TradeDirectionEnum.SHORT;
      }
      
      // Convert string status to enum
      let status = undefined;
      if (extractedStatus === 'ACTIVE') {
        status = TradeStatusEnum.ACTIVE;
      } else if (extractedStatus === 'COMPLETED') {
        status = TradeStatusEnum.COMPLETED;
      } else if (extractedStatus === 'CANCELLED') {
        status = TradeStatusEnum.CANCELLED;
      } else if (extractedStatus === 'LIQUIDATED') {
        // Use appropriate enum value based on what's available in TradeStatusEnum
        status = 'LIQUIDATED_MARGIN_CALL' in TradeStatusEnum 
          ? TradeStatusEnum.LIQUIDATED_MARGIN_CALL 
          : TradeStatusEnum.CANCELLED; // Fallback
      }

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
        data: { trades, filters: { tradeDirection, status } }
      };

      callback(responseContent);
      return responseContent;
    } catch (error) {
      elizaLogger.error('Error in GET_TRADES action:', error);
      
      const errorContent: Content = {
        text: `Error getting trades: ${error.message || String(error)}`,
        actions: ['GET_TRADES'],
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
          text: 'Get all my active trades',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Found 2 trades:\nID: 123, LONG btc, Status: ACTIVE, Leverage: 2x, Created: 4/1/2023, 10:30:00 AM\nID: 124, SHORT eth, Status: ACTIVE, Leverage: 3x, Created: 4/2/2023, 11:45:00 AM',
          actions: ['GET_TRADES'],
        },
      },
    ],
  ],
};
