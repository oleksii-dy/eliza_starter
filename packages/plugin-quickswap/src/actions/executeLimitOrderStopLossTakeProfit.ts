import { Action, IAgentRuntime, logger, Memory, composePromptFromState } from '@elizaos/core';
import { z } from 'zod';
import { callLLMWithTimeout } from '../utils/llmHelpers.js';
import { executeLimitOrderStopLossTakeProfitTemplate } from '../templates/executeLimitOrderStopLossTakeProfitTemplate.js';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';

interface ExecuteLimitOrderStopLossTakeProfitParams {
  tradeType: 'limit' | 'stop-loss' | 'take-profit';
  inputTokenSymbolOrAddress: string;
  outputTokenSymbolOrAddress: string;
  amount: string;
  price: string;
  stopPrice?: string;
  takeProfitPrice?: string;
}

/**
 * M5-10: Executes a limit order, stop-loss order, or take-profit order on Quickswap.
 */
export const executeLimitOrderStopLossTakeProfitAction: Action = {
  name: 'executeLimitOrderStopLossTakeProfit',
  similes: [
    'EXECUTE_TRADE_ORDER',
    'PLACE_LIMIT_ORDER',
    'SET_STOP_LOSS',
    'SET_TAKE_PROFIT',
    'AUTOMATE_TRADE',
  ],
  description:
    'Executes a limit, stop-loss, or take-profit order for a specified token pair on Quickswap.',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true;
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    logger.info(
      `[executeLimitOrderStopLossTakeProfitAction] Handler called for message: "${message.content?.text}"`
    );

    let params: ExecuteLimitOrderStopLossTakeProfitParams;

    try {
      const llmResult = await callLLMWithTimeout<
        ExecuteLimitOrderStopLossTakeProfitParams & { error?: string }
      >(
        runtime,
        null,
        executeLimitOrderStopLossTakeProfitTemplate,
        'executeLimitOrderStopLossTakeProfitAction',
        message.content?.text || ''
      );

      logger.info(
        '[executeLimitOrderStopLossTakeProfitAction] LLM result:',
        JSON.stringify(llmResult)
      );

      if (
        llmResult?.error ||
        !llmResult?.tradeType ||
        !llmResult?.inputTokenSymbolOrAddress ||
        !llmResult?.outputTokenSymbolOrAddress ||
        !llmResult?.amount ||
        !llmResult?.price
      ) {
        throw new Error('Required order parameters not found by LLM');
      }
      params = llmResult;
    } catch (error) {
      logger.warn(
        '[executeLimitOrderStopLossTakeProfitAction] LLM extraction failed, trying regex fallback'
      );

      const text = message.content?.text || '';
      // Very simplified regex for demonstration, actual implementation would be more robust
      const limitOrderMatch = text.match(
        /limit\s+order\s+to\s+buy\s+(\d+\.?\d*)\s+([a-zA-Z0-9]+)\s+with\s+([a-zA-Z0-9]+)\s+at\s+(\d+\.?\d*)/i
      );
      const stopLossMatch = text.match(
        /stop-loss\s+sell\s+(\d+\.?\d*)\s+([a-zA-Z0-9]+)\s+if\s+price\s+drops\s+to\s+(\d+\.?\d*)/i
      );
      const takeProfitMatch = text.match(
        /take-profit\s+sell\s+(\d+\.?\d*)\s+([a-zA-Z0-9]+)\s+if\s+price\s+rises\s+to\s+(\d+\.?\d*)/i
      );

      if (limitOrderMatch && limitOrderMatch.length >= 5) {
        params = {
          tradeType: 'limit',
          amount: limitOrderMatch[1],
          outputTokenSymbolOrAddress: limitOrderMatch[2],
          inputTokenSymbolOrAddress: limitOrderMatch[3],
          price: limitOrderMatch[4],
        };
      } else if (stopLossMatch && stopLossMatch.length >= 4) {
        params = {
          tradeType: 'stop-loss',
          amount: stopLossMatch[1],
          inputTokenSymbolOrAddress: stopLossMatch[2],
          outputTokenSymbolOrAddress: 'USDC', // Placeholder, would need to be extracted or inferred
          price: '0', // Not directly used for stop-loss execution price here, but required by interface
          stopPrice: stopLossMatch[3],
        };
      } else if (takeProfitMatch && takeProfitMatch.length >= 4) {
        params = {
          tradeType: 'take-profit',
          amount: takeProfitMatch[1],
          inputTokenSymbolOrAddress: takeProfitMatch[2],
          outputTokenSymbolOrAddress: 'USDC', // Placeholder
          price: '0', // Not directly used for take-profit execution price here, but required by interface
          takeProfitPrice: takeProfitMatch[3],
        };
      } else {
        const errorMessage =
          'Please specify the trade type (limit, stop-loss, take-profit), token pair, amount, and relevant price (e.g., "place a limit order to buy 10 WMATIC with USDC at 0.5").';
        logger.error(`[executeLimitOrderStopLossTakeProfitAction] Parameter extraction failed`);
        return {
          text: `❌ **Error**: ${errorMessage}\n\nExamples:\n• "Place a limit order to buy 10 WMATIC with USDC at 0.5"
• "Set a stop-loss to sell 5 ETH if price drops to 1800"
• "Set a take-profit to sell 2 BTC if price rises to 30000"

**Required parameters:**
- Trade Type (limit, stop-loss, take-profit)
- Input Token Symbol/Address
- Output Token Symbol/Address
- Amount
- Price (for limit orders); Stop Price (for stop-loss); Take Profit Price (for take-profit)`,
          actions: ['executeLimitOrderStopLossTakeProfit'],
          data: { error: errorMessage },
        };
      }
    }

    try {
      const quickswapClient = await initializeQuickswapClient(runtime);
      // Simulate order execution logic
      const orderResult = await quickswapClient.simulateExecuteOrder(params);

      if (orderResult && orderResult.success) {
        const responseText = `✅ **${params.tradeType.toUpperCase()} Order Executed Successfully**\n\n**Order Details:**\n• **Trade Type**: ${params.tradeType.toUpperCase()}\n• **Input Token**: ${params.inputTokenSymbolOrAddress.toUpperCase()}\n• **Output Token**: ${params.outputTokenSymbolOrAddress.toUpperCase()}\n• **Amount**: ${params.amount}\n• **Price**: ${params.price}\n${params.stopPrice ? `• **Stop Price**: ${params.stopPrice}\n` : ''}${params.takeProfitPrice ? `• **Take Profit Price**: ${params.takeProfitPrice}\n` : ''}• **Transaction Hash**: ${orderResult.transactionHash}\n• **Platform**: Quickswap`;

        return {
          text: responseText,
          actions: ['executeLimitOrderStopLossTakeProfit'],
          data: {
            success: true,
            orderDetails: orderResult,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        const errorMessage =
          orderResult?.error || `Executing ${params.tradeType} order failed or is not supported.`;
        return {
          text: `❌ **Error**: ${errorMessage}\n\nPlease verify order parameters and try again.`,
          actions: ['executeLimitOrderStopLossTakeProfit'],
          data: {
            success: false,
            error: errorMessage,
            params,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred while executing order';
      logger.error(`[executeLimitOrderStopLossTakeProfitAction] Error executing order:`, error);

      return {
        text: `❌ **Error**: ${errorMessage}\n\nPlease check your configuration and try again.`,
        actions: ['executeLimitOrderStopLossTakeProfit'],
        data: {
          error: errorMessage,
          params,
          timestamp: new Date().toISOString(),
        },
      };
    }
  },
  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Place a limit order to buy 10 WMATIC with 5 USDC at a price of 0.5',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: 'Executing limit order...',
          action: 'executeLimitOrderStopLossTakeProfit',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Set a stop-loss to sell 5 ETH if the price drops to 1800',
        },
      },
      {
        name: '{{user2}} ',
        content: {
          text: 'Setting stop-loss order...',
          action: 'executeLimitOrderStopLossTakeProfit',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Set a take-profit to sell 2 BTC if the price rises to 30000',
        },
      },
      {
        name: '{{user2}} ',
        content: {
          text: 'Setting take-profit order...',
          action: 'executeLimitOrderStopLossTakeProfit',
        },
      },
    ],
  ],
};
