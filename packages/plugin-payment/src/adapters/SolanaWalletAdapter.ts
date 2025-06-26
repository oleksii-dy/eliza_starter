import { type IAgentRuntime, elizaLogger as logger } from '@elizaos/core';
import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'node:buffer';
import { IWalletAdapter, PaymentMethod, PaymentStatus, TransactionResult } from '../types';
import { CustodialWalletService } from '@elizaos/plugin-solana';

/**
 * Wallet adapter for Solana integration
 */
export class SolanaWalletAdapter implements IWalletAdapter {
  public readonly name = 'solana';
  public readonly supportedMethods: PaymentMethod[] = [PaymentMethod.USDC_SOL, PaymentMethod.SOL];

  private runtime: IAgentRuntime;
  private walletService: CustodialWalletService | null = null;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async initialize(): Promise<void> {
    try {
      // Get the Solana custodial wallet service
      const service =
        this.runtime.getService('custodial-wallet') ||
        this.runtime.getService('solana-custodial-wallet');

      if (service) {
        this.walletService = service as CustodialWalletService;
        logger.info('[SolanaWalletAdapter] Initialized with Solana wallet service');
      } else {
        logger.warn(
          '[SolanaWalletAdapter] Solana wallet service not found - adapter will have limited functionality'
        );
      }
    } catch (error) {
      logger.error('[SolanaWalletAdapter] Failed to initialize', error);
      throw error;
    }
  }

  async getBalance(address: string, method: PaymentMethod): Promise<bigint> {
    if (!this.walletService) {
      logger.warn('[SolanaWalletAdapter] No wallet service available for balance check');
      return BigInt(0);
    }

    try {
      // Validate address
      new PublicKey(address);

      if (method === PaymentMethod.SOL) {
        // Get SOL balance - the service returns balance in SOL
        const balance = await this.walletService.getBalance(address);
        // Convert SOL to lamports
        return BigInt(Math.floor(balance * 1e9));
      } else if (method === PaymentMethod.USDC_SOL) {
        // For USDC, we need to check token accounts
        // This is a simplified version - in production, you'd need to query token accounts
        logger.warn('[SolanaWalletAdapter] USDC balance check not fully implemented');
        return BigInt(0);
      }

      return BigInt(0);
    } catch (error) {
      logger.error('[SolanaWalletAdapter] Error getting balance', { error, address, method });
      return BigInt(0);
    }
  }

  async sendTransaction(
    fromAddress: string,
    toAddress: string,
    amount: bigint,
    method: PaymentMethod,
    _privateKey?: string
  ): Promise<TransactionResult> {
    if (!this.walletService) {
      throw new Error('Solana wallet service not available');
    }

    try {
      // Validate addresses
      new PublicKey(fromAddress);
      new PublicKey(toAddress);

      // Find the wallet entity for the fromAddress
      const wallets = await this.walletService.listWallets(this.runtime.agentId);
      const sourceWallet = wallets.find((w: any) => w.publicKey === fromAddress);

      if (!sourceWallet) {
        throw new Error('Source wallet not found in custodial service');
      }

      let signature: string;

      if (method === PaymentMethod.SOL) {
        // Execute transaction through custodial service
        const result = await (this.walletService as any).executeTransaction({
          walletId: sourceWallet.id,
          toAddress,
          amountWei: amount, // In lamports
          initiatedBy: this.runtime.agentId,
          purpose: 'payment',
          trustLevel: 100, // High trust for payment service
        });

        signature = result.txHash;
      } else if (method === PaymentMethod.USDC_SOL) {
        // For USDC transfers, we need the token mint address
        const usdcMint = this.getUSDCMint();

        const result = await (this.walletService as any).executeTransaction({
          walletId: sourceWallet.id,
          toAddress,
          amountWei: amount,
          tokenAddress: usdcMint,
          initiatedBy: this.runtime.agentId,
          purpose: 'payment',
          trustLevel: 100,
        });

        signature = result.txHash;
      } else {
        throw new Error(`Unsupported payment method: ${method}`);
      }

      if (!signature) {
        throw new Error('Transaction failed - no signature returned');
      }

      return {
        hash: signature,
        status: PaymentStatus.PROCESSING,
        confirmations: 0,
      };
    } catch (error) {
      logger.error('[SolanaWalletAdapter] Error sending transaction', { error, method });
      throw error;
    }
  }

  async getTransaction(hash: string): Promise<TransactionResult> {
    if (!this.walletService) {
      return {
        hash,
        status: PaymentStatus.PROCESSING,
        confirmations: 0,
      };
    }

    try {
      // Get transaction from history
      const history = await (this.walletService as any).getTransactionHistory(
        this.runtime.agentId,
        10
      );

      const tx = history.find((t: any) => t.transactionHash === hash);

      if (!tx) {
        return {
          hash,
          status: PaymentStatus.PROCESSING,
          confirmations: 0,
        };
      }

      // Map transaction status
      let status: PaymentStatus;
      switch (tx.status) {
        case 'completed':
          status = PaymentStatus.COMPLETED;
          break;
        case 'failed':
          status = PaymentStatus.FAILED;
          break;
        case 'submitted':
        case 'pending':
          status = PaymentStatus.PROCESSING;
          break;
        default:
          status = PaymentStatus.PROCESSING;
      }

      return {
        hash,
        status,
        confirmations: tx.confirmations || 0,
        blockNumber: tx.blockNumber,
      };
    } catch (error) {
      logger.error('[SolanaWalletAdapter] Error getting transaction', { error, hash });
      return {
        hash,
        status: PaymentStatus.PROCESSING,
        confirmations: 0,
      };
    }
  }

  async createWallet(): Promise<{ address: string; privateKey: string }> {
    if (!this.walletService) {
      // Generate a random keypair if service not available
      const keypair = Array.from({ length: 64 }, () => Math.floor(Math.random() * 256));

      // This is a simplified version - real implementation would use proper keypair generation
      return {
        address: new PublicKey(keypair.slice(32)).toString(),
        privateKey: Buffer.from(keypair).toString('base64'),
      };
    }

    try {
      // Create wallet through the custodial service
      const entityId = `payment-${Date.now()}`;
      const wallet = await this.walletService.createWallet(
        entityId,
        'USER' as any,
        this.runtime.agentId,
        {
          name: 'Payment Wallet',
          // purpose: 'payments',
        }
      );

      if (!wallet) {
        throw new Error('Failed to create wallet');
      }

      // Note: Private key is managed by custodial service
      return {
        address: wallet.publicKey,
        privateKey: '', // Private key is managed securely by the service
      };
    } catch (error) {
      logger.error('[SolanaWalletAdapter] Error creating wallet', { error });
      throw error;
    }
  }

  validateAddress(address: string, method: PaymentMethod): boolean {
    if (!this.supportedMethods.includes(method)) {
      return false;
    }

    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  // Helper methods
  private getUSDCMint(): string {
    // USDC mint address on Solana mainnet
    const network = this.runtime.getSetting('SOLANA_NETWORK') || 'mainnet-beta';

    if (network === 'mainnet-beta') {
      return 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    } else if (network === 'devnet') {
      // USDC Dev on devnet
      return '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
    }

    // Default to mainnet USDC
    return 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  }
}
