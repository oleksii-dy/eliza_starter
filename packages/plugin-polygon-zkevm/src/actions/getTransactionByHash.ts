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
 * Get transaction by hash action for Polygon zkEVM
 * Retrieves transaction details by transaction hash
 */
export const getTransactionByHashAction: Action = {
  name: 'GET_TRANSACTION_BY_HASH_ZKEVM',
  similes: ['GET_TX', 'TRANSACTION_DETAILS', 'TX_INFO', 'TRANSACTION_BY_HASH'],
  description: 'Get transaction details by hash on Polygon zkEVM',

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    // Check if we have the required configuration
    const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');
    const zkevmRpcUrl = process.env.ZKEVM_RPC_URL || runtime.getSetting('ZKEVM_RPC_URL');

    if (!alchemyApiKey && !zkevmRpcUrl) {
      logger.error('No Alchemy API key or zkEVM RPC URL configured');
      return false;
    }

    // Check if message contains a transaction hash
    const text = message.content.text.toLowerCase();
    const hasTxHash =
      /0x[a-fA-F0-9]{64}/.test(text) || text.includes('transaction') || text.includes('tx');

    return hasTxHash;
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
      logger.info('Handling GET_TRANSACTION_BY_HASH_ZKEVM action');

      // Extract transaction hash from message
      const text = message.content.text;
      const txHashMatch = text.match(/0x[a-fA-F0-9]{64}/);

      if (!txHashMatch) {
        const errorContent: Content = {
          text: 'Please provide a valid transaction hash (0x... 64 characters) to get transaction details.',
          actions: ['GET_TRANSACTION_BY_HASH_ZKEVM'],
          source: message.content.source,
        };
        await callback(errorContent);
        return errorContent;
      }

      const txHash = txHashMatch[0];

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

      // Get transaction details
      const transaction = await provider.getTransaction(txHash);

      if (!transaction) {
        const errorContent: Content = {
          text: `Transaction not found: ${txHash}`,
          actions: ['GET_TRANSACTION_BY_HASH_ZKEVM'],
          source: message.content.source,
        };
        await callback(errorContent);
        return errorContent;
      }

      // Format transaction details
      const valueInEth = Number(transaction.value) / 1e18;
      const gasPriceInGwei = transaction.gasPrice ? Number(transaction.gasPrice) / 1e9 : 'N/A';

      const responseContent: Content = {
        text: `Transaction Details for ${txHash}:
📋 Hash: ${transaction.hash}
🔗 Block: ${transaction.blockNumber || 'Pending'}
📍 From: ${transaction.from}
📍 To: ${transaction.to || 'Contract Creation'}
💰 Value: ${valueInEth.toFixed(6)} ETH
⛽ Gas Limit: ${transaction.gasLimit?.toString() || 'N/A'}
💸 Gas Price: ${gasPriceInGwei} Gwei
🔢 Nonce: ${transaction.nonce}
📊 Status: ${transaction.blockNumber ? 'Confirmed' : 'Pending'}`,
        actions: ['GET_TRANSACTION_BY_HASH_ZKEVM'],
        source: message.content.source,
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in GET_TRANSACTION_BY_HASH_ZKEVM action:', error);

      const errorContent: Content = {
        text: `Error getting transaction details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        actions: ['GET_TRANSACTION_BY_HASH_ZKEVM'],
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
          text: 'Get transaction details for 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: `Transaction Details for 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef:
📋 Hash: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
🔗 Block: 12345
📍 From: 0xabc123...
📍 To: 0xdef456...
💰 Value: 1.000000 ETH
⛽ Gas Limit: 21000
💸 Gas Price: 20 Gwei
🔢 Nonce: 42
📊 Status: Confirmed`,
          actions: ['GET_TRANSACTION_BY_HASH_ZKEVM'],
        },
      },
    ],
  ],
};
