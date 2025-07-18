import { connect, keyStores, utils, type Near, type Account, type KeyPair } from 'near-api-js';
import type { KeyPairString } from 'near-api-js/lib/utils';
import { elizaLogger, type IAgentRuntime } from '@elizaos/core';
import { BaseNearService } from './base/BaseService';
import { NearPluginError, NearErrorCode } from '../core/errors';
import type { NearPluginConfig, WalletInfo, TokenBalance } from '../core/types';
import { NEAR_NETWORKS, MIN_ACCOUNT_BALANCE } from '../core/constants';
import { validateNearConfig } from '../environment';

export class WalletService extends BaseNearService {
  static serviceType = 'near-wallet';
  capabilityDescription = 'Manages NEAR wallet operations';

  private near!: Near;
  private keyStore!: typeof keyStores.InMemoryKeyStore.prototype;
  private keyPair!: KeyPair;
  private account!: Account;

  async onInitialize(): Promise<void> {
    // Validate and load configuration
    this.config = await validateNearConfig(this.runtime);

    // Initialize key store
    this.keyStore = new keyStores.InMemoryKeyStore();

    // Set up wallet
    await this.setupWallet();

    // Connect to NEAR
    await this.connectToNear();

    // Verify account exists
    await this.verifyAccount();
  }

  private async setupWallet(): Promise<void> {
    try {
      this.keyPair = utils.KeyPair.fromString(
        this.nearConfig.NEAR_WALLET_SECRET_KEY as KeyPairString
      );

      // IMPORTANT: Set key for both possible network ID formats
      // Some NEAR operations use "testnet" while others might use the full network ID
      await this.keyStore.setKey(
        this.nearConfig.networkId,
        this.nearConfig.NEAR_ADDRESS,
        this.keyPair
      );

      // Also set for the simple network name to handle both cases
      await this.keyStore.setKey(
        this.nearConfig.NEAR_NETWORK,
        this.nearConfig.NEAR_ADDRESS,
        this.keyPair
      );

      elizaLogger.info(`Wallet configured for ${this.nearConfig.NEAR_ADDRESS}`);
      elizaLogger.debug(
        `Keys set for network IDs: ${this.nearConfig.networkId}, ${this.nearConfig.NEAR_NETWORK}`
      );
    } catch (error) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'Failed to setup wallet', error);
    }
  }

  private async connectToNear(): Promise<void> {
    try {
      const networkConfig = NEAR_NETWORKS[this.nearConfig.NEAR_NETWORK];

      // @ts-ignore - NEAR SDK v6 deprecated keyStore but it still works
      this.near = await connect({
        networkId: this.nearConfig.networkId,
        keyStore: this.keyStore,
        nodeUrl: this.nearConfig.nodeUrl || networkConfig.nodeUrl,
        walletUrl: networkConfig.walletUrl,
        helperUrl: networkConfig.helperUrl,
      });
      this.account = await this.near.account(this.nearConfig.NEAR_ADDRESS);

      elizaLogger.info(`Connected to NEAR ${this.nearConfig.networkId}`);
    } catch (error) {
      throw new NearPluginError(
        NearErrorCode.NETWORK_UNAVAILABLE,
        'Failed to connect to NEAR network',
        error
      );
    }
  }

  private async verifyAccount(): Promise<void> {
    try {
      const state = await this.account.state();
      elizaLogger.info(`Account verified: ${this.nearConfig.NEAR_ADDRESS}`, {
        balance: utils.format.formatNearAmount(state.amount.toString()),
      });
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        throw new NearPluginError(
          NearErrorCode.ACCOUNT_NOT_FOUND,
          `Account ${this.nearConfig.NEAR_ADDRESS} does not exist`,
          error
        );
      }
      throw new NearPluginError(NearErrorCode.RPC_ERROR, 'Failed to verify account', error);
    }
  }

  async getAccount(): Promise<Account> {
    if (!this.account) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'Wallet not initialized');
    }
    return this.account;
  }

  async getNear(): Promise<Near> {
    if (!this.near) {
      throw new NearPluginError(NearErrorCode.INVALID_CONFIG, 'NEAR connection not initialized');
    }
    return this.near;
  }

  async getBalance(): Promise<string> {
    try {
      const balance = await this.account.getAccountBalance();
      return balance.available;
    } catch (error) {
      throw new NearPluginError(NearErrorCode.RPC_ERROR, 'Failed to get account balance', error);
    }
  }

  async getWalletInfo(): Promise<WalletInfo> {
    try {
      const balance = await this.getBalance();
      const state = await this.account.state();

      // For now, just return NEAR balance
      // Token balances will be handled by TokenService
      const info: WalletInfo = {
        address: this.nearConfig.NEAR_ADDRESS,
        publicKey: this.nearConfig.NEAR_WALLET_PUBLIC_KEY,
        balance,
        tokens: [
          {
            token: {
              id: 'NEAR',
              symbol: 'NEAR',
              name: 'NEAR Protocol',
              decimals: 24,
            },
            amount: balance,
            humanAmount: utils.format.formatNearAmount(balance.toString()),
          },
        ],
        totalValueUsd: 0, // Will be calculated by PriceService
      };

      return info;
    } catch (error) {
      throw new NearPluginError(NearErrorCode.RPC_ERROR, 'Failed to get wallet info', error);
    }
  }

  async hasEnoughBalance(amount: string, includeGas: boolean = true): Promise<boolean> {
    try {
      const balance = await this.getBalance();
      const required = BigInt(amount);
      const available = BigInt(balance);

      if (includeGas) {
        // Keep minimum balance for storage
        const minBalance = BigInt(utils.format.parseNearAmount(MIN_ACCOUNT_BALANCE) || '0');
        return available - minBalance >= required;
      }

      return available >= required;
    } catch (error) {
      elizaLogger.error('Error checking balance:', error);
      return false;
    }
  }

  async checkHealth(): Promise<void> {
    try {
      await this.account.state();
    } catch (error) {
      throw new NearPluginError(NearErrorCode.RPC_ERROR, 'Health check failed', error);
    }
  }

  protected async onCleanup(): Promise<void> {
    // Clear sensitive data
    if (this.keyStore) {
      await this.keyStore.clear();
    }
  }

  // Getters for configuration
  getNetwork(): 'mainnet' | 'testnet' {
    return this.nearConfig.NEAR_NETWORK;
  }

  getAddress(): string {
    return this.nearConfig.NEAR_ADDRESS;
  }

  getKeyStore(): typeof keyStores.InMemoryKeyStore.prototype {
    return this.keyStore;
  }

  getNearConnection(): Near {
    return this.near;
  }

  getExplorerUrl(txHash?: string): string {
    const baseUrl = NEAR_NETWORKS[this.nearConfig.NEAR_NETWORK].explorerUrl;
    if (txHash) {
      return `${baseUrl}/transactions/${txHash}`;
    }
    return `${baseUrl}/accounts/${this.nearConfig.NEAR_ADDRESS}`;
  }

  static async start(runtime: IAgentRuntime): Promise<WalletService> {
    const service = new WalletService();
    await service.initialize(runtime);
    return service;
  }

  async stop(): Promise<void> {
    await this.cleanup();
  }
}
