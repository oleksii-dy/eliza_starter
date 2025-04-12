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
import { 
  TradeDirectionEnum, 
  CollateralTokenType, 
  TargetTokenType 
} from '@sifchain/gtk-api';
import { composeContext } from '../utils';
import { placeOrderTemplate } from '../templates';
import { PlaceOrderSchema, type PlaceOrderContent } from '../types';

/**
 * Place Order Action
 */
export const placeOrderAction: Action = {
  name: 'PLACE_ORDER',
  similes: ['CREATE_TRADE', 'OPEN_POSITION', 'START_TRADE'],
  description: 'Places a new order for margin trading',

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
      elizaLogger.info('Handling PLACE_ORDER action');
      
      // Compose context from state and template
      const context = composeContext({
        state,
        template: placeOrderTemplate,
        userMessage: message.content.text || '',
      });

      // Use LLM to extract parameters
      const extractedObject = await runtime.useModel(
        ModelType.OBJECT_LARGE,
        {
          prompt: context,
          schema: PlaceOrderSchema,
        }
      );

      if (!extractedObject) {
        const response: Content = {
          text: 'Failed to extract order details. Please provide information like the token type, amount, and leverage.',
        };
        callback(response);
        return response;
      }

      const { 
        tokenType,
        tokenAmount,
        targetTokenType,
        tradeDirection,
        leverage,
        stopLoss,
        takeProfit,
        limitPrice,
      } = extractedObject as PlaceOrderContent;

      // Get GTK service and client
      const gtkService = runtime.getService('gtk') as GTKService;
      const client = gtkService.getClient();

      // Place the order
      const orderResult = await client.placeOrder(
        tokenType as CollateralTokenType,
        tokenAmount,
        targetTokenType as TargetTokenType,
        tradeDirection === 'LONG' ? TradeDirectionEnum.LONG : TradeDirectionEnum.SHORT,
        leverage,
        stopLoss,
        takeProfit,
        limitPrice
      );

      // Create response
      const responseContent: Content = {
        text: orderResult 
          ? `Order placed successfully! Transaction hash: ${orderResult.transactionHash}` 
          : 'Failed to place order',
        actions: ['PLACE_ORDER'],
        source: message.content.source,
        data: orderResult ? { transactionHash: orderResult.transactionHash } : undefined
      };

      callback(responseContent);
      return responseContent;
    } catch (error) {
      elizaLogger.error('Error in PLACE_ORDER action:', error);
      
      const errorContent: Content = {
        text: `Error placing order: ${error.message || String(error)}`,
        actions: ['PLACE_ORDER'],
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
          text: 'Place an order for 0.1 BTC with 2x leverage using USDC collateral',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Order placed successfully! Order ID: 789',
          actions: ['PLACE_ORDER'],
        },
      },
    ],
  ],
};
