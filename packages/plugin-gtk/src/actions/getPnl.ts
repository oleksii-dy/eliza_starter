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
import { PnlTypeEnum } from '@sifchain/gtk-api';
import { z } from 'zod';
import { composeContext } from '../utils';
import { pnlTemplate } from '../templates';

// Define schema for PnL parameters
const PnlSchema = z.object({
  pnlType: z.enum(['OVERALL', 'REALIZED', 'UNREALIZED']).default('OVERALL').describe('The type of PnL to retrieve')
});

type PnlContent = z.infer<typeof PnlSchema>;

/**
 * Get PnL Action
 */
export const getPnlAction: Action = {
  name: 'GET_PNL',
  similes: ['PROFIT_LOSS', 'CALCULATE_PNL', 'TRADING_PERFORMANCE'],
  description: 'Gets the profit and loss information',

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
      elizaLogger.info('Handling GET_PNL action');
      
      // Compose context from state and template
      const context = composeContext({
        state,
        template: pnlTemplate,
        userMessage: message.content.text || '',
      });

      // Use LLM to extract parameters
      const extractedObject = await runtime.useModel(
        ModelType.OBJECT_LARGE,
        {
          prompt: context,
          schema: PnlSchema,
        }
      );

      // Determine PnL type
      let pnlType = PnlTypeEnum.OVERALL;
      const extractedPnlType = (extractedObject as PnlContent)?.pnlType;
      
      if (extractedPnlType === 'REALIZED') {
        pnlType = PnlTypeEnum.REALIZED;
      } else if (extractedPnlType === 'UNREALIZED') {
        pnlType = PnlTypeEnum.UNREALIZED;
      }

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
        data: { pnl, pnlType }
      };

      callback(responseContent);
      return responseContent;
    } catch (error) {
      elizaLogger.error('Error in GET_PNL action:', error);
      
      const errorContent: Content = {
        text: `Error getting PnL: ${error.message || String(error)}`,
        actions: ['GET_PNL'],
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
          text: 'What is my overall PnL?',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'OVERALL Profit & Loss:\nbtc: +0.05\neth: -0.02\nusdc: +100',
          actions: ['GET_PNL'],
        },
      },
    ],
  ],
};
