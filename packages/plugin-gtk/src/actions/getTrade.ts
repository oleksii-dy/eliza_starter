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
import { z } from 'zod';
import { composeContext } from '../utils';
import { getTradeTemplate } from '../templates';

// Define schema for get trade parameters
const GetTradeSchema = z.object({
  tradeId: z.number().describe('The ID of the trade to retrieve details for')
});

type GetTradeContent = z.infer<typeof GetTradeSchema>;

/**
 * Get Trade Action
 */
export const getTradeAction: Action = {
  name: 'GET_TRADE',
  similes: ['TRADE_DETAILS', 'VIEW_TRADE', 'SHOW_TRADE'],
  description: 'Gets details of a specific trade by ID',

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
      elizaLogger.info('Handling GET_TRADE action');
      
      // Compose context from state and template
      const context = composeContext({
        state,
        template: getTradeTemplate,
        userMessage: message.content.text || '',
      });

      // Use LLM to extract parameters
      const extractedObject = await runtime.useModel(
        ModelType.OBJECT_LARGE,
        {
          prompt: context,
          schema: GetTradeSchema,
        }
      );

      if (!extractedObject) {
        const response: Content = {
          text: 'Please provide a trade ID to view. For example: "Show me trade #123"',
        };
        callback(response);
        return response;
      }

      const { tradeId } = extractedObject as GetTradeContent;
      
      if (!tradeId) {
        const response: Content = {
          text: 'Please provide a valid trade ID. For example: "Show me trade #123"',
        };
        callback(response);
        return response;
      }

      // Get GTK service and client
      const gtkService = runtime.getService('gtk') as GTKService;
      const client = gtkService.getClient();

      // Get trade details
      const trade = await client.getTrade(Number(tradeId));

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
        data: { trade, tradeId }
      };

      callback(responseContent);
      return responseContent;
    } catch (error) {
      elizaLogger.error('Error in GET_TRADE action:', error);
      
      const errorContent: Content = {
        text: `Error getting trade details: ${error.message || String(error)}`,
        actions: ['GET_TRADE'],
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
          text: 'Show me the details of trade ID 123',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Trade #123 Details:\nType: LONG btc\nStatus: ACTIVE\nCollateral: 0.01 usdc\nLeverage: 2x\nEntry Price: 45000\nCreated: 4/1/2023, 10:30:00 AM\nTrader: sif1abc...\nP&L: +0.005',
          actions: ['GET_TRADE'],
        },
      },
    ],
  ],
};
