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
import { DEFAULT_TARGET_TOKEN } from '../constants';
import { z } from 'zod';
import { composeContext } from '../utils';
import { interestRateTemplate } from '../templates';
import { ModelClass } from '../core';

// Define schema for interest rate parameters
const InterestRateSchema = z.object({
  targetTokenType: z.string().default(DEFAULT_TARGET_TOKEN).describe('The token type to get interest rate for')
});

type InterestRateContent = z.infer<typeof InterestRateSchema>;

/**
 * Get Interest Rate Action
 */
export const getInterestRateAction: Action = {
  name: 'GET_INTEREST_RATE',
  similes: ['CHECK_INTEREST', 'INTEREST_RATE'],
  description: 'Gets the current interest rate for a specific token',

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
      elizaLogger.info('Handling GET_INTEREST_RATE action');
      
      // Compose context from state and template
      const context = composeContext({
        state,
        template: interestRateTemplate,
        userMessage: message.content.text || '',
      });

      // Use LLM to extract parameters
      const extractionResult = await generateObject({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
        schema: InterestRateSchema,
      });

      // Get token type, default to BTC if not specified
      const targetTokenType = (extractionResult?.object as InterestRateContent)?.targetTokenType || DEFAULT_TARGET_TOKEN;

      // Get GTK service and client
      const gtkService = runtime.getService('gtk') as GTKService;
      const client = gtkService.getClient();
      // Ensure targetTokenType is a valid token type
      const validTokenTypes = ["btc", "atom", "eth", "icp", "trx", "sol", "near", "link", "doge", "avax", "matic", "fil", "sui", "wld", "apt", "xrp", "crv", "op", "ada", "arb", "bch", "etc", "sei", "bnb"];
      const normalizedTokenType = targetTokenType.toLowerCase() as "btc" | "atom" | "eth" | "icp" | "trx" | "sol" | "near" | "link" | "doge" | "avax" | "matic" | "fil" | "sui" | "wld" | "apt" | "xrp" | "crv" | "op" | "ada" | "arb" | "bch" | "etc" | "sei" | "bnb";

      if (!validTokenTypes.includes(normalizedTokenType)) {
        throw new Error(`Invalid token type: ${targetTokenType}. Valid types are: ${validTokenTypes.join(', ')}`);
      }

      // Get interest rate
      const interestRate = await client.getCurrentInterestRate(normalizedTokenType);

      // Create response
      const responseContent: Content = {
        text: `Current interest rate for ${normalizedTokenType.toUpperCase()}: ${interestRate}%`,
        actions: ['GET_INTEREST_RATE'],
        source: message.content.source,
        data: { interestRate, targetTokenType }
      };

      callback(responseContent);
      return responseContent;
    } catch (error) {
      elizaLogger.error('Error in GET_INTEREST_RATE action:', error);
      
      const errorContent: Content = {
        text: `Error getting interest rate: ${error.message || String(error)}`,
        actions: ['GET_INTEREST_RATE'],
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
          text: 'What is the current interest rate for BTC?',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Current interest rate for BTC: 0.5%',
          actions: ['GET_INTEREST_RATE'],
        },
      },
    ],
  ],
};
