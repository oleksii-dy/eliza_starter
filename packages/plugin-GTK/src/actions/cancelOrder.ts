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
 * Cancel Order Action
 */
export const cancelOrderAction: Action = {
  name: 'CANCEL_ORDER',
  similes: ['ABORT_TRADE', 'CANCEL_TRADE'],
  description: 'Cancels a pending order',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    const content = message.content.text?.toLowerCase() || '';
    return content.includes('cancel') && content.includes('order');
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
      logger.info('Handling CANCEL_ORDER action');
      
      // Extract trade ID from options
      const { tradeId } = options || {};
      
      if (!tradeId) {
        throw new Error('Trade ID is required to cancel an order');
      }

      // Get GTK service and client
      const gtkService = runtime.getService('gtk') as GTKService;
      const client = gtkService.getClient();

      // Cancel the order
      const result = await client.cancelOrder(tradeId);

      // Create response
      const responseContent: Content = {
        text: result 
          ? `Order #${tradeId} cancelled successfully! Transaction hash: ${result.transactionHash}` 
          : `Failed to cancel order #${tradeId}`,
        actions: ['CANCEL_ORDER'],
        source: message.content.source,
        data: result ? { transactionHash: result.transactionHash } : undefined
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in CANCEL_ORDER action:', error);
      
      const errorContent: Content = {
        text: `Error cancelling order: ${error.message}`,
        actions: ['CANCEL_ORDER'],
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
          text: 'Cancel my pending trade with ID 456',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Order #456 cancelled successfully! Transaction hash: 0x456...',
          actions: ['CANCEL_ORDER'],
        },
      },
    ],
  ],
};
