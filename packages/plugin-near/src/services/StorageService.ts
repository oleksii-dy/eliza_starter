import { elizaLogger, type IAgentRuntime } from '@elizaos/core';
import { BaseNearService } from './base/BaseService';
import { WalletService } from './WalletService';
import { NearPluginError, NearErrorCode } from '../core/errors';
import { utils } from 'near-api-js';

/**
 * Real implementation of StorageService using NEAR Social contract
 * NEAR Social provides on-chain key-value storage for any NEAR account
 */
export interface StorageEntry {
  key: string;
  value: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

// NEAR Social contract addresses
const NEAR_SOCIAL_CONTRACT = {
  mainnet: 'social.near',
  testnet: 'v1.social08.testnet',
};

export class StorageService extends BaseNearService {
  static serviceType = 'near-storage';
  capabilityDescription = 'Manages on-chain storage for agent memory using NEAR Social';

  private walletService!: WalletService;
  private socialContract!: string;
  private storageKeyPrefix!: string;
  private cache: Map<string, StorageEntry> = new Map();

  async onInitialize(): Promise<void> {
    try {
      const walletService = this.runtime.getService<WalletService>('near-wallet' as any);
      if (!walletService) {
        throw new Error('WalletService is required for StorageService');
      }
      this.walletService = walletService;

      // Set contract based on network
      const network = this.walletService.getNetwork();
      this.socialContract = NEAR_SOCIAL_CONTRACT[network];

      // Use account ID as prefix for storage keys
      this.storageKeyPrefix = this.walletService.getAddress();

      elizaLogger.info(
        `StorageService initialized with NEAR Social contract: ${this.socialContract}`
      );
    } catch (error) {
      throw new NearPluginError(
        NearErrorCode.UNKNOWN_ERROR,
        'Failed to initialize StorageService',
        error
      );
    }
  }

  /**
   * Store data on-chain using NEAR Social contract
   */
  async set(key: string, value: any, metadata?: Record<string, any>): Promise<void> {
    try {
      const account = await this.walletService.getAccount();

      // Prepare data for NEAR Social format
      const data = {
        [this.storageKeyPrefix]: {
          [key]: JSON.stringify(value),
        },
      };

      // Call NEAR Social set method
      const result = await account.functionCall({
        contractId: this.socialContract,
        methodName: 'set',
        args: {
          data: data,
        },
        gas: 100000000000000n, // 100 TGas
        attachedDeposit: utils.format.parseNearAmount('0.1')
          ? BigInt(utils.format.parseNearAmount('0.1')!)
          : 0n, // Storage deposit
      });

      elizaLogger.success(`Data stored on-chain for key: ${key}, tx: ${result.transaction.hash}`);
    } catch (error) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        `Failed to store data for key: ${key}`,
        error
      );
    }
  }

  /**
   * Get a value from on-chain storage
   */
  async get(key: string): Promise<any | null> {
    try {
      const account = await this.walletService.getAccount();

      // Query NEAR Social for the data
      const result = await account.viewFunction({
        contractId: this.socialContract,
        methodName: 'get',
        args: {
          keys: [`${this.storageKeyPrefix}/${key}/**`],
        },
      });

      // Parse the result
      if (result && result[this.storageKeyPrefix] && result[this.storageKeyPrefix][key]) {
        const data = result[this.storageKeyPrefix][key];
        try {
          return JSON.parse(data);
        } catch {
          return data; // Return as-is if not JSON
        }
      }

      return null;
    } catch (error) {
      elizaLogger.error(`Failed to get value for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete data (set to null in NEAR Social)
   */
  async delete(key: string): Promise<void> {
    try {
      const account = await this.walletService.getAccount();

      // In NEAR Social, deletion is done by setting the value to null
      const data = {
        [this.storageKeyPrefix]: {
          [key]: null,
        },
      };

      const result = await account.functionCall({
        contractId: this.socialContract,
        methodName: 'set',
        args: {
          data: data,
        },
        gas: 50000000000000n, // 50 TGas
        attachedDeposit: 1n, // 1 yoctoNEAR
      });

      elizaLogger.success(`Data deleted for key: ${key}, tx: ${result.transaction.hash}`);
    } catch (error) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        `Failed to delete data for key: ${key}`,
        error
      );
    }
  }

  /**
   * List all stored keys for this account
   */
  async listKeys(fromIndex = 0, limit = 100): Promise<string[]> {
    try {
      const account = await this.walletService.getAccount();

      // Get all keys for this account
      const result = await account.viewFunction({
        contractId: this.socialContract,
        methodName: 'keys',
        args: {
          keys: [`${this.storageKeyPrefix}/**`],
          options: {
            return_type: 'BlockHeight',
            return_deleted: false,
          },
        },
      });

      // Extract keys
      const keys: string[] = [];
      if (result && result[this.storageKeyPrefix]) {
        Object.keys(result[this.storageKeyPrefix]).forEach((key) => {
          keys.push(key);
        });
      }

      return keys.slice(fromIndex, fromIndex + limit);
    } catch (error) {
      elizaLogger.warn('Failed to list storage keys', error);
      return [];
    }
  }

  /**
   * Store multiple entries in a single transaction
   */
  async setBatch(entries: Array<{ key: string; value: any }>): Promise<void> {
    try {
      const account = await this.walletService.getAccount();

      // Prepare batch data for NEAR Social
      const data: any = {
        [this.storageKeyPrefix]: {},
      };

      for (const entry of entries) {
        data[this.storageKeyPrefix][entry.key] = JSON.stringify(entry.value);
      }

      // Execute batch storage
      const result = await account.functionCall({
        contractId: this.socialContract,
        methodName: 'set',
        args: {
          data: data,
        },
        gas: 200000000000000n, // 200 TGas for batch
        attachedDeposit: utils.format.parseNearAmount(`${entries.length * 0.1}`)
          ? BigInt(utils.format.parseNearAmount(`${entries.length * 0.1}`)!)
          : 0n,
      });

      elizaLogger.success(`Batch stored ${entries.length} entries, tx: ${result.transaction.hash}`);
    } catch (error) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        'Failed to store batch data',
        error
      );
    }
  }

  /**
   * Share data with another account
   */
  async shareWith(key: string, accountId: string): Promise<void> {
    try {
      // In NEAR Social, we can create a shared key that both accounts can access
      const sharedKey = `shared:${accountId}:${key}`;
      const value = await this.get(key);

      if (value !== null) {
        await this.set(sharedKey, {
          originalKey: key,
          sharedBy: this.storageKeyPrefix,
          sharedWith: accountId,
          value: value,
          sharedAt: Date.now(),
        });
      }

      elizaLogger.success(`Data shared: ${key} -> ${accountId}`);
    } catch (error) {
      throw new NearPluginError(
        NearErrorCode.TRANSACTION_FAILED,
        `Failed to share data with ${accountId}`,
        error
      );
    }
  }

  /**
   * Get shared data from another account
   */
  async getShared(key: string, fromAccount: string): Promise<any | null> {
    try {
      const account = await this.walletService.getAccount();

      // Look for shared data
      const sharedKey = `shared:${this.storageKeyPrefix}:${key}`;

      const result = await account.viewFunction({
        contractId: this.socialContract,
        methodName: 'get',
        args: {
          keys: [`${fromAccount}/${sharedKey}/**`],
        },
      });

      if (result && result[fromAccount] && result[fromAccount][sharedKey]) {
        const data = result[fromAccount][sharedKey];
        try {
          const parsed = JSON.parse(data);
          return parsed.value || parsed;
        } catch {
          return data;
        }
      }

      return null;
    } catch (error) {
      elizaLogger.warn(`Failed to get shared data from ${fromAccount}`, error);
      return null;
    }
  }

  protected async checkHealth(): Promise<void> {
    try {
      const account = await this.walletService.getAccount();

      // Check if we can query the social contract
      await account.viewFunction({
        contractId: this.socialContract,
        methodName: 'get',
        args: {
          keys: [`${this.storageKeyPrefix}/health-check`],
        },
      });
    } catch (error) {
      throw new NearPluginError(
        NearErrorCode.RPC_ERROR,
        'Storage service health check failed',
        error
      );
    }
  }

  protected async onCleanup(): Promise<void> {
    // No cleanup needed for on-chain storage
  }

  static async start(runtime: IAgentRuntime): Promise<StorageService> {
    const service = new StorageService();
    await service.initialize(runtime);
    return service;
  }

  async stop(): Promise<void> {
    await this.cleanup();
  }
}
