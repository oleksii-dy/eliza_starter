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
 * Close Order Action
 */
export const closeOrderAction: Action = {
  name: 'CLOSE_ORDER',
  similes: ['EXIT_TRADE', 'CLOSE_POSITION', 'END_TRADE'],
  description: 'Closes an existing order/trade',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    const content = message.content.text?.toLowerCase() || '';
    return content.includes('close') && content.includes('order');
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
      logger.info('Handling CLOSE_ORDER action');
      
      // Extract trade ID from options
      const { tradeId } = options || {};
      
      if (!tradeId) {
        throw new Error('Trade ID is required to close an order');
      }

      // Get GTK service and client
      const gtkService = runtime.getService('gtk') as GTKService;
      const client = gtkService.getClient();

      // Close the order
      const result = await client.closeOrder(tradeId);

      // Create response
      const responseContent: Content = {
        text: result 
          ? `Order #${tradeId} closed successfully! Transaction hash: ${result.transactionHash}` 
          : `Failed to close order #${tradeId}`,
        actions: ['CLOSE_ORDER'],
        source: message.content.source,
        data: result ? { transactionHash: result.transactionHash } : undefined
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in CLOSE_ORDER action:', error);
      
      const errorContent: Content = {
        text: `Error closing order: ${error.message}`,
        actions: ['CLOSE_ORDER'],
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
          text: 'Close my trade with ID 123',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Order #123 closed successfully! Transaction hash: 0x123...',
          actions: ['CLOSE_ORDER'],
        },
      },
    ],
  ],
};
