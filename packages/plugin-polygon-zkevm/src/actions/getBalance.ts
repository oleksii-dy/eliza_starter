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
 * Get balance action for Polygon zkEVM
 * Retrieves the balance of a specific address
 */
export const getBalanceAction: Action = {
  name: 'GET_BALANCE_ZKEVM',
  similes: ['CHECK_BALANCE', 'BALANCE', 'GET_ETH_BALANCE', 'WALLET_BALANCE'],
  description: 'Get the balance of an address on Polygon zkEVM',

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    // Check if we have the required configuration
    const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');
    const zkevmRpcUrl = process.env.ZKEVM_RPC_URL || runtime.getSetting('ZKEVM_RPC_URL');

    if (!alchemyApiKey && !zkevmRpcUrl) {
      logger.error('No Alchemy API key or zkEVM RPC URL configured');
      return false;
    }

    // Check if message contains an address
    const text = message.content.text.toLowerCase();
    const hasAddress =
      /0x[a-fA-F0-9]{40}/.test(text) || text.includes('balance') || text.includes('eth');

    return hasAddress;
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
      logger.info('Handling GET_BALANCE_ZKEVM action');

      // Extract address from message
      const text = message.content.text;
      const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);

      if (!addressMatch) {
        const errorContent: Content = {
          text: 'Please provide a valid Ethereum address (0x...) to check the balance.',
          actions: ['GET_BALANCE_ZKEVM'],
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

      // Get balance
      const balance = await provider.getBalance(address);
      const balanceInEth = Number(balance) / 1e18;

      const responseContent: Content = {
        text: `Balance for address ${address}:\n${balanceInEth.toFixed(6)} ETH (${balance.toString()} wei)`,
        actions: ['GET_BALANCE_ZKEVM'],
        source: message.content.source,
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in GET_BALANCE_ZKEVM action:', error);

      const errorContent: Content = {
        text: `Error getting balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        actions: ['GET_BALANCE_ZKEVM'],
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
          text: 'What is the balance of 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Balance for address 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6:\n1.234567 ETH (1234567000000000000 wei)',
          actions: ['GET_BALANCE_ZKEVM'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Check balance for 0x1234567890123456789012345678901234567890',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Balance for address 0x1234567890123456789012345678901234567890:\n0.000000 ETH (0 wei)',
          actions: ['GET_BALANCE_ZKEVM'],
        },
      },
    ],
  ],
};
