import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PolygonRpcProvider } from '../../src/providers/PolygonRpcProvider';
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
  const mockCreatePublicClient = vi.fn();
  const mockCreateWalletClient = vi.fn();
  
  return {
    createPublicClient: mockCreatePublicClient,
    createWalletClient: mockCreateWalletClient,
    formatEther: vi.fn().mockReturnValue('2.0'),
    toHex: vi.fn().mockImplementation((value) => `0x${value.toString(16)}`),
    http: vi.fn().mockImplementation(() => 'http-transport'),
  };
});

// Mock viem/accounts
vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn().mockReturnValue({
    address: '0xUserAddress',
    signMessage: vi.fn(),
    signTransaction: vi.fn(),
    signTypedData: vi.fn(),
  }),
}));

// Mock viem/chains
vi.mock('viem/chains', () => ({
  mainnet: {
    id: 1,
    name: 'Ethereum',
    network: 'mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://ethereum-rpc.com'] },
    },
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    network: 'polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://polygon-rpc.com'] },
    },
  },
}));

describe('PolygonRpcProvider', () => {
  let provider: PolygonRpcProvider;
  let mockL1PublicClient: any;
  let mockL2PublicClient: any;
  let mockL1WalletClient: any;
  let mockL2WalletClient: any;
  
  const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockEthereumRpcUrl = 'https://eth-mainnet.mock.io';
  const mockPolygonRpcUrl = 'https://polygon-mainnet.mock.io';
  const mockTokenAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const mockUserAddress = '0xUserAddress';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create separate mock clients for L1 and L2
    mockL1PublicClient = {
      getBlockNumber: vi.fn().mockResolvedValue(BigInt(15000000)), // Ethereum block
      getBlock: vi.fn().mockResolvedValue({
        hash: '0xL1BlockHash',
        number: BigInt(15000000),
        timestamp: BigInt(1700000000),
        gasUsed: BigInt(2000000),
        gasLimit: BigInt(30000000),
        transactions: ['0xL1TxHash1', '0xL1TxHash2'],
      }),
      getTransaction: vi.fn().mockResolvedValue({
        hash: '0xL1TxHash',
        from: '0xSenderAddress',
        to: '0xRecipientAddress',
        value: BigInt(1000000000000000000), // 1 ETH
        gasPrice: BigInt(30000000000), // Higher gas on L1
      }),
      getTransactionReceipt: vi.fn().mockResolvedValue({
        status: 1,
        blockNumber: BigInt(15000000),
        gasUsed: BigInt(21000),
        effectiveGasPrice: BigInt(30000000000),
      }),
      getBalance: vi.fn().mockResolvedValue(BigInt(3000000000000000000)), // 3 ETH
      readContract: vi.fn().mockImplementation(({ functionName }) => {
        if (functionName === 'balanceOf') return BigInt(1000000000000000000); // 1 token
        if (functionName === 'decimals') return 18;
        if (functionName === 'symbol') return 'ETH';
        return null;
      }),
      getGasPrice: vi.fn().mockResolvedValue(BigInt(30000000000)), // 30 gwei for L1
      estimateGas: vi.fn().mockResolvedValue(BigInt(21000)),
    };
    
    mockL2PublicClient = {
      getBlockNumber: vi.fn().mockResolvedValue(BigInt(40000000)), // Polygon block
      getBlock: vi.fn().mockResolvedValue({
        hash: '0xL2BlockHash',
        number: BigInt(40000000),
        timestamp: BigInt(1700000000),
        gasUsed: BigInt(1000000),
        gasLimit: BigInt(20000000),
        transactions: ['0xL2TxHash1', '0xL2TxHash2'],
      }),
      getTransaction: vi.fn().mockResolvedValue({
        hash: '0xL2TxHash',
        from: '0xSenderAddress',
        to: '0xRecipientAddress',
        value: BigInt(1000000000000000000), // 1 MATIC
        gasPrice: BigInt(5000000000), // Lower gas on L2
      }),
      getTransactionReceipt: vi.fn().mockResolvedValue({
        status: 1,
        blockNumber: BigInt(40000000),
        gasUsed: BigInt(21000),
        effectiveGasPrice: BigInt(5000000000),
      }),
      getBalance: vi.fn().mockResolvedValue(BigInt(5000000000000000000)), // 5 MATIC
      readContract: vi.fn().mockImplementation(({ functionName }) => {
        if (functionName === 'balanceOf') return BigInt(2000000000000000000); // 2 tokens
        if (functionName === 'decimals') return 18;
        if (functionName === 'symbol') return 'MATIC';
        return null;
      }),
      getGasPrice: vi.fn().mockResolvedValue(BigInt(5000000000)), // 5 gwei for L2
      estimateGas: vi.fn().mockResolvedValue(BigInt(21000)),
    };
    
    mockL1WalletClient = {
      sendTransaction: vi.fn().mockResolvedValue('0xL1TransactionHash'),
      writeContract: vi.fn().mockResolvedValue('0xL1ContractTxHash'),
      account: { address: '0xUserAddress' },
    };
    
    mockL2WalletClient = {
      sendTransaction: vi.fn().mockResolvedValue('0xL2TransactionHash'),
      writeContract: vi.fn().mockResolvedValue('0xL2ContractTxHash'),
      account: { address: '0xUserAddress' },
    };
    
    // Configure createPublicClient and createWalletClient to return different clients based on the chain
    const viem = require('viem');
    viem.createPublicClient.mockImplementation((config) => {
      // Determine which mock to return based on the chain
      if (config.chain.id === 1) {
        return mockL1PublicClient;
      } else {
        return mockL2PublicClient;
      }
    });
    
    viem.createWalletClient.mockImplementation((config) => {
      // Determine which mock to return based on the chain
      if (config.chain.id === 1) {
        return mockL1WalletClient;
      } else {
        return mockL2WalletClient;
      }
    });
    
    // Initialize the provider
    provider = new PolygonRpcProvider(
      mockEthereumRpcUrl,
      mockPolygonRpcUrl,
      mockPrivateKey
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct RPC URLs and account', () => {
      expect(provider).toBeDefined();
      expect(provider.getAddress()).toBe(mockUserAddress);
    });

    it('should create separate clients for L1 and L2', () => {
      const { createPublicClient, createWalletClient } = require('viem');
      // Should create 2 public clients (L1, L2) and 2 wallet clients (L1, L2)
      expect(createPublicClient).toHaveBeenCalledTimes(2);
      expect(createWalletClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('Network-specific Block methods', () => {
    it('should get L1 block number', async () => {
      const blockNumber = await provider.getBlockNumber('L1');
      expect(blockNumber).toBe(15000000);
      expect(mockL1PublicClient.getBlockNumber).toHaveBeenCalledTimes(1);
      expect(mockL2PublicClient.getBlockNumber).toHaveBeenCalledTimes(0);
    });

    it('should get L2 block number', async () => {
      const blockNumber = await provider.getBlockNumber('L2');
      expect(blockNumber).toBe(40000000);
      expect(mockL2PublicClient.getBlockNumber).toHaveBeenCalledTimes(1);
      expect(mockL1PublicClient.getBlockNumber).toHaveBeenCalledTimes(0);
    });

    it('should get L1 block details by number', async () => {
      const block = await provider.getBlock(15000000, 'L1');
      expect(block.hash).toBe('0xL1BlockHash');
      expect(mockL1PublicClient.getBlock).toHaveBeenCalledWith({
        blockNumber: BigInt(15000000),
      });
    });

    it('should get L2 block details by hash', async () => {
      const block = await provider.getBlock('0xL2BlockHash', 'L2');
      expect(block.number).toBe(BigInt(40000000));
      expect(mockL2PublicClient.getBlock).toHaveBeenCalledWith({
        blockHash: '0xL2BlockHash',
      });
    });
  });

  describe('Transaction methods', () => {
    it('should get L1 transaction details', async () => {
      const tx = await provider.getTransaction('0xL1TxHash', 'L1');
      expect(tx.value).toBe(BigInt(1000000000000000000)); // 1 ETH
      expect(mockL1PublicClient.getTransaction).toHaveBeenCalledWith({
        hash: '0xL1TxHash',
      });
    });

    it('should get L2 transaction details', async () => {
      const tx = await provider.getTransaction('0xL2TxHash', 'L2');
      expect(tx.gasPrice).toBe(BigInt(5000000000)); // Lower L2 gas price
      expect(mockL2PublicClient.getTransaction).toHaveBeenCalledWith({
        hash: '0xL2TxHash',
      });
    });

    it('should get L1 transaction receipt', async () => {
      const receipt = await provider.getTransactionReceipt('0xL1TxHash', 'L1');
      expect(receipt.status).toBe(1); // Success
      expect(mockL1PublicClient.getTransactionReceipt).toHaveBeenCalledWith({
        hash: '0xL1TxHash',
      });
    });

    it('should get L2 transaction receipt', async () => {
      const receipt = await provider.getTransactionReceipt('0xL2TxHash', 'L2');
      expect(receipt.effectiveGasPrice).toBe(BigInt(5000000000)); // L2 gas price
      expect(mockL2PublicClient.getTransactionReceipt).toHaveBeenCalledWith({
        hash: '0xL2TxHash',
      });
    });
  });

  describe('Balance methods', () => {
    it('should get L1 native balance', async () => {
      const balance = await provider.getNativeBalance(mockUserAddress, 'L1');
      expect(balance).toBe(BigInt(3000000000000000000)); // 3 ETH
      expect(mockL1PublicClient.getBalance).toHaveBeenCalledWith({
        address: mockUserAddress,
      });
    });

    it('should get L2 native balance', async () => {
      const balance = await provider.getNativeBalance(mockUserAddress, 'L2');
      expect(balance).toBe(BigInt(5000000000000000000)); // 5 MATIC
      expect(mockL2PublicClient.getBalance).toHaveBeenCalledWith({
        address: mockUserAddress,
      });
    });

    it('should get L1 token balance', async () => {
      const balance = await provider.getErc20Balance(
        mockTokenAddress,
        mockUserAddress,
        'L1'
      );
      
      expect(balance).toBe(BigInt(1000000000000000000)); // 1 token on L1
      expect(mockL1PublicClient.readContract).toHaveBeenCalledWith({
        address: mockTokenAddress,
        abi: expect.any(Array),
        functionName: 'balanceOf',
        args: [mockUserAddress],
      });
    });

    it('should get L2 token balance', async () => {
      const balance = await provider.getErc20Balance(
        mockTokenAddress,
        mockUserAddress,
        'L2'
      );
      
      expect(balance).toBe(BigInt(2000000000000000000)); // 2 tokens on L2
      expect(mockL2PublicClient.readContract).toHaveBeenCalledWith({
        address: mockTokenAddress,
        abi: expect.any(Array),
        functionName: 'balanceOf',
        args: [mockUserAddress],
      });
    });
  });

  describe('Token metadata methods', () => {
    it('should get L1 token metadata', async () => {
      const metadata = await provider.getErc20Metadata(mockTokenAddress, 'L1');
      expect(metadata.symbol).toBe('ETH');
      expect(metadata.decimals).toBe(18);
      expect(mockL1PublicClient.readContract).toHaveBeenCalledTimes(2);
    });

    it('should get L2 token metadata', async () => {
      const metadata = await provider.getErc20Metadata(mockTokenAddress, 'L2');
      expect(metadata.symbol).toBe('MATIC');
      expect(metadata.decimals).toBe(18);
      expect(mockL2PublicClient.readContract).toHaveBeenCalledTimes(2);
    });
  });

  describe('Gas methods', () => {
    it('should get L1 gas price', async () => {
      const gasPrice = await provider.getGasPrice('L1');
      expect(gasPrice).toBe(BigInt(30000000000)); // 30 gwei on L1
      expect(mockL1PublicClient.getGasPrice).toHaveBeenCalledTimes(1);
    });

    it('should get L2 gas price', async () => {
      const gasPrice = await provider.getGasPrice('L2');
      expect(gasPrice).toBe(BigInt(5000000000)); // 5 gwei on L2
      expect(mockL2PublicClient.getGasPrice).toHaveBeenCalledTimes(1);
    });

    it('should estimate gas for L1 transaction', async () => {
      const gas = await provider.estimateGas({
        to: '0xRecipientAddress',
        value: BigInt(1000000000000000000),
        data: '0x',
      }, 'L1');
      
      expect(gas).toBe(BigInt(21000));
      expect(mockL1PublicClient.estimateGas).toHaveBeenCalledTimes(1);
    });

    it('should estimate gas for L2 transaction', async () => {
      const gas = await provider.estimateGas({
        to: '0xRecipientAddress',
        value: BigInt(1000000000000000000),
        data: '0x',
      }, 'L2');
      
      expect(gas).toBe(BigInt(21000));
      expect(mockL2PublicClient.estimateGas).toHaveBeenCalledTimes(1);
    });
  });

  describe('Transaction sending methods', () => {
    it('should send transaction on L1', async () => {
      const hash = await provider.sendTransaction(
        '0xRecipientAddress',
        BigInt(1000000000000000000),
        '0x',
        'L1'
      );
      
      expect(hash).toBe('0xL1TransactionHash');
      expect(mockL1WalletClient.sendTransaction).toHaveBeenCalledWith({
        to: '0xRecipientAddress',
        value: BigInt(1000000000000000000),
        data: '0x',
      });
    });

    it('should send transaction on L2', async () => {
      const hash = await provider.sendTransaction(
        '0xRecipientAddress',
        BigInt(1000000000000000000),
        '0x',
        'L2'
      );
      
      expect(hash).toBe('0xL2TransactionHash');
      expect(mockL2WalletClient.sendTransaction).toHaveBeenCalledWith({
        to: '0xRecipientAddress',
        value: BigInt(1000000000000000000),
        data: '0x',
      });
    });
  });

  describe('Caching mechanism', () => {
    it('should cache block number responses', async () => {
      // First call should access the RPC client
      await provider.getBlockNumber('L2');
      expect(mockL2PublicClient.getBlockNumber).toHaveBeenCalledTimes(1);
      
      // Second call within cache timeout should not call RPC again
      await provider.getBlockNumber('L2');
      expect(mockL2PublicClient.getBlockNumber).toHaveBeenCalledTimes(1);
    });
  });
}); 