import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GovernanceService, ProposalState, ProposalVotes } from '../services/GovernanceService';
import { PolygonRpcService } from '../services/PolygonRpcService';
import { type Address } from 'viem';

// Mock the Contract class from ethers
vi.mock('ethers', () => {
  return {
    Contract: vi.fn().mockImplementation((address, abi, provider) => {
      return {
        address,
        // Mock token contract methods
        name: vi.fn().mockResolvedValue('Governance Token'),
        symbol: vi.fn().mockResolvedValue('GOV'),
        decimals: vi.fn().mockResolvedValue(18),
        totalSupply: vi.fn().mockResolvedValue(BigInt('1000000000000000000000000')), // 1M tokens
        getVotes: vi.fn().mockResolvedValue(BigInt('100000000000000000000')), // 100 tokens
        balanceOf: vi.fn().mockResolvedValue(BigInt('500000000000000000000')), // 500 tokens
        getPastVotes: vi.fn().mockResolvedValue(BigInt('50000000000000000000')), // 50 tokens
        
        // Mock governor contract methods
        votingDelay: vi.fn().mockResolvedValue(BigInt('1')), // 1 block
        votingPeriod: vi.fn().mockResolvedValue(BigInt('45818')), // ~1 week (assuming 13s blocks)
        proposalThreshold: vi.fn().mockResolvedValue(BigInt('10000000000000000000')), // 10 tokens
        quorum: vi.fn().mockResolvedValue(BigInt('40000000000000000000000')), // 40k tokens
        state: vi.fn().mockResolvedValue(1), // Active state
        proposalVotes: vi.fn().mockResolvedValue([
          BigInt('10000000000000000000'), // Against: 10 tokens
          BigInt('30000000000000000000'), // For: 30 tokens
          BigInt('5000000000000000000')   // Abstain: 5 tokens
        ]),
        token: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
        timelock: vi.fn().mockResolvedValue('0x0987654321098765432109876543210987654321'),
        
        // Mock timelock contract methods
        getMinDelay: vi.fn().mockResolvedValue(BigInt('86400')), // 1 day in seconds
      };
    }),
    JsonRpcProvider: vi.fn(),
    Wallet: vi.fn(),
  };
});

// Mock IAgentRuntime
const mockRuntime = {
  getSetting: vi.fn((key) => {
    const settings = {
      'GOVERNOR_ADDRESS': '0xD952175d6A20187d7A5803DcC9741472F640A9b8',
      'TOKEN_ADDRESS': '0x1234567890123456789012345678901234567890',
      'TIMELOCK_ADDRESS': '0x0987654321098765432109876543210987654321',
    };
    return settings[key];
  }),
  getService: vi.fn((serviceType) => {
    if (serviceType === PolygonRpcService.serviceType) {
      return mockPolygonRpcService;
    }
    return null;
  }),
  setCache: vi.fn(),
  getCache: vi.fn(),
  deleteCache: vi.fn(),
  setSetting: vi.fn(),
};

// Mock PolygonRpcService
const mockPolygonRpcService = {
  getEthersProvider: vi.fn().mockReturnValue({
    // Minimal mock of ethers provider
    getNetwork: vi.fn().mockResolvedValue({ chainId: 137 }),
    getBlockNumber: vi.fn().mockResolvedValue(1000000),
  }),
  sendTransaction: vi.fn().mockResolvedValue('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'),
};

describe('GovernanceService', () => {
  let governanceService: GovernanceService;

  beforeEach(async () => {
    vi.clearAllMocks();
    governanceService = await GovernanceService.start(mockRuntime as any);
  });

  afterEach(async () => {
    await governanceService.stop();
  });

  describe('Initialization', () => {
    it('should initialize with contract addresses from settings', async () => {
      expect(mockRuntime.getSetting).toHaveBeenCalledWith('GOVERNOR_ADDRESS');
      expect(mockRuntime.getSetting).toHaveBeenCalledWith('TOKEN_ADDRESS');
      expect(mockRuntime.getSetting).toHaveBeenCalledWith('TIMELOCK_ADDRESS');
      expect(mockRuntime.getService).toHaveBeenCalledWith(PolygonRpcService.serviceType);
    });
  });

  describe('Token Information', () => {
    it('should get token information', async () => {
      const tokenInfo = await governanceService.getTokenInfo();
      
      expect(tokenInfo).toEqual({
        name: 'Governance Token',
        symbol: 'GOV',
        decimals: 18,
        totalSupply: BigInt('1000000000000000000000000')
      });
    });
  });

  describe('Governance Settings', () => {
    it('should get governance settings', async () => {
      const settings = await governanceService.getGovernanceSettings();
      
      expect(settings).toEqual({
        votingDelay: BigInt('1'),
        votingPeriod: BigInt('45818'),
        proposalThreshold: BigInt('10000000000000000000'),
        quorum: BigInt('40000000000000000000000')
      });
    });
  });

  describe('Proposal State', () => {
    it('should get proposal state', async () => {
      const state = await governanceService.getProposalState(BigInt('123'));
      
      expect(state).toBe(1); // Active state
    });
  });

  describe('Proposal Votes', () => {
    it('should get proposal votes', async () => {
      const votes = await governanceService.getProposalVotes(BigInt('123'));
      
      expect(votes).toEqual({
        againstVotes: BigInt('10000000000000000000'),
        forVotes: BigInt('30000000000000000000'),
        abstainVotes: BigInt('5000000000000000000')
      });
    });
  });

  describe('Voting Power', () => {
    it('should get voting power for an address', async () => {
      const address = '0xabcdef1234567890abcdef1234567890abcdef12' as Address;
      const votingPower = await governanceService.getVotingPower(address);
      
      expect(votingPower).toBe(BigInt('100000000000000000000')); // 100 tokens
    });
  });

  describe('Token Balance', () => {
    it('should get token balance for an address', async () => {
      const address = '0xabcdef1234567890abcdef1234567890abcdef12' as Address;
      const balance = await governanceService.getTokenBalance(address);
      
      expect(balance).toBe(BigInt('500000000000000000000')); // 500 tokens
    });
  });

  describe('Timelock', () => {
    it('should get minimum delay', async () => {
      const minDelay = await governanceService.getMinDelay();
      
      expect(minDelay).toBe(BigInt('86400')); // 1 day in seconds
    });
  });
}); 