import { type IAgentRuntime, elizaLogger as logger } from '@elizaos/core';
import { IWalletAdapter, PaymentMethod, PaymentStatus, TransactionResult } from '../types';
// @ts-ignore - Plugin types not available at compile time
import { RealCrossMintService, CrossMintUniversalWalletService } from '@elizaos/plugin-crossmint';

/**
 * Wallet adapter for Crossmint integration
 * Supports MPC wallets and cross-chain operations
 */
export class CrossmintAdapter implements IWalletAdapter {
  public readonly name = 'crossmint';
  public readonly supportedMethods: PaymentMethod[] = [
    PaymentMethod.USDC_ETH,
    PaymentMethod.ETH,
    PaymentMethod.MATIC,
    PaymentMethod.ARB,
    PaymentMethod.OP,
    PaymentMethod.BASE,
    PaymentMethod.USDC_SOL,
    PaymentMethod.SOL,
  ];

  private runtime: IAgentRuntime;
  private crossmintService: RealCrossMintService | null = null;
  private walletService: CrossMintUniversalWalletService | null = null;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async initialize(): Promise<void> {
    try {
      // Get Crossmint services
      this.crossmintService = this.runtime.getService('real-crossmint') as RealCrossMintService;
      this.walletService = this.runtime.getService('crossmint-universal-wallet') as CrossMintUniversalWalletService;

      if (!this.crossmintService && !this.walletService) {
        logger.warn(
          '[CrossmintAdapter] No Crossmint services found - adapter will have limited functionality'
        );
      } else {
        logger.info('[CrossmintAdapter] Initialized with Crossmint services');
      }
    } catch (error) {
      logger.error('[CrossmintAdapter] Failed to initialize', error);
      throw error;
    }
  }

  async getBalance(address: string, method: PaymentMethod): Promise<bigint> {
    try {
      if (!this.walletService) {
        logger.warn('[CrossmintAdapter] No wallet service available for balance check');
        return BigInt(0);
      }

      // Get the chain for this payment method
      const chain = this.getChainForMethod(method);
      
      // Get portfolio/balances through the universal wallet service
      const balances = await this.walletService.getBalances(address);
      
      // Find the balance for the requested token
      const tokenSymbol = this.getTokenSymbol(method);
      const balance = balances.find((b: any) => 
        b.symbol === tokenSymbol && 
        b.chain === chain
      );

      if (balance) {
        // Convert balance to smallest unit (wei/lamports)
        const decimals = balance.decimals || 18;
        const balanceInSmallestUnit = BigInt(balance.balance);
        return balanceInSmallestUnit;
      }

      return BigInt(0);
    } catch (error) {
      logger.error('[CrossmintAdapter] Error getting balance', { error, address, method });
      return BigInt(0);
    }
  }

  async sendTransaction(
    fromAddress: string,
    toAddress: string,
    amount: bigint,
    method: PaymentMethod,
    privateKey?: string
  ): Promise<TransactionResult> {
    try {
      if (!this.walletService) {
        throw new Error('Crossmint wallet service not available');
      }

      const chain = this.getChainForMethod(method);
      const tokenAddress = this.isNativeToken(method) ? undefined : this.getTokenAddress(method);

      // Execute transfer through the universal wallet service
      const result = await this.walletService.transfer({
        from: fromAddress,
        to: toAddress,
        amount: amount.toString(),
        chain: chain,
        tokenAddress: tokenAddress,
      });

      return {
        hash: result.hash,
        status: this.mapStatus(result.status),
        confirmations: result.confirmations || 0,
        blockNumber: result.blockNumber,
      };
    } catch (error) {
      logger.error('[CrossmintAdapter] Error sending transaction', { error, method });
      throw error;
    }
  }

  async getTransaction(hash: string): Promise<TransactionResult> {
    try {
      if (!this.walletService) {
        return {
          hash,
          status: PaymentStatus.PROCESSING,
          confirmations: 0,
        };
      }

      // Get transaction through the universal wallet service
      const tx = await this.walletService.getTransaction(hash);

      return {
        hash: tx.hash,
        status: this.mapStatus(tx.status),
        confirmations: tx.confirmations || 0,
        blockNumber: tx.blockNumber,
      };
    } catch (error) {
      logger.error('[CrossmintAdapter] Error getting transaction', { error, hash });
      return {
        hash,
        status: PaymentStatus.PROCESSING,
        confirmations: 0,
      };
    }
  }

  async createWallet(): Promise<{ address: string; privateKey: string }> {
    try {
      if (!this.walletService) {
        throw new Error('Crossmint wallet service not available');
      }

      // Create MPC wallet through Crossmint
      const wallet = await this.walletService.createWallet({
        type: 'mpc', // Use MPC wallets for security
        name: 'Payment Wallet',
        metadata: {
          purpose: 'payments',
          createdBy: 'payment-service',
        },
      });

      return {
        address: wallet.address,
        privateKey: '', // MPC wallets don't expose private keys
      };
    } catch (error) {
      logger.error('[CrossmintAdapter] Error creating wallet', { error });
      throw error;
    }
  }

  validateAddress(address: string, method: PaymentMethod): boolean {
    if (!this.supportedMethods.includes(method)) {
      return false;
    }

    const chain = this.getChainForMethod(method);

    // Solana address validation
    if (chain === 'solana') {
      try {
        // Basic Solana address validation (32 bytes base58)
        const decoded = this.base58Decode(address);
        return decoded.length === 32;
      } catch {
        return false;
      }
    }

    // EVM address validation
    try {
      // Check if it's a valid hex address
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // Helper methods
  private getChainForMethod(method: PaymentMethod): string {
    const chainMap: Record<PaymentMethod, string> = {
      [PaymentMethod.USDC_ETH]: 'ethereum',
      [PaymentMethod.ETH]: 'ethereum',
      [PaymentMethod.MATIC]: 'polygon',
      [PaymentMethod.ARB]: 'arbitrum',
      [PaymentMethod.OP]: 'optimism',
      [PaymentMethod.BASE]: 'base',
      [PaymentMethod.USDC_SOL]: 'solana',
      [PaymentMethod.SOL]: 'solana',
      [PaymentMethod.BTC]: 'bitcoin', // Not supported by Crossmint
      [PaymentMethod.OTHER]: 'ethereum',
    };

    return chainMap[method] || 'ethereum';
  }

  private getTokenSymbol(method: PaymentMethod): string {
    const symbolMap: Record<PaymentMethod, string> = {
      [PaymentMethod.USDC_ETH]: 'USDC',
      [PaymentMethod.ETH]: 'ETH',
      [PaymentMethod.MATIC]: 'MATIC',
      [PaymentMethod.ARB]: 'ETH', // Arbitrum uses ETH
      [PaymentMethod.OP]: 'ETH', // Optimism uses ETH
      [PaymentMethod.BASE]: 'ETH', // Base uses ETH
      [PaymentMethod.USDC_SOL]: 'USDC',
      [PaymentMethod.SOL]: 'SOL',
      [PaymentMethod.BTC]: 'BTC',
      [PaymentMethod.OTHER]: 'UNKNOWN',
    };

    return symbolMap[method] || 'UNKNOWN';
  }

  private isNativeToken(method: PaymentMethod): boolean {
    return [
      PaymentMethod.ETH,
      PaymentMethod.MATIC,
      PaymentMethod.ARB,
      PaymentMethod.OP,
      PaymentMethod.BASE,
      PaymentMethod.SOL,
    ].includes(method);
  }

  private getTokenAddress(method: PaymentMethod): string | undefined {
    // USDC addresses on different chains
    const tokenMap: Record<PaymentMethod, string | undefined> = {
      [PaymentMethod.USDC_ETH]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
      [PaymentMethod.USDC_SOL]: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
      [PaymentMethod.ETH]: undefined, // Native
      [PaymentMethod.SOL]: undefined, // Native
      [PaymentMethod.BTC]: undefined, // Not supported
      [PaymentMethod.MATIC]: undefined, // Native
      [PaymentMethod.ARB]: undefined, // Native
      [PaymentMethod.OP]: undefined, // Native
      [PaymentMethod.BASE]: undefined, // Native
      [PaymentMethod.OTHER]: undefined,
    };

    return tokenMap[method];
  }

  private mapStatus(status: string): PaymentStatus {
    switch (status) {
      case 'confirmed':
      case 'completed':
      case 'success':
        return PaymentStatus.COMPLETED;
      case 'failed':
      case 'error':
        return PaymentStatus.FAILED;
      case 'pending':
      case 'processing':
      default:
        return PaymentStatus.PROCESSING;
    }
  }

  private base58Decode(str: string): Uint8Array {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const ALPHABET_MAP: { [key: string]: number } = {};
    for (let i = 0; i < ALPHABET.length; i++) {
      ALPHABET_MAP[ALPHABET[i]] = i;
    }

    const bytes: number[] = [];
    let decimal = 0;
    let multi = 1;

    for (let i = str.length - 1; i >= 0; i--) {
      const char = str[i];
      if (!(char in ALPHABET_MAP)) {
        throw new Error('Invalid base58 character');
      }

      decimal += multi * ALPHABET_MAP[char];
      multi *= 58;
    }

    while (decimal > 0) {
      bytes.push(decimal % 256);
      decimal = Math.floor(decimal / 256);
    }

    // Handle leading zeros
    for (let i = 0; i < str.length && str[i] === '1'; i++) {
      bytes.push(0);
    }

    return new Uint8Array(bytes.reverse());
  }
} 