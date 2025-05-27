import {
  type Action,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { JsonRpcProvider } from 'ethers';

/**
 * Get transaction count action for Polygon zkEVM
 * Retrieves the transaction count (nonce) for a specific address
 */
export const getTransactionCountAction: Action = {
  name: 'GET_TRANSACTION_COUNT_ZKEVM',
  similes: ['GET_NONCE', 'TRANSACTION_COUNT', 'NONCE', 'TX_COUNT'],
  description: 'Get transaction count (nonce) for an address on Polygon zkEVM',

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    // Check if we have the required configuration
    const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');
    const zkevmRpcUrl = process.env.ZKEVM_RPC_URL || runtime.getSetting('ZKEVM_RPC_URL');

    if (!alchemyApiKey && !zkevmRpcUrl) {
      logger.error('No Alchemy API key or zkEVM RPC URL configured');
      return false;
    }

    // Check if message contains an address and nonce/count request
    const text = message.content.text.toLowerCase();
    const hasAddress = /0x[a-fA-F0-9]{40}/.test(text);
    const hasCountRequest =
      text.includes('nonce') || text.includes('count') || text.includes('transaction count');

    return hasAddress && hasCountRequest;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback,
    responses: Memory[]
  ) => {
    try {
      logger.info('Handling GET_TRANSACTION_COUNT_ZKEVM action');

      // Extract address from message
      const text = message.content.text;
      const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);

      if (!addressMatch) {
        const errorContent: Content = {
          text: 'Please provide a valid Ethereum address (0x...) to get the transaction count.',
          actions: ['GET_TRANSACTION_COUNT_ZKEVM'],
          source: message.content.source,
        };
        await callback(errorContent);
        return errorContent;
      }

      const address = addressMatch[0];

      // Setup provider - prefer Alchemy, fallback to RPC
      let provider: JsonRpcProvider;
      const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');

      if (alchemyApiKey) {
        provider = new JsonRpcProvider(
          `https://polygonzkevm-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
        );
      } else {
        const zkevmRpcUrl =
          process.env.ZKEVM_RPC_URL ||
          runtime.getSetting('ZKEVM_RPC_URL') ||
          'https://zkevm-rpc.com';
        provider = new JsonRpcProvider(zkevmRpcUrl);
      }

      // Get transaction count for both latest and pending
      const [latestCount, pendingCount] = await Promise.all([
        provider.getTransactionCount(address, 'latest'),
        provider.getTransactionCount(address, 'pending'),
      ]);

      let responseText = `📊 Transaction Count for ${address}:
🔢 Latest: ${latestCount} transactions
⏳ Pending: ${pendingCount} transactions`;

      if (pendingCount > latestCount) {
        const pendingTxs = pendingCount - latestCount;
        responseText += `\n🚀 Pending Transactions: ${pendingTxs}`;
      }

      responseText += `\n\n💡 Next Nonce: ${pendingCount}`;

      const responseContent: Content = {
        text: responseText,
        actions: ['GET_TRANSACTION_COUNT_ZKEVM'],
        source: message.content.source,
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in GET_TRANSACTION_COUNT_ZKEVM action:', error);

      const errorContent: Content = {
        text: `Error getting transaction count: ${error instanceof Error ? error.message : 'Unknown error'}`,
        actions: ['GET_TRANSACTION_COUNT_ZKEVM'],
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
          text: 'What is the transaction count for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: `📊 Transaction Count for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6:
🔢 Latest: 42 transactions
⏳ Pending: 42 transactions

💡 Next Nonce: 42`,
          actions: ['GET_TRANSACTION_COUNT_ZKEVM'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Get nonce for 0x1234567890123456789012345678901234567890',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: `📊 Transaction Count for 0x1234567890123456789012345678901234567890:
🔢 Latest: 100 transactions
⏳ Pending: 102 transactions
🚀 Pending Transactions: 2

💡 Next Nonce: 102`,
          actions: ['GET_TRANSACTION_COUNT_ZKEVM'],
        },
      },
    ],
  ],
};
