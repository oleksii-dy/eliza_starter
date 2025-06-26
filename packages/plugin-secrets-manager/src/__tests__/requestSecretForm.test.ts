import { type IAgentRuntime, type Memory, type HandlerCallback, type State } from '@elizaos/core';
import * as core from '@elizaos/core';
import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { requestSecretFormAction } from '../actions/requestSecretForm';
import { createMockRuntime } from './test-utils';

// Import core functions to spy on them
// Mock logger
const _mockLogger = {
  info: mock(),
  warn: mock(),
  error: mock(),
  debug: mock(),
};
// Mock the core module's parseJSONObjectFromText function
const parseJSONSpy = spyOn(core, 'parseJSONObjectFromText');
describe('requestSecretFormAction', () => {
  let mockRuntime: IAgentRuntime;
  let mockForm: any;
  let mockCallback: HandlerCallback;
  let mockState: State;
  beforeEach(() => {
    // Reset individual mocks instead of calling mock.restore() which affects spies
    mockForm = {
      createSecretForm: mock().mockResolvedValue({
        url: 'https://test.ngrok.io/form/123',
        sessionId: 'session-123',
      }),
    } as any;
    
    // Use the unified mock runtime with plugin-specific overrides
    mockRuntime = createMockRuntime({
      agentId: 'agent-123',
      getService: (name: string) => {
        if (name === 'SECRET_FORMS') {
          return mockForm;
        }
        return null;
      },
      get: mock().mockReturnValue(mockForm),
    });
    
    mockCallback = mock();
    mockState = {
      values: {},
      data: {},
      text: '',
    };
  });
  describe('validate', () => {
    it('should return true when service exists and keywords match', async () => {
      const message: Memory = {
        content: { text: 'I need you to request secret from me' },
        entityId: 'user-123',
      } as any;
      const result = await requestSecretFormAction.validate(mockRuntime, message);
      expect(result).toBe(true);
    });
    it('should return false when service does not exist', async () => {
      mockRuntime.getService = mock(() => null);
      const message: Memory = {
        content: { text: 'request secret' },
        entityId: 'user-123',
      } as any;
      const result = await requestSecretFormAction.validate(mockRuntime, message);
      expect(result).toBe(false);
    });
    it('should match various keywords', async () => {
      const testCases = [
        'request secret from user',
        'need information about api',
        'collect secret data',
        'create form for credentials',
        'ask for api key',
        'request credentials',
      ];
      for (const text of testCases) {
        const message: Memory = {
          content: { text },
          entityId: 'user-123',
        } as any;
        const result = await requestSecretFormAction.validate(mockRuntime, message);
        expect(result).toBe(true);
      }
    });
    it('should return false for non-matching text', async () => {
      const message: Memory = {
        content: { text: 'hello world' },
        entityId: 'user-123',
      } as any;
      const result = await requestSecretFormAction.validate(mockRuntime, message);
      expect(result).toBe(false);
    });
  });
  describe('handler', () => {
    it('should create form for API key request', async () => {
      const message: Memory = {
        content: { text: 'Request my OpenAI API key' },
        entityId: 'user-123',
      } as any;
      await requestSecretFormAction.handler(mockRuntime, message, mockState, {}, mockCallback);
      expect(mockForm.createSecretForm).toHaveBeenCalledWith(
        expect.objectContaining({
          secrets: expect.arrayContaining([
            expect.objectContaining({
              key: 'OPENAI_API_KEY',
              config: expect.objectContaining({
                type: 'api_key',
                description: 'OpenAI API Key',
              }),
            }),
          ]),
        }),
        expect.objectContaining({
          level: 'user',
          userId: 'user-123',
          agentId: 'agent-123',
        }),
        expect.any(Function)
      );
      expect(mockCallback).toHaveBeenCalledWith({
        text: expect.stringContaining('https://test.ngrok.io/form/123'),
        data: {
          formUrl: 'https://test.ngrok.io/form/123',
          sessionId: 'session-123',
          expiresAt: expect.any(Number),
        },
      });
    });
    it('should handle multiple API keys', async () => {
      // Ensure parseJSONObjectFromText returns null for natural language
      // const _parseJSON = await import('@elizaos/core').then((m) => m.parseJSONObjectFromText);
      parseJSONSpy.mockReturnValue(null);
      const message: Memory = {
        content: { text: 'I need you to collect my OpenAI and Anthropic API keys' },
        entityId: 'user-123',
      } as any;
      await requestSecretFormAction.handler(mockRuntime, message, mockState, {}, mockCallback);
      const formCall = mockForm.createSecretForm.mock.calls[0];
      const request = formCall[0];
      expect(request.secrets).toHaveLength(2);
      const keys = request.secrets.map((s) => s.key);
      expect(keys).toContain('OPENAI_API_KEY');
      expect(keys).toContain('ANTHROPIC_API_KEY');
    });
    it('should handle webhook URL request', async () => {
      const message: Memory = {
        content: { text: 'Create a form for webhook configuration' },
        entityId: 'user-123',
      } as any;
      await requestSecretFormAction.handler(mockRuntime, message, mockState, {}, mockCallback);
      const formCall = mockForm.createSecretForm.mock.calls[0];
      const request = formCall[0];
      expect(request.secrets[0]).toMatchObject({
        key: 'WEBHOOK_URL',
        config: {
          type: 'url',
          description: 'Webhook URL',
        },
      });
    });
    it('should parse JSON parameters', async () => {
      parseJSONSpy.mockReturnValue({
        secrets: [
          {
            key: 'CUSTOM_KEY',
            description: 'Custom Secret',
            type: 'secret',
            required: false,
          },
        ],
        title: 'Custom Form',
        description: 'Custom Description',
        mode: 'inline',
        expiresIn: 600000,
      });
      const message: Memory = {
        content: { text: '{"secrets": [...]}' },
        entityId: 'user-123',
      } as any;
      await requestSecretFormAction.handler(mockRuntime, message, mockState, {}, mockCallback);
      const formCall = mockForm.createSecretForm.mock.calls[0];
      const request = formCall[0];
      expect(request.title).toBe('Custom Form');
      expect(request.description).toBe('Custom Description');
      expect(request.mode).toBe('inline');
      expect(request.expiresIn).toBe(600000);
    });
    it('should handle custom expiration times', async () => {
      // Ensure parseJSONObjectFromText returns null for natural language
      parseJSONSpy.mockReturnValue(null);
      const message: Memory = {
        content: { text: 'Create a form for my API key that expires in 5 minutes' },
        entityId: 'user-123',
      } as any;
      await requestSecretFormAction.handler(mockRuntime, message, mockState, {}, mockCallback);
      const formCall = mockForm.createSecretForm.mock.calls[0];
      const request = formCall[0];
      expect(request.expiresIn).toBe(5 * 60 * 1000);
    });
    it('should handle hour expiration', async () => {
      // Ensure parseJSONObjectFromText returns null for natural language
      parseJSONSpy.mockReturnValue(null);
      const message: Memory = {
        content: { text: 'Create a form for my password that expires in 2 hours' },
        entityId: 'user-123',
      } as any;
      await requestSecretFormAction.handler(mockRuntime, message, mockState, {}, mockCallback);
      const formCall = mockForm.createSecretForm.mock.calls[0];
      const request = formCall[0];
      expect(request.expiresIn).toBe(2 * 60 * 60 * 1000);
    });
    it('should use inline mode when specified', async () => {
      const message: Memory = {
        content: { text: 'Create a quick inline form for API key' },
        entityId: 'user-123',
      } as any;
      await requestSecretFormAction.handler(mockRuntime, message, mockState, {}, mockCallback);
      const formCall = mockForm.createSecretForm.mock.calls[0];
      const request = formCall[0];
      expect(request.mode).toBe('inline');
    });
    it('should handle credit card request', async () => {
      // Ensure parseJSONObjectFromText returns null for natural language
      // const _parseJSON = await import('@elizaos/core').then((m) => m.parseJSONObjectFromText);
      parseJSONSpy.mockReturnValue(null);
      const message: Memory = {
        content: { text: 'Please request my credit card information' },
        entityId: 'user-123',
      } as any;
      await requestSecretFormAction.handler(mockRuntime, message, mockState, {}, mockCallback);
      const formCall = mockForm.createSecretForm.mock.calls[0];
      const request = formCall[0];
      expect(request.secrets[0]).toMatchObject({
        key: 'CREDIT_CARD',
        config: {
          type: 'creditcard',
          description: 'Credit Card Number',
        },
      });
    });
    it('should handle service not available', async () => {
      mockRuntime.getService = mock(() => null);
      const message: Memory = {
        content: { text: 'Request API key' },
        entityId: 'user-123',
      } as any;
      const result = await requestSecretFormAction.handler(
        mockRuntime,
        message,
        mockState,
        {},
        mockCallback
      );
      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledWith({
        text: 'Secret form service is not available.',
        error: true,
      });
    });
    it('should handle no secrets specified', async () => {
      // const _parseJSON = await import('@elizaos/core').then((m) => m.parseJSONObjectFromText);
      parseJSONSpy.mockReturnValue({
        secrets: [],
      });
      const message: Memory = {
        content: { text: '{"secrets": []}' },
        entityId: 'user-123',
      } as any;
      const result = await requestSecretFormAction.handler(
        mockRuntime,
        message,
        mockState,
        {},
        mockCallback
      );
      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledWith({
        text: 'Please specify what secrets you need to collect.',
        error: true,
      });
    });
    it('should handle form creation errors', async () => {
      // Make sure parseJSONObjectFromText returns null for natural language
      // const _parseJSON = await import('@elizaos/core').then((m) => m.parseJSONObjectFromText);
      parseJSONSpy.mockReturnValue(null);
      (mockForm.createSecretForm as any).mockRejectedValue(new Error('Ngrok tunnel failed'));
      const message: Memory = {
        content: { text: 'Request API key' },
        entityId: 'user-123',
      } as any;
      const result = await requestSecretFormAction.handler(
        mockRuntime,
        message,
        mockState,
        {},
        mockCallback
      );
      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledWith({
        text: 'Error creating secret form: Ngrok tunnel failed',
        error: true,
      });
    });
    it('should add generic secret if no specific type found', async () => {
      // Make sure parseJSONObjectFromText returns null for natural language
      // const _parseJSON = await import('@elizaos/core').then((m) => m.parseJSONObjectFromText);
      parseJSONSpy.mockReturnValue(null);
      const message: Memory = {
        content: { text: 'Request some secret information' },
        entityId: 'user-123',
      } as any;
      await requestSecretFormAction.handler(mockRuntime, message, mockState, {}, mockCallback);
      const formCall = mockForm.createSecretForm.mock.calls[0];
      const request = formCall[0];
      expect(request.secrets[0]).toMatchObject({
        key: 'SECRET',
        config: {
          type: 'secret',
          description: 'Secret Value',
        },
      });
    });
    it('should handle submission callback', async () => {
      // Make sure parseJSONObjectFromText returns null for natural language
      // const _parseJSON = await import('@elizaos/core').then((m) => m.parseJSONObjectFromText);
      parseJSONSpy.mockReturnValue(null);
      const message: Memory = {
        content: { text: 'Request API key' },
        entityId: 'user-123',
      } as any;
      await requestSecretFormAction.handler(mockRuntime, message, mockState, {}, mockCallback);
      // Verify createSecretForm was called
      expect(mockForm.createSecretForm).toHaveBeenCalled();
      // Get the callback function
      const formCall = mockForm.createSecretForm.mock.calls[0];
      const submissionCallback = formCall[2];
      // Simulate form submission
      const submission = {
        formId: 'form-123',
        sessionId: 'session-123',
        data: { API_KEY: 'test-key' },
        submittedAt: Date.now(),
      };
      // HandlerCallback should not throw - it returns void/undefined
      await expect(submissionCallback?.(submission)).resolves.toBeUndefined();
    });
  });
  describe('examples', () => {
    it('should have valid examples', () => {
      expect(requestSecretFormAction.examples).toBeDefined();
      expect(requestSecretFormAction.examples).toHaveLength(3);
      // Check first example
      const firstExample = requestSecretFormAction.examples![0];
      expect(firstExample[0].name).toBe('user');
      expect(firstExample[0].content.text).toBe('I need you to collect my API keys');
      expect(firstExample[1].name).toBe('assistant');
      expect(firstExample[1].content.action).toBe('REQUEST_SECRET_FORM');
    });
  });
});
