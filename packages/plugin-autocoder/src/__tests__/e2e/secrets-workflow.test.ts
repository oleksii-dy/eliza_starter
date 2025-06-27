import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { type IAgentRuntime, type Memory, type State, type UUID } from '@elizaos/core';
import { requestSecretsFormAction } from '../../actions/requestSecretsForm';
import { SecretsFormWebSocketService } from '../../services/SecretsFormWebSocketService';

// Helper function to generate valid UUIDs for testing
function generateTestUUID(): UUID {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }) as UUID;
}

describe('Secrets Workflow E2E Tests', () => {
  let mockRuntime: IAgentRuntime;
  let mockSecretsService: any;
  let mockWSService: SecretsFormWebSocketService;
  let testMemories: Memory[] = [];

  beforeEach(() => {
    // Reset test state
    testMemories = [];

    // Mock secrets service
    mockSecretsService = {
      createSecretForm: vi.fn().mockResolvedValue({
        url: 'https://secure.example.com/form/test-form-id',
        formId: 'test-form-id'
      }),
      storeSecrets: vi.fn().mockResolvedValue(true),
      getSecrets: vi.fn().mockResolvedValue({}),
    };

    // Mock WebSocket service
    mockWSService = {
      broadcastFormInjection: vi.fn().mockResolvedValue(undefined),
      registerConnection: vi.fn(),
      broadcast: vi.fn().mockResolvedValue(undefined), 
      getConnectionCount: vi.fn().mockReturnValue(1),
      getActiveForms: vi.fn().mockReturnValue([]),
      getForm: vi.fn().mockReturnValue(null),
      stop: vi.fn().mockResolvedValue(undefined),
      capabilityDescription: 'Mock WebSocket service for testing'
    } as any;

    // Mock runtime
    mockRuntime = {
      agentId: generateTestUUID(),
      character: {
        name: 'TestAgent',
        bio: ['Test agent for secrets workflow'],
        system: 'Test system prompt',
        messageExamples: [],
        postExamples: [],
        topics: [],
        knowledge: [],
        plugins: [],
      },
      getService: vi.fn((serviceName: string) => {
        if (serviceName === 'SECRETS') return mockSecretsService;
        if (serviceName === 'websocket' || serviceName === 'messaging') return mockWSService;
        return null;
      }),
      getSetting: vi.fn((key: string) => {
        const settings: Record<string, string> = {
          API_KEY: 'test-api-key',
          SECRET_KEY: 'test-secret',
        };
        return settings[key];
      }),
      createMemory: vi.fn().mockImplementation((memory: Memory) => {
        const newMemory = {
          id: generateTestUUID(),
          ...memory,
          createdAt: Date.now(),
        };
        testMemories.push(newMemory);
        return Promise.resolve(newMemory.id);
      }),
      getMemories: vi.fn().mockResolvedValue(testMemories),
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should detect OpenAI API key requirement and create secrets form', async () => {
    console.log('🧪 Testing OpenAI API key detection and form creation...');

    const message: Memory = {
      id: generateTestUUID(),
      entityId: generateTestUUID(),
      roomId: generateTestUUID(),
      agentId: mockRuntime.agentId,
      content: {
        text: 'Create a chatbot that uses OpenAI for natural language processing',
        source: 'autocoder',
      },
      createdAt: Date.now(),
    };

    const state: State = {
      values: {
        projectType: 'autocoder',
        projectId: generateTestUUID(),
      },
      data: {},
      text: 'User wants to create an OpenAI-powered chatbot',
    };

    // Test validation
    const isValid = await requestSecretsFormAction.validate(mockRuntime, message, state);
    expect(isValid).toBe(true);
    console.log('✅ Action validation passed');

    // Test handler execution
    const mockCallback = vi.fn();
    const result = await requestSecretsFormAction.handler(
      mockRuntime,
      message,
      state,
      {},
      mockCallback
    );

    // Verify secrets service was called
    expect(mockSecretsService.createSecretForm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Configuration Required',
        description: 'Please provide the following configuration values to continue:',
        fields: expect.arrayContaining([
          expect.objectContaining({
            name: 'OPENAI_API_KEY',
            label: 'OpenAI API Key',
            type: 'password',
            required: true,
          }),
        ]),
      })
    );
    console.log('✅ Secrets form created with OpenAI API key field');

    // Verify WebSocket broadcast
    expect(mockWSService.broadcast).toHaveBeenCalled();
    console.log('✅ Form injection broadcasted via WebSocket');

    // Verify memory creation
    expect(mockRuntime.createMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          type: 'secrets_form_request',
        }),
      })
    );
    console.log('✅ Form request stored in memory');

    // Verify callback response
    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('OpenAI API Key'),
        action: 'REQUEST_SECRETS_FORM',
      })
    );
    console.log('✅ User callback executed with form details');

    // Verify result structure
    expect(result).toEqual(
      expect.objectContaining({
        text: expect.stringContaining('OpenAI API Key'),
        data: expect.objectContaining({
          status: 'form_created',
          formRequest: expect.objectContaining({
            secrets: expect.arrayContaining([
              expect.objectContaining({
                key: 'OPENAI_API_KEY',
              }),
            ]),
          }),
        }),
      })
    );
    console.log('✅ Action result structure verified');

    console.log('🎉 OpenAI API key detection test completed successfully!');
  });

  test('should handle Discord bot creation with multiple secrets', async () => {
    console.log('🧪 Testing Discord bot creation with multiple secret requirements...');

    const message: Memory = {
      id: generateTestUUID(),
      entityId: generateTestUUID(),
      roomId: generateTestUUID(),
      agentId: mockRuntime.agentId,
      content: {
        text: 'Build a Discord bot that can send messages and manage channels',
        source: 'autocoder',
      },
      createdAt: Date.now(),
    };

    const state: State = {
      values: {
        projectType: 'autocoder',
        missingSecrets: ['DISCORD_TOKEN'],
      },
      data: {},
      text: 'User wants to create a Discord bot',
    };

    // Execute handler
    const mockCallback = vi.fn();
    const result = await requestSecretsFormAction.handler(
      mockRuntime,
      message,
      state,
      {},
      mockCallback
    );

    // Verify Discord token field is included
    expect(mockSecretsService.createSecretForm).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.arrayContaining([
          expect.objectContaining({
            name: 'DISCORD_TOKEN',
            label: 'Discord Bot Token',
            type: 'password',
            required: true,
          }),
        ]),
      })
    );
    console.log('✅ Discord bot token field detected and included');

    // Verify priority is set appropriately
    const createFormCall = mockSecretsService.createSecretForm.mock.calls[0][0];
    expect(createFormCall.metadata.context.priority).toBeDefined();
    console.log('✅ Form priority determined correctly');

    console.log('🎉 Discord bot secrets test completed successfully!');
  });

  test('should complete full secrets workflow with form submission', async () => {
    console.log('🧪 Testing complete secrets workflow with form submission...');

    // Step 1: Create form request
    const message: Memory = {
      id: generateTestUUID(),
      entityId: generateTestUUID(),
      roomId: generateTestUUID(),
      agentId: mockRuntime.agentId,
      content: {
        text: 'Create a web scraper that uses OpenAI for analysis and stores data in PostgreSQL',
        source: 'autocoder',
      },
      createdAt: Date.now(),
    };

    const state: State = {
      values: {
        projectType: 'autocoder',
        projectId: 'full-workflow-test',
      },
      data: {},
      text: 'User wants a web scraper with OpenAI and database',
    };

    const mockCallback = vi.fn();
    await requestSecretsFormAction.handler(mockRuntime, message, state, {}, mockCallback);

    console.log('✅ Initial form request created');

    // Step 2: Simulate form completion via WebSocket service
    const formCompletionMessage = {
      type: 'FORM_COMPLETED' as const,
      data: {
        formId: 'test-form-id',
        secrets: {
          OPENAI_API_KEY: 'sk-test-openai-key-123',
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
        },
        projectId: 'full-workflow-test',
        timestamp: new Date().toISOString(),
      },
    };

    // Simulate WebSocket message handling - first need to register the form
    const wsService = new SecretsFormWebSocketService(mockRuntime);
    // Manually add the form to the active forms map to simulate it being created
    wsService['activeForms'].set('test-form-id', {
      id: 'test-form-id',
      title: 'Web Scraper Configuration',
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    
    await wsService['handleFormCompletedMessage'](formCompletionMessage);

    console.log('✅ Form completion processed');

    // Verify secrets were stored
    expect(mockSecretsService.storeSecrets).toHaveBeenCalledWith(
      {
        OPENAI_API_KEY: 'sk-test-openai-key-123',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
      },
      expect.objectContaining({
        formId: 'test-form-id',
        projectId: 'full-workflow-test',
        source: 'autocoder_form',
      })
    );
    console.log('✅ Secrets stored via secrets service');

    // Verify completion memory was created
    const completionMemory = testMemories.find(
      (m) => m.content.type === 'secrets_form_completion'
    );
    expect(completionMemory).toBeDefined();
    expect(completionMemory?.content.secretKeys).toEqual(['OPENAI_API_KEY', 'DATABASE_URL']);
    console.log('✅ Completion memory created with secret keys');

    console.log('🎉 Full secrets workflow test completed successfully!');
  });

  test('should handle form cancellation gracefully', async () => {
    console.log('🧪 Testing form cancellation handling...');

    // Create initial form
    const message: Memory = {
      id: generateTestUUID(),
      entityId: generateTestUUID(),
      roomId: generateTestUUID(),
      agentId: mockRuntime.agentId,
      content: {
        text: 'I need to set up Stripe payments but I want to cancel the form',
        source: 'autocoder',
      },
      createdAt: Date.now(),
    };

    const state: State = {
      values: { projectType: 'autocoder' },
      data: {},
      text: 'User wants Stripe integration',
    };

    const mockCallback = vi.fn();
    await requestSecretsFormAction.handler(mockRuntime, message, state, {}, mockCallback);

    console.log('✅ Initial form created for Stripe');

    // Simulate form cancellation
    const formCancellationMessage = {
      type: 'FORM_CANCELLED' as const,
      data: {
        formId: 'test-form-id',
        projectId: 'autocoder-cancel-test',
        timestamp: new Date().toISOString(),
      },
    };

    const wsService = new SecretsFormWebSocketService(mockRuntime);
    await wsService['handleFormCancelledMessage'](formCancellationMessage);

    console.log('✅ Form cancellation processed');

    // Verify cancellation memory was created
    const cancellationMemory = testMemories.find(
      (m) => m.content.type === 'secrets_form_cancellation'
    );
    expect(cancellationMemory).toBeDefined();
    expect((cancellationMemory?.metadata as any)?.status).toBe('cancelled');
    console.log('✅ Cancellation memory created');

    console.log('🎉 Form cancellation test completed successfully!');
  });

  test('should validate action context appropriately', async () => {
    console.log('🧪 Testing action validation logic...');

    // Test 1: Should pass validation in autocoder context
    const autocoderMessage: Memory = {
      id: generateTestUUID(),
      entityId: generateTestUUID(),
      roomId: generateTestUUID(),
      agentId: mockRuntime.agentId,
      content: {
        text: 'I need API keys for my project',
        source: 'autocoder',
      },
      createdAt: Date.now(),
    };

    const isValidAutocoder = await requestSecretsFormAction.validate(
      mockRuntime,
      autocoderMessage
    );
    expect(isValidAutocoder).toBe(true);
    console.log('✅ Validation passes in autocoder context');

    // Test 2: Should fail validation in non-autocoder context
    const nonAutocoderMessage: Memory = {
      id: generateTestUUID(),
      entityId: generateTestUUID(),
      roomId: generateTestUUID(),
      agentId: mockRuntime.agentId,
      content: {
        text: 'I need API keys for my project',
        source: 'chat',
      },
      createdAt: Date.now(),
    };

    const isValidNonAutocoder = await requestSecretsFormAction.validate(
      mockRuntime,
      nonAutocoderMessage
    );
    expect(isValidNonAutocoder).toBe(false);
    console.log('✅ Validation fails in non-autocoder context');

    // Test 3: Should fail validation when secrets service is unavailable
    const mockRuntimeNoSecrets = {
      ...mockRuntime,
      getService: vi.fn().mockReturnValue(null),
    } as any;

    const isValidNoService = await requestSecretsFormAction.validate(
      mockRuntimeNoSecrets,
      autocoderMessage
    );
    expect(isValidNoService).toBe(false);
    console.log('✅ Validation fails when secrets service unavailable');

    console.log('🎉 Action validation tests completed successfully!');
  });

  test('should handle multiple secret types and validation patterns', async () => {
    console.log('🧪 Testing multiple secret types and validation patterns...');

    const message: Memory = {
      id: generateTestUUID(),
      entityId: generateTestUUID(),
      roomId: generateTestUUID(),
      agentId: mockRuntime.agentId,
      content: {
        text: 'Build an e-commerce platform with Stripe payments, SendGrid emails, GitHub integration, and OpenAI product recommendations',
        source: 'autocoder',
      },
      createdAt: Date.now(),
    };

    const state: State = {
      values: { projectType: 'autocoder' },
      data: {},
      text: 'Complex e-commerce project',
    };

    const mockCallback = vi.fn();
    await requestSecretsFormAction.handler(mockRuntime, message, state, {}, mockCallback);

    // Verify all expected secret types are included
    const createFormCall = mockSecretsService.createSecretForm.mock.calls[0][0];
    const fieldNames = createFormCall.fields.map((f: any) => f.name);

    expect(fieldNames).toContain('OPENAI_API_KEY');
    expect(fieldNames).toContain('STRIPE_SECRET_KEY');
    expect(fieldNames).toContain('SENDGRID_API_KEY');
    expect(fieldNames).toContain('GITHUB_TOKEN');

    console.log('✅ All secret types detected:', fieldNames);

    // Verify validation patterns are included
    const openaiField = createFormCall.fields.find((f: any) => f.name === 'OPENAI_API_KEY');
    const stripeField = createFormCall.fields.find((f: any) => f.name === 'STRIPE_SECRET_KEY');

    expect(openaiField.validation).toBeDefined();
    expect(stripeField.validation).toBeDefined();
    console.log('✅ Validation patterns included for API keys');

    // Verify priority is set to high for multiple critical secrets
    expect(createFormCall.metadata.context.priority).toBe('high');
    console.log('✅ High priority set for multiple critical secrets');

    console.log('🎉 Multiple secret types test completed successfully!');
  });
});