import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { PolygonRpcService } from '../PolygonRpcService';
import type { IAgentRuntime } from '@elizaos/core';
import { Contract, JsonRpcProvider, Wallet } from 'ethers'; // Assuming ContractRunner is not directly used
import type * as ethersActualTypes from 'ethers';

// Import shared mock functions from vitest.setup.ts
import {
  mockGetLastChildBlock,
  mockCheckpointManagerAddressFn,
  mockCurrentEpoch,
} from '~/vitest.setup'; // Using new path alias

// Define a simple interface for our mocked provider instance
interface MockEthersProvider {
  getNetwork: Mock;
}

// Define a simple interface for our mocked signer instance
interface MockEthersSigner {
  getAddress: Mock;
  connect: Mock;
}

// Constants used by tests
const ROOT_CHAIN_MANAGER_ADDRESS_L1 = '0xA0c68C638235ee32657e8f720a23ceC1bFc77C77';
const STAKE_MANAGER_ADDRESS_L1 = '0x5e3Ef299fDDf15eAa0432E6e66473ace8c13D908';
const mockCheckpointManagerAddr = '0xCheckpointManager123'; // Should match MOCK_CHECKPOINT_MANAGER_ADDR in setup
const mockL1RpcUrl = 'http://mock-l1-rpc.com';
const mockL2RpcUrl = 'http://mock-l2-rpc.com';
const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

// @elizaos/core logger and ethers module are globally mocked in vitest.setup.ts

describe('PolygonRpcService Unit Tests', () => {
  let service: PolygonRpcService;
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset imported mock functions to their default behavior (or a clean state)
    // The default resolved values are set in vitest.setup.ts, but resetting here ensures
    // that any per-test modifications (mockResolvedValueOnce etc.) don't leak between tests.
    mockGetLastChildBlock.mockReset().mockResolvedValue(1000n); // Default success
    mockCheckpointManagerAddressFn.mockReset().mockResolvedValue(mockCheckpointManagerAddr); // Default success
    mockCurrentEpoch.mockReset().mockResolvedValue(1n); // Default success

    mockRuntime = {
      getSetting: vi.fn((key: string): string | undefined => {
        if (key === 'ETHEREUM_RPC_URL') return mockL1RpcUrl;
        if (key === 'POLYGON_RPC_URL') return mockL2RpcUrl;
        if (key === 'PRIVATE_KEY') return mockPrivateKey;
        return undefined;
      }),
      getService: vi.fn(),
    } as unknown as IAgentRuntime;
  });

  describe('PolygonRpcService.start (initialization)', () => {
    it('should initialize providers and contracts correctly', async () => {
      service = await PolygonRpcService.start(mockRuntime);

      expect(mockRuntime.getSetting).toHaveBeenCalledWith('ETHEREUM_RPC_URL');
      expect(mockRuntime.getSetting).toHaveBeenCalledWith('POLYGON_RPC_URL');
      expect(mockRuntime.getSetting).toHaveBeenCalledWith('PRIVATE_KEY');

      expect(JsonRpcProvider).toHaveBeenCalledWith(mockL1RpcUrl);
      expect(JsonRpcProvider).toHaveBeenCalledWith(mockL2RpcUrl);

      const walletCallArgs = (Wallet as unknown as Mock).mock.calls[0];
      expect(walletCallArgs[0]).toBe(mockPrivateKey);
      expect(walletCallArgs[1]).toBeInstanceOf(Object);
      expect(walletCallArgs[1]).toHaveProperty('getNetwork');
      expect(typeof (walletCallArgs[1] as MockEthersProvider).getNetwork).toBe('function');

      expect(Contract).toHaveBeenCalledWith(
        STAKE_MANAGER_ADDRESS_L1,
        expect.any(Object),
        walletCallArgs[1]
      );
      expect(mockCurrentEpoch).not.toHaveBeenCalled(); // Called during initializeL1Contracts if needed by logic

      expect(Contract).toHaveBeenCalledWith(
        ROOT_CHAIN_MANAGER_ADDRESS_L1,
        expect.any(Object),
        expect.objectContaining<Partial<MockEthersSigner>>({
          getAddress: expect.any(Function),
          connect: expect.any(Function),
        })
      );
      expect(mockCheckpointManagerAddressFn).toHaveBeenCalled();

      expect(Contract).toHaveBeenCalledWith(
        mockCheckpointManagerAddr,
        expect.any(Object),
        walletCallArgs[1]
      );

      expect(service).toBeInstanceOf(PolygonRpcService);
    });

    it('should throw if ETHEREUM_RPC_URL is missing', async () => {
      vi.mocked(mockRuntime.getSetting).mockImplementation((key: string) => {
        if (key === 'POLYGON_RPC_URL') return mockL2RpcUrl;
        if (key === 'PRIVATE_KEY') return mockPrivateKey;
        return undefined;
      });
      await expect(PolygonRpcService.start(mockRuntime)).rejects.toThrow('Missing L1/L2 RPC URLs');
    });

    it('should throw if PRIVATE_KEY is missing', async () => {
      vi.mocked(mockRuntime.getSetting).mockImplementation((key: string) => {
        if (key === 'ETHEREUM_RPC_URL') return mockL1RpcUrl;
        if (key === 'POLYGON_RPC_URL') return mockL2RpcUrl;
        return undefined;
      });
      await expect(PolygonRpcService.start(mockRuntime)).rejects.toThrow(
        'Missing PRIVATE_KEY for signer initialization'
      );
    });

    it('should throw if RootChainManager.checkpointManagerAddress fails', async () => {
      mockCheckpointManagerAddressFn.mockRejectedValueOnce(new Error('RCM call failed'));
      await expect(PolygonRpcService.start(mockRuntime)).rejects.toThrow(
        // Original regex: /RCM call failed|RootChainManager contract failed to initialize/
        // Using string contains for simplicity as the regex was causing issues.
        'RCM call failed'
      );
    });
  });

  describe('getLastCheckpointedL2Block', () => {
    beforeEach(async () => {
      service = await PolygonRpcService.start(mockRuntime);
    });

    it('should return the last checkpointed L2 block number on success', async () => {
      const expectedBlock = 12345n;
      mockGetLastChildBlock.mockResolvedValueOnce(expectedBlock);
      const result = await service.getLastCheckpointedL2Block();
      expect(result).toBe(expectedBlock);
      expect(mockGetLastChildBlock).toHaveBeenCalled();
    });

    it('should throw an error if CheckpointManager.getLastChildBlock fails', async () => {
      mockGetLastChildBlock.mockRejectedValueOnce(new Error('Eth call error'));
      await expect(service.getLastCheckpointedL2Block()).rejects.toThrow(
        'Failed to fetch last checkpointed L2 block: Eth call error'
      );
    });

    it('should throw if service is not properly initialized (e.g. no start call)', async () => {
      const uninitializedService = new PolygonRpcService(mockRuntime);
      await expect(uninitializedService.getLastCheckpointedL2Block()).rejects.toThrow(
        'CheckpointManager L1 contract is not initialized.'
      );
    });
  });

  describe('isL2BlockCheckpointed', () => {
    beforeEach(async () => {
      service = await PolygonRpcService.start(mockRuntime);
    });

    it('should return true if L2 block is less than last checkpointed block', async () => {
      mockGetLastChildBlock.mockResolvedValueOnce(1000n);
      const result = await service.isL2BlockCheckpointed(500n);
      expect(result).toBe(true);
      expect(mockGetLastChildBlock).toHaveBeenCalled();
    });

    it('should return true if L2 block is equal to last checkpointed block', async () => {
      mockGetLastChildBlock.mockResolvedValueOnce(1000n);
      const result = await service.isL2BlockCheckpointed(1000n);
      expect(result).toBe(true);
    });

    it('should return false if L2 block is greater than last checkpointed block', async () => {
      mockGetLastChildBlock.mockResolvedValueOnce(1000n);
      const result = await service.isL2BlockCheckpointed(1500n);
      expect(result).toBe(false);
    });

    it('should throw an error if getLastCheckpointedL2Block fails', async () => {
      mockGetLastChildBlock.mockRejectedValueOnce(new Error('RPC down'));
      await expect(service.isL2BlockCheckpointed(500n)).rejects.toThrow(
        'Failed to fetch last checkpointed L2 block: RPC down'
      );
    });
  });

  describe('getL2Provider', () => {
    it('should return the L2 provider if initialized', async () => {
      service = await PolygonRpcService.start(mockRuntime);
      const provider = service.getL2Provider();
      expect(provider).toBeDefined();
      expect(provider).toHaveProperty('getNetwork');
    });

    it('should throw if service is not initialized', () => {
      const uninitializedService = new PolygonRpcService(mockRuntime);
      expect(() => uninitializedService.getL2Provider()).toThrow('Provider L2 not initialized.');
    });
  });
});
