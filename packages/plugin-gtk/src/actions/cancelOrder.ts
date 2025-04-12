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
import { composeContext } from '../utils';
import { cancelOrderTemplate } from '../templates';
import { CancelOrderSchema, type CancelOrderContent } from '../types';

/**
 * Cancel Order Action
 */
export const cancelOrderAction: Action = {
  name: 'CANCEL_ORDER',
  similes: ['ABORT_TRADE', 'CANCEL_TRADE'],
  description: 'Cancels a pending order',

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
      elizaLogger.info('Handling CANCEL_ORDER action');
      
      // Compose context from state and template
      const context = composeContext({
        state,
        template: cancelOrderTemplate,
        userMessage: message.content.text || '',
      });

      // Use LLM to extract parameters using the actual generateObject from 'ai'
      const extractedObject = await runtime.useModel(
        ModelType.OBJECT_LARGE,
        {
          prompt: context,
          schema: CancelOrderSchema, 
        }
      );

      if (!extractedObject) {
        const response: Content = {
          text: 'Failed to extract trade details. Please provide a trade ID to cancel.',
        };
        callback(response);
        return response;
      }

      const { tradeId } = extractedObject as CancelOrderContent;
      
      // Validate extracted parameters
      if (!tradeId) {
        const response: Content = {
          text: 'Please provide a trade ID to cancel. For example: "Cancel order #123"',
        };
        callback(response);
        return response;
      }

      // Get GTK service and client
      const gtkService = runtime.getService('gtk') as GTKService;
      const client = gtkService.getClient();

      // Cancel the order
      const cancelResult = await client.cancelOrder(tradeId);

      // Create response
      const responseContent: Content = {
        text: cancelResult 
          ? `Order #${tradeId} cancelled successfully! Transaction hash: ${cancelResult.transactionHash}` 
          : `Failed to cancel order #${tradeId}`,
        actions: ['CANCEL_ORDER'],
        source: message.content.source,
        data: cancelResult ? { transactionHash: cancelResult.transactionHash } : undefined
      };

      callback(responseContent);
      return responseContent;
    } catch (error) {
      elizaLogger.error('Error in CANCEL_ORDER action:', error);
      
      const errorContent: Content = {
        text: `Error cancelling order: ${error.message || String(error)}`,
        actions: ['CANCEL_ORDER'],
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
          text: 'Abort trade #789',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Order #789 cancelled successfully! Transaction hash: 0x789...',
          actions: ['CANCEL_ORDER'],
        },
      },
    ],
  ],
};
