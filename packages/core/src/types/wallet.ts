import { Service, ServiceType } from './service';
import type { TokenBalance } from './token';
import type { IUniversalWalletService, UniversalPortfolio, UniversalTokenBalance, UniversalTransferParams, UniversalTransactionParams, UniversalTransactionResult, SimulationResult, GasEstimate, ChainInfo, WalletCapability } from './universal-wallet';

/**
 * Represents a single asset holding within a wallet, including its value.
 * This extends a generic TokenBalance with wallet-specific valuation.
 */
export interface WalletAsset extends TokenBalance {
  priceUsd?: number;
  valueUsd?: number;
}

/**
 * Represents the entire portfolio of assets in a wallet.
 */
export interface WalletPortfolio {
  totalValueUsd: number;
  assets: WalletAsset[];
}

/**
 * Abstract interface for a Wallet Service.
 * Plugins that provide wallet functionality (e.g., for Solana, EVM) should implement this service.
 * It provides a standardized way for other plugins to query the state of a wallet.
 * 
 * @deprecated Use IUniversalWalletService for new implementations
 */
export abstract class IWalletService extends Service {
  static override readonly serviceType = ServiceType.WALLET;

  public readonly capabilityDescription =
    'Provides standardized access to wallet balances and portfolios.';

  /**
   * Retrieves the entire portfolio of assets held by the wallet.
   * @param owner - Optional: The specific wallet address/owner to query if the service manages multiple.
   * @returns A promise that resolves to the wallet's portfolio.
   */
  abstract getPortfolio(owner?: string): Promise<WalletPortfolio>;

  /**
   * Retrieves the balance of a specific asset in the wallet.
   * @param assetAddress - The mint address or native identifier of the asset.
   * @param owner - Optional: The specific wallet address/owner to query.
   * @returns A promise that resolves to the user-friendly (decimal-adjusted) balance of the asset held.
   */
  abstract getBalance(assetAddress: string, owner?: string): Promise<number>;

  /**
   * Transfers SOL from a specified keypair to a given public key.
   * This is a low-level function primarily for Solana-based wallet services.
   * @param from - The Keypair of the sender.
   * @param to - The PublicKey of the recipient.
   * @param lamports - The amount in lamports to transfer.
   * @returns A promise that resolves with the transaction signature.
   */
  abstract transferSol(from: any, to: any, lamports: number): Promise<string>;
}

/**
 * Adapter to bridge legacy IWalletService to Universal interface
 * This allows existing wallet services to work with the new universal system
 */
export abstract class WalletServiceAdapter extends Service implements IUniversalWalletService {
  static override readonly serviceType = ServiceType.WALLET;
  
  // Universal interface requirements
  abstract readonly chainSupport: string[];
  abstract readonly capabilities: WalletCapability[];
  
  // Add new universal getBalance method
  abstract getUniversalBalance(assetAddress: string, owner?: string): Promise<UniversalTokenBalance>;
  
  // Legacy getBalance method for backward compatibility  
  async getBalance(assetAddress: string, owner?: string): Promise<number> {
    const universalBalance = await this.getUniversalBalance(assetAddress, owner);
    return parseFloat(universalBalance.balanceFormatted);
  }
  
  // Abstract method for transferSol (legacy support)
  abstract transferSol(from: any, to: any, lamports: number): Promise<string>;
  
  // Universal portfolio method - implements IUniversalWalletService requirement
  async getUniversalPortfolio(owner?: string): Promise<UniversalPortfolio> {
    // Need to implement this ourselves since base method is abstract
    const balances = await this.getBalances(owner);
    const totalValue = balances.reduce((sum, balance) => sum + (balance.valueUsd || 0), 0);
    
    // Convert to universal format
    return {
      totalValueUsd: totalValue,
      chains: this.chainSupport,
      assets: balances,
      breakdown: {
        tokens: totalValue,
        defi: 0,
        nfts: 0,
        staked: 0,
      },
    };
  }
  
  // Implement the universal getPortfolio method (required by IUniversalWalletService)
  async getPortfolio(owner?: string): Promise<UniversalPortfolio> {
    return await this.getUniversalPortfolio(owner);
  }
  
  // Add legacy portfolio method for backward compatibility
  async getLegacyPortfolio(owner?: string): Promise<WalletPortfolio> {
    const universal = await this.getUniversalPortfolio(owner);
    return {
      totalValueUsd: universal.totalValueUsd,
      assets: universal.assets.map(asset => ({
        ...asset,
        priceUsd: asset.priceUsd,
        valueUsd: asset.valueUsd,
      })),
    };
  }
  
  // Implement universal balance method by delegating to new method
  async getBalances(owner?: string): Promise<UniversalTokenBalance[]> {
    // Default implementation - subclasses should override
    const nativeBalance = await this.getUniversalBalance('native', owner);
    return [nativeBalance];
  }
  
  // Abstract methods that implementations must provide
  abstract transfer(params: UniversalTransferParams): Promise<UniversalTransactionResult>;
  abstract sendTransaction(params: UniversalTransactionParams): Promise<UniversalTransactionResult>;
  abstract estimateGas(params: UniversalTransactionParams): Promise<GasEstimate>;
  abstract simulateTransaction(params: UniversalTransactionParams): Promise<SimulationResult>;
  abstract getTransaction(hash: string, chain?: string): Promise<UniversalTransactionResult>;
  abstract getSupportedChains(): Promise<ChainInfo[]>;
  abstract switchChain(chainId: string): Promise<void>;
  abstract isChainSupported(chainId: string): boolean;
  
  // Optional methods with default "not implemented" behavior
  async swap(params: import('./universal-wallet').SwapParams): Promise<UniversalTransactionResult> {
    throw new Error('Swap not supported by legacy wallet service');
  }
  
  async bridge(params: import('./universal-wallet').BridgeParams): Promise<UniversalTransactionResult> {
    throw new Error('Bridge not supported by legacy wallet service');
  }
}
