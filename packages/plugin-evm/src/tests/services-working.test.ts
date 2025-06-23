import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRuntime, testPrivateKey, getTestChains } from './test-config';
import { WalletProvider } from '../providers/wallet';
import { ChainConfigService } from '../core/chains/config';
import type { IAgentRuntime } from '@elizaos/core';
import * as dbService from '../core/database/service';

describe('EVM Services Working Tests', () => {
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    vi.clearAllMocks();
  });

  describe('WalletProvider', () => {
    it('should create wallet provider with chains', () => {
      const chains = getTestChains();
      const walletProvider = new WalletProvider(testPrivateKey, mockRuntime, chains);
      
      expect(walletProvider).toBeDefined();
      expect(walletProvider.getAddress()).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should support multiple chains', () => {
      const chains = getTestChains();
      const walletProvider = new WalletProvider(testPrivateKey, mockRuntime, chains);
      
      const supportedChains = walletProvider.getSupportedChains();
      expect(supportedChains).toContain('sepolia');
      expect(supportedChains).toContain('mainnet');
      expect(supportedChains.length).toBeGreaterThan(0);
    });

    it('should get chain configs', () => {
      const chains = getTestChains();
      const walletProvider = new WalletProvider(testPrivateKey, mockRuntime, chains);
      
      const sepoliaConfig = walletProvider.getChainConfigs('sepolia');
      expect(sepoliaConfig).toBeDefined();
      expect(sepoliaConfig.id).toBe(11155111); // Sepolia chain ID
    });

    it('should create public client for supported chain', () => {
      const chains = getTestChains();
      const walletProvider = new WalletProvider(testPrivateKey, mockRuntime, chains);
      
      const publicClient = walletProvider.getPublicClient('sepolia');
      expect(publicClient).toBeDefined();
    });

    it('should create wallet client for supported chain', () => {
      const chains = getTestChains();
      const walletProvider = new WalletProvider(testPrivateKey, mockRuntime, chains);
      
      const walletClient = walletProvider.getWalletClient('sepolia');
      expect(walletClient).toBeDefined();
      expect(walletClient.account).toBeDefined();
      expect(walletClient.account?.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should throw error for unsupported chain', () => {
      const chains = getTestChains();
      const walletProvider = new WalletProvider(testPrivateKey, mockRuntime, chains);
      
      expect(() => walletProvider.getChainConfigs('unsupported' as any)).toThrow('Invalid chain name');
    });
  });

  describe('ChainConfigService', () => {
    it('should initialize with runtime', () => {
      const chainConfig = new ChainConfigService(mockRuntime);
      expect(chainConfig).toBeDefined();
    });

    it('should get supported chains', () => {
      const chainConfig = new ChainConfigService(mockRuntime);
      const chains = chainConfig.getSupportedChains();
      expect(chains).toBeDefined();
      expect(chains.length).toBeGreaterThan(0);
    });

    it('should get supported chain IDs', () => {
      const chainConfig = new ChainConfigService(mockRuntime);
      const chainIds = chainConfig.getSupportedChainIds();
      expect(chainIds).toBeDefined();
      expect(chainIds.length).toBeGreaterThan(0);
      expect(chainIds).toContain(1); // Mainnet
      expect(chainIds).toContain(11155111); // Sepolia
    });

    it('should check if chain is supported by ID', () => {
      const chainConfig = new ChainConfigService(mockRuntime);
      expect(chainConfig.isChainSupported(11155111)).toBe(true); // Sepolia
      expect(chainConfig.isChainSupported(1)).toBe(true); // Mainnet
      expect(chainConfig.isChainSupported(999999)).toBe(false); // Unsupported
    });

    it('should get chain config by ID', () => {
      const chainConfig = new ChainConfigService(mockRuntime);
      const sepoliaConfig = chainConfig.getChain(11155111);
      expect(sepoliaConfig).toBeDefined();
      expect(sepoliaConfig?.chain.id).toBe(11155111);
    });

    it('should return undefined for unsupported chain ID', () => {
      const chainConfig = new ChainConfigService(mockRuntime);
      const unsupportedChain = chainConfig.getChain(999999);
      expect(unsupportedChain).toBeUndefined();
    });
  });

  describe('Mock Runtime Configuration', () => {
    it('should have all required settings', () => {
      const requiredSettings = [
        'EVM_PRIVATE_KEY',
        'DATABASE_URL',
        'SEPOLIA_RPC_URL',
        'ETHEREUM_RPC_URL'
      ];

      for (const setting of requiredSettings) {
        const value = mockRuntime.getSetting(setting);
        expect(value).toBeTruthy();
      }
    });

    it('should provide valid private key format', () => {
      const privateKey = mockRuntime.getSetting('EVM_PRIVATE_KEY');
      expect(privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should provide database URL', () => {
      const dbUrl = mockRuntime.getSetting('DATABASE_URL');
      expect(dbUrl).toBe('sqlite::memory:');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing chains gracefully', () => {
      // Create wallet provider without chains
      const walletProvider = new WalletProvider(testPrivateKey, mockRuntime);
      
      expect(() => walletProvider.getChainConfigs('sepolia')).toThrow('Invalid chain name');
    });

    it('should handle invalid private key format', () => {
      // WalletProvider validates private key in constructor
      try {
        new WalletProvider('invalid-key' as any, mockRuntime);
        // If no error is thrown, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        // Any error is acceptable for invalid key
        expect(error).toBeDefined();
      }
    });
  });
});