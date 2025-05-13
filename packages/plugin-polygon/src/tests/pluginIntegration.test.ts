import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import PolygonPlugin from '../index';
import { PolygonRpcService } from '../services/PolygonRpcService';
import { GovernanceService } from '../services/GovernanceService';

// Mock the services
vi.mock('../services/PolygonRpcService', () => {
  return {
    PolygonRpcService: {
      serviceType: 'polygonRpc',
      start: vi.fn().mockResolvedValue({
        getBlockNumber: vi.fn().mockResolvedValue(1000000),
        getBalance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
        getTransaction: vi.fn().mockResolvedValue({}),
        getTransactionReceipt: vi.fn().mockResolvedValue({}),
        getBlock: vi.fn().mockResolvedValue({}),
        call: vi.fn().mockResolvedValue('0x'),
        estimateGas: vi.fn().mockResolvedValue(BigInt('21000')),
        getGasPrice: vi.fn().mockResolvedValue(BigInt('10000000000')),
        sendTransaction: vi.fn().mockResolvedValue('0xabcdef'),
        getCurrentL1BlockNumber: vi.fn().mockResolvedValue(15000000),
        getCurrentL2BlockNumber: vi.fn().mockResolvedValue(40000000),
        getNativeL1Balance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
        getNativeL2Balance: vi.fn().mockResolvedValue(BigInt('2000000000000000000')),
        getCurrentBlockNumber: vi.fn().mockResolvedValue(40000000),
        getBlockDetails: vi.fn().mockResolvedValue({}),
        getTransactionDetails: vi.fn().mockResolvedValue({}),
        getNativeBalance: vi.fn().mockResolvedValue(BigInt('2000000000000000000')),
        getErc20Balance: vi.fn().mockResolvedValue(BigInt('500000000000000000000')),
        getEthersProvider: vi.fn().mockReturnValue({}),
      }),
      stop: vi.fn().mockResolvedValue(undefined),
    }
  };
});

vi.mock('../services/GovernanceService', () => {
  return {
    GovernanceService: {
      serviceType: 'polygonGovernance',
      start: vi.fn().mockResolvedValue({
        getTokenInfo: vi.fn().mockResolvedValue({
          name: 'Governance Token',
          symbol: 'GOV',
          decimals: 18,
          totalSupply: BigInt('1000000000000000000000000')
        }),
        getGovernanceSettings: vi.fn().mockResolvedValue({
          votingDelay: BigInt('1'),
          votingPeriod: BigInt('45818'),
          proposalThreshold: BigInt('10000000000000000000'),
          quorum: BigInt('40000000000000000000000')
        }),
        getProposalState: vi.fn().mockResolvedValue(1),
        getProposalVotes: vi.fn().mockResolvedValue({
          againstVotes: BigInt('10000000000000000000'),
          forVotes: BigInt('30000000000000000000'),
          abstainVotes: BigInt('5000000000000000000')
        }),
        getVotingPower: vi.fn().mockResolvedValue(BigInt('100000000000000000000')),
        getTokenBalance: vi.fn().mockResolvedValue(BigInt('500000000000000000000')),
        getMinDelay: vi.fn().mockResolvedValue(BigInt('86400')),
      }),
      stop: vi.fn().mockResolvedValue(undefined),
    }
  };
});

// Mock actions
vi.mock('../actions/getGovernanceInfo', () => {
  return {
    getGovernanceInfoAction: {
      name: 'GET_GOVERNANCE_INFO',
      description: 'Gets governance information from Polygon, including token details and governance settings.',
      validate: vi.fn().mockResolvedValue(true),
      handler: vi.fn().mockResolvedValue({
        text: 'Governance Information',
        actions: ['GET_GOVERNANCE_INFO'],
        data: {}
      }),
      examples: [],
    },
    getVotingPowerAction: {
      name: 'GET_VOTING_POWER',
      description: 'Gets voting power for an address on Polygon governance.',
      validate: vi.fn().mockResolvedValue(true),
      handler: vi.fn().mockResolvedValue({
        text: 'Voting Power Information',
        actions: ['GET_VOTING_POWER'],
        data: {}
      }),
      examples: [],
    }
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

describe('Polygon Plugin Integration', () => {
  let plugin: PolygonPlugin;

  beforeEach(async () => {
    vi.clearAllMocks();
    plugin = new PolygonPlugin();
    await plugin.init({
      ETHEREUM_RPC_URL: 'https://mainnet.infura.io/v3/test',
      POLYGON_RPC_URL: 'https://polygon-rpc.com',
      PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      POLYGONSCAN_KEY: 'ABCDEF1234567890',
      GOVERNOR_ADDRESS: '0xD952175d6A20187d7A5803DcC9741472F640A9b8',
    }, mockRuntime as any);
  });

  describe('Plugin Initialization', () => {
    it('should initialize with valid config', () => {
      expect(plugin.config).toBeDefined();
      expect(plugin.config?.GOVERNOR_ADDRESS).toBe('0xD952175d6A20187d7A5803DcC9741472F640A9b8');
    });

    it('should throw an error with invalid config', async () => {
      const invalidPlugin = new PolygonPlugin();
      await expect(invalidPlugin.init({
        // Missing required fields
      }, mockRuntime as any)).rejects.toThrow();
    });
  });

  describe('Services Registration', () => {
    it('should register both RPC and Governance services', () => {
      const services = plugin.getServices();
      
      expect(services).toContain(PolygonRpcService);
      expect(services).toContain(GovernanceService);
      expect(services.length).toBe(2);
    });
  });

  describe('Actions Registration', () => {
    it('should register governance actions', () => {
      const actions = plugin.getActions();
      
      const actionNames = actions.map(action => action.name);
      expect(actionNames).toContain('GET_GOVERNANCE_INFO');
      expect(actionNames).toContain('GET_VOTING_POWER');
    });
  });

  describe('Governance Address Integration', () => {
    it('should use the specified governance address', async () => {
      // This test verifies that the specified governance address is used in the config
      expect(plugin.config?.GOVERNOR_ADDRESS).toBe('0xD952175d6A20187d7A5803DcC9741472F640A9b8');
    });
  });
}); 