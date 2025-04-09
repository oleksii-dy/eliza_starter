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
import { PnlTypeEnum } from '@sifchain/gtk-api';

/**
 * Get PnL Action
 */
export const getPnlAction: Action = {
  name: 'GET_PNL',
  similes: ['PROFIT_LOSS', 'CALCULATE_PNL', 'TRADING_PERFORMANCE'],
  description: 'Gets the profit and loss information',

  validate: async (_runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    const content = message.content.text?.toLowerCase() || '';
    return content.includes('pnl') || (content.includes('profit') && content.includes('loss'));
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
      logger.info('Handling GET_PNL action');
      
      // Extract parameters from options
      const { 
        pnlType = PnlTypeEnum.OVERALL
      } = options || {};

      // Get GTK service and client
      const gtkService = runtime.getService('gtk') as GTKService;
      const client = gtkService.getClient();

      // Get PnL
      const pnl = await client.getPnl(pnlType);

      // Create response
      let responseText = `${pnlType} Profit & Loss:\n`;
      
      if (Object.keys(pnl).length === 0) {
        responseText += 'No PnL data available.';
      } else {
        for (const [token, amount] of Object.entries(pnl)) {
          responseText += `${token}: ${amount > 0 ? '+' : ''}${amount}\n`;
        }
      }

      const responseContent: Content = {
        text: responseText,
        actions: ['GET_PNL'],
        source: message.content.source,
        data: { pnl }
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in GET_PNL action:', error);
      
      const errorContent: Content = {
        text: `Error getting PnL: ${error.message}`,
        actions: ['GET_PNL'],
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
          text: 'What is my overall PnL?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'OVERALL Profit & Loss:\nbtc: +0.05\neth: -0.02\nuusdc: +100',
          actions: ['GET_PNL'],
        },
      },
    ],
  ],
};
