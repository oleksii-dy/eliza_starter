import {
  type Action,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
  generateObject,
} from '@elizaos/core';
import { GTKService } from '../service';
import { 
  TradeDirectionEnum, 
  CollateralTokenType, 
  TargetTokenType 
} from '@sifchain/gtk-api';
import {
  DEFAULT_COLLATERAL_TYPE,
  DEFAULT_TARGET_TOKEN,
  DEFAULT_LEVERAGE,
  DEFAULT_COLLATERAL_AMOUNT
} from '../constants';
import { z } from 'zod';
import { composeContext } from '../utils';
import { placeOrderTemplate } from '../templates';
import { ModelClass } from '../core';

// Define schema for place order parameters
const PlaceOrderSchema = z.object({
  tokenType: z.string().default(DEFAULT_COLLATERAL_TYPE).describe('The type of collateral token to use'),
  tokenAmount: z.number().default(DEFAULT_COLLATERAL_AMOUNT).describe('The amount of collateral to use'),
  targetTokenType: z.string().default(DEFAULT_TARGET_TOKEN).describe('The target token type'),
  tradeDirection: z.enum(['LONG', 'SHORT']).default('LONG').describe('The direction of the trade'),
  leverage: z.number().default(DEFAULT_LEVERAGE).describe('The leverage to use'),
  stopLoss: z.number().optional().nullable().describe('Stop loss price level'),
  takeProfit: z.number().optional().nullable().describe('Take profit price level'),
  limitPrice: z.number().optional().nullable().describe('Limit price for the order')
});

type PlaceOrderContent = z.infer<typeof PlaceOrderSchema>;

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
      const extractionResult = await generateObject({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
        schema: PlaceOrderSchema,
      });

      if (!extractionResult.object) {
        const response: Content = {
          text: 'Failed to extract order details. Please provide information like the token type, amount, and leverage.',
        };
        callback(response);
        return response;
      }

      // Extract parameters with defaults
      const {
        tokenType = DEFAULT_COLLATERAL_TYPE,
        tokenAmount = DEFAULT_COLLATERAL_AMOUNT,
        targetTokenType = DEFAULT_TARGET_TOKEN,
        tradeDirection = 'LONG',
        leverage = DEFAULT_LEVERAGE,
        stopLoss = null,
        takeProfit = null,
        limitPrice = null
      } = extractionResult.object as PlaceOrderContent;

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
          text: 'Place a long order for 0.01 BTC with 2x leverage',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Order placed successfully! Transaction hash: 0x123...',
          actions: ['PLACE_ORDER'],
        },
      },
    ],
  ],
};
