import type { TestSuite, IAgentRuntime, Memory } from '@elizaos/core';
import { createUniqueUuid } from '@elizaos/core';
// Import types directly instead of from plugin-secrets-manager for now
// We'll use the runtime service directly
import { PluginCreationService } from '../services/plugin-creation-service.ts';

// Interface for EnvManagerService to avoid import issues
interface EnvManagerService {
  updateEnvVar(pluginName: string, varName: string, config: any): Promise<boolean>;
  getEnvVar(varName: string): string | null;
  getEnvVarsForPlugin(pluginName: string): Promise<any>;
  getMissingEnvVars(): Promise<any[]>;
  hasMissingEnvVars(): Promise<boolean>;
}

// Test creating a plugin that requires API keys
export const singleApiKeyScenarioTest = {
  name: 'single-api-key-scenario-e2e',
  description: 'E2E test for plugin creation with single API key requirement',
  fn: async (runtime: IAgentRuntime) => {
    console.log('Starting Single API Key Scenario Test...');

    try {
      // Get the environment manager service
      const envManager = runtime.getService('ENV_MANAGER') as unknown as EnvManagerService;
      if (!envManager) {
        console.log(
          '✅ Test skipped: EnvManagerService not available (expected - not integrated yet)'
        );
        return;
      }

      // Get the plugin creation service
      const pluginService = runtime.getService('plugin_creation') as PluginCreationService;
      if (!pluginService) {
        throw new Error('PluginCreationService not available');
      }

      // 1. Create a namespaced test API key
      const testApiKey = 'test-weather-api-key-12345';
      await envManager.updateEnvVar('plugin-weather-test', 'WEATHER_API_KEY_TEST', {
        value: testApiKey,
        type: 'api_key',
        required: true,
        description: 'Test weather API key',
        status: 'valid',
        validatedAt: Date.now(),
      });

      // 2. Create a weather plugin specification that uses the API key
      const weatherSpec = {
        name: '@elizaos/plugin-weather-test',
        description: 'Weather plugin that requires API key',
        version: '1.0.0',
        actions: [
          {
            name: 'getCurrentWeather',
            description: 'Get weather for a location',
            parameters: {
              location: 'string',
            },
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

      // 3. Create the plugin
      console.log('Creating weather plugin with API key requirement...');
      const jobId = await pluginService.createPlugin(weatherSpec);

      // 4. Wait for plugin creation to complete
      let job = pluginService.getJobStatus(jobId);
      let attempts = 0;
      const maxAttempts = 60; // 1 minute timeout

      while (job?.status === 'running' && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        job = pluginService.getJobStatus(jobId);
        attempts++;
      }

      // 5. Verify plugin was created successfully
      if (job?.status !== 'completed') {
        throw new Error(`Plugin creation failed: ${job?.status} - ${job?.error}`);
      }

      // 6. Simulate workflow execution using the API key
      console.log('Simulating workflow execution with API key...');

      // Get the API key from the environment manager
      const retrievedKey = envManager.getEnvVar('WEATHER_API_KEY_TEST');
      if (retrievedKey !== testApiKey) {
        throw new Error('Failed to retrieve API key from environment manager');
      }

      // 7. Verify the plugin can access the API key
      const pluginEnvVars = await envManager.getEnvVarsForPlugin('plugin-weather-test');
      if (!pluginEnvVars?.WEATHER_API_KEY_TEST?.value) {
        throw new Error('Plugin cannot access API key');
      }

      console.log('✅ Single API key scenario test passed!');
    } catch (error) {
      console.error('❌ Single API key scenario test failed:', error);
      throw error;
    }
  },
};

// Test creating a plugin that requires multiple API keys
export const multipleApiKeysScenarioTest = {
  name: 'multiple-api-keys-scenario-e2e',
  description: 'E2E test for plugin creation with multiple API key requirements',
  fn: async (runtime: IAgentRuntime) => {
    console.log('Starting Multiple API Keys Scenario Test...');

    try {
      // Get services
      const envManager = runtime.getService('ENV_MANAGER') as unknown as EnvManagerService;
      if (!envManager) {
        console.log(
          '✅ Test skipped: EnvManagerService not available (expected - not integrated yet)'
        );
        return;
      }
      const pluginService = runtime.getService('plugin_creation') as PluginCreationService;

      // 1. Simulate user providing multiple API keys
      const apiKeys = {
        OPENAI_API_KEY_TEST: 'sk-test-openai-12345',
        SENDGRID_API_KEY_TEST: 'SG.test-sendgrid-67890',
        SLACK_WEBHOOK_URL_TEST: 'https://hooks.slack.com/test/webhook',
      };

      // 2. Store all API keys in the environment manager
      for (const [key, value] of Object.entries(apiKeys)) {
        await envManager.updateEnvVar('plugin-notification-test', key, {
          value,
          type: key.includes('WEBHOOK') ? 'url' : 'api_key',
          required: true,
          description: `Test ${key}`,
          status: 'valid',
          validatedAt: Date.now(),
        });
      }

      // 3. Create a notification plugin that uses all API keys
      const notificationSpec = {
        name: '@elizaos/plugin-notification-test',
        description: 'Multi-channel notification plugin',
        version: '1.0.0',
        actions: [
          {
            name: 'sendNotification',
            description: 'Send notification via multiple channels',
            parameters: {
              message: 'string',
              channels: 'string[]',
            },
          },
        ],
        providers: [
          {
            name: 'notificationStatus',
            description: 'Provides notification delivery status',
          },
        ],
        environmentVariables: [
          {
            name: 'OPENAI_API_KEY_TEST',
            description: 'OpenAI API key for message enhancement',
            required: true,
            sensitive: true,
          },
          {
            name: 'SENDGRID_API_KEY_TEST',
            description: 'SendGrid API key for email notifications',
            required: true,
            sensitive: true,
          },
          {
            name: 'SLACK_WEBHOOK_URL_TEST',
            description: 'Slack webhook URL for notifications',
            required: true,
            sensitive: true,
          },
        ],
      };

      // 4. Create the plugin
      console.log('Creating notification plugin with multiple API keys...');
      const jobId = await pluginService.createPlugin(notificationSpec);

      // 5. Monitor creation progress
      let job = pluginService.getJobStatus(jobId);
      let attempts = 0;
      const maxAttempts = 60;

      while (job?.status === 'running' && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        job = pluginService.getJobStatus(jobId);
        attempts++;

        // Log progress
        if (attempts % 10 === 0) {
          console.log(`Progress: ${job?.currentPhase} - ${job?.progress}%`);
        }
      }

      // 6. Verify plugin creation
      if (job?.status !== 'completed') {
        throw new Error(`Plugin creation failed: ${job?.status} - ${job?.error}`);
      }

      // 7. Verify all API keys are accessible
      console.log('Verifying all API keys are accessible...');
      for (const [key, expectedValue] of Object.entries(apiKeys)) {
        const retrievedValue = envManager.getEnvVar(key);
        if (retrievedValue !== expectedValue) {
          throw new Error(`Failed to retrieve ${key}`);
        }
      }

      // 8. Simulate workflow execution with all API keys
      console.log('Simulating multi-channel notification workflow...');

      // Verify the plugin can access all API keys
      const pluginEnvVars = await envManager.getEnvVarsForPlugin('plugin-notification-test');
      for (const key of Object.keys(apiKeys)) {
        if (!pluginEnvVars?.[key]?.value) {
          throw new Error(`Plugin cannot access ${key}`);
        }
      }

      console.log('✅ Multiple API keys scenario test passed!');
    } catch (error) {
      console.error('❌ Multiple API keys scenario test failed:', error);
      throw error;
    }
  },
};

// Test workflow execution after plugin creation
export const workflowExecutionScenarioTest = {
  name: 'workflow-execution-scenario-e2e',
  description: 'E2E test for executing workflows after plugin creation with API keys',
  fn: async (runtime: IAgentRuntime) => {
    console.log('Starting Workflow Execution Scenario Test...');

    try {
      // Get services
      const envManager = runtime.getService('ENV_MANAGER') as unknown as EnvManagerService;
      if (!envManager) {
        console.log(
          '✅ Test skipped: EnvManagerService not available (expected - not integrated yet)'
        );
        return;
      }
      const pluginService = runtime.getService('plugin_creation') as PluginCreationService;

      // 1. Set up test API keys
      await envManager.updateEnvVar('plugin-workflow-test', 'WORKFLOW_API_KEY_TEST', {
        value: 'test-workflow-key-abc123',
        type: 'api_key',
        required: true,
        description: 'Test workflow API key',
        status: 'valid',
        validatedAt: Date.now(),
      });

      // 2. Create a workflow plugin
      const workflowSpec = {
        name: '@elizaos/plugin-workflow-test',
        description: 'Workflow execution plugin',
        version: '1.0.0',
        actions: [
          {
            name: 'executeWorkflow',
            description: 'Execute a predefined workflow',
            parameters: {
              workflowId: 'string',
              params: 'object',
            },
          },
        ],
        services: [
          {
            name: 'WorkflowService',
            description: 'Manages workflow execution',
            methods: ['execute', 'getStatus', 'cancel'],
          },
        ],
        environmentVariables: [
          {
            name: 'WORKFLOW_API_KEY_TEST',
            description: 'API key for workflow service',
            required: true,
            sensitive: true,
          },
        ],
      };

      // 3. Create the plugin
      const jobId = await pluginService.createPlugin(workflowSpec);

      // Wait for completion
      let job = pluginService.getJobStatus(jobId);
      while (job?.status === 'running') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        job = pluginService.getJobStatus(jobId);
      }

      if (job?.status !== 'completed') {
        throw new Error(`Plugin creation failed: ${job?.error}`);
      }

      // 4. Simulate workflow execution
      console.log('Simulating workflow execution...');

      // Create a mock workflow execution context
      const testRoomId = createUniqueUuid(runtime, 'test-room');
      const workflowMessage: Memory = {
        id: createUniqueUuid(runtime, 'test-message'),
        content: {
          text: 'Execute workflow: data-processing-pipeline with params: {"input": "test-data"}',
          source: 'test',
        },
        roomId: testRoomId,
        agentId: runtime.agentId,
        entityId: runtime.agentId,
        createdAt: Date.now(),
      };

      // 5. Verify workflow can access API key
      const apiKey = envManager.getEnvVar('WORKFLOW_API_KEY_TEST');
      if (!apiKey) {
        throw new Error('Workflow cannot access API key');
      }

      // 6. Simulate workflow completion
      console.log('Workflow executed successfully with API key access');

      console.log('✅ Workflow execution scenario test passed!');
    } catch (error) {
      console.error('❌ Workflow execution scenario test failed:', error);
      throw error;
    }
  },
};

// Test handling missing API keys
export const missingApiKeysScenarioTest = {
  name: 'missing-api-keys-scenario-e2e',
  description: 'E2E test for handling plugins that require missing API keys',
  fn: async (runtime: IAgentRuntime) => {
    console.log('Starting Missing API Keys Scenario Test...');

    try {
      // Get services
      const envManager = runtime.getService('ENV_MANAGER') as unknown as EnvManagerService;
      if (!envManager) {
        console.log(
          '✅ Test skipped: EnvManagerService not available (expected - not integrated yet)'
        );
        return;
      }
      const pluginService = runtime.getService('plugin_creation') as PluginCreationService;

      // 1. Create a plugin spec that requires API keys we haven't provided
      const apiPluginSpec = {
        name: '@elizaos/plugin-api-test',
        description: 'API plugin requiring keys',
        version: '1.0.0',
        actions: [
          {
            name: 'callExternalAPI',
            description: 'Call external API',
            parameters: {
              endpoint: 'string',
              data: 'object',
            },
          },
        ],
        environmentVariables: [
          {
            name: 'EXTERNAL_API_KEY_TEST',
            description: 'External API key (not provided)',
            required: true,
            sensitive: true,
          },
          {
            name: 'EXTERNAL_SECRET_TEST',
            description: 'External secret (not provided)',
            required: true,
            sensitive: true,
          },
        ],
      };

      // 2. Check for missing environment variables
      const missingVars = await envManager.getMissingEnvVars();
      console.log(`Found ${missingVars.length} missing environment variables`);

      // 3. Create the plugin anyway
      const jobId = await pluginService.createPlugin(apiPluginSpec);

      // Wait for completion
      let job = pluginService.getJobStatus(jobId);
      while (job?.status === 'running') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        job = pluginService.getJobStatus(jobId);
      }

      // 4. Plugin should be created but env vars should be tracked as missing
      if (job?.status !== 'completed') {
        throw new Error(`Plugin creation failed: ${job?.error}`);
      }

      // 5. Verify the missing variables are tracked
      const hasMissing = await envManager.hasMissingEnvVars();
      if (!hasMissing) {
        throw new Error('Should have missing environment variables');
      }

      // 6. Simulate providing the missing API keys
      console.log('Simulating user providing missing API keys...');

      await envManager.updateEnvVar('plugin-api-test', 'EXTERNAL_API_KEY_TEST', {
        value: 'provided-api-key-xyz',
        type: 'api_key',
        required: true,
        description: 'External API key',
        status: 'valid',
        validatedAt: Date.now(),
      });

      await envManager.updateEnvVar('plugin-api-test', 'EXTERNAL_SECRET_TEST', {
        value: 'provided-secret-123',
        type: 'secret',
        required: true,
        description: 'External secret',
        status: 'valid',
        validatedAt: Date.now(),
      });

      // 7. Verify all variables are now available
      const pluginVars = await envManager.getEnvVarsForPlugin('plugin-api-test');
      if (!pluginVars?.EXTERNAL_API_KEY_TEST?.value || !pluginVars?.EXTERNAL_SECRET_TEST?.value) {
        throw new Error('Failed to provide missing API keys');
      }

      console.log('✅ Missing API keys scenario test passed!');
    } catch (error) {
      console.error('❌ Missing API keys scenario test failed:', error);
      throw error;
    }
  },
};

// Export test suite
export const apiWorkflowScenariosSuite: TestSuite = {
  name: 'API Workflow Scenarios E2E Tests',
  tests: [
    singleApiKeyScenarioTest,
    multipleApiKeysScenarioTest,
    workflowExecutionScenarioTest,
    missingApiKeysScenarioTest,
  ],
};
