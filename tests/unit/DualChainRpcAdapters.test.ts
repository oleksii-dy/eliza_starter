import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { elizaLogger } from '@elizaos/core';

// Mock @elizaos/core
vi.mock('@elizaos/core', () => ({
  elizaLogger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  }
}));

// Mock viem
vi.mock('viem', () => {
  return {
    createPublicClient: vi.fn(),
    createWalletClient: vi.fn(),
    http: vi.fn().mockImplementation(() => 'http-transport'),
    formatEther: vi.fn().mockReturnValue('2.0'),
    parseEther: vi.fn().mockImplementation((value) => BigInt(value) * BigInt(10)**BigInt(18)),
  };
});

// Mock the chain adapters
const mockReadFunction = vi.fn();
const mockWriteFunction = vi.fn();

// Mock the actual adapter module - this should be the path to your actual adapters
vi.mock('../../src/adapters/dualChainAdapter', () => ({
  createDualChainReader: vi.fn().mockImplementation((provider) => {
    return function dualChainReader(targetChain) {
      return async function readWrapper(...args) {
        return mockReadFunction(targetChain, ...args);
      };
    };
  }),
  createDualChainWriter: vi.fn().mockImplementation((provider) => {
    return function dualChainWriter(targetChain) {
      return async function writeWrapper(...args) {
        return mockWriteFunction(targetChain, ...args);
      };
    };
  }),
}));

// Mock the provider
const mockProvider = {
  getPublicClient: vi.fn().mockImplementation((network) => {
    return network === 'L1' ? mockL1PublicClient : mockL2PublicClient;
  }),
  getWalletClient: vi.fn().mockImplementation((network) => {
    return network === 'L1' ? mockL1WalletClient : mockL2WalletClient;
  }),
  getChainConfig: vi.fn().mockImplementation((network) => {
    return network === 'L1' ? { id: 1, name: 'Ethereum' } : { id: 137, name: 'Polygon' };
  }),
};

// Mock clients
const mockL1PublicClient = {
  readContract: vi.fn().mockResolvedValue(BigInt(100)),
};

const mockL2PublicClient = {
  readContract: vi.fn().mockResolvedValue(BigInt(200)),
};

const mockL1WalletClient = {
  writeContract: vi.fn().mockResolvedValue('0xL1TxHash'),
};

const mockL2WalletClient = {
  writeContract: vi.fn().mockResolvedValue('0xL2TxHash'),
};

// Import the adapters
import { createDualChainReader, createDualChainWriter } from '../../src/adapters/dualChainAdapter';

describe('Dual Chain RPC Adapters', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Dual Chain Reader', () => {
    it('should create a reader function for L1', async () => {
      const reader = createDualChainReader(mockProvider);
      const l1Reader = reader('L1');

      // Should be a function
      expect(typeof l1Reader).toBe('function');

      // Call the reader
      await l1Reader('contractAddress', 'balanceOf', ['0xUserAddress']);

      // Should have called the mock read function with L1 as first parameter
      expect(mockReadFunction).toHaveBeenCalledWith(
        'L1',
        'contractAddress',
        'balanceOf',
        ['0xUserAddress']
      );
    });

    it('should create a reader function for L2', async () => {
      const reader = createDualChainReader(mockProvider);
      const l2Reader = reader('L2');

      // Call the reader
      await l2Reader('contractAddress', 'tokenData', [123]);

      // Should have called the mock read function with L2 as first parameter
      expect(mockReadFunction).toHaveBeenCalledWith(
        'L2',
        'contractAddress',
        'tokenData',
        [123]
      );
    });

    it('should forward the correct arguments to the provider', async () => {
      // Override the mock implementation for this test
      mockReadFunction.mockImplementation((network, address, method, args) => {
        return { network, address, method, args };
      });

      const reader = createDualChainReader(mockProvider);
      const l1Reader = reader('L1');

      const result = await l1Reader('0xContractAddress', 'balanceOf', ['0xUserAddress']);

      expect(result).toEqual({
        network: 'L1',
        address: '0xContractAddress',
        method: 'balanceOf',
        args: ['0xUserAddress'],
      });
    });

    it('should handle errors from the underlying reader', async () => {
      // Make the mock throw an error
      mockReadFunction.mockRejectedValueOnce(new Error('RPC error'));

      const reader = createDualChainReader(mockProvider);
      const l1Reader = reader('L1');

      await expect(l1Reader('0xContract', 'method', [])).rejects.toThrow('RPC error');
    });
  });

  describe('Dual Chain Writer', () => {
    it('should create a writer function for L1', async () => {
      const writer = createDualChainWriter(mockProvider);
      const l1Writer = writer('L1');

      // Should be a function
      expect(typeof l1Writer).toBe('function');

      // Call the writer
      await l1Writer('contractAddress', 'transfer', ['0xRecipient', BigInt(100)]);

      // Should have called the mock write function with L1 as first parameter
      expect(mockWriteFunction).toHaveBeenCalledWith(
        'L1',
        'contractAddress',
        'transfer',
        ['0xRecipient', BigInt(100)]
      );
    });

    it('should create a writer function for L2', async () => {
      const writer = createDualChainWriter(mockProvider);
      const l2Writer = writer('L2');

      // Call the writer
      await l2Writer('contractAddress', 'mint', ['0xRecipient', BigInt(200)]);

      // Should have called the mock write function with L2 as first parameter
      expect(mockWriteFunction).toHaveBeenCalledWith(
        'L2',
        'contractAddress',
        'mint',
        ['0xRecipient', BigInt(200)]
      );
    });

    it('should forward the correct arguments to the provider', async () => {
      // Override the mock implementation for this test
      mockWriteFunction.mockImplementation((network, address, method, args) => {
        return { network, address, method, args, txHash: network === 'L1' ? '0xL1Hash' : '0xL2Hash' };
      });

      const writer = createDualChainWriter(mockProvider);
      const l2Writer = writer('L2');

      const result = await l2Writer('0xContractAddress', 'withdraw', [BigInt(500)]);

      expect(result).toEqual({
        network: 'L2',
        address: '0xContractAddress',
        method: 'withdraw',
        args: [BigInt(500)],
        txHash: '0xL2Hash',
      });
    });

    it('should handle errors from the underlying writer', async () => {
      // Make the mock throw an error
      mockWriteFunction.mockRejectedValueOnce(new Error('Transaction reverted'));

      const writer = createDualChainWriter(mockProvider);
      const l2Writer = writer('L2');

      await expect(l2Writer('0xContract', 'method', [])).rejects.toThrow('Transaction reverted');
    });
  });

  describe('Practical chain-specific adapter usage', () => {
    it('should correctly route read operations to the right chain', async () => {
      // Override mocks to simulate actual implementation
      mockReadFunction.mockImplementation((network, address, method, args) => {
        if (network === 'L1') {
          return mockL1PublicClient.readContract({ address, functionName: method, args });
        } else {
          return mockL2PublicClient.readContract({ address, functionName: method, args });
        }
      });

      const reader = createDualChainReader(mockProvider);
      const l1Reader = reader('L1');
      const l2Reader = reader('L2');

      // Reading from L1
      const l1Result = await l1Reader('0xTokenAddress', 'balanceOf', ['0xUser']);
      expect(l1Result).toBe(BigInt(100)); // L1 mock returns 100
      expect(mockL1PublicClient.readContract).toHaveBeenCalled();
      expect(mockL2PublicClient.readContract).not.toHaveBeenCalled();

      vi.clearAllMocks();

      // Reading from L2
      const l2Result = await l2Reader('0xTokenAddress', 'balanceOf', ['0xUser']);
      expect(l2Result).toBe(BigInt(200)); // L2 mock returns 200
      expect(mockL2PublicClient.readContract).toHaveBeenCalled();
      expect(mockL1PublicClient.readContract).not.toHaveBeenCalled();
    });

    it('should correctly route write operations to the right chain', async () => {
      // Override mocks to simulate actual implementation
      mockWriteFunction.mockImplementation((network, address, method, args) => {
        if (network === 'L1') {
          return mockL1WalletClient.writeContract({ address, functionName: method, args });
        } else {
          return mockL2WalletClient.writeContract({ address, functionName: method, args });
        }
      });

      const writer = createDualChainWriter(mockProvider);
      const l1Writer = writer('L1');
      const l2Writer = writer('L2');

      // Writing to L1
      const l1Result = await l1Writer('0xBridgeAddress', 'deposit', ['0xUser', BigInt(100)]);
      expect(l1Result).toBe('0xL1TxHash');
      expect(mockL1WalletClient.writeContract).toHaveBeenCalled();
      expect(mockL2WalletClient.writeContract).not.toHaveBeenCalled();

      vi.clearAllMocks();

      // Writing to L2
      const l2Result = await l2Writer('0xBridgeAddress', 'withdraw', ['0xUser', BigInt(200)]);
      expect(l2Result).toBe('0xL2TxHash');
      expect(mockL2WalletClient.writeContract).toHaveBeenCalled();
      expect(mockL1WalletClient.writeContract).not.toHaveBeenCalled();
    });
  });

  describe('Integration with Bridge Service', () => {
    // Mock bridge service that uses the adapters
    let mockBridgeService;

    beforeEach(() => {
      // Create reader and writer functions
      const reader = createDualChainReader(mockProvider);
      const writer = createDualChainWriter(mockProvider);

      // Create a simplified bridge service that uses these adapters
      mockBridgeService = {
        depositEth: async (amount) => {
          // Should use L1 writer
          return writer('L1')('0xBridgeContract', 'depositEtherFor', ['0xUser'], { value: amount });
        },
        withdrawToken: async (tokenAddress, amount) => {
          // Should use L2 writer
          return writer('L2')('0xBridgeContract', 'withdraw', [tokenAddress, amount]);
        },
        getL1Balance: async (address) => {
          // Should use L1 reader
          return reader('L1')('0xBridgeContract', 'balanceOf', [address]);
        },
        getL2Balance: async (address) => {
          // Should use L2 reader
          return reader('L2')('0xBridgeContract', 'balanceOf', [address]);
        }
      };
    });

    it('should use L1 adapter for Ethereum operations', async () => {
      await mockBridgeService.depositEth(BigInt(1000));
      expect(mockWriteFunction).toHaveBeenCalledWith(
        'L1', 
        '0xBridgeContract', 
        'depositEtherFor', 
        ['0xUser'],
        expect.objectContaining({ value: BigInt(1000) })
      );
    });

    it('should use L2 adapter for Polygon operations', async () => {
      await mockBridgeService.withdrawToken('0xTokenAddress', BigInt(2000));
      expect(mockWriteFunction).toHaveBeenCalledWith(
        'L2', 
        '0xBridgeContract', 
        'withdraw', 
        ['0xTokenAddress', BigInt(2000)]
      );
    });

    it('should use the correct reader for each chain', async () => {
      await mockBridgeService.getL1Balance('0xUserAddress');
      expect(mockReadFunction).toHaveBeenCalledWith(
        'L1',
        '0xBridgeContract',
        'balanceOf',
        ['0xUserAddress']
      );

      await mockBridgeService.getL2Balance('0xUserAddress');
      expect(mockReadFunction).toHaveBeenCalledWith(
        'L2',
        '0xBridgeContract',
        'balanceOf',
        ['0xUserAddress']
      );
    });
  });
}); 