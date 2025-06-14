import { Action, IAgentRuntime, logger, Memory, composePromptFromState } from '@elizaos/core';
import { z } from 'zod';
import { callLLMWithTimeout } from '../utils/llmHelpers.js';
import { fetchTransactionHistoryTemplate } from '../templates/fetchTransactionHistoryTemplate.js';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';

interface FetchTransactionHistoryParams {
  walletAddress: string;
  tokenSymbolOrAddress?: string;
  transactionType?: 'swap' | 'addLiquidity' | 'removeLiquidity';
  limit?: number;
}

/**
 * M5-15: Fetches the transaction history for a given wallet address, with optional filters.
 */
export const fetchTransactionHistoryAction: Action = {
  name: 'fetchTransactionHistory',
  similes: ['GET_TRANSACTION_LOGS', 'WALLET_ACTIVITY', 'TRADE_HISTORY', 'VIEW_PAST_DEALS'],
  description:
    'Retrieves the transaction history for a specified wallet address, with options to filter by token or transaction type.',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true;
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    logger.info(
      `[fetchTransactionHistoryAction] Handler called for message: "${message.content?.text}"`
    );

    let params: FetchTransactionHistoryParams;

    try {
      const llmResult = await callLLMWithTimeout<
        FetchTransactionHistoryParams & { error?: string }
      >(
        runtime,
        null,
        fetchTransactionHistoryTemplate,
        'fetchTransactionHistoryAction',
        message.content?.text || ''
      );

      logger.info('[fetchTransactionHistoryAction] LLM result:', JSON.stringify(llmResult));

      if (llmResult?.error || !llmResult?.walletAddress) {
        throw new Error('Required wallet address not found by LLM');
      }
      params = llmResult;
    } catch (error) {
      logger.warn('[fetchTransactionHistoryAction] LLM extraction failed, trying regex fallback');

      const text = message.content?.text || '';
      // Basic regex for wallet address, more robust validation would be needed
      const walletMatch = text.match(
        /(?:history|transactions)\\s+(?:for|of)?\\s+(0x[a-fA-F0-9]{40})/i
      );
      const tokenFilterMatch = text.match(/token\\s+([a-zA-Z0-9]+)/i);
      const typeFilterMatch = text.match(
        /(?:type|filter\\s+by)\\s+(swap|addLiquidity|removeLiquidity)/i
      );
      const limitMatch = text.match(/last\\s+(\\d+)\\s+transactions/i);

      if (walletMatch && walletMatch.length >= 2) {
        params = {
          walletAddress: walletMatch[1],
        };
        if (tokenFilterMatch && tokenFilterMatch.length >= 2) {
          params.tokenSymbolOrAddress = tokenFilterMatch[1];
        }
        if (typeFilterMatch && typeFilterMatch.length >= 2) {
          params.transactionType = typeFilterMatch[1] as
            | 'swap'
            | 'addLiquidity'
            | 'removeLiquidity';
        }
        if (limitMatch && limitMatch.length >= 2) {
          params.limit = parseInt(limitMatch[1], 10);
        }
      } else {
        const errorMessage =
          'Please specify the wallet address (e.g., "show transaction history for 0x123...abc").';
        logger.error(`[fetchTransactionHistoryAction] Parameter extraction failed`);
        return {
          text: `❌ **Error**: ${errorMessage}\n\nExamples:\n• "Fetch transaction history for 0xAbc123...xyz"\n• "Show me the last 10 swap transactions for 0xDef456...uvw with WMATIC"\n\n**Required parameters:**\n- Wallet Address\n- Optional: Token Symbol/Address, Transaction Type (swap, addLiquidity, removeLiquidity), Limit (number of transactions)`,
          actions: ['fetchTransactionHistory'],
          data: { error: errorMessage },
        };
      }
    }

    try {
      const quickswapClient = await initializeQuickswapClient(runtime);
      const transactionHistoryResult = await quickswapClient.simulateFetchTransactionHistory(
        params.walletAddress,
        params.tokenSymbolOrAddress,
        params.transactionType,
        params.limit
      );

      if (
        transactionHistoryResult &&
        transactionHistoryResult.success &&
        transactionHistoryResult.transactions &&
        transactionHistoryResult.transactions.length > 0
      ) {
        const transactionsList = transactionHistoryResult.transactions
          .map(
            (tx) =>
              `• Type: ${tx.type}, Hash: ${tx.hash.substring(0, 10)}..., Amount: ${tx.amount} ${tx.token}, Status: ${tx.status}`
          )
          .join('\n');
        const responseText = `📜 **Transaction History for Wallet ${params.walletAddress.substring(0, 10)}...**\n\n${transactionsList}\n\n• **Platform**: Quickswap (Simulated)`;

        return {
          text: responseText,
          actions: ['fetchTransactionHistory'],
          data: {
            success: true,
            walletAddress: params.walletAddress,
            filters: {
              token: params.tokenSymbolOrAddress,
              type: params.transactionType,
              limit: params.limit,
            },
            transactions: transactionHistoryResult.transactions,
            timestamp: new Date().toISOString(),
          },
        };
      } else if (
        transactionHistoryResult &&
        transactionHistoryResult.success &&
        (!transactionHistoryResult.transactions ||
          transactionHistoryResult.transactions.length === 0)
      ) {
        return {
          text: `ℹ️ **No Transaction History Found**\n\nNo transactions found for wallet ${params.walletAddress.substring(0, 10)}... with the given filters.\n\n• **Platform**: Quickswap (Simulated)`,
          actions: ['fetchTransactionHistory'],
          data: {
            success: true,
            walletAddress: params.walletAddress,
            filters: {
              token: params.tokenSymbolOrAddress,
              type: params.transactionType,
              limit: params.limit,
            },
            transactions: [],
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        const errorMessage =
          transactionHistoryResult?.error || 'Failed to fetch transaction history.';
        return {
          text: `❌ **Error**: ${errorMessage}\n\nPlease verify wallet address and filters and try again.`,
          actions: ['fetchTransactionHistory'],
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
        error instanceof Error
          ? error.message
          : 'Unknown error occurred while fetching transaction history';
      logger.error(`[fetchTransactionHistoryAction] Error fetching transaction history:`, error);

      return {
        text: `❌ **Error**: ${errorMessage}\n\nPlease check your configuration and try again.`,
        actions: ['fetchTransactionHistory'],
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
          text: 'Fetch transaction history for 0xAbc1234567890123456789012345678901234567',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: 'Fetching transaction history...',
          action: 'fetchTransactionHistory',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Show me the last 5 swap transactions for 0xDef4567890123456789012345678901234567890 with WMATIC',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: 'Fetching transaction history...',
          action: 'fetchTransactionHistory',
        },
      },
    ],
  ],
};
