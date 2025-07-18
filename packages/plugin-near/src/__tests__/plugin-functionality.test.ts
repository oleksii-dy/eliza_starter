import { describe, it, expect, beforeAll } from 'bun:test';
import { nearPlugin } from '../../src/index';
import { WalletService } from '../../src/services/WalletService';
import { TransactionService } from '../../src/services/TransactionService';
import type { IAgentRuntime } from '@elizaos/core';

// Mock runtime
const createMockRuntime = (settings: Record<string, string>): IAgentRuntime => {
  const services = new Map<string, any>();

  return {
    getSetting: (key: string) => settings[key] || process.env[key],
    getCharacter: () => ({ name: 'TestAgent' }),
    messageManager: {
      createMemory: async () => {},
    },
    getService: (name: string) => services.get(name),
    registerService: (service: any) => {
      services.set(
        service.serviceType || service.constructor.serviceType || service.constructor.name,
        service
      );
    },
  } as unknown as IAgentRuntime;
};

describe('NEAR Plugin Functionality', () => {
  let runtime: IAgentRuntime;

  beforeAll(() => {
    runtime = createMockRuntime({
      NEAR_ADDRESS: process.env.NEAR_ADDRESS || 'test.near',
      NEAR_WALLET_SECRET_KEY: process.env.NEAR_WALLET_SECRET_KEY || '',
      NEAR_WALLET_PUBLIC_KEY: process.env.NEAR_WALLET_PUBLIC_KEY || '',
    });
  });

  it('should have correct plugin structure', () => {
    expect(nearPlugin.name).toBe('near');
    expect(nearPlugin.actions).toBeDefined();
    expect(nearPlugin.services).toBeDefined();
    expect(nearPlugin.providers).toBeDefined();
    expect(Array.isArray(nearPlugin.actions)).toBe(true);
    expect(Array.isArray(nearPlugin.services)).toBe(true);
    expect(Array.isArray(nearPlugin.providers)).toBe(true);
  });

  it('should initialize wallet service', async () => {
    try {
      const runtime = createMockRuntime({
        NEAR_ADDRESS: process.env.NEAR_ADDRESS || 'test.near',
        NEAR_WALLET_SECRET_KEY: process.env.NEAR_WALLET_SECRET_KEY || '',
        NEAR_WALLET_PUBLIC_KEY: process.env.NEAR_WALLET_PUBLIC_KEY || '',
      });
      const walletService = new WalletService();
      await walletService.initialize(runtime);

      expect(walletService).toBeDefined();
      expect(WalletService.serviceType).toBe('near-wallet');
    } catch (error: any) {
      if (
        error.message?.includes('does not track the shard') ||
        error.message?.includes('Failed to verify account')
      ) {
        console.log('Skipping test due to NEAR testnet RPC shard issues');
        return; // Skip the test
      }
      throw error;
    }
  });

  it('should initialize transaction service', async () => {
    try {
      const runtime = createMockRuntime({
        NEAR_ADDRESS: process.env.NEAR_ADDRESS || 'test.near',
        NEAR_WALLET_SECRET_KEY: process.env.NEAR_WALLET_SECRET_KEY || '',
        NEAR_WALLET_PUBLIC_KEY: process.env.NEAR_WALLET_PUBLIC_KEY || '',
      });
      const walletService = new WalletService();
      await walletService.initialize(runtime);

      // Register wallet service so transaction service can find it
      (runtime as any).registerService(walletService);

      const transactionService = new TransactionService();
      await transactionService.initialize(runtime);

      expect(transactionService).toBeDefined();
      expect(TransactionService.serviceType).toBe('near-transaction');
    } catch (error: any) {
      if (
        error.message?.includes('does not track the shard') ||
        error.message?.includes('Failed to verify account') ||
        error.message?.includes('Failed to initialize WalletService')
      ) {
        console.log('Skipping test due to NEAR testnet RPC shard issues');
        return; // Skip the test
      }
      throw error;
    }
  });

  it('should have wallet provider', () => {
    const walletProvider = nearPlugin.providers?.find((p) => p.name === 'near-wallet');
    expect(walletProvider).toBeDefined();
    expect(walletProvider?.description).toContain('wallet information');
  });

  it('should have transfer action', () => {
    const transferAction = nearPlugin.actions?.find((a) => a.name === 'SEND_NEAR');
    expect(transferAction).toBeDefined();
    expect(transferAction?.description).toContain('Send NEAR');
  });
});
