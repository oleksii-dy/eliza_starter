import type { Plugin } from '@elizaos/core';

// Services
import {
  WalletService,
  TransactionService,
  SwapService,
  StorageService,
  RainbowBridgeService,
  MarketplaceService,
  GameService,
  SmartContractEscrowService,
  OnChainMessagingService,
} from './services';

// Actions
import { executeTransfer } from './actions/transfer';
import { executeSwap } from './actions/swap';
import { storageActions } from './actions/storage';
import { crossChainActions } from './actions/crosschain';
import { escrowActions } from './actions/escrow';

// Providers
import { walletProvider } from './providers/wallet';

// Tests
import testSuites from './__tests__/e2e';
export const tests = testSuites;

/**
 * NEAR Protocol plugin for ElizaOS
 *
 * This plugin provides:
 * - NEAR wallet management and transactions
 * - Token swaps on Ref Finance
 * - Cross-chain operations via Rainbow Bridge (real implementation)
 * - On-chain storage for agent memory
 * - Agent marketplace for services
 * - Multi-agent games
 * - Smart contract escrow (real on-chain implementation)
 * - On-chain messaging for decentralized agent communication
 */
export const nearPlugin: Plugin = {
  name: 'near',
  description: 'NEAR Protocol blockchain integration plugin for ElizaOS with real smart contracts',

  providers: [walletProvider],
  actions: [
    executeTransfer,
    executeSwap,
    ...storageActions,
    ...crossChainActions,
    ...escrowActions,
  ],
  services: [
    WalletService as any,
    TransactionService as any,
    SwapService as any,
    StorageService as any,
    RainbowBridgeService as any, // Real Rainbow Bridge implementation
    MarketplaceService as any,
    GameService as any,
    SmartContractEscrowService as any, // Real escrow smart contract
    OnChainMessagingService as any, // On-chain messaging contract
  ],
  // Include the test suites
  tests: testSuites,
};

// Re-export core types and utilities
export * from './core/types';
export * from './core/errors';
export * from './core/constants';

// Re-export services for direct usage
export * from './services';

// Re-export actions
export { executeTransfer, executeSwap, storageActions, crossChainActions, escrowActions };

// Re-export providers
export { walletProvider };

export default nearPlugin;
