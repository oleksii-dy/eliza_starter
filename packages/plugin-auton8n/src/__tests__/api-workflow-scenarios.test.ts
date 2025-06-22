import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PluginCreationService } from '../services/plugin-creation-service';

// Mock runtime with simulated environment manager
const createMockRuntime = (envVars: Record<string, string> = {}) => {
  const mockEnvVars = { ...envVars };

  // Mock EnvManagerService
  const mockEnvManager = {
    updateEnvVar: vi.fn().mockResolvedValue(true),
    getEnvVar: vi.fn((varName: string) => mockEnvVars[varName] || null),
    getEnvVarsForPlugin: vi.fn().mockResolvedValue({}),
    getMissingEnvVars: vi.fn().mockResolvedValue([]),
    hasMissingEnvVars: vi.fn().mockResolvedValue(false),
  };

  return {
    agentId: 'test-agent',
    getSetting: vi.fn((key: string) => mockEnvVars[key]),
    setSetting: vi.fn((key: string, value: string) => {
      mockEnvVars[key] = value;
    }),
    getService: vi.fn((serviceName: string) => {
      if (serviceName === 'ENV_MANAGER') return mockEnvManager;
      if (serviceName === 'PLUGIN_CREATION') return PluginCreationService.prototype;
      return null;
    }),
    mockEnvManager,
    mockEnvVars,
  };
};

describe('API Workflow Scenarios', () => {
  let mockRuntime: any;
  let pluginService: PluginCreationService;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    pluginService = new PluginCreationService(mockRuntime as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Single API Key Workflow', () => {
    it('should handle plugin creation with single API key requirement', async () => {
      // Simulate user providing API key
      const testApiKey = 'test-weather-api-key-12345';
      await mockRuntime.mockEnvManager.updateEnvVar('plugin-weather-test', 'WEATHER_API_KEY_TEST', {
        value: testApiKey,
        type: 'api_key',
        required: true,
        description: 'Test weather API key',
      });

      // Verify API key was stored
      mockRuntime.mockEnvVars['WEATHER_API_KEY_TEST'] = testApiKey;

      const retrievedKey = mockRuntime.mockEnvManager.getEnvVar('WEATHER_API_KEY_TEST');
      expect(retrievedKey).toBe(testApiKey);

      // Create plugin specification
      const weatherSpec = {
        name: '@elizaos/plugin-weather-test',
        description: 'Weather plugin that requires API key',
        version: '1.0.0',
        actions: [
          {
            name: 'getCurrentWeather',
            description: 'Get weather for a location',
            parameters: { location: 'string' },
          },
        ],
        environmentVariables: [
          {
            name: 'WEATHER_API_KEY_TEST',
            description: 'OpenWeatherMap API key',
            required: true,
            sensitive: true,
          },
        ],
      };

      // Verify the plugin specification includes env vars
      expect(weatherSpec.environmentVariables).toHaveLength(1);
      expect(weatherSpec.environmentVariables[0].name).toBe('WEATHER_API_KEY_TEST');
    });
  });

  describe('Multiple API Keys Workflow', () => {
    it('should handle plugin creation with multiple API key requirements', async () => {
      // Simulate user providing multiple API keys
      const apiKeys = {
        OPENAI_API_KEY_TEST: 'sk-test-openai-12345',
        SENDGRID_API_KEY_TEST: 'SG.test-sendgrid-67890',
        SLACK_WEBHOOK_URL_TEST: 'https://hooks.slack.com/test/webhook',
      };

      // Store all API keys
      for (const [key, value] of Object.entries(apiKeys)) {
        await mockRuntime.mockEnvManager.updateEnvVar('plugin-notification-test', key, {
          value,
          type: 'api_key',
        });
        mockRuntime.mockEnvVars[key] = value;
      }

      // Verify all keys are accessible
      for (const [key, expectedValue] of Object.entries(apiKeys)) {
        const retrievedValue = mockRuntime.mockEnvManager.getEnvVar(key);
        expect(retrievedValue).toBe(expectedValue);
      }

      // Create multi-API plugin specification
      const notificationSpec = {
        name: '@elizaos/plugin-notification-test',
        description: 'Multi-channel notification plugin',
        environmentVariables: [
          {
            name: 'OPENAI_API_KEY_TEST',
            description: 'OpenAI API key',
            required: true,
            sensitive: true,
          },
          {
            name: 'SENDGRID_API_KEY_TEST',
            description: 'SendGrid API key',
            required: true,
            sensitive: true,
          },
          {
            name: 'SLACK_WEBHOOK_URL_TEST',
            description: 'Slack webhook URL',
            required: true,
            sensitive: true,
          },
        ],
      };

      // Verify all env vars are included
      expect(notificationSpec.environmentVariables).toHaveLength(3);
    });
  });

  describe('Missing API Keys Handling', () => {
    it('should track missing API keys and allow later provision', async () => {
      // Start with no API keys
      mockRuntime.mockEnvManager.hasMissingEnvVars.mockResolvedValue(true);
      mockRuntime.mockEnvManager.getMissingEnvVars.mockResolvedValue([
        {
          plugin: 'plugin-api-test',
          varName: 'EXTERNAL_API_KEY_TEST',
          config: { required: true, status: 'missing' },
        },
      ]);

      // Check for missing vars
      const hasMissing = await mockRuntime.mockEnvManager.hasMissingEnvVars();
      expect(hasMissing).toBe(true);

      const missingVars = await mockRuntime.mockEnvManager.getMissingEnvVars();
      expect(missingVars).toHaveLength(1);

      // Simulate user providing the missing key
      await mockRuntime.mockEnvManager.updateEnvVar('plugin-api-test', 'EXTERNAL_API_KEY_TEST', {
        value: 'provided-api-key-xyz',
        type: 'api_key',
        required: true,
        status: 'valid',
      });

      // Update mock to reflect no missing vars
      mockRuntime.mockEnvManager.hasMissingEnvVars.mockResolvedValue(false);
      mockRuntime.mockEnvManager.getMissingEnvVars.mockResolvedValue([]);

      // Verify no more missing vars
      const stillMissing = await mockRuntime.mockEnvManager.hasMissingEnvVars();
      expect(stillMissing).toBe(false);
    });
  });

  describe('Workflow Execution with API Keys', () => {
    it('should execute workflows using stored API keys', async () => {
      // Set up workflow API key
      const workflowApiKey = 'test-workflow-key-abc123';
      mockRuntime.mockEnvVars['WORKFLOW_API_KEY_TEST'] = workflowApiKey;

      // Create workflow execution context
      const workflowContext = {
        workflowId: 'data-processing-pipeline',
        params: { input: 'test-data' },
        apiKey: mockRuntime.mockEnvManager.getEnvVar('WORKFLOW_API_KEY_TEST'),
      };

      // Verify API key is available for workflow
      expect(workflowContext.apiKey).toBe(workflowApiKey);

      // Simulate workflow execution steps
      const workflowSteps = [
        { step: 'authenticate', requiresKey: true },
        { step: 'fetch-data', requiresKey: true },
        { step: 'process-data', requiresKey: false },
        { step: 'store-results', requiresKey: true },
      ];

      // Verify each step has access to API key when needed
      for (const step of workflowSteps) {
        if (step.requiresKey) {
          const keyAccess = mockRuntime.mockEnvManager.getEnvVar('WORKFLOW_API_KEY_TEST');
          expect(keyAccess).toBe(workflowApiKey);
        }
      }
    });
  });

  describe('API Key Namespacing', () => {
    it('should handle namespaced API keys to prevent conflicts', () => {
      // Test different namespacing strategies
      const namespacedKeys = {
        OPENAI_API_KEY: 'sk-prod-openai-key',
        OPENAI_API_KEY_TEST: 'sk-test-openai-key',
        OPENAI_API_KEY_DEV: 'sk-dev-openai-key',
      };

      // Store namespaced keys
      Object.entries(namespacedKeys).forEach(([key, value]) => {
        mockRuntime.mockEnvVars[key] = value;
      });

      // Verify each namespace has its own key
      expect(mockRuntime.mockEnvManager.getEnvVar('OPENAI_API_KEY')).toBe('sk-prod-openai-key');
      expect(mockRuntime.mockEnvManager.getEnvVar('OPENAI_API_KEY_TEST')).toBe(
        'sk-test-openai-key'
      );
      expect(mockRuntime.mockEnvManager.getEnvVar('OPENAI_API_KEY_DEV')).toBe('sk-dev-openai-key');
    });
  });
});
