// import { TrustAwarePlugin } from '@elizaos/plugin-trust';
// import { type ActionPermission } from '@elizaos/plugin-trust';
import { executeSwap } from './actions/swap.js';
import transferAction from './actions/transfer.js';
import { stakeSOL } from './actions/stake.js';
import { walletProvider } from './providers/wallet.js';
import { WalletBalanceService } from './services/WalletBalanceService.js';
import { TransactionService } from './services/TransactionService.js';
import { PriceOracleService } from './services/PriceOracleService.js';
import { TokenService } from './services/TokenService.js';
import { RpcService } from './services/RpcService.js';
import { CustodialWalletService } from './services/CustodialWalletService.js';

/**
 * Trust-aware Solana plugin using the proper framework
 */
// export class TrustAwareSolanaPlugin extends TrustAwarePlugin {
export class TrustAwareSolanaPlugin {
  name = '@elizaos/plugin-solana-trust-aware';
  description = 'Solana plugin with trust-based financial security';

  // Define trust requirements for each action
  protected trustRequirements = {
    TRANSFER_SOLANA: 80, // High trust for transfers
    SWAP_SOLANA: 60, // Medium trust for swaps
    STAKE_SOL: 70, // High trust for staking
  };

  // Define permission requirements
  // protected permissions: Record<string, ActionPermission> = {
  protected permissions: Record<string, any> = {
    TRANSFER_SOLANA: {
      action: 'TRANSFER_SOLANA',
      unix: 0o750, // Owner and group can execute
      description: 'Transfer Solana tokens',
    },
    SWAP_SOLANA: {
      action: 'SWAP_SOLANA',
      unix: 0o644, // Owner can execute, others read
      description: 'Swap Solana tokens',
    },
    STAKE_SOL: {
      action: 'STAKE_SOL',
      unix: 0o700, // Owner only
      description: 'Stake SOL tokens',
    },
  };

  actions = [executeSwap, transferAction, stakeSOL];
  providers = [walletProvider];
  services = [
    RpcService,
    TokenService,
    TransactionService,
    PriceOracleService,
    WalletBalanceService,
    CustodialWalletService,
  ];
}
