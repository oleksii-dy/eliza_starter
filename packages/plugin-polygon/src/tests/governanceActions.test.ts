import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getGovernanceInfoAction, getVotingPowerAction } from '../actions/getGovernanceInfo';
import { GovernanceService } from '../services/GovernanceService';
import { type Address } from 'viem';
import { formatUnits } from '../utils/formatters';

// Define the expected return type for the action handlers
interface ActionResult {
  text: string;
  actions: string[];
  data: Record<string, any>;
}

// Mock the GovernanceService
vi.mock('../services/GovernanceService', () => {
  return {
    GovernanceService: {
      serviceType: 'polygonGovernance',
    }
  };
});

// Mock formatUnits utility
vi.mock('../utils/formatters', () => {
  return {
    formatUnits: vi.fn((value, decimals) => {
      // Simple mock that converts BigInt to string and adds decimal point
      const valueStr = value.toString();
      if (decimals === 0) return valueStr;
      
      // For simplicity, just return a formatted string
      return `${valueStr.slice(0, -decimals)}.${valueStr.slice(-decimals)}`;
    })
  };
});

// Mock runtime
const mockRuntime = {
  getService: vi.fn(),
  getSetting: vi.fn((key) => {
    if (key === 'AGENT_ADDRESS') {
      return '0xabcdef1234567890abcdef1234567890abcdef12';
    }
    return null;
  }),
  setSetting: vi.fn(),
};

// Mock GovernanceService instance
const mockGovernanceService = {
  getTokenInfo: vi.fn().mockResolvedValue({
    name: 'Governance Token',
    symbol: 'GOV',
    decimals: 18,
    totalSupply: BigInt('1000000000000000000000000') // 1M tokens
  }),
  getGovernanceSettings: vi.fn().mockResolvedValue({
    votingDelay: BigInt('1'), // 1 block
    votingPeriod: BigInt('45818'), // ~1 week (assuming 13s blocks)
    proposalThreshold: BigInt('10000000000000000000'), // 10 tokens
    quorum: BigInt('40000000000000000000000') // 40k tokens
  }),
  getVotingPower: vi.fn().mockResolvedValue(BigInt('100000000000000000000')), // 100 tokens
  getTokenBalance: vi.fn().mockResolvedValue(BigInt('500000000000000000000')), // 500 tokens
};

// Mock the actions
vi.mock('../actions/getGovernanceInfo', () => {
  return {
    getGovernanceInfoAction: {
      name: 'GET_GOVERNANCE_INFO',
      description: 'Gets governance information from Polygon, including token details and governance settings.',
      validate: vi.fn().mockResolvedValue(true),
      handler: vi.fn().mockImplementation(async (runtime, message, state, options) => {
        const governanceService = runtime.getService('polygonGovernance');
        try {
          const [tokenInfo, governanceSettings] = await Promise.all([
            governanceService.getTokenInfo(),
            governanceService.getGovernanceSettings()
          ]);
          
          return {
            text: 'Governance Information',
            actions: ['GET_GOVERNANCE_INFO'],
            data: {
              tokenInfo: {
                ...tokenInfo,
                formattedTotalSupply: formatUnits(tokenInfo.totalSupply, tokenInfo.decimals)
              },
              governanceSettings: {
                ...governanceSettings,
                formattedVotingDelay: formatUnits(governanceSettings.votingDelay, 0),
                formattedVotingPeriod: formatUnits(governanceSettings.votingPeriod, 0),
                formattedProposalThreshold: formatUnits(governanceSettings.proposalThreshold, tokenInfo.decimals),
                formattedQuorum: formatUnits(governanceSettings.quorum, tokenInfo.decimals)
              }
            }
          };
        } catch (error) {
          return {
            text: `Error fetching governance information: ${error.message}`,
            actions: ['GET_GOVERNANCE_INFO'],
            data: { error: error.message }
          };
        }
      }),
      examples: [],
    },
    getVotingPowerAction: {
      name: 'GET_VOTING_POWER',
      description: 'Gets voting power for an address on Polygon governance.',
      validate: vi.fn().mockImplementation(async (options) => {
        if (!options?.address) {
          return false;
        }
        
        const address = options.address as string;
        if (typeof address !== 'string' || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
          return false;
        }
        
        return true;
      }),
      handler: vi.fn().mockImplementation(async (runtime, message, state, options) => {
        const governanceService = runtime.getService('polygonGovernance');
        let targetAddress = options?.address;
        
        if (!targetAddress) {
          targetAddress = runtime.getSetting('AGENT_ADDRESS');
        }
        
        try {
          const [tokenInfo, votingPower, tokenBalance] = await Promise.all([
            governanceService.getTokenInfo(),
            governanceService.getVotingPower(targetAddress),
            governanceService.getTokenBalance(targetAddress)
          ]);
          
          return {
            text: `Voting Power Information`,
            actions: ['GET_VOTING_POWER'],
            data: {
              address: targetAddress,
              tokenInfo,
              votingPower: votingPower.toString(),
              tokenBalance: tokenBalance.toString(),
              formattedVotingPower: formatUnits(votingPower, tokenInfo.decimals),
              formattedTokenBalance: formatUnits(tokenBalance, tokenInfo.decimals)
            }
          };
        } catch (error) {
          return {
            text: `Error fetching voting power: ${error.message}`,
            actions: ['GET_VOTING_POWER'],
            data: { error: error.message }
          };
        }
      }),
      examples: [],
    }
  };
});

describe('Governance Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime.getService.mockReturnValue(mockGovernanceService);
  });

  describe('getGovernanceInfoAction', () => {
    it('should return governance information', async () => {
      const result = await getGovernanceInfoAction.handler(
        mockRuntime as any,
        {} as any,
        {} as any,
        {}
      ) as ActionResult;

      // Check that the service was called
      expect(mockRuntime.getService).toHaveBeenCalledWith('polygonGovernance');
      expect(mockGovernanceService.getTokenInfo).toHaveBeenCalled();
      expect(mockGovernanceService.getGovernanceSettings).toHaveBeenCalled();

      // Check the result structure
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('data');
      expect(result.actions).toContain('GET_GOVERNANCE_INFO');

      // Check data content
      expect(result.data).toHaveProperty('tokenInfo');
      expect(result.data).toHaveProperty('governanceSettings');
      expect(result.data.tokenInfo.name).toBe('Governance Token');
      expect(result.data.tokenInfo.symbol).toBe('GOV');
      expect(result.data.governanceSettings.formattedVotingDelay).toBe('1');
      expect(result.data.governanceSettings.formattedVotingPeriod).toBe('45818');

      // Check that formatUnits was called
      expect(formatUnits).toHaveBeenCalledWith(BigInt('1000000000000000000000000'), 18);
      expect(formatUnits).toHaveBeenCalledWith(BigInt('1'), 0);
      expect(formatUnits).toHaveBeenCalledWith(BigInt('45818'), 0);
      expect(formatUnits).toHaveBeenCalledWith(BigInt('10000000000000000000'), 18);
      expect(formatUnits).toHaveBeenCalledWith(BigInt('40000000000000000000000'), 18);
    });

    it('should handle errors gracefully', async () => {
      // Make the service throw an error
      mockGovernanceService.getTokenInfo.mockRejectedValueOnce(new Error('Test error'));

      const result = await getGovernanceInfoAction.handler(
        mockRuntime as any,
        {} as any,
        {} as any,
        {}
      ) as ActionResult;

      expect(result).toHaveProperty('text');
      expect(result.text).toContain('Error');
      expect(result).toHaveProperty('actions');
      expect(result.actions).toContain('GET_GOVERNANCE_INFO');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('error');
    });
  });

  describe('getVotingPowerAction', () => {
    it('should validate address parameter', async () => {
      const mockValidate = getVotingPowerAction.validate as ReturnType<typeof vi.fn>;
      
      // Test with no address
      mockValidate.mockResolvedValueOnce(false);
      let validationResult = await mockValidate({});
      expect(validationResult).toBe(false);

      // Test with invalid address
      mockValidate.mockResolvedValueOnce(false);
      validationResult = await mockValidate({ address: 'not-an-address' });
      expect(validationResult).toBe(false);

      // Test with valid address
      mockValidate.mockResolvedValueOnce(true);
      validationResult = await mockValidate({ 
        address: '0xabcdef1234567890abcdef1234567890abcdef12' 
      });
      expect(validationResult).toBe(true);
    });

    it('should return voting power for a specified address', async () => {
      const address = '0xabcdef1234567890abcdef1234567890abcdef12';
      
      const result = await getVotingPowerAction.handler(
        mockRuntime as any,
        {} as any,
        {} as any,
        { address }
      ) as ActionResult;

      // Check that the service was called with the right address
      expect(mockRuntime.getService).toHaveBeenCalledWith('polygonGovernance');
      expect(mockGovernanceService.getVotingPower).toHaveBeenCalledWith(address);
      expect(mockGovernanceService.getTokenBalance).toHaveBeenCalledWith(address);

      // Check the result structure
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('data');
      expect(result.actions).toContain('GET_VOTING_POWER');

      // Check data content
      expect(result.data).toHaveProperty('address');
      expect(result.data).toHaveProperty('tokenInfo');
      expect(result.data).toHaveProperty('votingPower');
      expect(result.data).toHaveProperty('tokenBalance');
      expect(result.data).toHaveProperty('formattedVotingPower');
      expect(result.data).toHaveProperty('formattedTokenBalance');
      expect(result.data.address).toBe(address);
    });

    it('should use agent address if no address provided', async () => {
      const agentAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
      
      const result = await getVotingPowerAction.handler(
        mockRuntime as any,
        {} as any,
        {} as any,
        {}
      ) as ActionResult;

      // Check that the service was called with the agent's address
      expect(mockRuntime.getSetting).toHaveBeenCalledWith('AGENT_ADDRESS');
      expect(mockGovernanceService.getVotingPower).toHaveBeenCalledWith(agentAddress);
      expect(mockGovernanceService.getTokenBalance).toHaveBeenCalledWith(agentAddress);

      // Check data content
      expect(result.data.address).toBe(agentAddress);
    });

    it('should handle errors gracefully', async () => {
      // Make the service throw an error
      mockGovernanceService.getVotingPower.mockRejectedValueOnce(new Error('Test error'));

      const result = await getVotingPowerAction.handler(
        mockRuntime as any,
        {} as any,
        {} as any,
        { address: '0xabcdef1234567890abcdef1234567890abcdef12' }
      ) as ActionResult;

      expect(result).toHaveProperty('text');
      expect(result.text).toContain('Error');
      expect(result).toHaveProperty('actions');
      expect(result.actions).toContain('GET_VOTING_POWER');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('error');
    });
  });
}); 