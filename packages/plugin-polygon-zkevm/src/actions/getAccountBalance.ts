import {
  type Action,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { JsonRpcProvider, Contract, formatUnits } from 'ethers';

// ERC-20 ABI for balanceOf function
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

interface TokenBalance {
  contract: string;
  balance: string;
  decimals?: number;
  symbol?: string;
  name?: string;
  balanceFormatted?: string;
}

interface AccountBalanceResult {
  address: string;
  native: string;
  nativeFormatted: string;
  tokens: TokenBalance[];
  method: 'alchemy' | 'rpc';
  timestamp: number;
}

/**
 * Get account balance action for Polygon zkEVM
 * Retrieves native ETH balance and ERC-20 token balances for a given address
 */
export const getAccountBalanceAction: Action = {
  name: 'GET_ACCOUNT_BALANCE',
  similes: [
    'GET_WALLET_BALANCE',
    'CHECK_ACCOUNT_BALANCE',
    'ACCOUNT_BALANCE',
    'WALLET_BALANCE',
    'GET_TOKEN_BALANCES',
    'CHECK_TOKENS',
    'BALANCE_CHECK',
    'GET_ALL_BALANCES',
  ],
  description:
    'Get comprehensive account balance including native ETH and ERC-20 token balances for a Polygon zkEVM address',

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    // Check if we have the required configuration
    const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');
    const zkevmRpcUrl = process.env.ZKEVM_RPC_URL || runtime.getSetting('ZKEVM_RPC_URL');

    if (!alchemyApiKey && !zkevmRpcUrl) {
      logger.error('No Alchemy API key or zkEVM RPC URL configured');
      return false;
    }

    // Check if message contains an address or balance-related keywords
    const text = message.content.text.toLowerCase();
    const hasAddress = /0x[a-fA-F0-9]{40}/.test(text);
    const hasBalanceKeywords =
      text.includes('balance') ||
      text.includes('wallet') ||
      text.includes('account') ||
      text.includes('token') ||
      text.includes('eth') ||
      text.includes('check');

    return hasAddress || hasBalanceKeywords;
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
      logger.info('💰 Handling GET_ACCOUNT_BALANCE action');

      // Extract address from message
      const text = message.content.text;
      const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);

      if (!addressMatch) {
        const errorContent: Content = {
          text: '❌ Please provide a valid Ethereum address (0x followed by 40 hexadecimal characters) to check account balance.',
          actions: ['GET_ACCOUNT_BALANCE'],
          source: message.content.source,
        };
        await callback(errorContent);
        return errorContent;
      }

      const address = addressMatch[0];
      logger.info(`💰 Getting account balance for address: ${address}`);

      // Extract token contract addresses if provided
      const tokenAddresses: string[] = [];
      const allAddresses = text.match(/0x[a-fA-F0-9]{40}/g) || [];
      // Skip the first address (account address) and treat rest as token contracts
      for (let i = 1; i < allAddresses.length; i++) {
        tokenAddresses.push(allAddresses[i]);
      }

      // Setup provider - prefer Alchemy, fallback to RPC
      let provider: JsonRpcProvider;
      let methodUsed: 'alchemy' | 'rpc' = 'rpc';
      const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');

      if (alchemyApiKey) {
        provider = new JsonRpcProvider(
          `https://polygonzkevm-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
        );
        methodUsed = 'alchemy';
        logger.info('🔗 Using Alchemy API for account balance');
      } else {
        const zkevmRpcUrl =
          process.env.ZKEVM_RPC_URL ||
          runtime.getSetting('ZKEVM_RPC_URL') ||
          'https://zkevm-rpc.com';
        provider = new JsonRpcProvider(zkevmRpcUrl);
        logger.info('🔗 Using direct RPC for account balance');
      }

      let nativeBalance = '0';
      const tokenBalances: TokenBalance[] = [];
      let errorMessages: string[] = [];

      // Get native ETH balance
      try {
        logger.info('💎 Fetching native ETH balance...');
        const balance = await provider.getBalance(address);
        nativeBalance = balance.toString();
        logger.info(`✅ Native balance retrieved: ${nativeBalance} wei`);
      } catch (error) {
        const errorMsg = `Failed to get native balance: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMsg);
        errorMessages.push(errorMsg);
      }

      // Get token balances if token addresses provided
      if (tokenAddresses.length > 0) {
        logger.info(`🪙 Fetching ${tokenAddresses.length} token balances...`);

        for (const tokenAddress of tokenAddresses) {
          try {
            logger.info(`🔍 Checking token: ${tokenAddress}`);

            const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);

            // Get token balance
            const balance = await tokenContract.balanceOf(address);

            // Try to get token metadata
            let decimals = 18;
            let symbol = 'UNKNOWN';
            let name = 'Unknown Token';

            try {
              decimals = await tokenContract.decimals();
              symbol = await tokenContract.symbol();
              name = await tokenContract.name();
            } catch (metadataError) {
              logger.warn(`Could not fetch metadata for token ${tokenAddress}:`, metadataError);
            }

            const balanceFormatted = formatUnits(balance, decimals);

            tokenBalances.push({
              contract: tokenAddress,
              balance: balance.toString(),
              decimals,
              symbol,
              name,
              balanceFormatted,
            });

            logger.info(`✅ Token ${symbol} balance: ${balanceFormatted}`);
          } catch (error) {
            const errorMsg = `Failed to get balance for token ${tokenAddress}: ${error instanceof Error ? error.message : String(error)}`;
            logger.error(errorMsg);
            errorMessages.push(errorMsg);

            // Add failed token with zero balance
            tokenBalances.push({
              contract: tokenAddress,
              balance: '0',
              decimals: 18,
              symbol: 'ERROR',
              name: 'Failed to load',
              balanceFormatted: '0',
            });
          }
        }
      }

      // Try fallback method if using Alchemy and native balance failed
      if (nativeBalance === '0' && methodUsed === 'alchemy' && errorMessages.length > 0) {
        logger.info('🔄 Attempting fallback to direct RPC for native balance...');
        try {
          const fallbackRpcUrl =
            process.env.ZKEVM_RPC_URL ||
            runtime.getSetting('ZKEVM_RPC_URL') ||
            'https://zkevm-rpc.com';
          const fallbackProvider = new JsonRpcProvider(fallbackRpcUrl);

          const fallbackBalance = await fallbackProvider.getBalance(address);
          nativeBalance = fallbackBalance.toString();
          methodUsed = 'rpc';
          logger.info('✅ Fallback successful for native balance');
        } catch (fallbackError) {
          const errorMsg = `Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`;
          logger.error(errorMsg);
          errorMessages.push(errorMsg);
        }
      }

      // Format native balance
      const nativeBalanceFormatted = formatUnits(nativeBalance, 18);

      // Create result object
      const result: AccountBalanceResult = {
        address,
        native: nativeBalance,
        nativeFormatted: nativeBalanceFormatted,
        tokens: tokenBalances,
        method: methodUsed,
        timestamp: Date.now(),
      };

      // Format response text
      let responseText = `💰 **Account Balance for ${address}**\n\n`;

      // Native balance
      responseText += `**Native ETH Balance:**\n`;
      responseText += `💎 ${nativeBalanceFormatted} ETH (${nativeBalance} wei)\n`;

      // Token balances
      if (tokenBalances.length > 0) {
        responseText += `\n**Token Balances:**\n`;
        for (const token of tokenBalances) {
          const emoji = token.symbol === 'ERROR' ? '❌' : '🪙';
          responseText += `${emoji} ${token.symbol}: ${token.balanceFormatted || '0'}\n`;
          if (token.name && token.name !== 'Unknown Token' && token.name !== 'Failed to load') {
            responseText += `   └─ ${token.name} (${token.contract})\n`;
          } else {
            responseText += `   └─ ${token.contract}\n`;
          }
        }
      } else {
        responseText += `\n💡 *No token addresses provided. Add token contract addresses to check ERC-20 balances.*\n`;
      }

      // Add method and error info
      responseText += `\n🔗 Retrieved via ${methodUsed === 'alchemy' ? 'Alchemy API' : 'Direct RPC'}`;

      if (errorMessages.length > 0) {
        responseText += `\n\n⚠️ Some errors occurred:\n${errorMessages
          .slice(0, 3)
          .map((msg) => `• ${msg}`)
          .join('\n')}`;
        if (errorMessages.length > 3) {
          responseText += `\n• ... and ${errorMessages.length - 3} more errors`;
        }
      }

      const responseContent: Content = {
        text: responseText,
        actions: ['GET_ACCOUNT_BALANCE'],
        source: message.content.source,
        data: result,
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('❌ Error in GET_ACCOUNT_BALANCE action:', error);

      const errorContent: Content = {
        text: `❌ Error getting account balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        actions: ['GET_ACCOUNT_BALANCE'],
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
          text: 'Get account balance for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '💰 **Account Balance for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6**\n\n**Native ETH Balance:**\n💎 1.234567 ETH (1234567000000000000 wei)\n\n💡 *No token addresses provided. Add token contract addresses to check ERC-20 balances.*\n\n🔗 Retrieved via Alchemy API',
          actions: ['GET_ACCOUNT_BALANCE'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Check balance for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6 with tokens 0xA0b86a33E6441b8dB8C7C3D8C7C3D8C7C3D8C7C3 0xB1c97a44F7552c9eE9D8E8E9D8E8E9D8E8E9D8E8',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '💰 **Account Balance for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6**\n\n**Native ETH Balance:**\n💎 0.500000 ETH (500000000000000000 wei)\n\n**Token Balances:**\n🪙 USDC: 1000.000000\n   └─ USD Coin (0xA0b86a33E6441b8dB8C7C3D8C7C3D8C7C3D8C7C3)\n🪙 WETH: 0.250000\n   └─ Wrapped Ether (0xB1c97a44F7552c9eE9D8E8E9D8E8E9D8E8E9D8E8)\n\n🔗 Retrieved via Alchemy API',
          actions: ['GET_ACCOUNT_BALANCE'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'What is the wallet balance for 0x1234567890123456789012345678901234567890?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '💰 **Account Balance for 0x1234567890123456789012345678901234567890**\n\n**Native ETH Balance:**\n💎 0.000000 ETH (0 wei)\n\n💡 *No token addresses provided. Add token contract addresses to check ERC-20 balances.*\n\n🔗 Retrieved via Direct RPC',
          actions: ['GET_ACCOUNT_BALANCE'],
        },
      },
    ],
  ],
};
