import { describe, it, beforeEach, vi, expect } from 'vitest';
import { restakeRewardsL1Action } from '../../actions/restakeRewardsL1';
import { PolygonRpcService } from '../../services/PolygonRpcService';
import type { IAgentRuntime, Memory, State, Content } from '@elizaos/core';
import { logger } from '@elizaos/core';

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
  };
});

const mockRuntime = {
  getSetting: vi.fn(),
  getService: vi.fn(),
  useModel: vi.fn(),
} as unknown as IAgentRuntime;

const mockPolygonRpcService = {
  restakeRewards: vi.fn().mockResolvedValue('0xabcdef1234567890'), // Return just the transaction hash
  serviceType: 'PolygonRpcService',
} as unknown as PolygonRpcService;

const mockMessageContent: Content = { text: 'Restake rewards for validator 1' };

const mockMessage: Memory = {
  id: '123e4567-e89b-12d3-a456-426614174009',
  entityId: '123e4567-e89b-12d3-a456-426614174010',
  roomId: '123e4567-e89b-12d3-a456-426614174011',
  content: mockMessageContent,
  createdAt: Date.now(),
};

const mockState = {} as State;
const mockCallback = vi.fn();

describe('restakeRewardsL1Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockRuntime.getService as ReturnType<typeof vi.fn>).mockReturnValue(mockPolygonRpcService);
    // Reset the mock message content for each test
    mockMessage.content.text = 'Restake rewards for validator 1';
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

      const isValid = await restakeRewardsL1Action.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(true);
    });

    const requiredSettings = ['PRIVATE_KEY', 'ETHEREUM_RPC_URL', 'POLYGON_PLUGINS_ENABLED'];

    for (const settingName of requiredSettings) {
      it(`should return false if ${settingName} is missing or falsy`, async () => {
        (mockRuntime.getSetting as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
          if (key === settingName) return key === 'POLYGON_PLUGINS_ENABLED' ? false : null;
          if (key === 'PRIVATE_KEY') return 'test-pk';
          if (key === 'ETHEREUM_RPC_URL') return 'test-rpc-url';
          if (key === 'POLYGON_PLUGINS_ENABLED') return true;
          return null;
        });
        (mockRuntime.getService as ReturnType<typeof vi.fn>).mockReturnValue(mockPolygonRpcService);

        const isValid = await restakeRewardsL1Action.validate(mockRuntime, mockMessage, mockState);
        expect(isValid).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining(`Required setting ${settingName} not configured`)
        );
      });
    }

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

      const isValid = await restakeRewardsL1Action.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'PolygonRpcService not initialized for RESTAKE_REWARDS_L1.'
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

      const isValid = await restakeRewardsL1Action.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Error accessing PolygonRpcService during RESTAKE_REWARDS_L1 validation:',
        serviceError
      );
    });
  });

  describe('handler', () => {
    it('should successfully restake rewards with valid parameters from LLM', async () => {
      const validatorId = 1; // Match the value from message text
      const txHash = '0xabcdef1234567890';

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue({
        validatorId,
      });

      // Mock successful restakeRewards function
      (mockPolygonRpcService.restakeRewards as ReturnType<typeof vi.fn>).mockResolvedValue(txHash);

      await restakeRewardsL1Action.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockPolygonRpcService.restakeRewards).toHaveBeenCalledWith(validatorId);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining(`Restake operation for validator ${validatorId} initiated`),
          actions: ['RESTAKE_REWARDS_L1'],
          data: expect.objectContaining({
            status: 'initiated',
            success: true,
            validatorId,
            transactionHash: txHash,
          }),
        })
      );
    });

    it('should successfully restake rewards with valid parameters from text extraction fallback', async () => {
      const validatorId = 1; // Number value instead of string
      const txHash = '0xabcdef1234567890';

      // Mock LLM extraction failure
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: 'Could not extract parameters',
      });

      // Text from message should be used as fallback
      mockMessage.content.text = `Restake rewards for validator ${validatorId}`;

      // Mock successful restakeRewards function
      (mockPolygonRpcService.restakeRewards as ReturnType<typeof vi.fn>).mockResolvedValue(txHash);

      await restakeRewardsL1Action.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockPolygonRpcService.restakeRewards).toHaveBeenCalledWith(validatorId);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining(`Restake operation for validator ${validatorId} initiated`),
          data: expect.objectContaining({
            status: 'initiated',
            success: true,
            validatorId,
            transactionHash: txHash,
          }),
        })
      );
    });

    it('should return an error if validatorId is missing', async () => {
      // Mock LLM extraction with missing validatorId
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue({});

      mockMessage.content.text = 'Restake rewards'; // No validator ID in text

      await restakeRewardsL1Action.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockPolygonRpcService.restakeRewards).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error restaking rewards (L1)'),
          data: expect.objectContaining({
            error: expect.stringContaining('validator ID'),
            success: false,
          }),
        })
      );
    });

    it('should return an error if LLM responds with an error field', async () => {
      const llmError = 'Failed to extract parameters from message';

      // Mock LLM extraction with error
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: llmError,
      });

      // Text without clear parameters
      mockMessage.content.text = 'Restake my rewards';

      await restakeRewardsL1Action.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockPolygonRpcService.restakeRewards).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error restaking rewards (L1)'),
          data: expect.objectContaining({
            error: expect.stringContaining('validator ID'),
            success: false,
          }),
        })
      );
    });

    it('should return an error if PolygonRpcService is not found', async () => {
      const validatorId = 1; // Match the value from message text

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue({
        validatorId,
      });

      // Mock getService returning null
      (mockRuntime.getService as ReturnType<typeof vi.fn>).mockReturnValue(null);

      await restakeRewardsL1Action.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('PolygonRpcService not available'),
          data: expect.objectContaining({
            error: 'PolygonRpcService not available',
            success: false,
          }),
        })
      );
    });

    it('should return an error if polygonService.restakeRewards throws an error', async () => {
      const validatorId = 1; // Match the value from message text
      const serviceError = new Error('Transaction failed');

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue({
        validatorId,
      });

      // Restore the default service mock
      (mockRuntime.getService as ReturnType<typeof vi.fn>).mockReturnValue(mockPolygonRpcService);

      // Mock restakeRewards function throwing error
      (mockPolygonRpcService.restakeRewards as ReturnType<typeof vi.fn>).mockRejectedValue(
        serviceError
      );

      await restakeRewardsL1Action.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockPolygonRpcService.restakeRewards).toHaveBeenCalledWith(validatorId);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error restaking rewards'),
          data: expect.objectContaining({
            error: serviceError.message,
            success: false,
          }),
        })
      );
    });

    it('should correctly format the success message and data', async () => {
      const validatorId = 1; // Match the value from message text
      const txHash = '0x0123456789abcdef';

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue({
        validatorId,
      });

      // Mock successful restakeRewards function
      (mockPolygonRpcService.restakeRewards as ReturnType<typeof vi.fn>).mockResolvedValue(txHash);

      await restakeRewardsL1Action.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining(`Restake operation for validator ${validatorId} initiated`),
          actions: ['RESTAKE_REWARDS_L1'],
          data: expect.objectContaining({
            status: 'initiated',
            success: true,
            validatorId,
            transactionHash: txHash,
          }),
        })
      );
    });

    it('should correctly format the error message and data on failure', async () => {
      const errorMessage = 'Could not determine validator ID from the message';

      // Mock LLM extraction with error
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: errorMessage,
      });

      // Mock to ensure this test causes a failure with a specific error
      mockMessage.content.text = 'Restake rewards'; // No validator ID in text

      await restakeRewardsL1Action.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error restaking rewards (L1)'),
          data: expect.objectContaining({
            error: expect.stringContaining('validator ID'),
            success: false,
          }),
        })
      );
    });

    it('should call the callback with the response content', async () => {
      const validatorId = 1; // Match the value from message text
      const txHash = '0xabcdef1234567890';

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue({
        validatorId,
      });

      // Mock successful restakeRewards function
      (mockPolygonRpcService.restakeRewards as ReturnType<typeof vi.fn>).mockResolvedValue(txHash);

      await restakeRewardsL1Action.handler(
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
            status: 'initiated',
            success: true,
            validatorId,
            transactionHash: txHash,
          }),
        })
      );
    });
  });
});
