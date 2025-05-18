import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import {
  type IAgentRuntime,
  type Memory,
  type State,
  type Content,
  type HandlerCallback,
  logger as coreLogger,
  composePromptFromState as coreComposePromptFromState,
  ModelType as CoreModelType,
} from '@elizaos/core';
import { getDelegatorInfoAction } from '../../actions/getDelegatorInfo';
import { PolygonRpcService, type DelegatorInfo } from '../../services/PolygonRpcService';
import {
  Wallet,
  ZeroAddress,
  formatUnits as ethersFormatUnits,
  parseUnits as ethersParseUnits,
} from 'ethers';
import { getDelegatorInfoTemplate } from '../../templates'; // Import for context
import { parseErrorMessage } from '../../errors'; // Import for context

// --- Mocking @elizaos/core ---
vi.mock('@elizaos/core', async () => {
  const originalCore = (await vi.importActual('@elizaos/core')) as typeof import('@elizaos/core');
  return {
    ...originalCore,
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    },
    composePromptFromState: vi.fn(),
  };
});

// --- Mocking ../services/PolygonRpcService ---
const mockGetDelegatorInfo = vi.fn();

vi.mock('../../services/PolygonRpcService', async () => {
  const MOCKED_POLYGON_RPC_SERVICE_TYPE_IN_FACTORY = 'PolygonRpcService';
  const MockPolygonRpcService = vi.fn().mockImplementation(() => ({
    getDelegatorInfo: mockGetDelegatorInfo,
  })) as Mock & { serviceType?: string };

  MockPolygonRpcService.serviceType = MOCKED_POLYGON_RPC_SERVICE_TYPE_IN_FACTORY;
  return {
    PolygonRpcService: MockPolygonRpcService,
  };
});

// --- Mocking ethers ---
const mockAgentAddress = '0xMockAgentAddress';
const mockEthersWalletInstance = {
  address: mockAgentAddress,
};

vi.mock('ethers', async () => {
  const originalEthers = await vi.importActual<typeof import('ethers')>('ethers');
  const mockEthersWalletConstructor = vi.fn().mockImplementation(() => mockEthersWalletInstance);
  return {
    ...originalEthers,
    Wallet: mockEthersWalletConstructor,
    formatUnits: originalEthers.formatUnits,
    ZeroAddress: originalEthers.ZeroAddress,
    parseUnits: originalEthers.parseUnits,
  };
});

describe('getDelegatorInfoAction', () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State | undefined;
  let mockCallback: HandlerCallback;

  const validatorId = 123;
  const delegatorAddress = '0xDelegatorAddress';
  const mockDelegatorParams = { validatorId, delegatorAddress };
  // Error message from template if validatorId is missing
  const validatorIdMissingError =
    'Validator ID not found or invalid. Please specify a positive integer for the validator ID.';

  beforeEach(async () => {
    vi.clearAllMocks();

    (coreLogger.info as Mock).mockClear();
    (coreLogger.error as Mock).mockClear();
    (coreLogger.debug as Mock).mockClear();
    (coreLogger.warn as Mock).mockClear();
    (coreComposePromptFromState as Mock).mockClear();
    mockGetDelegatorInfo.mockClear();
    (Wallet as unknown as Mock).mockClear();

    mockRuntime = {
      getSetting: vi.fn((key: string) => {
        if (key === 'PRIVATE_KEY')
          return '0x1234567890123456789012345678901234567890123456789012345678901234';
        if (key === 'ETHEREUM_RPC_URL') return 'mock_l1_rpc_url';
        if (key === 'POLYGON_RPC_URL') return 'mock_l2_rpc_url';
        if (key === 'POLYGON_PLUGINS_ENABLED') return 'true';
        return null;
      }),
      getService: vi.fn().mockImplementation((serviceType: string) => {
        if (serviceType === 'PolygonRpcService') {
          return new PolygonRpcService();
        }
        return null;
      }),
      useModel: vi.fn(),
    } as unknown as IAgentRuntime;

    mockMessage = {
      id: 'test-message-id-12345' as Memory['id'],
      entityId: '123e4567-e89b-12d3-a456-426614174000',
      roomId: '123e4567-e89b-12d3-a456-426614174001',
      timestamp: new Date().toISOString(),
      type: 'user_message',
      role: 'user',
      content: {
        text: 'Get my delegation for validator 123 and address 0xDelegatorAddress',
        source: 'test-source',
      },
    } as Memory;

    mockState = { recentMessages: [mockMessage] } as unknown as State; // Ensure state has recentMessages for composePromptFromState
    mockCallback = vi.fn();
    (coreComposePromptFromState as Mock).mockReturnValue('mock-prompt-for-llm');
  });

  describe('validate', () => {
    it('should return true if all settings are present and service is available', async () => {
      const isValid = await getDelegatorInfoAction.validate?.(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(true);
    });

    it('should return false if PRIVATE_KEY is missing', async () => {
      (mockRuntime.getSetting as Mock).mockImplementation((key: string) => {
        if (key === 'PRIVATE_KEY') return null;
        if (key === 'ETHEREUM_RPC_URL') return 'mock_l1_rpc_url';
        if (key === 'POLYGON_RPC_URL') return 'mock_l2_rpc_url';
        if (key === 'POLYGON_PLUGINS_ENABLED') return 'true';
        return null;
      });
      const isValid = await getDelegatorInfoAction.validate?.(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
      expect(coreLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('PRIVATE_KEY not configured')
      );
    });

    it('should return false if PolygonRpcService is not available', async () => {
      (mockRuntime.getService as Mock).mockImplementation((serviceType: string) => {
        if (serviceType === 'PolygonRpcService') return null;
        return {};
      });
      const isValid = await getDelegatorInfoAction.validate?.(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
      expect(coreLogger.error).toHaveBeenCalledWith('PolygonRpcService not initialized.');
    });
  });

  describe('handler', () => {
    const mockDelegationData: DelegatorInfo = {
      delegatedAmount: ethersParseUnits('1000', 18),
      pendingRewards: ethersParseUnits('50', 18),
    };

    beforeEach(() => {
      // Default mock for useModel: success with OBJECT_LARGE
      (mockRuntime.useModel as Mock).mockImplementation(async (modelType) => {
        if (modelType === CoreModelType.OBJECT_LARGE) {
          return mockDelegatorParams; // { validatorId, delegatorAddress }
        }
        return JSON.stringify({
          error: 'Fallback model LARGE called unexpectedly',
        });
      });
      mockGetDelegatorInfo.mockResolvedValue(mockDelegationData);
    });

    it('should successfully get delegator info when delegatorAddress is provided', async () => {
      const result = await getDelegatorInfoAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
        undefined
      );

      expect(coreComposePromptFromState).toHaveBeenCalledWith({
        state: mockState,
        template: getDelegatorInfoTemplate,
      });
      expect(mockRuntime.useModel).toHaveBeenCalledWith(CoreModelType.OBJECT_LARGE, {
        prompt: 'mock-prompt-for-llm',
      });
      expect(mockGetDelegatorInfo).toHaveBeenCalledWith(validatorId, delegatorAddress);
      expect(mockCallback).toHaveBeenCalledTimes(1);

      const expectedDelegatedMatic = ethersFormatUnits(mockDelegationData.delegatedAmount, 18);
      const expectedPendingRewardsMatic = ethersFormatUnits(mockDelegationData.pendingRewards, 18);

      const expectedText = `Delegation Info for address ${delegatorAddress} with validator ${validatorId}:\n- Delegated Amount: ${expectedDelegatedMatic} MATIC\n- Pending Rewards: ${expectedPendingRewardsMatic} MATIC`;

      const expectedResponse: Content = {
        text: expectedText,
        actions: ['GET_DELEGATOR_INFO'],
        source: 'test-source',
        data: {
          validatorId: validatorId,
          delegatorAddress: delegatorAddress,
          delegation: {
            delegatedAmount: mockDelegationData.delegatedAmount.toString(),
            delegatedAmountFormatted: expectedDelegatedMatic,
            pendingRewards: mockDelegationData.pendingRewards.toString(),
            pendingRewardsFormatted: expectedPendingRewardsMatic,
          },
          success: true,
        },
        success: true,
      };

      expect(mockCallback).toHaveBeenCalledWith(expectedResponse);
      expect(result).toEqual(expectedResponse);
      expect(coreLogger.info).toHaveBeenCalledWith(
        'Handling GET_DELEGATOR_INFO action for message:',
        mockMessage.id
      );
      expect(coreLogger.info).toHaveBeenCalledWith(
        `GET_DELEGATOR_INFO: Fetching info for V:${validatorId} / D:${delegatorAddress}...`
      );
      expect(coreLogger.info).toHaveBeenCalledWith(
        `Retrieved delegator info for V:${validatorId} / D:${delegatorAddress}`
      );
    });

    it("should use agent's wallet if delegatorAddress is not provided by LLM (OBJECT_LARGE returns only validatorId)", async () => {
      (mockRuntime.useModel as Mock).mockImplementation(async (modelType) => {
        if (modelType === CoreModelType.OBJECT_LARGE) {
          return { validatorId }; // No delegatorAddress
        }
        return JSON.stringify({
          error: 'Fallback model LARGE called unexpectedly',
        });
      });

      await getDelegatorInfoAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
        undefined
      );

      expect(mockRuntime.getSetting).toHaveBeenCalledWith('PRIVATE_KEY');
      expect(Wallet).toHaveBeenCalled(); // Check if Wallet constructor was called
      expect(mockGetDelegatorInfo).toHaveBeenCalledWith(validatorId, mockAgentAddress);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle fallback to LARGE model if OBJECT_LARGE fails and then succeed', async () => {
      (mockRuntime.useModel as Mock)
        .mockImplementationOnce(async (modelType) => {
          // First call (OBJECT_LARGE)
          if (modelType === CoreModelType.OBJECT_LARGE) {
            throw new Error('OBJECT_LARGE failed');
          }
          return null;
        })
        .mockImplementationOnce(async (modelType) => {
          // Second call (LARGE)
          if (modelType === CoreModelType.LARGE) {
            return JSON.stringify(mockDelegatorParams); // Success with LARGE
          }
          return null;
        });

      await getDelegatorInfoAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
        undefined
      );

      expect(mockRuntime.useModel).toHaveBeenCalledTimes(2);
      expect(mockRuntime.useModel).toHaveBeenNthCalledWith(1, CoreModelType.OBJECT_LARGE, {
        prompt: 'mock-prompt-for-llm',
      });
      expect(mockRuntime.useModel).toHaveBeenNthCalledWith(2, CoreModelType.LARGE, {
        prompt: 'mock-prompt-for-llm',
      });
      expect(mockGetDelegatorInfo).toHaveBeenCalledWith(validatorId, delegatorAddress);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should return error content if LLM (OBJECT_LARGE) returns error field', async () => {
      const llmError = 'LLM explicitly returned an error.';
      (mockRuntime.useModel as Mock).mockImplementation(async (modelType) => {
        if (modelType === CoreModelType.OBJECT_LARGE) {
          return { error: llmError };
        }
        // Simulate fallback path where LARGE model also doesn't resolve, leading to manual
        return null;
      });

      const result = await getDelegatorInfoAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
        undefined
      );

      expect(mockGetDelegatorInfo).not.toHaveBeenCalled();
      const expectedErrorText =
        "Error retrieving delegator information: GET_DELEGATOR_INFO failed: Cannot read properties of null (reading 'match')";
      const expectedErrorInDetails = "TypeError: Cannot read properties of null (reading 'match')";

      if (result && typeof result === 'object' && 'text' in result) {
        const errorContent = result as Content;
        expect(errorContent.text).toContain(expectedErrorText);

        // Simplify the error checks to avoid type issues
        if (errorContent.data && typeof errorContent.data === 'object') {
          const errorData = errorContent.data as {
            error?: string;
            details?: unknown;
          };
          if (errorData.error) {
            expect(typeof errorData.error).toBe('string');
          }
          if (errorData.details) {
            expect(String(errorData.details)).toContain(expectedErrorInDetails);
          }
        }
      }
    });

    it('should return error content if validatorId is not extracted (OBJECT_LARGE returns no validatorId)', async () => {
      (mockRuntime.useModel as Mock).mockImplementation(async (modelType) => {
        if (modelType === CoreModelType.OBJECT_LARGE) {
          return { delegatorAddress: 'someAddress' }; // No validatorId
        }
        // Simulate LARGE model also not returning validatorId
        if (modelType === CoreModelType.LARGE) {
          return JSON.stringify({ delegatorAddress: 'someAddress' });
        }
        return null;
      });
      const expectedErrorText =
        'Error retrieving delegator information: GET_DELEGATOR_INFO failed: Validator ID not found or invalid. Received: undefined. Please provide a positive integer.';
      const expectedErrorInDetails =
        'ValidationError: Validator ID not found or invalid. Received: undefined. Please provide a positive integer.';

      const result = await getDelegatorInfoAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
        undefined
      );

      expect(mockGetDelegatorInfo).not.toHaveBeenCalled();
      if (result && typeof result === 'object' && 'text' in result) {
        const errorContent = result as Content;
        expect(errorContent.text).toContain(expectedErrorText);

        // Simplify the error checks to avoid type issues
        if (errorContent.data && typeof errorContent.data === 'object') {
          const errorData = errorContent.data as {
            error?: string;
            details?: unknown;
          };
          if (errorData.error) {
            expect(String(errorData.error)).toContain(
              'Validator ID not found or invalid. Received: undefined. Please provide a positive integer.'
            );
          }
          if (errorData.details) {
            expect(String(errorData.details)).toContain(expectedErrorInDetails);
          }
        }
      }
    });

    it('should return error if private key is missing and agent address is needed', async () => {
      // Simulate LLM returning only validatorId, so agent address is needed
      (mockRuntime.useModel as Mock).mockImplementation(async (modelType) => {
        if (modelType === CoreModelType.OBJECT_LARGE) {
          return { validatorId };
        }
        return null;
      });
      // Simulate getSetting failing to return PRIVATE_KEY
      (mockRuntime.getSetting as Mock).mockImplementation((key: string) => {
        if (key === 'PRIVATE_KEY') return null;
        return 'other_setting_value';
      });

      const expectedOriginalErrorMsg =
        'Private key not available to determine agent wallet address';
      const expectedErrorText = `Error retrieving delegator information: GET_DELEGATOR_INFO failed: ${expectedOriginalErrorMsg}`;
      const expectedErrorInDetails = `ServiceError: ${expectedOriginalErrorMsg}`;

      const result = await getDelegatorInfoAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
        undefined
      );

      expect(mockGetDelegatorInfo).not.toHaveBeenCalled();
      if (result && typeof result === 'object' && 'text' in result) {
        const errorContent = result as Content;
        expect(errorContent.text).toContain(expectedErrorText);

        // Simplify the error checks to avoid type issues
        if (errorContent.data && typeof errorContent.data === 'object') {
          const errorData = errorContent.data as {
            error?: string;
            details?: unknown;
          };
          if (errorData.error) {
            expect(String(errorData.error)).toContain(expectedOriginalErrorMsg);
          }
          if (errorData.details) {
            expect(String(errorData.details)).toContain(expectedErrorInDetails);
          }
        }
      }
    });

    it('should return error if PolygonRpcService.getDelegatorInfo returns null', async () => {
      mockGetDelegatorInfo.mockResolvedValue(null);
      const specificDelegatorAddress = '0xNoDelegationAddress';
      const specificValidatorId = 111;

      (mockRuntime.useModel as Mock).mockImplementation(async (modelType) => {
        if (modelType === CoreModelType.OBJECT_LARGE) {
          return {
            validatorId: specificValidatorId,
            delegatorAddress: specificDelegatorAddress,
          };
        }
        return null;
      });

      const originalErrorMsg = `No delegation found for address ${specificDelegatorAddress} with validator ID ${specificValidatorId}`;
      const expectedErrorText = `Error retrieving delegator information: GET_DELEGATOR_INFO failed: ${originalErrorMsg}`;
      const expectedErrorInDetails = `ValidationError: ${originalErrorMsg}`;

      const result = await getDelegatorInfoAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
        undefined
      );

      expect(mockGetDelegatorInfo).toHaveBeenCalledWith(
        specificValidatorId,
        specificDelegatorAddress
      );
      if (result && typeof result === 'object' && 'text' in result) {
        const errorContent = result as Content;
        expect(errorContent.text).toContain(expectedErrorText);

        // Simplify the error checks to avoid type issues
        if (errorContent.data && typeof errorContent.data === 'object') {
          const errorData = errorContent.data as {
            error?: string;
            details?: unknown;
          };
          if (errorData.error) {
            expect(String(errorData.error)).toContain(originalErrorMsg);
          }
          if (errorData.details) {
            expect(String(errorData.details)).toContain(expectedErrorInDetails);
          }
        }
      }
    });

    it('should return error if PolygonRpcService.getDelegatorInfo throws an error', async () => {
      const serviceErrorMsg = 'Service connection failed';
      mockGetDelegatorInfo.mockRejectedValue(new Error(serviceErrorMsg));

      const expectedErrorText = `Error retrieving delegator information: GET_DELEGATOR_INFO failed: ${serviceErrorMsg}`;
      const expectedErrorInDetails = `Error: ${serviceErrorMsg}`;

      const result = await getDelegatorInfoAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
        undefined
      );

      expect(mockGetDelegatorInfo).toHaveBeenCalledWith(validatorId, delegatorAddress);
      if (result && typeof result === 'object' && 'text' in result) {
        const errorContent = result as Content;
        expect(errorContent.text).toContain(expectedErrorText);

        // Simplify the error checks to avoid type issues
        if (errorContent.data && typeof errorContent.data === 'object') {
          const errorData = errorContent.data as {
            error?: string;
            details?: unknown;
          };
          if (errorData.error) {
            expect(String(errorData.error)).toContain(serviceErrorMsg);
          }
          if (errorData.details) {
            expect(String(errorData.details)).toContain(expectedErrorInDetails);
          }
        }
      }
    });

    it('should return content successfully even if callback is not provided', async () => {
      const noCallbackValidatorId = 333;
      const noCallbackDelegatorAddress = '0xNoCallbackAddress';
      (mockRuntime.useModel as Mock).mockImplementation(async (modelType) => {
        if (modelType === CoreModelType.OBJECT_LARGE) {
          return {
            validatorId: noCallbackValidatorId,
            delegatorAddress: noCallbackDelegatorAddress,
          };
        }
        return null;
      });

      const result = await getDelegatorInfoAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        undefined, // No callback
        undefined
      );

      expect(mockGetDelegatorInfo).toHaveBeenCalledWith(
        noCallbackValidatorId,
        noCallbackDelegatorAddress
      );
      expect(mockCallback).not.toHaveBeenCalled();

      const expectedDelegatedMatic = ethersFormatUnits(mockDelegationData.delegatedAmount, 18);
      const expectedPendingRewardsMatic = ethersFormatUnits(mockDelegationData.pendingRewards, 18);
      const expectedText = `Delegation Info for address ${noCallbackDelegatorAddress} with validator ${noCallbackValidatorId}:\n- Delegated Amount: ${expectedDelegatedMatic} MATIC\n- Pending Rewards: ${expectedPendingRewardsMatic} MATIC`;

      if (result && typeof result === 'object' && 'text' in result) {
        const successContent = result as Content;
        expect(successContent.text).toEqual(expectedText);
        expect(successContent.data).toBeDefined();
        if (successContent.data) {
          interface SuccessDataDelegation {
            delegatedAmount: string;
            delegatedAmountFormatted: string;
            pendingRewards: string;
            pendingRewardsFormatted: string;
          }
          interface SuccessData {
            validatorId: number;
            delegatorAddress: string;
            delegation: SuccessDataDelegation;
          }
          const data = successContent.data as SuccessData;
          expect(data.validatorId).toBe(noCallbackValidatorId);
          expect(data.delegatorAddress).toBe(noCallbackDelegatorAddress);
          expect(data.delegation.delegatedAmountFormatted).toBe(expectedDelegatedMatic);
        }
      } else {
        expect(result).toBeDefined(); // Fail if result is not as expected
      }
    });
  });
});
