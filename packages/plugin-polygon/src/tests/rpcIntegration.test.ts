import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PolygonRpcService } from '../services/PolygonRpcService';
import { GovernanceService } from '../services/GovernanceService';
import { type Address, type Hash } from 'viem';

// Mock ethers
vi.mock('ethers', () => {
  return {
    Contract: vi.fn().mockImplementation((address, abi, provider) => {
      return {
        address,
        // Mock contract methods
        name: vi.fn().mockResolvedValue('Governance Token'),
        symbol: vi.fn().mockResolvedValue('GOV'),
        decimals: vi.fn().mockResolvedValue(18),
        totalSupply: vi.fn().mockResolvedValue(BigInt('1000000000000000000000000')),
        getVotes: vi.fn().mockResolvedValue(BigInt('100000000000000000000')),
        balanceOf: vi.fn().mockResolvedValue(BigInt('500000000000000000000')),
        votingDelay: vi.fn().mockResolvedValue(BigInt('1')),
        votingPeriod: vi.fn().mockResolvedValue(BigInt('45818')),
        proposalThreshold: vi.fn().mockResolvedValue(BigInt('10000000000000000000')),
        quorum: vi.fn().mockResolvedValue(BigInt('40000000000000000000000')),
        state: vi.fn().mockResolvedValue(1),
        proposalVotes: vi.fn().mockResolvedValue([
          BigInt('10000000000000000000'),
          BigInt('30000000000000000000'),
          BigInt('5000000000000000000')
        ]),
        token: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
        timelock: vi.fn().mockResolvedValue('0x0987654321098765432109876543210987654321'),
        getMinDelay: vi.fn().mockResolvedValue(BigInt('86400')),
      };
    }),
    JsonRpcProvider: vi.fn().mockImplementation(() => {
      return {
        getNetwork: vi.fn().mockResolvedValue({ chainId: 137 }),
        getBlockNumber: vi.fn().mockResolvedValue(1000000),
      };
    }),
    Wallet: vi.fn().mockImplementation(() => {
      return {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        connect: vi.fn().mockReturnThis(),
      };
    }),
  };
});

// Mock viem
vi.mock('viem', () => {
  return {
    createPublicClient: vi.fn().mockReturnValue({
      getBalance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
      getBlockNumber: vi.fn().mockResolvedValue(1000000),
      getGasPrice: vi.fn().mockResolvedValue(BigInt('10000000000')),
      readContract: vi.fn().mockResolvedValue(BigInt('500000000000000000000')),
    }),
    createWalletClient: vi.fn().mockReturnValue({
      account: { address: '0xabcdef1234567890abcdef1234567890abcdef12' },
      sendTransaction: vi.fn().mockResolvedValue('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'),
    }),
    http: vi.fn(),
  };
});

// Mock IAgentRuntime
const mockRuntime = {
  getSetting: vi.fn((key) => {
    const settings = {
      'ETHEREUM_RPC_URL': 'https://mainnet.infura.io/v3/test',
      'POLYGON_RPC_URL': 'https://polygon-rpc.com',
      'PRIVATE_KEY': '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      'POLYGONSCAN_KEY': 'ABCDEF1234567890',
      'GOVERNOR_ADDRESS': '0xD952175d6A20187d7A5803DcC9741472F640A9b8',
      'TOKEN_ADDRESS': '0x1234567890123456789012345678901234567890',
      'TIMELOCK_ADDRESS': '0x0987654321098765432109876543210987654321',
    };
    return settings[key];
  }),
  getService: vi.fn(),
  setCache: vi.fn(),
  getCache: vi.fn(),
  deleteCache: vi.fn(),
  setSetting: vi.fn(),
};

describe('RPC and Governance Integration', () => {
  let rpcService: PolygonRpcService;
  let governanceService: GovernanceService;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Initialize RPC service first
    rpcService = await PolygonRpcService.start(mockRuntime as any);
    
    // Update the mock to return the RPC service
    mockRuntime.getService.mockImplementation((serviceType) => {
      if (serviceType === PolygonRpcService.serviceType) {
        return rpcService;
      }
      return null;
    });
    
    // Then initialize governance service
    governanceService = await GovernanceService.start(mockRuntime as any);
  });

  afterEach(async () => {
    await governanceService.stop();
    await rpcService.stop();
  });

  describe('Provider Access', () => {
    it('should allow GovernanceService to access ethers provider from RpcService', () => {
      // This test verifies that the GovernanceService can get an ethers provider from the RpcService
      const provider = rpcService.getEthersProvider('L2');
      expect(provider).toBeDefined();
    });
  });

  describe('Contract Interactions', () => {
    it('should get token information through ethers provider', async () => {
      const tokenInfo = await governanceService.getTokenInfo();
      
      expect(tokenInfo).toEqual({
        name: 'Governance Token',
        symbol: 'GOV',
        decimals: 18,
        totalSupply: BigInt('1000000000000000000000000')
      });
    });

    it('should get governance settings through ethers provider', async () => {
      const settings = await governanceService.getGovernanceSettings();
      
      expect(settings).toEqual({
        votingDelay: BigInt('1'),
        votingPeriod: BigInt('45818'),
        proposalThreshold: BigInt('10000000000000000000'),
        quorum: BigInt('40000000000000000000000')
      });
    });
  });

  describe('Network Selection', () => {
    it('should use L2 provider for governance interactions by default', async () => {
      // This test verifies that the governance service uses the L2 provider
      await governanceService.getTokenInfo();
      
      // Check that getEthersProvider was called with 'L2'
      expect(rpcService.getEthersProvider).toHaveBeenCalledWith('L2');
    });
  });

  describe('Error Handling', () => {
    it('should handle provider errors gracefully', async () => {
      // Make the provider throw an error
      vi.spyOn(rpcService, 'getEthersProvider').mockImplementationOnce(() => {
        throw new Error('Provider error');
      });
      
      // Reinitialize governance service to trigger the error
      await expect(GovernanceService.start(mockRuntime as any)).rejects.toThrow('Provider error');
    });
  });
}); 