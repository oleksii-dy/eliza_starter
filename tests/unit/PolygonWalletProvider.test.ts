import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PolygonWalletProvider } from '../../src/providers/PolygonWalletProvider';
import { elizaLogger } from '@elizaos/core';

// Mock dependencies
vi.mock('@elizaos/core', () => ({
  elizaLogger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  }
}));

vi.mock('../../src/providers/PolygonRpcProvider', () => {
  return {
    PolygonRpcProvider: vi.fn().mockImplementation(() => ({
      getAddress: vi.fn().mockReturnValue('0xUserAddress'),
      getPublicClient: vi.fn().mockImplementation((network) => {
        return network === 'L1' ? mockL1PublicClient : mockL2PublicClient;
      }),
      getWalletClient: vi.fn().mockImplementation((network) => {
        return network === 'L1' ? mockL1WalletClient : mockL2WalletClient;
      }),
      getChainConfig: vi.fn().mockImplementation((network) => {
        return network === 'L1' 
          ? { id: 1, name: 'Ethereum' } 
          : { id: 137, name: 'Polygon' };
      }),
      getNativeBalance: vi.fn().mockImplementation((address, network) => {
        return network === 'L1' 
          ? BigInt(3000000000000000000) // 3 ETH
          : BigInt(5000000000000000000); // 5 MATIC
      }),
      getErc20Balance: vi.fn().mockImplementation((tokenAddress, holderAddress, network) => {
        return network === 'L1' 
          ? BigInt(1000000000000000000) // 1 token on L1
          : BigInt(2000000000000000000); // 2 tokens on L2
      }),
      getErc20Metadata: vi.fn().mockImplementation((tokenAddress, network) => {
        return network === 'L1'
          ? { symbol: 'ETH', decimals: 18 }
          : { symbol: 'MATIC', decimals: 18 };
      }),
      sendTransaction: vi.fn().mockImplementation((to, value, data, network) => {
        return network === 'L1'
          ? '0xL1TransactionHash'
          : '0xL2TransactionHash';
      }),
      getGasPrice: vi.fn().mockImplementation((network) => {
        return network === 'L1'
          ? BigInt(30000000000) // 30 gwei on L1
          : BigInt(5000000000); // 5 gwei on L2
      }),
      estimateGas: vi.fn().mockImplementation((tx, network) => {
        return BigInt(21000);
      }),
    }))
  };
});

// Global mock clients referenced in the PolygonRpcProvider mock
const mockL1PublicClient = {
  getBlockNumber: vi.fn().mockResolvedValue(BigInt(15000000)),
};

const mockL2PublicClient = {
  getBlockNumber: vi.fn().mockResolvedValue(BigInt(40000000)),
};

const mockL1WalletClient = {
  sendTransaction: vi.fn().mockResolvedValue('0xL1TransactionHash'),
  writeContract: vi.fn().mockResolvedValue('0xL1ContractTxHash'),
  account: { address: '0xUserAddress' },
};

const mockL2WalletClient = {
  sendTransaction: vi.fn().mockResolvedValue('0xL2TransactionHash'),
  writeContract: vi.fn().mockResolvedValue('0xL2ContractTxHash'),
  account: { address: '0xUserAddress' },
};

describe('PolygonWalletProvider', () => {
  let walletProvider: PolygonWalletProvider;
  
  const mockEthereumRpcUrl = 'https://eth-mainnet.mock.io';
  const mockPolygonRpcUrl = 'https://polygon-mainnet.mock.io';
  const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockUserAddress = '0xUserAddress';
  const mockTokenAddress = '0x1234567890abcdef1234567890abcdef12345678';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Initialize the wallet provider
    walletProvider = new PolygonWalletProvider(
      mockEthereumRpcUrl,
      mockPolygonRpcUrl,
      mockPrivateKey
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should create the provider with correct configuration', () => {
      expect(walletProvider).toBeDefined();
    });
  });

  describe('Account methods', () => {
    it('should return the correct wallet address', () => {
      const address = walletProvider.getAddress();
      expect(address).toBe(mockUserAddress);
    });
  });

  describe('Balance methods', () => {
    it('should get L1 native balance', async () => {
      const balance = await walletProvider.getNativeBalance('L1');
      expect(balance).toBe(BigInt(3000000000000000000)); // 3 ETH
    });

    it('should get L2 native balance', async () => {
      const balance = await walletProvider.getNativeBalance('L2');
      expect(balance).toBe(BigInt(5000000000000000000)); // 5 MATIC
    });

    it('should get L1 token balance', async () => {
      const balance = await walletProvider.getTokenBalance(mockTokenAddress, 'L1');
      expect(balance).toBe(BigInt(1000000000000000000)); // 1 token on L1
    });

    it('should get L2 token balance', async () => {
      const balance = await walletProvider.getTokenBalance(mockTokenAddress, 'L2');
      expect(balance).toBe(BigInt(2000000000000000000)); // 2 tokens on L2
    });

    it('should get formatted native balance on L1', async () => {
      const formattedBalance = await walletProvider.getFormattedNativeBalance('L1');
      expect(formattedBalance).toMatchObject({
        balance: BigInt(3000000000000000000),
        formatted: '3.0',
        symbol: 'ETH',
      });
    });

    it('should get formatted native balance on L2', async () => {
      const formattedBalance = await walletProvider.getFormattedNativeBalance('L2');
      expect(formattedBalance).toMatchObject({
        balance: BigInt(5000000000000000000),
        formatted: '5.0',
        symbol: 'MATIC',
      });
    });

    it('should get formatted token balance on L1', async () => {
      const formattedBalance = await walletProvider.getFormattedTokenBalance(mockTokenAddress, 'L1');
      expect(formattedBalance).toMatchObject({
        balance: BigInt(1000000000000000000),
        formatted: '1.0',
        symbol: 'ETH',
      });
    });

    it('should get formatted token balance on L2', async () => {
      const formattedBalance = await walletProvider.getFormattedTokenBalance(mockTokenAddress, 'L2');
      expect(formattedBalance).toMatchObject({
        balance: BigInt(2000000000000000000),
        formatted: '2.0',
        symbol: 'MATIC',
      });
    });
  });

  describe('Transaction methods', () => {
    it('should send native transaction on L1', async () => {
      const txHash = await walletProvider.sendNativeTransaction({
        to: '0xRecipientAddress',
        value: '1.0',
        network: 'L1'
      });
      
      expect(txHash).toBe('0xL1TransactionHash');
      expect(walletProvider.rpcProvider.sendTransaction).toHaveBeenCalledWith(
        '0xRecipientAddress',
        BigInt(1000000000000000000), // 1 ETH in wei
        '0x',
        'L1'
      );
    });

    it('should send native transaction on L2', async () => {
      const txHash = await walletProvider.sendNativeTransaction({
        to: '0xRecipientAddress',
        value: '2.0',
        network: 'L2'
      });
      
      expect(txHash).toBe('0xL2TransactionHash');
      expect(walletProvider.rpcProvider.sendTransaction).toHaveBeenCalledWith(
        '0xRecipientAddress',
        BigInt(2000000000000000000), // 2 MATIC in wei
        '0x',
        'L2'
      );
    });

    it('should send token transaction on L1', async () => {
      vi.spyOn(walletProvider, 'getTokenTransferData').mockReturnValue('0xTokenTransferData');
      
      const txHash = await walletProvider.sendTokenTransaction({
        tokenAddress: mockTokenAddress,
        to: '0xRecipientAddress',
        value: '0.5',
        network: 'L1'
      });
      
      expect(txHash).toBe('0xL1TransactionHash');
      expect(walletProvider.rpcProvider.sendTransaction).toHaveBeenCalledWith(
        mockTokenAddress,
        BigInt(0),
        '0xTokenTransferData',
        'L1'
      );
    });

    it('should send token transaction on L2', async () => {
      vi.spyOn(walletProvider, 'getTokenTransferData').mockReturnValue('0xTokenTransferData');
      
      const txHash = await walletProvider.sendTokenTransaction({
        tokenAddress: mockTokenAddress,
        to: '0xRecipientAddress',
        value: '1.5',
        network: 'L2'
      });
      
      expect(txHash).toBe('0xL2TransactionHash');
      expect(walletProvider.rpcProvider.sendTransaction).toHaveBeenCalledWith(
        mockTokenAddress,
        BigInt(0),
        '0xTokenTransferData',
        'L2'
      );
    });
  });

  describe('Helper methods', () => {
    it('should generate correct token transfer data', () => {
      const transferData = walletProvider.getTokenTransferData(
        '0xRecipient',
        '1000000000000000000' // 1 token in wei
      );
      
      // Should start with the ERC20 transfer function selector (0xa9059cbb)
      expect(transferData.startsWith('0xa9059cbb')).toBe(true);
    });
    
    it('should format native amount correctly', () => {
      const weiAmount = walletProvider.parseNativeAmount('1.5');
      expect(weiAmount).toBe(BigInt(1500000000000000000)); // 1.5 ETH/MATIC in wei
    });
  });
}); 