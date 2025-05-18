import { describe, it, beforeEach, vi, expect } from 'vitest';
import { undelegateL1Action } from '../../actions/undelegateL1';
import { PolygonRpcService } from '../../services/PolygonRpcService';
import type { IAgentRuntime, Memory, State, Content, HandlerCallback } from '@elizaos/core';
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
    parseJSONObjectFromText: vi.fn((text) => {
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`Failed to parse JSON during test: ${text}`);
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
  undelegate: vi.fn().mockResolvedValue('0xabcdef1234567890'), // Return just the transaction hash as per implementation
  serviceType: 'PolygonRpcService',
} as unknown as PolygonRpcService;

const mockMessageContent: Content = {
  text: 'Undelegate 10 shares from validator 1',
};

const mockMessage: Memory = {
  id: '123e4567-e89b-12d3-a456-426614174003',
  entityId: '123e4567-e89b-12d3-a456-426614174004',
  roomId: '123e4567-e89b-12d3-a456-426614174005',
  content: mockMessageContent,
  createdAt: Date.now(),
};

const mockState = {} as State;
const mockCallback = vi.fn();

describe('undelegateL1Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockRuntime.getService as ReturnType<typeof vi.fn>).mockReturnValue(mockPolygonRpcService);
    // Reset the mock message content for each test
    mockMessage.content.text = 'Undelegate 10 shares from validator 1';
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

      const isValid = await undelegateL1Action.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(true);
    });

    it('should return false if PRIVATE_KEY is missing', async () => {
      (mockRuntime.getSetting as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'PRIVATE_KEY') return null;
        if (key === 'ETHEREUM_RPC_URL') return 'test-rpc-url';
        if (key === 'POLYGON_PLUGINS_ENABLED') return true;
        return null;
      });

      const isValid = await undelegateL1Action.validate(mockRuntime, mockMessage, mockState);
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

      const isValid = await undelegateL1Action.validate(mockRuntime, mockMessage, mockState);
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

      const isValid = await undelegateL1Action.validate(mockRuntime, mockMessage, mockState);
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

      const isValid = await undelegateL1Action.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'PolygonRpcService not initialized for UNDELEGATE_L1.'
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

      const isValid = await undelegateL1Action.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Error accessing PolygonRpcService during UNDELEGATE_L1 validation:',
        serviceError
      );
    });
  });

  describe('handler', () => {
    it('should successfully undelegate with valid parameters from LLM', async () => {
      const validatorId = 123; // Number instead of string
      const sharesAmountWei = '1000000000000000000'; // 1 share in Wei
      const txHash = '0xabcdef1234567890';

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          validatorId,
          sharesAmountWei,
        })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        validatorId,
        sharesAmountWei,
      });

      // Mock successful undelegate function
      (mockPolygonRpcService.undelegate as ReturnType<typeof vi.fn>).mockResolvedValue(txHash);

      await undelegateL1Action.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockPolygonRpcService.undelegate).toHaveBeenCalledWith(
        validatorId,
        BigInt(sharesAmountWei)
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Undelegation transaction sent'),
          actions: ['UNDELEGATE_L1'],
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
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          sharesAmountWei: '1000000000000000000',
        })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        sharesAmountWei: '1000000000000000000',
      });

      mockMessage.content.text = 'Undelegate 10 shares'; // No validator ID in text

      await undelegateL1Action.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockPolygonRpcService.undelegate).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error undelegating shares (L1)'),
          data: expect.objectContaining({
            error: expect.stringContaining(
              'Validator ID or shares amount is missing after extraction attempts.'
            ),
            success: false,
          }),
        })
      );
    });

    it('should return an error if sharesAmountWei is missing', async () => {
      // Mock LLM extraction with missing sharesAmountWei
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          validatorId: 123,
        })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        validatorId: 123,
      });

      mockMessage.content.text = 'Undelegate from validator 123'; // No amount in text

      await undelegateL1Action.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockPolygonRpcService.undelegate).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error undelegating shares (L1)'),
          data: expect.objectContaining({
            error: expect.stringContaining(
              'Validator ID or shares amount is missing after extraction attempts.'
            ),
            success: false,
          }),
        })
      );
    });

    it('should return an error if LLM responds with an error field', async () => {
      const llmError = 'Failed to extract parameters from message';

      // Mock LLM extraction with error
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          error: llmError,
        })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        error: llmError,
      });

      // Text without clear parameters
      mockMessage.content.text = 'Undelegate my stake';

      await undelegateL1Action.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockPolygonRpcService.undelegate).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error undelegating shares (L1)'),
          data: expect.objectContaining({
            error: expect.stringContaining(
              'Could not determine validator ID or shares amount from the message.'
            ),
            success: false,
          }),
        })
      );
    });

    it('should return an error if polygonService.undelegate throws an error', async () => {
      const validatorId = 123; // Number value instead of string
      const sharesAmountWei = '1000000000000000000';
      const serviceError = new Error('Transaction failed');

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          validatorId,
          sharesAmountWei,
        })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        validatorId,
        sharesAmountWei,
      });

      // Mock undelegate function throwing error
      (mockPolygonRpcService.undelegate as ReturnType<typeof vi.fn>).mockRejectedValue(
        serviceError
      );

      await undelegateL1Action.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockPolygonRpcService.undelegate).toHaveBeenCalledWith(
        validatorId,
        BigInt(sharesAmountWei)
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error undelegating shares'),
          data: expect.objectContaining({
            error: serviceError.message,
            success: false,
          }),
        })
      );
    });

    it('should correctly format the success message and data', async () => {
      const validatorId = 123; // Number value instead of string
      const sharesAmountWei = '5000000000000000000'; // 5 shares in Wei
      const txHash = '0x0123456789abcdef';

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          validatorId,
          sharesAmountWei,
        })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        validatorId,
        sharesAmountWei,
      });

      // Mock successful undelegate function
      (mockPolygonRpcService.undelegate as ReturnType<typeof vi.fn>).mockResolvedValue(txHash);

      await undelegateL1Action.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Undelegation transaction sent'),
          actions: ['UNDELEGATE_L1'],
          data: expect.objectContaining({
            transactionHash: txHash,
            status: 'pending',
            validatorId,
            sharesAmountWei,
          }),
        })
      );
    });

    it('should correctly format the error message and data on failure', async () => {
      const errorMessage = 'Invalid validator ID';

      // Mock LLM extraction with error
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          error: errorMessage,
        })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        error: errorMessage,
      });

      await undelegateL1Action.handler(
        mockRuntime,
        mockMessage,
        mockState,
        undefined,
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error undelegating shares (L1)'),
          data: expect.objectContaining({
            error: expect.stringContaining(
              'Could not determine validator ID or shares amount from the message.'
            ),
            success: false,
          }),
        })
      );
    });

    it('should call the callback with the response content', async () => {
      const validatorId = 123; // Number value instead of string
      const sharesAmountWei = '1000000000000000000';
      const txHash = '0xabcdef1234567890';

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          validatorId,
          sharesAmountWei,
        })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        validatorId,
        sharesAmountWei,
      });

      // Mock successful undelegate function
      (mockPolygonRpcService.undelegate as ReturnType<typeof vi.fn>).mockResolvedValue(txHash);

      await undelegateL1Action.handler(
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
            sharesAmountWei,
          }),
        })
      );
    });
  });
});
