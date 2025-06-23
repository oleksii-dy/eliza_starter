import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRuntime, testPrivateKey, MOCK_PROPOSAL, TESTNET_GOVERNORS, getTestChains } from './test-config';
import { ProposeAction, proposeAction as govProposeAction } from '../actions/gov-propose';
import { WalletProvider } from '../providers/wallet';
import type { IAgentRuntime } from '@elizaos/core';
import type { Address, Hash } from 'viem';

describe('Governance Unit Tests', () => {
  let mockRuntime: IAgentRuntime;
  let mockWalletProvider: WalletProvider;
  let proposeActionInstance: ProposeAction;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    mockWalletProvider = new WalletProvider(testPrivateKey, mockRuntime, getTestChains());
    proposeActionInstance = new ProposeAction(mockWalletProvider);
  });

  describe('ProposeAction', () => {
    it('should create proposal with valid parameters', async () => {
      // Mock the wallet client to return a successful transaction
      const getWalletClientSpy = vi.spyOn(mockWalletProvider, 'getWalletClient');
      const mockSendTransaction = vi.fn().mockResolvedValue('0xmockhash' as Hash);
      const mockPublicClient = {
        waitForTransactionReceipt: vi.fn().mockResolvedValue({ logs: [] }),
      };
      vi.spyOn(mockWalletProvider, 'getPublicClient').mockReturnValue(mockPublicClient as any);
      vi.spyOn(mockWalletProvider, 'getChainConfigs').mockReturnValue({ id: 11155111 } as any);
      
      getWalletClientSpy.mockReturnValue({
        account: { address: '0x1234567890123456789012345678901234567890' as Address },
        sendTransaction: mockSendTransaction,
      } as any);

      const params = {
        chain: 'sepolia' as const,
        governor: TESTNET_GOVERNORS.sepolia.governor,
        targets: MOCK_PROPOSAL.targets,
        values: MOCK_PROPOSAL.values.map(v => BigInt(v)),
        calldatas: MOCK_PROPOSAL.calldatas,
        description: MOCK_PROPOSAL.description,
      };

      const result = await proposeActionInstance.propose(params);
      
      expect(result).toBeDefined();
      expect(result.hash).toBe('0xmockhash');
      expect(mockSendTransaction).toHaveBeenCalled();
      getWalletClientSpy.mockRestore();
    });

    it('should handle missing wallet account', async () => {
      // Mock wallet client without account
      const getWalletClientSpy = vi.spyOn(mockWalletProvider, 'getWalletClient');
      getWalletClientSpy.mockReturnValue({
        account: undefined,
        writeContract: vi.fn(),
      } as any);

      const params = {
        chain: 'sepolia' as const,
        governor: TESTNET_GOVERNORS.sepolia.governor,
        targets: MOCK_PROPOSAL.targets,
        values: MOCK_PROPOSAL.values.map(v => BigInt(v)),
        calldatas: MOCK_PROPOSAL.calldatas,
        description: MOCK_PROPOSAL.description,
      };

      await expect(proposeActionInstance.propose(params)).rejects.toThrow('Wallet account is not available');
      getWalletClientSpy.mockRestore();
    });

    it('should handle transaction failures', async () => {
      // Mock wallet client that throws
      const getWalletClientSpy = vi.spyOn(mockWalletProvider, 'getWalletClient');
      vi.spyOn(mockWalletProvider, 'getChainConfigs').mockReturnValue({ id: 11155111 } as any);
      vi.spyOn(mockWalletProvider, 'getPublicClient').mockReturnValue({
        waitForTransactionReceipt: vi.fn(),
      } as any);
      
      getWalletClientSpy.mockReturnValue({
        account: { address: '0x1234567890123456789012345678901234567890' as Address },
        sendTransaction: vi.fn().mockRejectedValue(new Error('Transaction failed')),
      } as any);

      const params = {
        chain: 'sepolia' as const,
        governor: TESTNET_GOVERNORS.sepolia.governor,
        targets: MOCK_PROPOSAL.targets,
        values: MOCK_PROPOSAL.values.map(v => BigInt(v)),
        calldatas: MOCK_PROPOSAL.calldatas,
        description: MOCK_PROPOSAL.description,
      };

      await expect(proposeActionInstance.propose(params)).rejects.toThrow('Vote failed: Transaction failed');
      getWalletClientSpy.mockRestore();
    });
  });

  describe('Parameter Validation', () => {
    it('should validate proposal targets array', () => {
      expect(MOCK_PROPOSAL.targets).toHaveLength(1);
      expect(MOCK_PROPOSAL.targets[0]).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should validate proposal values array', () => {
      expect(MOCK_PROPOSAL.values).toHaveLength(1);
      expect(MOCK_PROPOSAL.values[0]).toBe('0');
    });

    it('should validate proposal calldatas array', () => {
      expect(MOCK_PROPOSAL.calldatas).toHaveLength(1);
      expect(MOCK_PROPOSAL.calldatas[0]).toMatch(/^0x/);
    });

    it('should validate arrays have same length', () => {
      expect(MOCK_PROPOSAL.targets).toHaveLength(MOCK_PROPOSAL.values.length);
      expect(MOCK_PROPOSAL.values).toHaveLength(MOCK_PROPOSAL.calldatas.length);
    });

    it('should validate description is not empty', () => {
      expect(MOCK_PROPOSAL.description).toBeTruthy();
      expect(MOCK_PROPOSAL.description.length).toBeGreaterThan(0);
    });
  });

  describe('Governor Address Validation', () => {
    it('should have valid testnet governor addresses', () => {
      expect(TESTNET_GOVERNORS.sepolia.governor).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(TESTNET_GOVERNORS.baseSepolia.governor).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid timelock addresses', () => {
      expect(TESTNET_GOVERNORS.sepolia.timelock).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(TESTNET_GOVERNORS.baseSepolia.timelock).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid token addresses', () => {
      expect(TESTNET_GOVERNORS.sepolia.token).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(TESTNET_GOVERNORS.baseSepolia.token).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });
});