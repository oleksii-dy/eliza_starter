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
import { closeOrderTemplate } from '../templates';
import { CloseOrderSchema, type CloseOrderContent } from '../types';

/**
 * Close Order Action
 */
export const closeOrderAction: Action = {
  name: 'CLOSE_ORDER',
  similes: ['EXIT_TRADE', 'CLOSE_POSITION', 'END_TRADE'],
  description: 'Closes an existing order/trade',

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
      elizaLogger.info('Handling CLOSE_ORDER action');
      
      // Compose context from state and template
      const context = composeContext({
        state,
        template: closeOrderTemplate,
        userMessage: message.content.text || '',
      });

      // Use runtime.useModel for parameter extraction
      const extractedObject = await runtime.useModel(
        ModelType.OBJECT_LARGE, 
        {
          prompt: context,
          schema: CloseOrderSchema, 
        }
      );

      if (!extractedObject) {
        const response: Content = {
          text: 'Failed to extract trade details. Please provide a trade ID to close.',
        };
        callback(response);
        return response;
      }

      // Cast the result directly
      const { tradeId } = extractedObject as CloseOrderContent;
      
      // Validate extracted parameters
      if (!tradeId) {
        const response: Content = {
          text: 'Please provide a trade ID to close. For example: "Close order #123"',
        };
        callback(response);
        return response;
      }

      // Get GTK service and client
      const gtkService = runtime.getService('gtk') as GTKService;
      const client = gtkService.getClient();

      // Close the order
      const closeResult = await client.closeOrder(tradeId);

      // Create response
      const responseContent: Content = {
        text: closeResult 
          ? `Order #${tradeId} closed successfully! Transaction hash: ${closeResult.transactionHash}` 
          : `Failed to close order #${tradeId}`,
        actions: ['CLOSE_ORDER'],
        source: message.content.source,
        data: closeResult ? { transactionHash: closeResult.transactionHash } : undefined
      };

      callback(responseContent);
      return responseContent;
    } catch (error) {
      elizaLogger.error('Error in CLOSE_ORDER action:', error);
      
      const errorContent: Content = {
        text: `Error closing order: ${error.message || String(error)}`,
        actions: ['CLOSE_ORDER'],
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
          text: 'Close my trade with ID 123',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Order #123 closed successfully! Transaction hash: 0x123...',
          actions: ['CLOSE_ORDER'],
        },
      },
    ],
  ],
};

