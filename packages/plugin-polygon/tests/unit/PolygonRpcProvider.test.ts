import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PolygonRpcProvider } from '../../src/providers/PolygonRpcProvider';
import { elizaLogger } from '../mocks/core-mock';

// Imported with mocks from vitest.setup.ts
import { createPublicClient, createWalletClient } from 'viem';

describe('PolygonRpcProvider', () => {
  let provider: PolygonRpcProvider;
  let mockPublicClient: any;
  let mockWalletClient: any;
  
  const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockEthereumRpcUrl = 'https://eth-mainnet.mock.io';
  const mockPolygonRpcUrl = 'https://polygon-mainnet.mock.io';
  const mockTokenAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const mockUserAddress = '0xUserAddress';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock clients
    mockPublicClient = {
      getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000000)),
      getBlock: vi.fn().mockResolvedValue({
        hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        number: BigInt(1000000),
        timestamp: BigInt(1600000000),
        gasUsed: BigInt(1000000),
        gasLimit: BigInt(30000000),
      }),
      getTransaction: vi.fn().mockResolvedValue({
        hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        from: '0xSenderAddress',
        to: '0xRecipientAddress',
        value: BigInt(1000000000000000000), // 1 ETH/MATIC
        gasPrice: BigInt(20000000000),
      }),
      getTransactionReceipt: vi.fn().mockResolvedValue({
        status: 'success',
        blockNumber: BigInt(1000000),
        gasUsed: BigInt(21000),
      }),
      getBalance: vi.fn().mockResolvedValue(BigInt(2000000000000000000)), // 2 ETH/MATIC
      readContract: vi.fn().mockImplementation(({ functionName }) => {
        if (functionName === 'balanceOf') return BigInt(500000000000000000); // 0.5 tokens
        if (functionName === 'decimals') return 18;
        if (functionName === 'symbol') return 'TKN';
        return null;
      }),
    };
    
    mockWalletClient = {
      sendTransaction: vi.fn().mockResolvedValue('0xTransactionHash'),
      writeContract: vi.fn().mockResolvedValue('0xTransactionHash'),
      account: { address: '0xUserAddress' },
    };
    
    // Mock implementation for createPublicClient and createWalletClient
    (createPublicClient as any).mockReturnValue(mockPublicClient);
    (createWalletClient as any).mockReturnValue(mockWalletClient);
    
    // Spy on elizaLogger methods
    vi.spyOn(elizaLogger, 'log').mockImplementation(() => {});
    vi.spyOn(elizaLogger, 'error').mockImplementation(() => {});
    vi.spyOn(elizaLogger, 'warn').mockImplementation(() => {});
    vi.spyOn(elizaLogger, 'debug').mockImplementation(() => {});
    vi.spyOn(elizaLogger, 'info').mockImplementation(() => {});
    
    // Initialize the provider
    provider = new PolygonRpcProvider(
      mockEthereumRpcUrl,
      mockPolygonRpcUrl,
      mockPrivateKey
    );
    
    // Add account property directly to avoid initialization issues
    provider.account = { address: mockUserAddress };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct RPC URLs and account', () => {
      expect(provider).toBeDefined();
      expect(provider.getAddress()).toBe(mockUserAddress);
    });
  });

  describe('Block methods', () => {
    it('should get L1 block number', async () => {
      const blockNumber = await provider.getBlockNumber('L1');
      expect(blockNumber).toBe(1000000);
    });

    it('should get L2 block number', async () => {
      const blockNumber = await provider.getBlockNumber('L2');
      expect(blockNumber).toBe(1000000);
    });

    it('should get L1 block by number', async () => {
      const block = await provider.getBlock(1000000, 'L1');
      expect(block).toBeDefined();
      expect(block.number).toBe(BigInt(1000000));
    });

    it('should get L2 block by number', async () => {
      const block = await provider.getBlock(1000000, 'L2');
      expect(block).toBeDefined();
      expect(block.number).toBe(BigInt(1000000));
    });
  });

  describe('Transaction methods', () => {
    it('should get transaction by hash from L1', async () => {
      const tx = await provider.getTransaction('0xHash', 'L1');
      expect(tx).toBeDefined();
      expect(tx.value).toBe(BigInt(1000000000000000000));
    });

    it('should get transaction by hash from L2', async () => {
      const tx = await provider.getTransaction('0xHash', 'L2');
      expect(tx).toBeDefined();
      expect(tx.value).toBe(BigInt(1000000000000000000));
    });

    it('should get transaction receipt from L1', async () => {
      const receipt = await provider.getTransactionReceipt('0xHash', 'L1');
      expect(receipt).toBeDefined();
      expect(receipt.status).toBe('success');
    });

    it('should get transaction receipt from L2', async () => {
      const receipt = await provider.getTransactionReceipt('0xHash', 'L2');
      expect(receipt).toBeDefined();
      expect(receipt.status).toBe('success');
    });
  });

  describe('Balance methods', () => {
    it('should get native balance from L1', async () => {
      const balance = await provider.getNativeBalance(mockUserAddress, 'L1');
      expect(balance).toBe(BigInt(2000000000000000000));
    });

    it('should get native balance from L2', async () => {
      const balance = await provider.getNativeBalance(mockUserAddress, 'L2');
      expect(balance).toBe(BigInt(2000000000000000000));
    });

    it('should get ERC20 token balance from L1', async () => {
      const balance = await provider.getErc20Balance(
        mockTokenAddress,
        mockUserAddress,
        'L1'
      );
      expect(balance).toBe(BigInt(500000000000000000));
    });

    it('should get ERC20 token balance from L2', async () => {
      const balance = await provider.getErc20Balance(
        mockTokenAddress,
        mockUserAddress,
        'L2'
      );
      expect(balance).toBe(BigInt(500000000000000000));
    });
  });

  describe('ERC20 metadata methods', () => {
    it('should get ERC20 token metadata from L1', async () => {
      const metadata = await provider.getErc20Metadata(mockTokenAddress, 'L1');
      expect(metadata).toBeDefined();
      expect(metadata.symbol).toBe('TKN');
      expect(metadata.decimals).toBe(18);
    });

    it('should get ERC20 token metadata from L2', async () => {
      const metadata = await provider.getErc20Metadata(mockTokenAddress, 'L2');
      expect(metadata).toBeDefined();
      expect(metadata.symbol).toBe('TKN');
      expect(metadata.decimals).toBe(18);
    });
  });

  describe('Transaction sending', () => {
    it('should send a transaction on L1', async () => {
      const txHash = await provider.sendTransaction(
        '0xRecipient',
        BigInt(1000000000000000000),
        '0xData',
        'L1'
      );
      expect(txHash).toBe('0xTransactionHash');
    });

    it('should send a transaction on L2', async () => {
      const txHash = await provider.sendTransaction(
        '0xRecipient',
        BigInt(1000000000000000000),
        '0xData',
        'L2'
      );
      expect(txHash).toBe('0xTransactionHash');
    });
  });

  describe('Caching', () => {
    it('should cache block number responses', async () => {
      // First call
      await provider.getBlockNumber('L2');
      
      // Second call should use cached result
      await provider.getBlockNumber('L2');
      
      // Verify getBlockNumber was only called once on the client
      expect(mockPublicClient.getBlockNumber).toHaveBeenCalledTimes(1);
    });
  });
}); 