import {
  type ActionExample,
  type HandlerCallback,
  elizaLogger,
  type IAgentRuntime,
  type Memory,
  type State,
  type Action,
  ModelType,
  composePrompt,
  parseKeyValueXml,
} from '@elizaos/core';
import { z } from 'zod';
import { walletProvider } from '../providers/wallet';
import { SwapService } from '../services/SwapService';
import { NearPluginError, formatErrorMessage, isNearError } from '../core/errors';
import type { SwapContent, SwapParams } from '../core/types';

export const SwapSchema = z.object({
  inputTokenId: z.string(),
  outputTokenId: z.string(),
  amount: z.string(),
});

const swapExtractionTemplate = `# Task: Extract token swap parameters from user message

# Recent Messages:
{{recentMessages}}

# Instructions:
Analyze the user's message to extract:
1. The input token (what they want to swap FROM)
2. The output token (what they want to swap TO)
3. The amount of input token to swap

Common token mappings:
- NEAR → wrap.testnet (on testnet) or wrap.near (on mainnet)
- USDC → usdc.fakes.testnet (on testnet)
- USDT → usdt.fakes.testnet (on testnet)
- DAI → dai.fakes.testnet (on testnet)
- REF → ref.fakes.testnet (on testnet)
- AURORA → aurora.fakes.testnet (on testnet)

Return the values in XML format:
<response>
  <inputTokenId>token-contract.near</inputTokenId>
  <outputTokenId>token-contract.near</outputTokenId>
  <amount>number as string</amount>
</response>

Examples:
- "Swap 10 NEAR for USDC"
<response>
  <inputTokenId>wrap.testnet</inputTokenId>
  <outputTokenId>usdc.fakes.testnet</outputTokenId>
  <amount>10</amount>
</response>

- "Exchange 100 USDC for REF"
<response>
  <inputTokenId>usdc.fakes.testnet</inputTokenId>
  <outputTokenId>ref.fakes.testnet</outputTokenId>
  <amount>100</amount>
</response>`;

export const executeSwap: Action = {
  name: 'EXECUTE_SWAP_NEAR',
  similes: ['SWAP_TOKENS_NEAR', 'TOKEN_SWAP_NEAR', 'TRADE_TOKENS_NEAR', 'EXCHANGE_TOKENS_NEAR'],
  validate: async (_runtime: IAgentRuntime, _message: Memory) => {
    return true;
  },
  description: 'Perform a token swap using Ref Finance on NEAR Protocol',
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<void> => {
    try {
      // Use LLM to extract swap parameters
      const prompt = composePrompt({
        state: {
          recentMessages: message.content.text || '',
        },
        template: swapExtractionTemplate,
      });

      const xmlResponse = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt,
      });

      // Parse XML response
      const extractedParams = parseKeyValueXml(xmlResponse);

      // Validate extraction
      if (
        !extractedParams ||
        !extractedParams.inputTokenId ||
        !extractedParams.outputTokenId ||
        !extractedParams.amount
      ) {
        elizaLogger.error('Failed to extract swap parameters', extractedParams);
        callback?.({
          text: 'I need to know which tokens to swap and the amount. For example: "Swap 10 NEAR for USDC"',
          content: { error: 'Missing required parameters' },
        });
        return;
      }

      // Get swap service
      const swapService = runtime.getService('near-swap' as any) as SwapService;

      if (!swapService) {
        throw new Error('Swap service not available');
      }

      // Get quote first
      elizaLogger.info(
        `Getting quote for swap: ${extractedParams.amount} ${extractedParams.inputTokenId} → ${extractedParams.outputTokenId}`
      );

      const params: SwapParams = {
        inputTokenId: extractedParams.inputTokenId,
        outputTokenId: extractedParams.outputTokenId,
        amount: extractedParams.amount,
      };

      const quote = await swapService.getQuote(params);

      // Check if price impact is acceptable
      if (quote.priceImpact > 0.05) {
        // 5% threshold
        callback?.({
          text: `Warning: This swap has high price impact (${(quote.priceImpact * 100).toFixed(2)}%). 
You'll receive approximately ${quote.route.outputAmount} ${quote.route.outputToken.symbol}.
Would you like to proceed?`,
          content: {
            quote,
            warning: 'high_price_impact',
          },
        });
        // In a real implementation, we'd wait for user confirmation
        return;
      }

      // Execute swap
      elizaLogger.info(
        `Executing swap: ${extractedParams.amount} ${extractedParams.inputTokenId} → ${extractedParams.outputTokenId}`
      );

      const result = await swapService.executeSwap(params);

      // Send success response
      callback?.({
        text: `Successfully swapped ${extractedParams.amount} ${quote.route.inputToken.symbol} for ${quote.route.outputAmount} ${quote.route.outputToken.symbol}`,
        content: {
          success: true,
          transactionHash: result.transactionHash,
          explorerUrl: result.explorerUrl,
          input: {
            token: quote.route.inputToken.symbol,
            amount: extractedParams.amount,
          },
          output: {
            token: quote.route.outputToken.symbol,
            amount: quote.route.outputAmount,
          },
          priceImpact: quote.priceImpact,
          route: quote.route.route,
        },
      });
    } catch (error) {
      elizaLogger.error('Error during token swap:', error);

      // Format error message
      let errorMessage = 'Error executing swap';
      if (isNearError(error)) {
        errorMessage = formatErrorMessage(error);
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      callback?.({
        text: errorMessage,
        content: {
          error: errorMessage,
          details: error,
        },
      });
    }
  },
  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Swap 10 NEAR for USDC',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll swap 10 NEAR for USDC...",
          action: 'EXECUTE_SWAP_NEAR',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Successfully swapped 10 NEAR for 245.67 USDC',
          content: {
            transactionHash: '8kL2m...',
            priceImpact: 0.003,
          },
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Exchange 100 USDC for REF tokens',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll exchange 100 USDC for REF tokens...",
          action: 'EXECUTE_SWAP_NEAR',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Successfully swapped 100 USDC for 1,234.56 REF',
          content: {
            route: ['usdc.fakes.testnet', 'wrap.testnet', 'ref.fakes.testnet'],
          },
        },
      },
    ],
  ],
};
