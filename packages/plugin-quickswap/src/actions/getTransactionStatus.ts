import { Action, IAgentRuntime, logger, Memory, composePromptFromState } from '@elizaos/core';
import { z } from 'zod';
import { callLLMWithTimeout } from '../utils/llmHelpers.js';
import { transactionStatusTemplate } from '../templates/transactionStatusTemplate.js';
import { initializeQuickswapClient } from '../utils/quickswapClient.js';

interface GetTransactionStatusParams {
  transactionHash: string;
}

/**
 * M5-06: Simulates fetching the status of a Quickswap transaction.
 */
export const getTransactionStatusAction: Action = {
  name: 'getTransactionStatus',
  similes: [
    'CHECK_TRANSACTION_STATUS',
    'GET_TX_STATUS',
    'LOOKUP_TRANSACTION',
    'VERIFY_TRANSACTION',
  ],
  description:
    'Simulates fetching the current status of a transaction on Quickswap using its hash.',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    return true; // Defer detailed validation to handler after LLM extraction
  },
  handler: async (runtime: IAgentRuntime, message: Memory) => {
    logger.info(
      `[getTransactionStatusAction] Handler called for message: "${message.content?.text}"`
    );

    let transactionHash: string;

    try {
      // Use LLM to extract parameters
      const llmResult = await callLLMWithTimeout<GetTransactionStatusParams & { error?: string }>(
        runtime,
        null,
        transactionStatusTemplate,
        'getTransactionStatusAction',
        message.content?.text || ''
      );

      logger.info('[getTransactionStatusAction] LLM result:', JSON.stringify(llmResult));

      if (llmResult?.error || !llmResult?.transactionHash) {
        throw new Error('Required transaction hash parameter not found by LLM');
      }
      transactionHash = llmResult.transactionHash;
    } catch (error) {
      logger.warn('[getTransactionStatusAction] LLM extraction failed, trying regex fallback');

      // Fallback to regex extraction
      const text = message.content?.text || '';

      const hashMatch = text.match(/0x[0-9a-fA-F]{64}/);

      if (hashMatch && hashMatch[0]) {
        transactionHash = hashMatch[0];
      } else {
        const errorMessage =
          'Please provide a valid transaction hash (a 64-character hexadecimal string starting with 0x).';
        logger.error(`[getTransactionStatusAction] Parameter extraction failed`);

        return {
          text: `❌ **Error**: ${errorMessage}\n\nExamples:\n• "What is the status of transaction 0x..."\n• "Check tx 0x..."\n\n**Required parameters:**\n- Transaction Hash`,
          actions: ['getTransactionStatus'],
          data: { error: errorMessage },
        };
      }
    }

    // Validate transaction hash format (basic check)
    if (!/^0x[0-9a-fA-F]{64}$/.test(transactionHash)) {
      return {
        message:
          'Invalid transaction hash format. It must be a 64-character hexadecimal string starting with 0x.',
        details: {
          status: 'error',
          error: 'Invalid transaction hash format',
        },
      };
    }

    try {
      const quickswapClient = await initializeQuickswapClient(runtime);

      // Simulate get transaction status logic using the client
      const transactionStatusResult =
        await quickswapClient.simulateGetTransactionStatus(transactionHash);

      if (transactionStatusResult && transactionStatusResult.success) {
        let responseText = `✅ **Transaction Status Fetched Successfully**\n\n**Transaction Details:**\n• **Hash**: ${transactionHash}\n• **Status**: ${transactionStatusResult.status?.toUpperCase()}`;

        if (transactionStatusResult.status === 'success') {
          responseText += `\n• **Block Number**: ${transactionStatusResult.blockNumber}\n• **Gas Used**: ${transactionStatusResult.gasUsed}\n• **From**: ${transactionStatusResult.from}\n• **To**: ${transactionStatusResult.to}\n• **Value**: ${transactionStatusResult.value}`;
        }

        return {
          text: responseText,
          actions: ['getTransactionStatus'],
          data: {
            success: true,
            transactionDetails: transactionStatusResult,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        const errorMessage =
          transactionStatusResult?.error ||
          `Transaction '${transactionHash}' status could not be retrieved or transaction is unknown.`;
        return {
          text: `❌ **Error**: ${errorMessage}\n\nPlease verify the transaction hash and try again.`,
          actions: ['getTransactionStatus'],
          data: {
            success: false,
            error: errorMessage,
            transactionHash,
            timestamp: new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error occurred while fetching transaction status';
      logger.error(`[getTransactionStatusAction] Error fetching transaction status:`, error);

      return {
        text: `❌ **Error**: ${errorMessage}\n\nPlease check your configuration and try again. Make sure:\n• Quickswap API URL is properly configured\n• Network connection is stable`,
        actions: ['getTransactionStatus'],
        data: {
          error: errorMessage,
          transactionHash,
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
          text: 'Get status for transaction 0x123...abc',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: 'Checking transaction status for 0x123...abc...',
          action: 'getTransactionStatus',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Is tx 0xdef...789 confirmed?',
        },
      },
      {
        name: '{{user2}} ',
        content: {
          text: 'Retrieving transaction confirmation status...',
          action: 'getTransactionStatus',
        },
      },
    ],
  ],
};
