// Core exports
export * from './core/chains/config';
export * from './core/database/service';
export * from './core/errors/error-handler';
export {
  type DefiPosition,
  type IWalletService,
  type NFTHolding,
  type SessionKey,
  type SmartWalletParams,
  type TransactionHistory,
  type TransactionRequest,
  type WalletCreationParams,
  type WalletInstance,
} from './core/interfaces/IWalletService';
export * from './core/security/encryption';
export * from './core/security/mev-protection';
export { EVMWalletService } from './core/services/EVMWalletService';
export { EVMUniversalWalletService } from './core/services/EVMUniversalWalletService';
export * from './core/simulation/simulator';

// Export database schema types explicitly to avoid conflicts
export {
  contractAbiCache,
  defiPositions,
  ensCache,
  gasPriceCache,
  nftHoldings,
  sessions,
  tokenBalances,
  transactionHistory,
  wallets,
  type TokenBalance as DBTokenBalance,
  type TransactionHistory as DBTransactionHistory,
  type Session,
  type Wallet,
} from './core/database/schema';

// Export type guards without conflicting types
export {
  isAddress,
  isBridgeQuote,
  isBridgeRoute,
  isChainId,
  isDeFiPosition,
  isHex,
  isNFTHolding,
  isNFTMetadata,
  isSmartWalletParams,
  isTokenBalance,
  isTransactionRequest,
  isWalletInstance,
} from './core/types/type-guards';

// Action exports
export * from './actions/bridge';
export * from './actions/gov-execute';
export * from './actions/gov-propose';
export * from './actions/gov-queue';
export * from './actions/gov-vote';
export * from './actions/swap';
export * from './actions/transfer';

// Provider exports
export * from './providers/get-balance';
export * from './providers/wallet';

// Service exports
export * from './service';
export { WalletBalanceService, type TokenBalance } from './services/WalletBalanceService';

// DeFi exports
export * from './defi/defi-service';

// NFT exports
export {
  NFTService,
  createNFTService,
  type NFTActivity,
  type NFTCollection,
  type NFTListingParams,
  type NFTMetadata,
} from './nft/nft-service';

// Bridge exports - export from one location only
export {
  BridgeAggregator,
  type BridgeParams as BridgeAggregatorParams,
  type BridgeQuote,
  type BridgeRoute,
} from './bridges/bridge-aggregator';

// Token exports
export * from './tokens/token-service';

// Trust exports
export * from './trust/evmTrustIntegration';

// Wallet exports
export * from './wallet/aa-provider';
export * from './wallet/safe-integration';
export * from './wallet/session-manager';
export * from './wallet/smart-wallet-factory';

// Template exports
export * from './templates';

// Type exports - removed duplicate SmartWalletDeploymentConfig
export type {
  BridgeParams,
  ChainConfig,
  ChainMetadata,
  EvmPluginConfig,
  ExecuteProposalParams,
  Proposal,
  ProposeProposalParams,
  QueueProposalParams,
  SmartWalletDeploymentConfig,
  SmartWalletType,
  SwapParams,
  SwapQuote,
  TokenData,
  TokenPriceResponse,
  TokenWithBalance,
  Transaction,
  TransferParams,
  VoteParams,
  VoteType,
  WalletBalance,
} from './types';

// Utility exports
export * from './utils/ens-resolver';
export * from './utils/multicall';

// Main plugin export
import type { Action, IAgentRuntime, Plugin } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import EVMPluginTestSuite from './__tests__/e2e/plugin-tests';
import { bridgeAction } from './actions/bridge';
import { executeAction } from './actions/gov-execute';
import { proposeAction } from './actions/gov-propose';
import { queueAction } from './actions/gov-queue';
import { voteAction } from './actions/gov-vote';
import { swapAction } from './actions/swap';
import { transferAction } from './actions/transfer';
import { EVMWalletService } from './core/services/EVMWalletService';
import { EVMUniversalWalletService } from './core/services/EVMUniversalWalletService';
import { tokenBalanceProvider } from './providers/get-balance';
import { evmWalletProvider } from './providers/wallet';

const actions: Action[] = [
  transferAction,
  bridgeAction,
  swapAction,
  proposeAction,
  voteAction,
  queueAction,
  executeAction,
];

const providers = [evmWalletProvider, tokenBalanceProvider];

// Core services that should be started
const services = [EVMWalletService, EVMUniversalWalletService];

export const evmPlugin: Plugin = {
  name: 'evm',
  description:
    'Comprehensive EVM chain integration plugin with advanced DeFi, wallet management, cross-chain capabilities, and trust-based smart contract security',
  actions: actions,
  providers: [...providers],
  services: services,
  tests: [EVMPluginTestSuite],
  dependencies: [],

  async init(config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
    elizaLogger.info('Initializing EVM Plugin...');

    // Register actions
    for (const action of actions) {
      runtime.registerAction(action);
    }

    // Register providers
    for (const provider of providers) {
      runtime.registerProvider(provider);
    }

    elizaLogger.info('✔ EVM plugin initialized successfully');
  },
};

export default evmPlugin;
