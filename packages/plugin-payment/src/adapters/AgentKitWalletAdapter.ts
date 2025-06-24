import { type IAgentRuntime, elizaLogger as logger } from '@elizaos/core';
import { isAddress } from 'viem';
import { IWalletAdapter, PaymentMethod, PaymentStatus, TransactionResult } from '../types';
// @ts-expect-error - Plugin types not available at compile time
import { AgentKitService, CustodialWalletService } from '@elizaos/plugin-agentkit';

/**
 * Wallet adapter for AgentKit CDP integration
 * Supports both direct AgentKit wallets and custodial wallets
 */
export class AgentKitWalletAdapter implements IWalletAdapter {
  public readonly name = 'agentkit';
  public readonly supportedMethods: PaymentMethod[] = [
    PaymentMethod.USDC_ETH,
    PaymentMethod.ETH,
    PaymentMethod.BASE,
  ];

  private runtime: IAgentRuntime;
  private agentKitService: AgentKitService | null = null;
  private custodialService: CustodialWalletService | null = null;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async initialize(): Promise<void> {
    try {
      // Get AgentKit service
      this.agentKitService = this.runtime.getService('agentkit') as AgentKitService;

      // Get custodial wallet service
      this.custodialService = this.runtime.getService('custodial-wallet') as CustodialWalletService;

      if (!this.agentKitService && !this.custodialService) {
        logger.warn('[AgentKitWalletAdapter] No AgentKit or custodial wallet service found');
      } else {
        logger.info('[AgentKitWalletAdapter] Initialized with services');
      }
    } catch (error) {
      logger.error('[AgentKitWalletAdapter] Failed to initialize', error);
      throw error;
    }
  }

  async getBalance(address: string, method: PaymentMethod): Promise<bigint> {
    try {
      // Validate address
      if (!isAddress(address)) {
        throw new Error('Invalid Ethereum address');
      }

      // Try custodial service first
      if (this.custodialService) {
        try {
          const wallets = await this.custodialService.listWallets(this.runtime.agentId);
          const wallet = wallets.find((w: any) => w.address === address);

          if (wallet) {
            const balance = await this.custodialService.getBalance(wallet.id);

            if (method === PaymentMethod.ETH || method === PaymentMethod.BASE) {
              // Balance is in ETH
              return BigInt(Math.floor(balance * 1e18));
            } else if (method === PaymentMethod.USDC_ETH) {
              // For USDC, we'd need to check token balance
              // This is a simplified version
              logger.warn('[AgentKitWalletAdapter] USDC balance check not fully implemented');
              return BigInt(0);
            }
          }
        } catch (error) {
          logger.error('[AgentKitWalletAdapter] Error getting custodial balance', error);
        }
      }

      // Try AgentKit service
      if (this.agentKitService && this.agentKitService.isReady()) {
        const agentKit = this.agentKitService.getAgentKit();
        if (agentKit) {
          // Get wallet from AgentKit
          const wallet = (agentKit as any).wallet;
          if (wallet && wallet.address === address) {
            // Get balance through wallet provider
            const provider = (agentKit as any).walletProvider;
            if (provider && typeof provider.getBalance === 'function') {
              const balance = await provider.getBalance();
              return BigInt(balance);
            }
          }
        }
      }

      return BigInt(0);
    } catch (error) {
      logger.error('[AgentKitWalletAdapter] Error getting balance', { error, address, method });
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
    try {
      // Validate addresses
      if (!isAddress(fromAddress) || !isAddress(toAddress)) {
        throw new Error('Invalid Ethereum address');
      }

      // Try custodial service first
      if (this.custodialService) {
        const wallets = await this.custodialService.listWallets(this.runtime.agentId);
        const sourceWallet = wallets.find((w: any) => w.address === fromAddress);

        if (sourceWallet) {
          const result = await this.custodialService.executeTransaction({
            walletId: sourceWallet.id,
            toAddress,
            amountWei: amount,
            initiatedBy: this.runtime.agentId,
            purpose: 'payment',
            trustLevel: 100, // High trust for payment service
          });

          return {
            hash: result.txHash,
            status: PaymentStatus.PROCESSING,
            confirmations: 0,
          };
        }
      }

      // Try AgentKit service
      if (this.agentKitService && this.agentKitService.isReady()) {
        const agentKit = this.agentKitService.getAgentKit();
        if (agentKit) {
          const wallet = (agentKit as any).wallet;
          if (wallet && wallet.address === fromAddress) {
            let txHash: string;

            if (method === PaymentMethod.ETH || method === PaymentMethod.BASE) {
              // Send native token
              const tx = await wallet.sendTransaction({
                to: toAddress,
                value: amount.toString(),
              });

              txHash = tx.hash;
            } else if (method === PaymentMethod.USDC_ETH) {
              // For USDC, we need to interact with the token contract
              const usdcAddress = this.getUSDCAddress(method);

              // Encode ERC20 transfer
              const data = this.encodeERC20Transfer(toAddress, amount);

              const tx = await wallet.sendTransaction({
                to: usdcAddress,
                data,
                value: '0',
              });

              txHash = tx.hash;
            } else {
              throw new Error(`Unsupported payment method: ${method}`);
            }

            return {
              hash: txHash,
              status: PaymentStatus.PROCESSING,
              confirmations: 0,
            };
          }
        }
      }

      throw new Error('No suitable wallet service available for transaction');
    } catch (error) {
      logger.error('[AgentKitWalletAdapter] Error sending transaction', { error, method });
      throw error;
    }
  }

  async getTransaction(hash: string): Promise<TransactionResult> {
    try {
      // Try custodial service first
      if (this.custodialService) {
        try {
          const history = await this.custodialService.getTransactionHistory(
            this.runtime.agentId,
            10
          );

          const tx = history.find((t: any) => t.transactionHash === hash);

          if (tx) {
            let status: PaymentStatus;
            switch (tx.status) {
              case 'completed':
                status = PaymentStatus.COMPLETED;
                break;
              case 'failed':
                status = PaymentStatus.FAILED;
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
          }
        } catch (error) {
          logger.error('[AgentKitWalletAdapter] Error getting custodial transaction', error);
        }
      }

      // Try AgentKit service
      if (this.agentKitService && this.agentKitService.isReady()) {
        const agentKit = this.agentKitService.getAgentKit();
        if (agentKit) {
          const provider = (agentKit as any).walletProvider;
          if (provider && typeof provider.getTransactionReceipt === 'function') {
            const receipt = await provider.getTransactionReceipt(hash);

            if (receipt) {
              const status = receipt.status === 1 ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;

              return {
                hash,
                status,
                confirmations: receipt.confirmations || 0,
                blockNumber: receipt.blockNumber,
              };
            }
          }
        }
      }

      return {
        hash,
        status: PaymentStatus.PROCESSING,
        confirmations: 0,
      };
    } catch (error) {
      logger.error('[AgentKitWalletAdapter] Error getting transaction', { error, hash });
      return {
        hash,
        status: PaymentStatus.PROCESSING,
        confirmations: 0,
      };
    }
  }

  async createWallet(): Promise<{ address: string; privateKey: string }> {
    try {
      // Try custodial service first
      if (this.custodialService) {
        const wallet = await this.custodialService.createWallet({
          name: 'Payment Wallet',
          type: 'user',
          owner: this.runtime.agentId,
          metadata: {
            purpose: 'payments',
            createdBy: 'payment-service',
          },
        });

        return {
          address: wallet.address,
          privateKey: '', // Private key is managed by custodial service
        };
      }

      // Try AgentKit service
      if (this.agentKitService && this.agentKitService.isReady()) {
        const agentKit = this.agentKitService.getAgentKit();
        if (agentKit) {
          // AgentKit typically manages its own wallet
          // This is a simplified version
          const wallet = (agentKit as any).wallet;
          if (wallet) {
            return {
              address: wallet.address,
              privateKey: '', // Private key is managed by AgentKit
            };
          }
        }
      }

      // Fallback to generating a random address
      logger.warn('[AgentKitWalletAdapter] No service available for wallet creation');
      return {
        address:
          `0x${
            Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        privateKey:
          `0x${
            Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      };
    } catch (error) {
      logger.error('[AgentKitWalletAdapter] Error creating wallet', { error });
      throw error;
    }
  }

  validateAddress(address: string, method: PaymentMethod): boolean {
    if (!this.supportedMethods.includes(method)) {
      return false;
    }

    return isAddress(address);
  }

  // Helper methods
  private getUSDCAddress(_method: PaymentMethod): string {
    // USDC addresses on different networks
    const network = this.runtime.getSetting('CDP_NETWORK_ID') || 'base-sepolia';

    switch (network) {
      case 'base-mainnet':
        return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
      case 'base-sepolia':
        return '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // USDC on Base Sepolia
      case 'ethereum-mainnet':
        return '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC on Ethereum
      default:
        return '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Default to Base Sepolia
    }
  }

  private encodeERC20Transfer(to: string, amount: bigint): string {
    // ERC20 transfer function signature: transfer(address,uint256)
    const functionSelector = '0xa9059cbb';

    // Pad address to 32 bytes
    const paddedAddress = to.slice(2).padStart(64, '0');

    // Convert amount to hex and pad to 32 bytes
    const paddedAmount = amount.toString(16).padStart(64, '0');

    return functionSelector + paddedAddress + paddedAmount;
  }
}
