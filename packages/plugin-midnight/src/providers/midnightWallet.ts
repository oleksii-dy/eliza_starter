import {
  type Provider,
  type ProviderResult,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { MidnightNetworkService } from '../services/MidnightNetworkService.js';
import { PaymentService } from '../services/PaymentService.js';

/**
 * Provider for Midnight Network wallet information and balance
 */
export const midnightWalletProvider: Provider = {
  name: 'MIDNIGHT_WALLET',
  description: 'Provides Midnight Network wallet information, balance, and recent transactions',

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<ProviderResult> => {
    try {
      logger.debug('Getting Midnight wallet information');

      const midnightService = runtime.getService<MidnightNetworkService>('midnight-network');
      const paymentService = runtime.getService<PaymentService>('payment');

      if (!midnightService || !paymentService) {
        return {
          text: 'Midnight Network services not available',
          values: {
            hasWallet: false,
            error: 'Services not initialized',
          },
          data: {},
        };
      }

      // Get wallet information
      const walletInfo = await midnightService.getWalletInfo();
      const balance = await paymentService.getBalance();
      const recentTransactions = paymentService.getRecentTransactions(5);

      // Format balance for display
      const balanceFormatted = (Number(balance.balance) / 1000000).toFixed(6); // Convert from micro-units

      // Create wallet summary
      const walletSummary = [
        '💰 **Midnight Wallet Status**',
        `Address: ${walletInfo.address.address.slice(0, 8)}...${walletInfo.address.address.slice(-8)}`,
        `Balance: ${balanceFormatted} ${balance.currency}`,
        `Recent Transactions: ${recentTransactions.length}`,
      ].join('\n');

      // Add recent transaction summary if any
      let transactionSummary = '';
      if (recentTransactions.length > 0) {
        transactionSummary = `\n\n**Recent Activity:**\n${recentTransactions
          .slice(0, 3)
          .map((tx, index) => {
            const amount = (Number(tx.amount) / 1000000).toFixed(3);
            const direction = tx.fromAgent === runtime.agentId ? '↗️ Sent' : '↙️ Received';
            const status = tx.status === 'confirmed' ? '✅' : '⏳';
            return `${index + 1}. ${direction} ${amount} ${tx.currency} ${status}`;
          })
          .join('\n')}`;
      }

      const fullText = walletSummary + transactionSummary;

      return {
        text: fullText,
        values: {
          hasWallet: true,
          address: walletInfo.address.address,
          publicKey: walletInfo.address.publicKey,
          balance: balanceFormatted,
          currency: balance.currency,
          recentTransactionCount: recentTransactions.length,
          isConnected: true,
        },
        data: {
          walletInfo,
          balance: balance.balance.toString(),
          recentTransactions: recentTransactions.map((tx) => ({
            id: tx.id,
            amount: tx.amount.toString(),
            currency: tx.currency,
            status: tx.status,
            timestamp: tx.timestamp.toISOString(),
            isOutgoing: tx.fromAgent === runtime.agentId,
          })),
        },
      };
    } catch (error) {
      logger.error('Error getting Midnight wallet information:', error);

      return {
        text: 'Unable to retrieve wallet information',
        values: {
          hasWallet: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          isConnected: false,
        },
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  },
};
