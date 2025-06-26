import { type IAgentRuntime, elizaLogger as logger } from '@elizaos/core';
import { Contract, ethers, JsonRpcProvider, Wallet } from 'ethers';
import { isAddress } from 'viem';
import { IWalletAdapter, PaymentMethod, PaymentStatus, TransactionResult } from '../types';
import type { EVMWalletService } from '@elizaos/plugin-evm';

/**
 * Wallet adapter for EVM chains integration using ethers.js
 */
export class EVMWalletAdapter implements IWalletAdapter {
  public readonly name = 'evm';
  public readonly supportedMethods: PaymentMethod[] = [
    PaymentMethod.USDC_ETH,
    PaymentMethod.ETH,
    PaymentMethod.MATIC,
    PaymentMethod.ARB,
    PaymentMethod.OP,
    PaymentMethod.BASE,
  ];

  private runtime: IAgentRuntime;
  private providers: Map<number, JsonRpcProvider> = new Map();
  private wallets: Map<string, Wallet> = new Map();
  private walletService: EVMWalletService | null = null;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize providers for each supported chain
      this.initializeProviders();

      // Get the EVM wallet service from runtime
      const service = this.runtime.getService('wallet');

      if (service) {
        this.walletService = service as any as EVMWalletService;
        logger.info('[EVMWalletAdapter] Initialized with real EVM providers and EVM wallet service');
      } else {
        logger.warn(
          '[EVMWalletAdapter] EVM wallet service not found - adapter will have limited functionality'
        );
      }
    } catch (error) {
      logger.error('[EVMWalletAdapter] Failed to initialize', error);
      throw error;
    }
  }

  private initializeProviders(): void {
    // Use public RPC endpoints or configured ones
    const rpcUrls: Record<number, string> = {
      1: this.runtime.getSetting('ETH_RPC_URL') || 'https://eth.llamarpc.com',
      137: this.runtime.getSetting('POLYGON_RPC_URL') || 'https://polygon-rpc.com',
      42161: this.runtime.getSetting('ARBITRUM_RPC_URL') || 'https://arb1.arbitrum.io/rpc',
      10: this.runtime.getSetting('OPTIMISM_RPC_URL') || 'https://mainnet.optimism.io',
      8453: this.runtime.getSetting('BASE_RPC_URL') || 'https://mainnet.base.org',
    };

    for (const [chainId, url] of Object.entries(rpcUrls)) {
      this.providers.set(Number(chainId), new JsonRpcProvider(url));
    }
  }

  async getBalance(address: string, method: PaymentMethod): Promise<bigint> {
    if (!this.walletService) {
      logger.warn('[EVMWalletAdapter] No wallet service available for balance check');
      return BigInt(0);
    }

    try {
      // Validate address
      if (!isAddress(address)) {
        throw new Error('Invalid Ethereum address');
      }

      const provider = this.getProvider(method);

      if (this.isNativeToken(method)) {
        // Get native token balance
        const balance = await provider.getBalance(address);
        return BigInt(balance.toString());
      } else {
        // Get ERC20 token balance
        const tokenAddress = this.getTokenAddress(method);
        if (!tokenAddress) {
          throw new Error(`No token address for ${method}`);
        }

        const tokenContract = new Contract(
          tokenAddress,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        );

        const balance = await tokenContract.balanceOf(address);
        return BigInt(balance.toString());
      }
    } catch (error) {
      logger.error('[EVMWalletAdapter] Error getting balance', { error, address, method });
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
    if (!this.walletService) {
      throw new Error('EVM wallet service not available');
    }

    try {
      // Validate addresses
      if (!isAddress(fromAddress) || !isAddress(toAddress)) {
        throw new Error('Invalid Ethereum address');
      }

      // Get wallet
      let wallet: Wallet;
      if (privateKey) {
        wallet = new Wallet(privateKey);
      } else {
        wallet = this.wallets.get(fromAddress) || await this.loadWallet(fromAddress);
      }

      const provider = this.getProvider(method);
      const connectedWallet = wallet.connect(provider);

      let tx: ethers.TransactionResponse;

      if (this.isNativeToken(method)) {
        // Send native token
        tx = await connectedWallet.sendTransaction({
          to: toAddress,
          value: amount.toString(),
          gasLimit: await this.estimateGas(method, false),
        });
      } else {
        // Send ERC20 token
        const tokenAddress = this.getTokenAddress(method);
        if (!tokenAddress) {
          throw new Error(`No token address for ${method}`);
        }

        const tokenContract = new Contract(
          tokenAddress,
          ['function transfer(address to, uint256 amount) returns (bool)'],
          connectedWallet
        );

        tx = await tokenContract.transfer(toAddress, amount.toString(), {
          gasLimit: await this.estimateGas(method, true),
        });
      }

      // Wait for transaction to be mined
      const receipt = await tx.wait(1);

      return {
        hash: tx.hash,
        status: receipt?.status === 1 ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
        confirmations: (receipt as any)?.confirmations || 0,
      };
    } catch (error) {
      logger.error('[EVMWalletAdapter] Error sending transaction', { error, method });
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
      // Try to get transaction from any provider
      for (const provider of this.providers.values()) {
        try {
          const receipt = await provider.getTransactionReceipt(hash);
          if (receipt) {
            return {
              hash,
              status: receipt.status === 1 ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
              confirmations: (receipt as any).confirmations || 0,
              blockNumber: receipt.blockNumber,
            };
          }
        } catch {
          // Try next provider
        }
      }

      // Transaction not found or still pending
      return {
        hash,
        status: PaymentStatus.PROCESSING,
        confirmations: 0,
      };
    } catch (error) {
      logger.error('[EVMWalletAdapter] Error getting transaction', { error, hash });
      return {
        hash,
        status: PaymentStatus.PROCESSING,
        confirmations: 0,
      };
    }
  }

  async createWallet(): Promise<{ address: string; privateKey: string }> {
    try {
      // Create a new random wallet - returns HDNodeWallet
      const hdWallet = Wallet.createRandom();

      // Convert to base Wallet if needed
      const wallet = new Wallet(hdWallet.privateKey);

      // Store encrypted wallet
      await this.storeWallet(wallet);

      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
      };
    } catch (error) {
      logger.error('[EVMWalletAdapter] Error creating wallet', { error });
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
  private getProvider(method: PaymentMethod): JsonRpcProvider {
    const chainId = this.getChainId(method);
    const provider = this.providers.get(chainId);

    if (!provider) {
      throw new Error(`No provider for chain ${chainId}`);
    }

    return provider;
  }

  private async storeWallet(wallet: Wallet): Promise<void> {
    // In production, store encrypted in database
    this.wallets.set(wallet.address, wallet);

    // TODO: Store encrypted private key in database
    logger.info('[EVMWalletAdapter] Wallet stored', { address: wallet.address });
  }

  private async loadWallet(address: string): Promise<Wallet> {
    // In production, load from database and decrypt
    const wallet = this.wallets.get(address);

    if (!wallet) {
      throw new Error(`Wallet not found for address ${address}`);
    }

    return wallet;
  }

  private async estimateGas(method: PaymentMethod, isERC20: boolean): Promise<bigint> {
    // Basic gas estimates
    if (isERC20) {
      return BigInt(100000); // ERC20 transfer
    } else {
      return BigInt(21000); // Native transfer
    }
  }

  private getChainId(method: PaymentMethod): number {
    const chainMap: Record<PaymentMethod, number> = {
      [PaymentMethod.USDC_ETH]: 1, // Ethereum mainnet
      [PaymentMethod.ETH]: 1,
      [PaymentMethod.MATIC]: 137, // Polygon
      [PaymentMethod.ARB]: 42161, // Arbitrum
      [PaymentMethod.OP]: 10, // Optimism
      [PaymentMethod.BASE]: 8453, // Base
      [PaymentMethod.USDC_SOL]: 0, // Not EVM
      [PaymentMethod.SOL]: 0, // Not EVM
      [PaymentMethod.BTC]: 0, // Not EVM
      [PaymentMethod.OTHER]: 1,
    };

    return chainMap[method] || 1;
  }

  private isNativeToken(method: PaymentMethod): boolean {
    return [
      PaymentMethod.ETH,
      PaymentMethod.MATIC,
      PaymentMethod.ARB,
      PaymentMethod.OP,
      PaymentMethod.BASE,
    ].includes(method);
  }

  private getCurrencySymbol(method: PaymentMethod): string {
    const symbolMap: Record<PaymentMethod, string> = {
      [PaymentMethod.ETH]: 'ETH',
      [PaymentMethod.MATIC]: 'MATIC',
      [PaymentMethod.ARB]: 'ETH', // Arbitrum uses ETH
      [PaymentMethod.OP]: 'ETH', // Optimism uses ETH
      [PaymentMethod.BASE]: 'ETH', // Base uses ETH
      [PaymentMethod.USDC_ETH]: 'USDC',
      [PaymentMethod.USDC_SOL]: 'USDC',
      [PaymentMethod.SOL]: 'SOL',
      [PaymentMethod.BTC]: 'BTC',
      [PaymentMethod.OTHER]: 'UNKNOWN',
    };

    return symbolMap[method] || 'UNKNOWN';
  }

  private getDecimals(method: PaymentMethod): number {
    if (this.isNativeToken(method)) {
      return 18;
    }

    // USDC has 6 decimals
    if (method === PaymentMethod.USDC_ETH) {
      return 6;
    }

    return 18;
  }

  private getTokenAddress(method: PaymentMethod): string | null {
    // USDC addresses on different chains
    const tokenMap: Record<PaymentMethod, string> = {
      [PaymentMethod.USDC_ETH]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
      [PaymentMethod.USDC_SOL]: '', // Not EVM
      [PaymentMethod.ETH]: '', // Native
      [PaymentMethod.SOL]: '', // Not EVM
      [PaymentMethod.BTC]: '', // Not EVM
      [PaymentMethod.MATIC]: '', // Native
      [PaymentMethod.ARB]: '', // Native
      [PaymentMethod.OP]: '', // Native
      [PaymentMethod.BASE]: '', // Native
      [PaymentMethod.OTHER]: '',
    };

    return tokenMap[method] || null;
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
