import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  logger,
} from '@elizaos/core';
import { formatUnits } from 'ethers';
import { WalletService } from '../services/wallet.service';
import { ClankerService } from '../services/clanker.service';
import { formatTokenAmount, formatUsd, shortenAddress } from '../utils/format';
import { validateAddress, handleError } from '../utils/errors';

export const balanceCheckAction: Action = {
  name: 'CHECK_BALANCE',
  similes: ['BALANCE', 'WALLET', 'HOLDINGS', 'PORTFOLIO'],
  description: 'Check token balances in the wallet',
  
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    try {
      // Check if service is available
      const walletService = runtime.getService(WalletService.serviceType) as WalletService;
      if (!walletService) {
        logger.warn('Wallet service not available for balance check');
        return false;
      }

      const text = message.content.text?.toLowerCase() || '';
      
      // Check for balance keywords
      const balanceKeywords = ['balance', 'wallet', 'holdings', 'portfolio', 'how much'];
      const hasBalanceIntent = balanceKeywords.some(keyword => text.includes(keyword));
      
      return hasBalanceIntent;
    } catch (error) {
      logger.error('Error validating balance check action:', error);
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: any,
    callback?: HandlerCallback,
    _responses?: Memory[]
  ): Promise<ActionResult> => {
    try {
      logger.info('Handling CHECK_BALANCE action');
      
      // Get services
      const walletService = runtime.getService(WalletService.serviceType) as WalletService;
      const clankerService = runtime.getService(ClankerService.serviceType) as ClankerService;
      
      if (!walletService) {
        throw new Error('Wallet service not available');
      }

      // Get wallet address
      const walletAddress = await walletService.getAddress();
      
      // Parse message to check if specific token is requested
      const text = message.content.text || '';
      const tokenAddress = extractTokenAddress(text);
      
      let responseText = `💰 Wallet Balance\n`;
      responseText += `Address: ${shortenAddress(walletAddress)}\n\n`;

      if (tokenAddress) {
        // Check specific token balance
        try {
          const tokenBalance = await walletService.getTokenBalance(tokenAddress);
          
          let tokenInfo;
          if (clankerService) {
            try {
              tokenInfo = await clankerService.getTokenInfo(tokenAddress);
            } catch (e) {
              logger.warn('Could not fetch token info:', e);
            }
          }

          responseText += `Token: ${tokenBalance.symbol}\n`;
          responseText += `Balance: ${tokenBalance.formattedBalance} ${tokenBalance.symbol}\n`;
          
          if (tokenInfo?.priceUsd && tokenBalance.balance > 0n) {
            const value = Number(tokenBalance.formattedBalance) * tokenInfo.priceUsd;
            responseText += `Value: ${formatUsd(value)}\n`;
          }
        } catch (error) {
          logger.error('Error getting token balance:', error);
          responseText += `❌ Could not retrieve balance for token ${shortenAddress(tokenAddress)}\n`;
        }
      } else {
        // Check ETH balance and common tokens
        const ethBalance = await walletService.getBalance();
        responseText += `ETH: ${formatTokenAmount(ethBalance, 18)} ETH\n`;
        
        // In a real implementation, you might check balances for common tokens
        // or tokens the user has interacted with before
        responseText += `\nTo check specific token balances, provide the token address.`;
      }

      if (callback) {
        await callback({
          text: responseText,
          actions: ['CHECK_BALANCE'],
          source: message.content.source,
        });
      }

      return {
        text: responseText,
        success: true,
        data: {
          walletAddress,
          tokenAddress: tokenAddress || null,
        },
      };
    } catch (error) {
      logger.error('Error in CHECK_BALANCE action:', error);
      const errorResponse = handleError(error);
      
      if (callback) {
        await callback({
          text: `❌ Failed to check balance: ${errorResponse.message}`,
          actions: ['CHECK_BALANCE'],
          source: message.content.source,
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Check my wallet balance',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: '💰 Wallet Balance\nAddress: 0x1234...5678\n\nETH: 2.5 ETH\n\nTo check specific token balances, provide the token address.',
          actions: ['CHECK_BALANCE'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'What is my balance of 0xabcdef1234567890abcdef1234567890abcdef12',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: '💰 Wallet Balance\nAddress: 0x1234...5678\n\nToken: BASE\nBalance: 10,000 BASE\nValue: $200.00',
          actions: ['CHECK_BALANCE'],
        },
      },
    ],
  ],
};

function extractTokenAddress(text: string): string | null {
  // Extract Ethereum address if present
  const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
  return addressMatch ? addressMatch[0] : null;
}