import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PolygonBridgeService } from '../../src/services/PolygonBridgeService';
import { elizaLogger } from '@elizaos/core';
import { encodeAbiParameters, parseAbiParameters } from 'viem';

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

// Mock viem for ABI encoding verification
vi.mock('viem', () => {
  const original = jest.requireActual('viem');
  return {
    ...original,
    encodeAbiParameters: vi.fn().mockImplementation((types, values) => {
      // Simple mock that returns a recognizable string
      if (types.length === 1 && types[0].type === 'uint256') {
        return `0xencoded_amount_${values[0].toString()}`;
      }
      return '0xmocked_encoded_data';
    }),
    parseAbiParameters: vi.fn().mockReturnValue([{ type: 'uint256' }]),
  };
});

// Create a mock for the PolygonRpcProvider
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
      sendTransaction: vi.fn().mockImplementation((to, value, data, network) => {
        return network === 'L1'
          ? '0xL1TransactionHash'
          : '0xL2TransactionHash';
      }),
    }))
  };
});

// Global mock client objects
const mockL1PublicClient = {
  readContract: vi.fn().mockImplementation(({ functionName }) => {
    if (functionName === 'rootExit') return true;
    if (functionName === 'depositEtherFor') return true;
    if (functionName === 'depositFor') return true;
    if (functionName === 'balanceOf') return BigInt(1000000000000000000);
    return null;
  }),
  estimateGas: vi.fn().mockResolvedValue(BigInt(100000)),
  getTransaction: vi.fn().mockResolvedValue({
    hash: '0xL1TxHash',
    to: '0xPolygonBridgeAddress',
    from: '0xUserAddress',
    status: 1
  }),
  getTransactionReceipt: vi.fn().mockResolvedValue({
    status: 1,
    logs: [
      {
        address: '0xPolygonBridgeAddress',
        topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
        data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
      }
    ]
  }),
  getBlock: vi.fn().mockResolvedValue({
    number: BigInt(15000000),
    timestamp: BigInt(1640000000)
  }),
};

const mockL2PublicClient = {
  readContract: vi.fn().mockImplementation(({ functionName }) => {
    if (functionName === 'exit') return true;
    if (functionName === 'withdraw') return true;
    if (functionName === 'balanceOf') return BigInt(2000000000000000000);
    return null;
  }),
  estimateGas: vi.fn().mockResolvedValue(BigInt(150000)),
  getTransaction: vi.fn().mockResolvedValue({
    hash: '0xL2TxHash',
    to: '0xPolygonChildBridgeAddress',
    from: '0xUserAddress',
    status: 1
  }),
  getTransactionReceipt: vi.fn().mockResolvedValue({
    status: 1,
    logs: [
      {
        address: '0xPolygonChildBridgeAddress',
        topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
        data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
      }
    ]
  }),
  getBlock: vi.fn().mockResolvedValue({
    number: BigInt(25000000),
    timestamp: BigInt(1640001000)
  }),
};

const mockL1WalletClient = {
  writeContract: vi.fn().mockResolvedValue('0xL1BridgeTxHash'),
  account: { address: '0xUserAddress' },
};

const mockL2WalletClient = {
  writeContract: vi.fn().mockResolvedValue('0xL2BridgeTxHash'),
  account: { address: '0xUserAddress' },
};

describe('PolygonBridgeService', () => {
  let bridgeService: PolygonBridgeService;
  
  const mockEthereumRpcUrl = 'https://eth-mainnet.mock.io';
  const mockPolygonRpcUrl = 'https://polygon-mainnet.mock.io';
  const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockTokenAddress = '0x1234567890abcdef1234567890abcdef12345678';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Initialize the bridge service
    bridgeService = new PolygonBridgeService(
      mockEthereumRpcUrl,
      mockPolygonRpcUrl,
      mockPrivateKey
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(bridgeService).toBeDefined();
      expect(bridgeService.rpcProvider).toBeDefined();
    });
  });

  describe('Bridge operations', () => {
    describe('Bridge ETH from L1 to L2', () => {
      it('should deposit ETH from Ethereum to Polygon', async () => {
        const amount = '1.0'; // 1 ETH
        const txHash = await bridgeService.depositEth(amount);
        
        expect(txHash).toBe('0xL1BridgeTxHash');
        expect(mockL1WalletClient.writeContract).toHaveBeenCalledWith(
          expect.objectContaining({
            functionName: 'depositEtherFor',
            args: ['0xUserAddress'],
            value: BigInt(1000000000000000000), // 1 ETH in wei
          })
        );
      });

      it('should handle errors when depositing ETH', async () => {
        mockL1WalletClient.writeContract.mockRejectedValueOnce(new Error('Deposit failed'));
        
        await expect(bridgeService.depositEth('1.0')).rejects.toThrow('Error depositing ETH');
        expect(elizaLogger.error).toHaveBeenCalled();
      });
    });

    describe('Bridge ERC20 tokens from L1 to L2', () => {
      it('should approve and deposit ERC20 tokens', async () => {
        // Mock the sequence of transactions for approval and deposit
        mockL1WalletClient.writeContract
          .mockResolvedValueOnce('0xApprovalTxHash') // First call for approval
          .mockResolvedValueOnce('0xDepositTxHash'); // Second call for deposit
        
        const result = await bridgeService.depositErc20Token(
          mockTokenAddress,
          '1.0' // 1 Token
        );
        
        expect(result).toBe('0xDepositTxHash');
        
        // Verify approval was called first
        expect(mockL1WalletClient.writeContract).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            address: mockTokenAddress,
            functionName: 'approve',
          })
        );
        
        // Verify deposit was called second
        expect(mockL1WalletClient.writeContract).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            functionName: 'depositFor',
          })
        );
      });
      
      it('should handle errors during token approval', async () => {
        mockL1WalletClient.writeContract.mockRejectedValueOnce(new Error('Approval failed'));
        
        await expect(bridgeService.depositErc20Token(
          mockTokenAddress,
          '1.0'
        )).rejects.toThrow('Error approving token');
        
        expect(elizaLogger.error).toHaveBeenCalled();
      });

      it('should encode depositData correctly for ERC20 deposits', async () => {
        // Setup a spy on the internal formatERC20DepositData method
        const encodeSpy = vi.spyOn(bridgeService, 'formatERC20DepositData');
        
        await bridgeService.depositErc20Token(
          mockTokenAddress,
          '1.0' // 1 Token with 18 decimals
        );
        
        // Verify the method was called with correct parameters
        expect(encodeSpy).toHaveBeenCalledWith(
          BigInt(1000000000000000000), // 1.0 with 18 decimals
          18
        );
        
        // Verify encodeAbiParameters was called correctly
        expect(encodeAbiParameters).toHaveBeenCalledWith(
          expect.any(Array),
          [BigInt(1000000000000000000)]
        );
      });
      
      it('should handle token deposits with different decimals', async () => {
        // Mock getErc20Metadata to return 6 decimals (like USDC)
        mockL1PublicClient.readContract.mockImplementation(({ functionName }) => {
          if (functionName === 'symbol') return 'USDC';
          if (functionName === 'decimals') return 6;
          return null;
        });
        
        const formatSpy = vi.spyOn(bridgeService, 'formatERC20DepositData');
        const amountSpy = vi.spyOn(bridgeService, 'parseTokenAmount');
        
        await bridgeService.depositErc20Token(
          mockTokenAddress,
          '100.5' // 100.5 USDC
        );
        
        // Verify parseTokenAmount was called with correct decimals
        expect(amountSpy).toHaveBeenCalledWith('100.5', 6);
        
        // Verify the deposit data was formatted with the right amount (100.5 * 10^6)
        expect(formatSpy).toHaveBeenCalledWith(
          BigInt(100500000), // 100.5 with 6 decimals
          6
        );
      });
      
      it('should wait for transaction confirmations between approve and deposit', async () => {
        // Create transaction objects with promises that resolve after delays
        const approvalTx = {
          hash: '0xApprovalTxHash',
          wait: vi.fn().mockResolvedValue({ status: 1 })
        };
        
        const depositTx = {
          hash: '0xDepositTxHash',
          wait: vi.fn().mockResolvedValue({ status: 1 })
        };
        
        // Mock the writeContract calls to return these transaction objects
        mockL1WalletClient.writeContract
          .mockResolvedValueOnce(approvalTx.hash)
          .mockResolvedValueOnce(depositTx.hash);
          
        // Mock waitForTransaction to simulate transaction confirmation
        mockL1PublicClient.waitForTransactionReceipt = vi.fn()
          .mockImplementation(({ hash }) => {
            if (hash === approvalTx.hash) {
              return Promise.resolve({ status: 1 });
            }
            return Promise.resolve({ status: 1 });
          });
        
        // Perform the deposit
        await bridgeService.depositErc20Token(
          mockTokenAddress,
          '1.0'
        );
        
        // Verify that waitForTransaction was called for the approval
        expect(mockL1PublicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
          hash: approvalTx.hash
        });
        
        // Verify the correct sequence of operations: approve -> wait -> deposit
        const calls = mockL1WalletClient.writeContract.mock.calls;
        
        // First call should be approve
        expect(calls[0][0].functionName).toBe('approve');
        
        // Second call should be depositFor
        expect(calls[1][0].functionName).toBe('depositFor');
      });

      it('should abort if approval transaction fails', async () => {
        // Mock waitForTransactionReceipt to return failed status
        mockL1PublicClient.waitForTransactionReceipt = vi.fn()
          .mockResolvedValue({ status: 0 }); // 0 = failed
          
        mockL1WalletClient.writeContract.mockResolvedValueOnce('0xFailedApprovalTxHash');
        
        await expect(bridgeService.depositErc20Token(
          mockTokenAddress,
          '1.0'
        )).rejects.toThrow('Approval transaction failed');
        
        // Verify deposit was not called after failed approval
        expect(mockL1WalletClient.writeContract).toHaveBeenCalledTimes(1);
        expect(mockL1WalletClient.writeContract).toHaveBeenCalledWith(
          expect.objectContaining({
            functionName: 'approve'
          })
        );
      });
    });

    describe('Bridge MATIC from L2 to L1', () => {
      it('should withdraw MATIC from Polygon to Ethereum', async () => {
        const amount = '1.0'; // 1 MATIC
        const txHash = await bridgeService.withdrawMatic(amount);
        
        expect(txHash).toBe('0xL2BridgeTxHash');
        expect(mockL2WalletClient.writeContract).toHaveBeenCalledWith(
          expect.objectContaining({
            functionName: 'withdraw',
            args: [BigInt(1000000000000000000)], // 1 MATIC in wei
          })
        );
      });

      it('should handle errors when withdrawing MATIC', async () => {
        mockL2WalletClient.writeContract.mockRejectedValueOnce(new Error('Withdraw failed'));
        
        await expect(bridgeService.withdrawMatic('1.0')).rejects.toThrow('Error withdrawing MATIC');
        expect(elizaLogger.error).toHaveBeenCalled();
      });
    });

    describe('Bridge ERC20 tokens from L2 to L1', () => {
      it('should withdraw ERC20 tokens from Polygon to Ethereum', async () => {
        const txHash = await bridgeService.withdrawErc20Token(
          mockTokenAddress,
          '1.0' // 1 Token
        );
        
        expect(txHash).toBe('0xL2BridgeTxHash');
        expect(mockL2WalletClient.writeContract).toHaveBeenCalledWith(
          expect.objectContaining({
            address: expect.any(String),
            functionName: 'withdrawTo',
            args: [
              mockTokenAddress,
              '0xUserAddress',
              BigInt(1000000000000000000), // 1 Token in wei
            ],
          })
        );
      });
      
      it('should handle errors when withdrawing tokens', async () => {
        mockL2WalletClient.writeContract.mockRejectedValueOnce(new Error('Withdraw failed'));
        
        await expect(bridgeService.withdrawErc20Token(
          mockTokenAddress,
          '1.0'
        )).rejects.toThrow('Error withdrawing token');
        
        expect(elizaLogger.error).toHaveBeenCalled();
      });
    });
    
    describe('Exit process from L1', () => {
      it('should process exit from L1 after bridge from L2', async () => {
        const mockBurnTxHash = '0xBurnTxHash';
        const txHash = await bridgeService.exitFromL1(mockBurnTxHash);
        
        expect(txHash).toBe('0xL1BridgeTxHash');
        expect(mockL1PublicClient.getTransactionReceipt).toHaveBeenCalledWith({
          hash: mockBurnTxHash,
        });
        
        expect(mockL1WalletClient.writeContract).toHaveBeenCalledWith(
          expect.objectContaining({
            functionName: 'exit',
            args: expect.any(Array), // The exit proof data
          })
        );
      });
      
      it('should handle errors during exit process', async () => {
        mockL1PublicClient.getTransactionReceipt.mockRejectedValueOnce(new Error('Receipt fetch failed'));
        
        await expect(bridgeService.exitFromL1('0xBurnTxHash')).rejects.toThrow('Error processing exit');
        expect(elizaLogger.error).toHaveBeenCalled();
      });
    });

    describe('Advanced bridging scenarios', () => {
      it('should handle large token amounts', async () => {
        const largeAmount = '1000000.0'; // 1 million tokens
        const parseSpy = vi.spyOn(bridgeService, 'parseTokenAmount');
        
        await bridgeService.depositErc20Token(
          mockTokenAddress,
          largeAmount
        );
        
        // Verify large amounts are handled correctly
        expect(parseSpy).toHaveBeenCalledWith(largeAmount, expect.any(Number));
        
        // Expected value: 1000000 * 10^18
        const expectedBigInt = BigInt('1000000') * BigInt(10)**BigInt(18);
        expect(parseSpy).toHaveReturnedWith(expectedBigInt);
      });
      
      it('should handle fractional token amounts', async () => {
        const smallAmount = '0.000000000000000001'; // smallest possible amount with 18 decimals
        const parseSpy = vi.spyOn(bridgeService, 'parseTokenAmount');
        
        await bridgeService.depositErc20Token(
          mockTokenAddress,
          smallAmount
        );
        
        // Verify that very small amounts are handled correctly
        expect(parseSpy).toHaveBeenCalledWith(smallAmount, expect.any(Number));
        expect(parseSpy).toHaveReturnedWith(BigInt(1)); // 0.000000000000000001 * 10^18 = 1
      });
      
      it('should reject bridge operations with zero amount', async () => {
        await expect(bridgeService.depositErc20Token(
          mockTokenAddress,
          '0.0'
        )).rejects.toThrow('Invalid amount');
      });
    });
    
    describe('Bridge transaction broadcasting', () => {
      it('should broadcast transactions to the correct network', async () => {
        // Test L1 transaction
        await bridgeService.depositEth('1.0');
        expect(mockL1WalletClient.writeContract).toHaveBeenCalled();
        expect(mockL2WalletClient.writeContract).not.toHaveBeenCalled();
        
        vi.clearAllMocks();
        
        // Test L2 transaction
        await bridgeService.withdrawMatic('1.0');
        expect(mockL2WalletClient.writeContract).toHaveBeenCalled();
        expect(mockL1WalletClient.writeContract).not.toHaveBeenCalled();
      });
      
      it('should handle network-specific gas parameters', async () => {
        // Mock estimateGas for both networks to return different values
        mockL1PublicClient.estimateGas.mockResolvedValue(BigInt(100000));
        mockL2PublicClient.estimateGas.mockResolvedValue(BigInt(50000));
        
        // Test with gas options
        const gasOptions = { gasPriceMultiplier: 1.2 };
        
        // L1 transaction with gas options
        await bridgeService.depositEth('1.0', gasOptions);
        
        // Should use L1 gas estimation
        expect(mockL1PublicClient.estimateGas).toHaveBeenCalled();
        
        // L2 transaction with gas options
        await bridgeService.withdrawMatic('1.0', gasOptions);
        
        // Should use L2 gas estimation
        expect(mockL2PublicClient.estimateGas).toHaveBeenCalled();
      });
    });
  });

  describe('Bridge status checks', () => {
    it('should check L1 to L2 bridge status', async () => {
      const status = await bridgeService.checkL1ToL2BridgeStatus('0xL1TxHash');
      
      expect(status).toEqual({
        complete: true,
        status: 'COMPLETED',
        txHash: '0xL1TxHash',
        blockNumber: 15000000,
        timestamp: 1640000000,
      });
      
      expect(mockL1PublicClient.getTransactionReceipt).toHaveBeenCalledWith({
        hash: '0xL1TxHash',
      });
    });
    
    it('should check L2 to L1 bridge status', async () => {
      const status = await bridgeService.checkL2ToL1BridgeStatus('0xL2TxHash');
      
      expect(status).toEqual({
        complete: true,
        status: 'COMPLETED',
        txHash: '0xL2TxHash',
        blockNumber: 25000000,
        timestamp: 1640001000,
        exitComplete: false,
        exitTxRequired: true,
      });
      
      expect(mockL2PublicClient.getTransactionReceipt).toHaveBeenCalledWith({
        hash: '0xL2TxHash',
      });
    });
    
    it('should handle failed transactions', async () => {
      // Mock a failed transaction
      mockL1PublicClient.getTransactionReceipt.mockResolvedValueOnce({
        status: 0, // Failed
        logs: []
      });
      
      const status = await bridgeService.checkL1ToL2BridgeStatus('0xL1TxHash');
      
      expect(status).toEqual({
        complete: true,
        status: 'FAILED',
        txHash: '0xL1TxHash',
        error: 'Transaction failed',
      });
    });
    
    it('should handle pending transactions', async () => {
      // Mock a transaction with no receipt yet
      mockL1PublicClient.getTransactionReceipt.mockResolvedValueOnce(null);
      
      const status = await bridgeService.checkL1ToL2BridgeStatus('0xL1TxHash');
      
      expect(status).toEqual({
        complete: false,
        status: 'PENDING',
        txHash: '0xL1TxHash',
      });
    });
  });

  describe('Helper methods', () => {
    it('should parse token amounts correctly', () => {
      const amount = bridgeService.parseTokenAmount('1.5', 18); // 1.5 tokens with 18 decimals
      expect(amount).toBe(BigInt(1500000000000000000)); // 1.5 * 10^18
    });
    
    it('should handle token decimals appropriately', () => {
      const amount = bridgeService.parseTokenAmount('1.5', 6); // 1.5 USDC with 6 decimals
      expect(amount).toBe(BigInt(1500000)); // 1.5 * 10^6
    });
    
    it('should validate token addresses', () => {
      expect(() => {
        bridgeService.validateTokenAddress('0xinvalid');
      }).toThrow('Invalid token address');
      
      // Valid address should not throw
      expect(() => {
        bridgeService.validateTokenAddress('0x1234567890abcdef1234567890abcdef12345678');
      }).not.toThrow();
    });
  });
}); 