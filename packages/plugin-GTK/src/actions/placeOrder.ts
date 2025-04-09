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

/**
 * Place Order Action
 */
export const placeOrderAction: Action = {
  name: 'PLACE_ORDER',
  similes: ['CREATE_TRADE', 'OPEN_POSITION', 'START_TRADE'],
  description: 'Places a new order for margin trading',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    // Simple validation - check if message contains required parameters
    const content = message.content.text?.toLowerCase() || '';
    return content.includes('place') && content.includes('order');
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
      logger.info('Handling PLACE_ORDER action');
      
      // Extract parameters from the message or options
      const {
        tokenType = DEFAULT_COLLATERAL_TYPE,
        tokenAmount = DEFAULT_COLLATERAL_AMOUNT,
        targetTokenType = DEFAULT_TARGET_TOKEN,
        tradeDirection = TradeDirectionEnum.LONG,
        leverage = DEFAULT_LEVERAGE,
        stopLoss = null,
        takeProfit = null,
        limitPrice = null
      } = options || {};

      // Get GTK service and client
      const gtkService = runtime.getService('gtk') as GTKService;
      const client = gtkService.getClient();

      // Place the order
      const result = await client.placeOrder(
        tokenType as CollateralTokenType,
        tokenAmount,
        targetTokenType as TargetTokenType,
        tradeDirection,
        leverage,
        stopLoss,
        takeProfit,
        limitPrice
      );

      // Create response
      const responseContent: Content = {
        text: result 
          ? `Order placed successfully! Transaction hash: ${result.transactionHash}` 
          : 'Failed to place order',
        actions: ['PLACE_ORDER'],
        source: message.content.source,
        data: result ? { transactionHash: result.transactionHash } : undefined
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in PLACE_ORDER action:', error);
      
      const errorContent: Content = {
        text: `Error placing order: ${error.message}`,
        actions: ['PLACE_ORDER'],
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
          text: 'Place a long order for 0.01 BTC with 2x leverage',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Order placed successfully! Transaction hash: 0x123...',
          actions: ['PLACE_ORDER'],
        },
      },
    ],
  ],
};
