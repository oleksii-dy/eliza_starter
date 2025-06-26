import { mock } from 'bun:test';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import type { WalletInstance } from '../../core/interfaces/IWalletService';
import type { Address } from 'viem';

// Simple custodial wallet type for testing
export interface CustodialWalletData {
  id: string;
  userId: string;
  agentId: string;
  address: Address;
  createdAt: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

/**
 * Mock database service that doesn't require actual database connection
 */
export class MockWalletDatabaseService {
  private wallets: Map<string, WalletInstance> = new Map();
  private custodialWallets: Map<string, CustodialWalletData> = new Map();

  constructor(private runtime: IAgentRuntime) {}

  async createWallet(
    wallet: Omit<WalletInstance, 'id'>,
    _privateKey?: string,
    _mnemonic?: string
  ): Promise<WalletInstance> {
    const newWallet: WalletInstance = {
      ...wallet,
      id: `00000000-0000-0000-0000-${Date.now().toString().padStart(12, '0')}` as UUID,
    };
    this.wallets.set(newWallet.id, newWallet);
    return newWallet;
  }

  async getWallet(id: string): Promise<WalletInstance | null> {
    return this.wallets.get(id) || null;
  }

  async updateWallet(id: string, updates: Partial<WalletInstance>): Promise<WalletInstance | null> {
    const wallet = this.wallets.get(id);
    if (!wallet) {
      return null;
    }

    const updatedWallet = { ...wallet, ...updates };
    this.wallets.set(id, updatedWallet);
    return updatedWallet;
  }

  async deleteWallet(id: string): Promise<boolean> {
    return this.wallets.delete(id);
  }

  async listWallets(_filter?: any): Promise<WalletInstance[]> {
    const allWallets = Array.from(this.wallets.values());
    // For testing, return all wallets regardless of filter
    return allWallets;
  }

  async createCustodialWallet(data: Omit<CustodialWalletData, 'id'>): Promise<CustodialWalletData> {
    const newWallet: CustodialWalletData = {
      ...data,
      id: `mock-custodial-${Date.now()}`,
    };
    this.custodialWallets.set(newWallet.id, newWallet);
    return newWallet;
  }

  async getCustodialWallet(id: string): Promise<CustodialWalletData | null> {
    return this.custodialWallets.get(id) || null;
  }

  async getCustodialWalletByUserId(userId: string): Promise<CustodialWalletData | null> {
    for (const wallet of this.custodialWallets.values()) {
      if (wallet.userId === userId) {
        return wallet;
      }
    }
    return null;
  }

  async updateCustodialWallet(
    id: string,
    updates: Partial<CustodialWalletData>
  ): Promise<CustodialWalletData | null> {
    const wallet = this.custodialWallets.get(id);
    if (!wallet) {
      return null;
    }

    const updatedWallet = { ...wallet, ...updates };
    this.custodialWallets.set(id, updatedWallet);
    return updatedWallet;
  }

  async deleteCustodialWallet(id: string): Promise<boolean> {
    return this.custodialWallets.delete(id);
  }

  async listCustodialWallets(agentId?: string): Promise<CustodialWalletData[]> {
    const allWallets = Array.from(this.custodialWallets.values());
    if (agentId) {
      return allWallets.filter((w) => w.agentId === agentId);
    }
    return allWallets;
  }

  // Cache and utility methods
  async cacheWalletBalance(_walletId: string, _chain: string, _balance: string): Promise<void> {
    // Mock implementation
  }

  async getCachedWalletBalance(_walletId: string, _chain: string): Promise<string | null> {
    // Mock implementation
    return null;
  }

  async clearExpiredCache(): Promise<void> {
    // Mock implementation
  }

  async executeInTransaction<T>(fn: () => Promise<T>): Promise<T> {
    // Mock transaction - just execute the function
    return await fn();
  }
}

/**
 * Factory function that mimics the real createWalletDatabaseService
 */
export function createMockWalletDatabaseService(runtime: IAgentRuntime): MockWalletDatabaseService {
  return new MockWalletDatabaseService(runtime);
}

/**
 * Mock for the actual module
 */
export const mockDatabaseModule = {
  createWalletDatabaseService: mock().mockImplementation(createMockWalletDatabaseService),
  WalletDatabaseService: MockWalletDatabaseService,
};
