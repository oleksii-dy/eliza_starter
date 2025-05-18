import { describe, it, beforeEach, vi, expect } from 'vitest';
import { delegateL1Action } from '../../actions/delegateL1';
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
    parseJSONObjectFromText: vi.fn((text) => {
      // Default mock implementation that can be overridden by tests
      try {
        return JSON.parse(text);
      } catch (e) {
        // This generic error will be thrown if a test doesn't mock a specific error
        // or if JSON.parse genuinely fails on an unexpected input.
        throw new Error(`Failed to parse JSON during test: ${text}`);
      }
    }),
  };
});

// Mock dependencies using Vitest
const mockRuntime = {
  getSetting: vi.fn(),
  getService: vi.fn(),
  useModel: vi.fn(),
} as unknown as IAgentRuntime;

const mockPolygonRpcService = {
  delegate: vi.fn().mockResolvedValue('0xabcdef1234567890'), // Return just the transaction hash per implementation
  serviceType: 'PolygonRpcService',
} as unknown as PolygonRpcService;

const mockMessageContent: Content = { text: 'Delegate 10 to validator 1' };

const mockMessage: Memory = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  entityId: '123e4567-e89b-12d3-a456-426614174001',
  roomId: '123e4567-e89b-12d3-a456-426614174002',
  content: mockMessageContent,
  createdAt: Date.now(),
};

const mockState = {} as State;
const mockCallback = vi.fn();

describe('delegateL1Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mocking getService to return our mockPolygonRpcService
    (mockRuntime.getService as ReturnType<typeof vi.fn>).mockReturnValue(mockPolygonRpcService);
    // Reset the mock message content for each test
    mockMessage.content.text = 'Delegate 10 to validator 1';
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

      const isValid = await delegateL1Action.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(true);
    });

    it('should return false if PRIVATE_KEY is missing', async () => {
      (mockRuntime.getSetting as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === 'PRIVATE_KEY') return null;
        if (key === 'ETHEREUM_RPC_URL') return 'test-rpc-url';
        if (key === 'POLYGON_PLUGINS_ENABLED') return true;
        return null;
      });

      const isValid = await delegateL1Action.validate(mockRuntime, mockMessage, mockState);
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

      const isValid = await delegateL1Action.validate(mockRuntime, mockMessage, mockState);
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

      const isValid = await delegateL1Action.validate(mockRuntime, mockMessage, mockState);
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

      const isValid = await delegateL1Action.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'PolygonRpcService not initialized for DELEGATE_L1.'
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

      const isValid = await delegateL1Action.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Error accessing PolygonRpcService during DELEGATE_L1 validation:',
        serviceError
      );
    });
  });

  describe('handler', () => {
    it('should successfully delegate with valid parameters from LLM', async () => {
      const validatorId = 123; // Number value instead of string
      const amountWei = '1000000000000000000'; // 1 MATIC in Wei
      const txHash = '0xabcdef1234567890';

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          validatorId,
          amountWei,
        })
      );
      // Mock parseJSONObjectFromText to return the expected object
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        validatorId,
        amountWei,
      });

      // Mock successful delegate function
      (mockPolygonRpcService.delegate as ReturnType<typeof vi.fn>).mockResolvedValue(txHash);

      await delegateL1Action.handler(mockRuntime, mockMessage, mockState, undefined, mockCallback);

      expect(mockPolygonRpcService.delegate).toHaveBeenCalledWith(validatorId, BigInt(amountWei));

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Successfully initiated delegation'),
          actions: ['DELEGATE_L1'],
          data: expect.objectContaining({
            transactionHash: txHash,
            status: 'pending',
            validatorId: validatorId,
          }),
        })
      );
    });

    it('should return an error if validatorId is missing after LLM and fallback', async () => {
      // Mock LLM extraction with missing validatorId
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          amountWei: '1000000000000000000',
        })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        amountWei: '1000000000000000000',
      });

      mockMessage.content.text = 'Delegate 10 MATIC'; // No validator ID in text

      await delegateL1Action.handler(mockRuntime, mockMessage, mockState, undefined, mockCallback);

      expect(mockPolygonRpcService.delegate).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error delegating MATIC (L1)'),
          data: expect.objectContaining({
            error: expect.stringContaining(
              'Validator ID or amount is missing after extraction attempts.'
            ),
            success: false,
          }),
        })
      );
    });

    it('should return an error if amountWei is missing after LLM and fallback', async () => {
      // Mock LLM extraction with missing amountWei
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          validatorId: 123,
        })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        validatorId: 123,
      });

      mockMessage.content.text = 'Delegate to validator 123'; // No amount in text

      await delegateL1Action.handler(mockRuntime, mockMessage, mockState, undefined, mockCallback);

      expect(mockPolygonRpcService.delegate).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error delegating MATIC (L1)'),
          data: expect.objectContaining({
            error: expect.stringContaining(
              'Validator ID or amount is missing after extraction attempts.'
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
      mockMessage.content.text = 'Delegate my MATIC';

      await delegateL1Action.handler(mockRuntime, mockMessage, mockState, undefined, mockCallback);

      expect(mockPolygonRpcService.delegate).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error delegating MATIC (L1)'),
          data: expect.objectContaining({
            error: expect.stringContaining(
              'Could not determine validator ID or amount from the message.'
            ),
            success: false,
          }),
        })
      );
    });

    it('should return an error if PolygonRpcService is not found', async () => {
      const validatorId = 123;
      const amountWei = '1000000000000000000';

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          validatorId,
          amountWei,
        })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        validatorId,
        amountWei,
      });

      // Mock getService returning null
      (mockRuntime.getService as ReturnType<typeof vi.fn>).mockReturnValue(null);

      await delegateL1Action.handler(mockRuntime, mockMessage, mockState, undefined, mockCallback);

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

    it('should return an error if polygonService.delegate throws an error', async () => {
      const validatorId = 123;
      const amountWei = '1000000000000000000';
      const serviceError = new Error('Transaction failed');

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          validatorId,
          amountWei,
        })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        validatorId,
        amountWei,
      });

      // Restore the default service mock
      (mockRuntime.getService as ReturnType<typeof vi.fn>).mockReturnValue(mockPolygonRpcService);

      // Mock delegate function throwing error
      (mockPolygonRpcService.delegate as ReturnType<typeof vi.fn>).mockRejectedValue(serviceError);

      await delegateL1Action.handler(mockRuntime, mockMessage, mockState, undefined, mockCallback);

      expect(mockPolygonRpcService.delegate).toHaveBeenCalledWith(validatorId, BigInt(amountWei));

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error delegating MATIC'),
          data: expect.objectContaining({
            error: serviceError.message,
            success: false,
          }),
        })
      );
    });

    it('should correctly format the success message and data', async () => {
      const validatorId = 123;
      const amountWei = '5000000000000000000'; // 5 MATIC in Wei
      const txHash = '0x0123456789abcdef';

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          validatorId,
          amountWei,
        })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        validatorId,
        amountWei,
      });

      // Mock successful delegate function
      (mockPolygonRpcService.delegate as ReturnType<typeof vi.fn>).mockResolvedValue(txHash);

      await delegateL1Action.handler(mockRuntime, mockMessage, mockState, undefined, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Successfully initiated delegation'),
          actions: ['DELEGATE_L1'],
          data: expect.objectContaining({
            transactionHash: txHash,
            status: 'pending',
            validatorId,
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

      await delegateL1Action.handler(mockRuntime, mockMessage, mockState, undefined, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Error delegating MATIC (L1)'),
          data: expect.objectContaining({
            error: expect.stringContaining(
              'Could not determine validator ID or amount from the message.'
            ),
            success: false,
          }),
        })
      );
    });

    it('should call the callback with the response content', async () => {
      const validatorId = 123;
      const amountWei = '1000000000000000000';
      const txHash = '0xabcdef1234567890';

      // Mock successful LLM extraction
      (mockRuntime.useModel as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          validatorId,
          amountWei,
        })
      );
      (parseJSONObjectFromText as ReturnType<typeof vi.fn>).mockReturnValue({
        validatorId,
        amountWei,
      });

      // Mock successful delegate function
      (mockPolygonRpcService.delegate as ReturnType<typeof vi.fn>).mockResolvedValue(txHash);

      await delegateL1Action.handler(mockRuntime, mockMessage, mockState, undefined, mockCallback);

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
