import { IAgentRuntime, Plugin, logger, Action } from '@elizaos/core';
import { executeSwap } from './actions/swap';
import transferAction from './actions/transfer';
import { stakeSOL } from './actions/stake';
import { mintNftAction, transferNftAction, listNftAction, viewNftsAction } from './actions/nft';
import { realTokenTestsSuite } from './e2e/real-token-tests';
import { walletBalanceTestSuite } from './e2e/wallet-balance-tests';
import { WalletBalanceService } from './services/WalletBalanceService';
import { TransactionService } from './services/TransactionService';
import { PriceOracleService } from './services/PriceOracleService';
import { TokenService } from './services/TokenService';
import { RpcService } from './services/RpcService';
import { CustodialWalletService } from './services/CustodialWalletService';
import { JupiterDexService } from './services/JupiterDexService';
import { SecureKeyManager } from './services/SecureKeyManager';
import { NftService } from './services/NftService';
import { LendingService } from './services/LendingService';
import { WebSocketService } from './services/WebSocketService';
import { Token22Service } from './services/Token22Service';
import { MultiSigService } from './services/MultiSigService';
import { TransactionHistoryService } from './services/TransactionHistoryService';
import { SolanaUniversalWalletService } from './services/SolanaUniversalWalletService';
import { walletProvider } from './providers/wallet';
import { validateSolanaConfig, generateConfigTemplate } from './utils/configValidator';

// It's good practice to define a unique name for the plugin
export const SOLANA_PLUGIN_NAME = '@elizaos/plugin-solana';

const solanaPlugin: Plugin = {
  name: SOLANA_PLUGIN_NAME,
  description:
    'Core Solana blockchain integration with wallet management, transfers, swaps, and staking.',

  actions: [
    // Financial actions disabled by default for security
    executeSwap,
    transferAction,
    stakeSOL,
    mintNftAction,
    transferNftAction,
    // Read-only actions enabled by default
    listNftAction,
    viewNftsAction,
  ],
  providers: [walletProvider],
  services: [
    RpcService,
    TokenService,
    TransactionService,
    PriceOracleService,
    WalletBalanceService,
    CustodialWalletService,
    SecureKeyManager,
    JupiterDexService,
    NftService,
    LendingService,
    WebSocketService,
    Token22Service,
    MultiSigService,
    TransactionHistoryService,
    SolanaUniversalWalletService,
  ],
  dependencies: [],
  tests: [realTokenTestsSuite, walletBalanceTestSuite],
  routes: [
    {
      name: 'wallet-balance',
      path: '/api/wallet/balance/:address',
      type: 'GET',
      handler: async (req: any, res: any, runtime: IAgentRuntime) => {
        try {
          const walletService = runtime.getService<WalletBalanceService>('wallet-balance');
          if (!walletService) {
            return res.status(500).json({ error: 'Wallet balance service not available' });
          }

          const { address } = req.params;
          const balance = await walletService.getWalletBalance(address);

          res.json({
            network: walletService.getNetwork(),
            address,
            balance,
          });
        } catch (error) {
          console.error('Error fetching wallet balance:', error);
          res.status(500).json({ error: 'Failed to fetch wallet balance' });
        }
      },
    },
    {
      name: 'agent-wallet-balance',
      path: '/api/agent/balance',
      type: 'GET',
      handler: async (req: any, res: any, runtime: IAgentRuntime) => {
        try {
          const walletService = runtime.getService<WalletBalanceService>('wallet-balance');

          if (!walletService) {
            return res.status(500).json({ error: 'Wallet balance service not available' });
          }

          // Get agent's wallet address from wallet provider
          const walletAddress = runtime.getSetting('SOLANA_PUBLIC_KEY');

          if (!walletAddress) {
            return res.status(404).json({ error: 'Agent wallet not configured' });
          }

          const balance = await walletService.getWalletBalance(walletAddress);

          res.json({
            network: walletService.getNetwork(),
            agentId: runtime.agentId,
            address: walletAddress,
            balance,
          });
        } catch (error) {
          console.error('Error fetching agent wallet balance:', error);
          res.status(500).json({ error: 'Failed to fetch agent wallet balance' });
        }
      },
    },
    {
      name: 'rpc-status',
      path: '/api/rpc/status',
      type: 'GET',
      handler: async (req: any, res: any, runtime: IAgentRuntime) => {
        try {
          const rpcService = runtime.getService<RpcService>('rpc-service');
          if (!rpcService) {
            return res.status(500).json({ error: 'RPC service not available' });
          }

          const status = rpcService.getStatus();
          res.json(status);
        } catch (error) {
          console.error('Error fetching RPC status:', error);
          res.status(500).json({ error: 'Failed to fetch RPC status' });
        }
      },
    },
  ],

  init: async (config: Record<string, string>, runtime: IAgentRuntime): Promise<void> => {
    logger.info('\n┌════════════════════════════════════════┐');
    logger.info('│           SOLANA PLUGIN               │');
    logger.info('├────────────────────────────────────────┤');
    logger.info('│  Initializing Solana Plugin...         │');
    logger.info('└════════════════════════════════════════┘');

    // Validate configuration
    const configValidation = validateSolanaConfig(runtime);
    if (!configValidation.valid) {
      logger.error('Invalid Solana plugin configuration!');
      logger.info(`Configuration template:\n${generateConfigTemplate()}`);
      throw new Error('Solana plugin configuration is invalid. Check the logs for details.');
    }

    logger.info('✔ Solana plugin initialized successfully');
  },
};

export default solanaPlugin;

// We export the classes and action object for external use if needed,
// though they are primarily loaded by the runtime through the plugin definition.
export {
  WalletBalanceService,
  TransactionService,
  PriceOracleService,
  TokenService,
  RpcService,
  CustodialWalletService,
  JupiterDexService,
  SecureKeyManager,
  NftService,
  LendingService,
  WebSocketService,
  Token22Service,
  MultiSigService,
  TransactionHistoryService,
  SolanaUniversalWalletService,
  executeSwap,
  stakeSOL,
  transferAction as transferSolana,
  mintNftAction,
  transferNftAction,
  listNftAction,
  viewNftsAction,
  walletProvider,
};
