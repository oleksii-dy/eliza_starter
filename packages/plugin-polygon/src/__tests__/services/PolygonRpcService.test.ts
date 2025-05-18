import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from 'vitest';
import {
  PolygonRpcService,
  ValidatorStatus,
  type ValidatorInfo,
  type DelegatorInfo,
} from '../../services/PolygonRpcService';
import type { IAgentRuntime } from '@elizaos/core';
import { ethers } from 'ethers'; // For ZeroAddress
// import { ContractError } from "../../errors"; // Service doesn't throw this directly for these methods

// Define a more specific error type for testing purposes
interface TestError extends Error {
  code?: string;
}

// Actual address from PolygonRpcService.ts
const STAKE_MANAGER_ADDRESS_L1 = '0x5e3Ef299fDDf15eAa0432E6e66473ace8c13D908';
const ROOT_CHAIN_MANAGER_ADDRESS_L1 = '0xA0c68C638235ee32657e8f720a23ceC1bFc77C77';
const VALIDATOR_SHARE_ADDRESS_MOCK = '0xValidatorShareAddressMock';

// --- Mock Ethers Contract Instances ---
const mockValidatorShareContractInstance = {
  getTotalStake: vi.fn(),
  getLiquidRewards: vi.fn(),
};

const mockStakeManagerContractInstance = {
  validators: vi.fn(),
  getValidatorContract: vi.fn(),
  validatorThreshold: vi.fn().mockResolvedValue(true), // For initializeProviders
};

const mockRootChainManagerContractInstance = {
  // Add methods if initializeProviders calls them for RCM
  // e.g. chainID: vi.fn().mockResolvedValue(1)
};

vi.mock('ethers', async () => {
  const originalEthers = (await vi.importActual('ethers')) as typeof ethers;
  return {
    ...originalEthers,
    Contract: vi.fn().mockImplementation((address, _abi, _providerOrSigner) => {
      if (address === STAKE_MANAGER_ADDRESS_L1) {
        return mockStakeManagerContractInstance;
      }
      if (address === VALIDATOR_SHARE_ADDRESS_MOCK) {
        return mockValidatorShareContractInstance;
      }
      if (address === ROOT_CHAIN_MANAGER_ADDRESS_L1) {
        return mockRootChainManagerContractInstance;
      }
      console.warn(`ethers.Contract mock called with unhandled address: ${address}`);
      return {
        interface: {
          getEvent: vi.fn(() => null),
          getFunction: vi.fn(() => null),
        }, // More specific mock for Ethers v6 Contract interface
        runner: { getAddress: vi.fn(() => Promise.resolve(address)) }, // Mock for Ethers v6 Contract needs a `runner` with getAddress
        target: address,
        getAddress: vi.fn(() => Promise.resolve(address)),
      };
    }),
    JsonRpcProvider: vi.fn(() => ({
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1n }),
    })),
    Wallet: vi.fn(() => ({
      getAddress: vi.fn().mockResolvedValue('0xMockSignerAddress'),
    })),
    ZeroAddress: originalEthers.ZeroAddress,
    formatEther: originalEthers.formatEther,
    parseUnits: originalEthers.parseUnits,
    AbiCoder: originalEthers.AbiCoder,
    MaxUint256: originalEthers.MaxUint256,
  };
});

// --- Mock ElizaOS Core Logger ---
vi.mock('@elizaos/core', async () => {
  const originalCore = (await vi.importActual('@elizaos/core')) as object;
  return {
    ...originalCore,
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    },
  };
});

describe('PolygonRpcService Staking Read Operations', () => {
  let service: PolygonRpcService;
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    // Reset all method mocks on the contract instances
    for (const mockFn of Object.values(mockStakeManagerContractInstance)) {
      mockFn?.mockReset?.();
    }
    for (const mockFn of Object.values(mockValidatorShareContractInstance)) {
      mockFn?.mockReset?.();
    }
    for (const mockFn of Object.values(mockRootChainManagerContractInstance)) {
      // Ensure mockReset exists before calling, for robustness if an object has no mock functions
      const fn = mockFn as Mock | undefined;
      fn?.mockReset?.();
    }

    mockStakeManagerContractInstance.validatorThreshold.mockResolvedValue(true);

    mockRuntime = {
      getSetting: vi.fn((key: string) => {
        if (key === 'ETHEREUM_RPC_URL') return 'mock_l1_rpc_url';
        if (key === 'POLYGON_RPC_URL') return 'mock_l2_rpc_url';
        if (key === 'PRIVATE_KEY')
          return '0x1234567890123456789012345678901234567890123456789012345678901234';
        return null;
      }),
    } as unknown as IAgentRuntime;
    service = await PolygonRpcService.start(mockRuntime);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getValidatorInfo', () => {
    it('should return validator info for a valid ID', async () => {
      const validatorId = 5;
      const mockValidatorDataFromContract = {
        status: ValidatorStatus.Active, // Numeric status
        amount: ethers.parseUnits('1000', 18), // Total stake
        // commissionRate is not in ABI's validators struct
        signer: '0xSignerAddress',
        activationEpoch: 100n,
        deactivationEpoch: 0n,
        jailTime: 0n,
        contractAddress: '0xValidatorShareRealAddress',
        // lastRewardUpdateEpoch is not in ABI's validators struct
      };
      mockStakeManagerContractInstance.validators.mockResolvedValue(mockValidatorDataFromContract);

      const result: ValidatorInfo | null = await service.getValidatorInfo(validatorId);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(ValidatorStatus.Active);
      expect(result?.totalStake).toEqual(ethers.parseUnits('1000', 18));
      expect(result?.commissionRate).toBe(0); // Defaulted as not in ABI
      expect(result?.signerAddress).toBe('0xSignerAddress');
      expect(result?.activationEpoch).toBe(100n);
      expect(result?.contractAddress).toBe('0xValidatorShareRealAddress');
      expect(result?.lastRewardUpdateEpoch).toBe(0n); // Defaulted
      expect(mockStakeManagerContractInstance.validators).toHaveBeenCalledWith(validatorId);
    });

    it('should return null if validator not found (signer is ZeroAddress)', async () => {
      const validatorId = 999;
      const mockValidatorDataFromContract = {
        signer: ethers.ZeroAddress, // Indicates validator not found or inactive
        // Other fields might be zeroed out or default
        status: ValidatorStatus.Inactive,
        amount: 0n,
        activationEpoch: 0n,
        deactivationEpoch: 0n,
        jailTime: 0n,
        contractAddress: ethers.ZeroAddress,
      };
      mockStakeManagerContractInstance.validators.mockResolvedValue(mockValidatorDataFromContract);

      const result = await service.getValidatorInfo(validatorId);
      expect(result).toBeNull();
    });

    it('should return null if validator data is null/undefined from contract', async () => {
      const validatorId = 777;
      mockStakeManagerContractInstance.validators.mockResolvedValue(null);
      const result = await service.getValidatorInfo(validatorId);
      expect(result).toBeNull();
    });

    it('should throw an error if the contract call fails', async () => {
      const validatorId = 13;
      const contractError = new Error('Network error');
      mockStakeManagerContractInstance.validators.mockRejectedValue(contractError);

      await expect(service.getValidatorInfo(validatorId)).rejects.toThrow(contractError);
    });
  });

  describe('getDelegatorInfo', () => {
    const validatorId = 10;
    const delegatorAddress = '0xDelegatorAddress';

    beforeEach(() => {
      // Default successful mock for getValidatorContract for these tests
      mockStakeManagerContractInstance.getValidatorContract.mockResolvedValue(
        VALIDATOR_SHARE_ADDRESS_MOCK
      );
    });

    it('should return delegator info for valid validator and delegator', async () => {
      const mockDelegatedAmount = ethers.parseUnits('500', 18);
      const mockPendingRewards = ethers.parseUnits('50', 18);

      mockValidatorShareContractInstance.getTotalStake.mockResolvedValue(mockDelegatedAmount);
      mockValidatorShareContractInstance.getLiquidRewards.mockResolvedValue(mockPendingRewards);

      const result: DelegatorInfo | null = await service.getDelegatorInfo(
        validatorId,
        delegatorAddress
      );

      expect(result).not.toBeNull();
      expect(result?.delegatedAmount).toEqual(mockDelegatedAmount);
      expect(result?.pendingRewards).toEqual(mockPendingRewards);
      expect(mockStakeManagerContractInstance.getValidatorContract).toHaveBeenCalledWith(
        validatorId
      );
      expect(mockValidatorShareContractInstance.getTotalStake).toHaveBeenCalledWith(
        delegatorAddress
      );
      expect(mockValidatorShareContractInstance.getLiquidRewards).toHaveBeenCalledWith(
        delegatorAddress
      );
    });

    it('should return null if ValidatorShare contract address is ZeroAddress', async () => {
      mockStakeManagerContractInstance.getValidatorContract.mockResolvedValue(ethers.ZeroAddress);

      const result = await service.getDelegatorInfo(validatorId, delegatorAddress);
      expect(result).toBeNull();
    });

    it('should return null if ValidatorShare contract address is null', async () => {
      mockStakeManagerContractInstance.getValidatorContract.mockResolvedValue(null);
      const result = await service.getDelegatorInfo(validatorId, delegatorAddress);
      expect(result).toBeNull();
    });

    it('should throw an error if getValidatorContract fails', async () => {
      const contractError = new Error('Failed to get validator contract');
      mockStakeManagerContractInstance.getValidatorContract.mockRejectedValue(contractError);

      await expect(service.getDelegatorInfo(validatorId, delegatorAddress)).rejects.toThrow(
        contractError
      );
    });

    it('should throw an error if getTotalStake fails', async () => {
      const contractError = new Error('Failed to get total stake');
      mockValidatorShareContractInstance.getTotalStake.mockRejectedValue(contractError);

      await expect(service.getDelegatorInfo(validatorId, delegatorAddress)).rejects.toThrow(
        contractError
      );
    });

    it('should throw an error if getLiquidRewards fails', async () => {
      const contractError = new Error('Failed to get liquid rewards');
      mockValidatorShareContractInstance.getLiquidRewards.mockRejectedValue(contractError);

      await expect(service.getDelegatorInfo(validatorId, delegatorAddress)).rejects.toThrow(
        contractError
      );
    });

    it('should return null if contract call for rewards implies no stake (e.g. CALL_EXCEPTION)', async () => {
      // Simulate an error that the service method catches and interprets as "no stake"
      const callExceptionError: TestError = new Error('call revert exception');
      callExceptionError.code = 'CALL_EXCEPTION';
      mockValidatorShareContractInstance.getLiquidRewards.mockRejectedValue(callExceptionError);
      // getTotalStake might still succeed or also throw. Let's assume it succeeds.
      mockValidatorShareContractInstance.getTotalStake.mockResolvedValue(
        ethers.parseUnits('100', 18)
      );

      const result = await service.getDelegatorInfo(validatorId, delegatorAddress);
      // Based on the implementation: if (error.message.includes('delegator never staked') || error.code === 'CALL_EXCEPTION') return null;
      expect(result).toBeNull();
    });
  });
});
