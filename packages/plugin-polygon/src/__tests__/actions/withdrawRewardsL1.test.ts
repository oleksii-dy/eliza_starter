import { describe, it, beforeEach, vi, expect } from 'vitest';
import { withdrawRewardsAction } from '../../actions/withdrawRewardsL1';
import { PolygonRpcService } from '../../services/PolygonRpcService';
import type { IAgentRuntime, Memory, State, Content, ModelType } from '@elizaos/core';
import { logger, parseJSONObjectFromText } from '@elizaos/core';

vi.mock('@elizaos/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@elizaos/core')>();
  return {
    ...actual,
    logger: {
      ...actual.logger,
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    parseJSONObjectFromText: vi.fn().mockImplementation((text) => {
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`Failed to parse JSON: ${e}`);
      }
    }),
  };
});

const mockRuntime = {
  getSetting: vi.fn(),
  getService: vi.fn(),
  useModel: vi.fn(),
} as unknown as IAgentRuntime;

const mockPolygonRpcService = {
  withdrawRewards: vi.fn().mockResolvedValue('0xabcdef1234567890'), // Return transaction hash
  serviceType: 'PolygonRpcService',
} as unknown as PolygonRpcService;

const mockMessageContent: Content = {
  text: 'Withdraw rewards for validator 1',
};

const mockMessage: Memory = {
  id: '123e4567-e89b-12d3-a456-426614174006',
  entityId: '123e4567-e89b-12d3-a456-426614174007',
  roomId: '123e4567-e89b-12d3-a456-426614174008',
  content: mockMessageContent,
  createdAt: Date.now(),
};

const mockState = {} as State;
const mockCallback = vi.fn();

describe('withdrawRewardsL1Action (from withdrawRewardsAction)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockRuntime.getService as ReturnType<typeof vi.fn>).mockReturnValue(mockPolygonRpcService);
    // Reset mock message content
    mockMessage.content.text = 'Withdraw rewards for validator 1';
  });

  describe('validate', () => {
    it('should return true if all required settings and services are available', async () => {
      (mockRuntime.getSetting as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'PRIVATE_KEY') return 'test-pk';
        if (key === 'ETHEREUM_RPC_URL') return 'test-rpc-url';
        if (key === 'POLYGON_PLUGINS_ENABLED') return true;
        return null;
      });
      (mockRuntime.getService as ReturnType<typeof vi.fn>).mockReturnValue(mockPolygonRpcService);

      const isValid = await withdrawRewardsAction.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(true);
    });

    it('should return false if PRIVATE_KEY is missing', async () => {
      (mockRuntime.getSetting as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'PRIVATE_KEY') return null;
        if (key === 'ETHEREUM_RPC_URL') return 'test-rpc-url';
        if (key === 'POLYGON_PLUGINS_ENABLED') return true;
        return null;
      });

      const isValid = await withdrawRewardsAction.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Required setting PRIVATE_KEY not configured')
      );
    });

    it('should return false if ETHEREUM_RPC_URL is missing', async () => {
      (mockRuntime.getSetting as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'PRIVATE_KEY') return 'test-pk';
        if (key === 'ETHEREUM_RPC_URL') return null;
        if (key === 'POLYGON_PLUGINS_ENABLED') return true;
        return null;
      });

      const isValid = await withdrawRewardsAction.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Required setting ETHEREUM_RPC_URL not configured')
      );
    });

    it('should return false if POLYGON_PLUGINS_ENABLED is false or missing', async () => {
      (mockRuntime.getSetting as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'PRIVATE_KEY') return 'test-pk';
        if (key === 'ETHEREUM_RPC_URL') return 'test-rpc-url';
        if (key === 'POLYGON_PLUGINS_ENABLED') return false;
        return null;
      });

      const isValid = await withdrawRewardsAction.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Required setting POLYGON_PLUGINS_ENABLED not configured')
      );
    });

    it('should return false if PolygonRpcService is not available', async () => {
      (mockRuntime.getSetting as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'PRIVATE_KEY') return 'test-pk';
        if (key === 'ETHEREUM_RPC_URL') return 'test-rpc-url';
        if (key === 'POLYGON_PLUGINS_ENABLED') return true;
        return null;
      });
      (mockRuntime.getService as ReturnType<typeof vi.fn>).mockImplementation(
        (serviceType: string) => {
          if (serviceType === PolygonRpcService.serviceType) return null;
          return mockPolygonRpcService;
        }
      );

      const isValid = await withdrawRewardsAction.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'PolygonRpcService not initialized for WITHDRAW_REWARDS_L1.'
      );
    });

    it('should log an error and return false if getService throws an error', async () => {
      (mockRuntime.getSetting as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'PRIVATE_KEY') return 'test-pk';
        if (key === 'ETHEREUM_RPC_URL') return 'test-rpc-url';
        if (key === 'POLYGON_PLUGINS_ENABLED') return true;
        return null;
      });
      const serviceError = new Error('Service retrieval failed');
      (mockRuntime.getService as ReturnType<typeof vi.fn>).mockImplementation(
        (serviceType: string) => {
          if (serviceType === PolygonRpcService.serviceType) throw serviceError;
          return null;
        }
      );

      const isValid = await withdrawRewardsAction.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Error accessing PolygonRpcService during WITHDRAW_REWARDS_L1 validation:',
        serviceError
      );
    });
  });

  describe('handler', () => {
    it('should successfully withdraw rewards with valid validatorId from LLM', async () => {
      const validatorId = 1; // Number instead of string
      const txHash = '0xabcdef1234567890';

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({ validatorId })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        validatorId,
      });

      // Mock successful withdrawRewards function
      (mockPolygonRpcService.withdrawRewards as ReturnType<typeof vi.fn>).mockResolvedValue(txHash);

      await withdrawRewardsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockPolygonRpcService.withdrawRewards).toHaveBeenCalledWith(validatorId);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining(
            `Successfully initiated withdrawal of rewards from validator ${validatorId}`
          ),
          actions: ['WITHDRAW_REWARDS_L1'],
          data: expect.objectContaining({
            transactionHash: txHash,
            status: 'pending',
            validatorId,
          }),
        })
      );
    });

    it('should return an error if validatorId is missing', async () => {
      // Mock LLM extraction with missing validatorId
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify({}));
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({});

      // Text with no validatorId
      mockMessage.content.text = 'Withdraw my rewards';

      await withdrawRewardsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockPolygonRpcService.withdrawRewards).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error withdrawing rewards'),
          data: expect.objectContaining({
            success: false,
            error: expect.stringContaining('Validator ID is missing after extraction attempts.'), // Adjusted to actual
          }),
        })
      );
    });

    it('should return an error if LLM responds with an error field', async () => {
      const llmError = 'Failed to extract parameters from message';

      // Mock LLM extraction with error
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({ error: llmError })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        error: llmError,
      });

      await withdrawRewardsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockPolygonRpcService.withdrawRewards).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error withdrawing rewards'),
          data: expect.objectContaining({
            success: false,
            error: expect.stringContaining('Could not determine validator ID from the message.'), // Adjusted to actual
          }),
        })
      );
    });

    it('should return an error if polygonService.withdrawRewards throws an error', async () => {
      const validatorId = 1;
      const serviceError = new Error('Transaction failed');

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({ validatorId })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        validatorId,
      });

      // Mock withdrawRewards function throwing error
      (mockPolygonRpcService.withdrawRewards as ReturnType<typeof vi.fn>).mockRejectedValue(
        serviceError
      );

      await withdrawRewardsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockPolygonRpcService.withdrawRewards).toHaveBeenCalledWith(validatorId);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error withdrawing rewards'),
          data: expect.objectContaining({
            success: false,
            error: serviceError.message,
          }),
        })
      );
    });

    it('should correctly format the success message and data', async () => {
      const validatorId = 1;
      const txHash = '0x0123456789abcdef';

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({ validatorId })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        validatorId,
      });

      // Mock successful withdrawRewards function
      (mockPolygonRpcService.withdrawRewards as ReturnType<typeof vi.fn>).mockResolvedValue(txHash);

      await withdrawRewardsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining(
            `Successfully initiated withdrawal of rewards from validator ${validatorId}`
          ),
          actions: ['WITHDRAW_REWARDS_L1'],
          data: expect.objectContaining({
            transactionHash: txHash,
            status: 'pending',
            validatorId,
          }),
        })
      );
    });

    it('should correctly format the error message and data on failure', async () => {
      const errorMessage = 'Could not determine validator ID from the message';

      // Mock LLM extraction failure with no fallback
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue('invalid json string');
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Simulated JSON parse error for no fallback error formatting');
      });

      // Text with no validatorId
      mockMessage.content.text = 'Withdraw rewards';

      await withdrawRewardsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error withdrawing rewards'),
          actions: ['WITHDRAW_REWARDS_L1'],
          data: expect.objectContaining({
            success: false,
            error: expect.stringContaining(errorMessage),
          }),
        })
      );
    });

    it('should call the callback with the response content', async () => {
      const validatorId = 1;
      const txHash = '0xabcdef1234567890';

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({ validatorId })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        validatorId,
      });

      // Mock successful withdrawRewards function
      (mockPolygonRpcService.withdrawRewards as ReturnType<typeof vi.fn>).mockResolvedValue(txHash);

      await withdrawRewardsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.any(String),
          data: expect.objectContaining({
            transactionHash: txHash,
            status: 'pending',
            validatorId,
          }),
        })
      );
    });
  });
});
