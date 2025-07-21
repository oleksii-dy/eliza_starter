import {
  Provider,
  ProviderResult,
  IAgentRuntime,
  Memory,
  State,
  logger,
} from '@elizaos/core';
import { WalletService } from '../services/wallet.service';
import { ClankerService } from '../services/clanker.service';
import { formatTokenAmount, formatUsd, shortenAddress } from '../utils/format';

export const tokenContextProvider: Provider = {
  name: 'TOKEN_CONTEXT_PROVIDER',
  description: 'Provides token holdings and trading context for the agent',
  
  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<ProviderResult> => {
    try {
      const walletService = runtime.getService(WalletService.serviceType) as WalletService;
      const clankerService = runtime.getService(ClankerService.serviceType) as ClankerService;
      
      if (!walletService) {
        return {
          text: 'Token context unavailable - wallet service not initialized',
          values: {},
          data: {},
        };
      }

      const walletAddress = await walletService.getAddress();
      const ethBalance = await walletService.getBalance();
      
      let contextText = `Current wallet: ${shortenAddress(walletAddress)}\n`;
      contextText += `ETH balance: ${formatTokenAmount(ethBalance, 18)} ETH\n`;

      // In a real implementation, you would:
      // 1. Track which tokens the user has deployed
      // 2. Track which tokens the user holds
      // 3. Track recent trading activity
      // 4. Provide relevant context based on the conversation
      
      // For now, we'll just provide basic wallet info
      const values = {
        walletAddress,
        ethBalance: formatTokenAmount(ethBalance, 18),
      };

      return {
        text: contextText,
        values,
        data: {
          walletAddress,
          ethBalance: ethBalance.toString(),
        },
      };
    } catch (error) {
      logger.error('Error in token context provider:', error);
      return {
        text: 'Token context temporarily unavailable',
        values: {},
        data: {},
      };
    }
  },
};