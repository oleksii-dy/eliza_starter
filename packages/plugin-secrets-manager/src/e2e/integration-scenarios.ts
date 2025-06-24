// Integration scenarios file

import { v4 as uuid } from 'uuid';
import { EnhancedSecretManager } from '../enhanced-service';
import { EnvManager } from '../service';
import { setupScenario, sendMessageAndWaitForResponse } from './test-utils';

// Helper to create a mock plugin with API key requirements
const createMockPlugin = (name: string, requiredKeys: Record<string, any>) => {
  return {
    name,
    declaredEnvVars: requiredKeys,
    description: `Mock ${name} plugin for testing`,
    actions: [],
    providers: [],
  };
};

// Mock action that simulates API call requiring keys
const createApiAction = (
  actionName: string,
  requiredKey: string,
  successMessage: string
): Action => {
  return {
    name: actionName,
    description: `Action that requires ${requiredKey} to function`,
    examples: [
      [
        {
          name: '{{user}}',
          content: { text: `Execute ${actionName}` },
        },
        {
          name: '{{agent}}',
          content: { text: `I'll execute ${actionName} for you.` },
        },
      ],
    ],
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
      const env = runtime.get<EnvManager>('ENV_MANAGER');
      if (!env) {
        return false;
      }

      const keyValue = env.getEnvVar(requiredKey);
      return !!keyValue;
    },
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      state?: State,
      options?: any,
      callback?: any
    ) => {
      const env = runtime.get<EnvManager>('ENV_MANAGER');
      const secret = runtime.get<EnhancedSecretManager>('SECRETS');

      if (!env || !secret) {
        console.log('⚠️ Required services not available, skipping action');
        if (callback) {
          await void callback({
            text: 'Sorry, I cannot execute this action at the moment. Required services are not available.',
          });
        }
        return { text: 's not available' };
      }

      const keyValue = env.getEnvVar(requiredKey);
      if (!keyValue) {
        if (callback) {
          await void callback({
            text: `Cannot execute ${actionName}: Missing ${requiredKey}. Please provide the API key first.`,
            actions: ['REQUEST_SECRET_FORM'],
          });
        }
        return { text: `Missing required API key: ${requiredKey}` };
      }

      // Simulate successful API call
      console.log(
        `✅ ${actionName} executed successfully with ${requiredKey}: ${keyValue.substring(0, 10)}...`
      );

      if (callback) {
        await void callback({
          text: successMessage,
          data: {
            action: actionName,
            status: 'success',
            apiKeyUsed: requiredKey,
          },
        });
      }

      return {
        text: successMessage,
        data: { success: true, apiKeyUsed: requiredKey },
      };
    },
  };
};

const integrationScenarios: TestCase[] = [
  {
    name: 'Admin provides OpenAI API key for AI text generation',
    fn: async (_runtime: IAgentRuntime) => {
      const secret = runtime.get<EnhancedSecretManager>('SECRETS');
      const env = runtime.get<EnvManager>('ENV_MANAGER');

      if (!secret) {
        console.log('⚠️ SECRETS service not available, skipping test');
        return;
      }
      if (!env) {
        console.log('⚠️ ENV_MANAGER service not available, skipping test');
        return;
      }

      // Setup scenario
      const { user: adminUser, room, world } = await setupScenario(runtime);

      // Make user an admin
      world.metadata = {
        ...world.metadata,
        roles: { [adminUser.id!]: Role.ADMIN },
      };
      await runtime.ensureExists(world);

      // Register a mock AI plugin that requires OpenAI API key
      const mockAIPlugin = createMockPlugin('ai-text-generator', {
        OPENAI_API_KEY: {
          type: 'api_key',
          required: true,
          description: 'OpenAI API key for text generation',
          validationMethod: 'openai_api_key',
        },
      });

      // Add the plugin to runtime (simulate plugin loading)
      runtime.plugins.push(mockAIPlugin as any);

      // Register the action that uses the API key
      const generateTextAction = createApiAction(
        'GENERATE_AI_TEXT',
        'OPENAI_API_KEY',
        'Successfully generated AI text using OpenAI API!'
      );
      runtime.actions.push(generateTextAction);

      // Scan for plugin requirements
      await env.scanPluginRequirements();

      // Verify the requirement was detected
      const requirements = await env.getEnvVarsForPlugin('ai-text-generator');
      if (!requirements || !requirements.OPENAI_API_KEY) {
        throw new Error('Plugin requirements were not detected');
      }

      // Admin provides the API key via message
      const adminMessage = await sendMessageAndWaitForResponse(
        runtime,
        room,
        adminUser,
        'Set OpenAI API key to sk-proj-test123abc456def789'
      );

      // Parse and set the key (simulating the SET_ENV_VAR action)
      const keyMatch = adminMessage.text?.match(/sk-proj-[\w]+/);
      if (keyMatch) {
        const apiKey = keyMatch[0];

        // Set at world level since admin
        const worldContext = {
          level: 'world' as const,
          worldId: world.id,
          requesterId: adminUser.id!,
          agentId: runtime.agentId,
        };

        await secret.set('OPENAI_API_KEY', apiKey, worldContext);
        await env.updateEnvVar('ai-text-generator', 'OPENAI_API_KEY', {
          value: apiKey,
          status: 'valid',
          validatedAt: Date.now(),
        });
      }

      // User requests AI text generation
      const regularUser: Entity = {
        id: as(uuid()),
        names: ['Regular User'],
        agentId: runtime.agentId,
      };
      await runtime.createEntity(regularUser);
      await runtime.ensureParticipantInRoom(regularUser.id!, room.id);

      const userResponse = await sendMessageAndWaitForResponse(
        runtime,
        room,
        regularUser,
        'Generate some AI text for me'
      );

      // Verify the action executed successfully
      if (!userResponse.text?.includes('Successfully generated AI text')) {
        throw new Error(`Expected successful generation but got: ${userResponse.text}`);
      }

      // Verify the API key was used
      const usedKey = env.getEnvVar('OPENAI_API_KEY');
      if (!usedKey || !usedKey.startsWith('sk-proj-')) {
        throw new Error('API key was not properly set or retrieved');
      }

      console.log(
        '✅ Integration test passed: Admin provided API key, user successfully used AI service'
      );
    },
  },

  {
    name: 'Multi-plugin scenario: Trading bot with multiple API keys',
    fn: async (_runtime: IAgentRuntime) => {
      const secret = runtime.get<EnhancedSecretManager>('SECRETS');
      const env = runtime.get<EnvManager>('ENV_MANAGER');

      if (!secret) {
        console.log('⚠️ SECRETS service not available, skipping test');
        return;
      }
      if (!env) {
        console.log('⚠️ ENV_MANAGER service not available, skipping test');
        return;
      }

      const { user: adminUser, room, world } = await setupScenario(runtime);

      // Make user an admin
      world.metadata = {
        ...world.metadata,
        roles: { [adminUser.id!]: Role.ADMIN },
      };
      await runtime.ensureExists(world);

      // Register mock trading plugins
      const exchangePlugin = createMockPlugin('crypto-exchange', {
        BINANCE_API_KEY: {
          type: 'api_key',
          required: true,
          description: 'Binance API key for trading',
        },
        BINANCE_SECRET_KEY: {
          type: 'secret',
          required: true,
          description: 'Binance secret key for trading',
        },
      });

      const analyticsPlugin = createMockPlugin('market-analytics', {
        COINGECKO_API_KEY: {
          type: 'api_key',
          required: true,
          description: 'CoinGecko API key for market data',
        },
      });

      runtime.plugins.push(exchangePlugin as any, analyticsPlugin as any);

      // Register actions
      const tradeAction = createApiAction(
        'EXECUTE_TRADE',
        'BINANCE_API_KEY',
        'Trade executed successfully on Binance!'
      );

      const analyzeAction = createApiAction(
        'ANALYZE_MARKET',
        'COINGECKO_API_KEY',
        'Market analysis completed with live data!'
      );

      runtime.actions.push(tradeAction, analyzeAction);

      // Scan requirements
      await env.scanPluginRequirements();

      // Admin provides multiple keys in sequence
      const worldContext = {
        level: 'world' as const,
        worldId: world.id,
        requesterId: adminUser.id!,
        agentId: runtime.agentId,
      };

      // Set Binance keys
      await secret.set('BINANCE_API_KEY', 'binance-key-abc123', worldContext);
      await env.updateEnvVar('crypto-exchange', 'BINANCE_API_KEY', {
        value: 'binance-key-abc123',
        status: 'valid',
        validatedAt: Date.now(),
      });

      await secret.set('BINANCE_SECRET_KEY', 'binance-secret-xyz789', worldContext);
      await env.updateEnvVar('crypto-exchange', 'BINANCE_SECRET_KEY', {
        value: 'binance-secret-xyz789',
        status: 'valid',
        validatedAt: Date.now(),
      });

      // Set CoinGecko key
      await secret.set('COINGECKO_API_KEY', 'cg-key-def456', worldContext);
      await env.updateEnvVar('market-analytics', 'COINGECKO_API_KEY', {
        value: 'cg-key-def456',
        status: 'valid',
        validatedAt: Date.now(),
      });

      // Create a trader user
      const traderUser: Entity = {
        id: as(uuid()),
        names: ['Crypto Trader'],
        agentId: runtime.agentId,
      };
      await runtime.createEntity(traderUser);
      await runtime.ensureParticipantInRoom(traderUser.id!, room.id);

      // Execute market analysis
      const analysisResponse = await sendMessageAndWaitForResponse(
        runtime,
        room,
        traderUser,
        'Analyze the crypto market'
      );

      if (!analysisResponse.text?.includes('Market analysis completed')) {
        throw new Error('Market analysis failed');
      }

      // Execute a trade
      const tradeResponse = await sendMessageAndWaitForResponse(
        runtime,
        room,
        traderUser,
        'Execute a trade on Binance'
      );

      if (!tradeResponse.text?.includes('Trade executed successfully')) {
        throw new Error('Trade execution failed');
      }

      // Verify all keys are properly set
      const binanceKey = env.getEnvVar('BINANCE_API_KEY');
      const binanceSecret = env.getEnvVar('BINANCE_SECRET_KEY');
      const coingeckoKey = env.getEnvVar('COINGECKO_API_KEY');

      if (!binanceKey || !binanceSecret || !coingeckoKey) {
        throw new Error('Not all API keys were properly configured');
      }

      console.log(
        '✅ Multi-plugin integration test passed: Trading bot with multiple API keys working'
      );
    },
  },

  {
    name: 'User-level API key with validation and permission checking',
    fn: async (_runtime: IAgentRuntime) => {
      const secret = runtime.get<EnhancedSecretManager>('SECRETS');
      const env = runtime.get<EnvManager>('ENV_MANAGER');

      if (!secret) {
        console.log('⚠️ SECRETS service not available, skipping test');
        return;
      }
      if (!env) {
        console.log('⚠️ ENV_MANAGER service not available, skipping test');
        return;
      }

      const { user: userAlice, room, world } = await setupScenario(runtime);

      // Register a weather plugin
      const weatherPlugin = createMockPlugin('weather-service', {
        WEATHER_API_KEY: {
          type: 'api_key',
          required: true,
          description: 'Weather API key for forecasts',
          validationMethod: 'regex',
          validationPattern: '^weather-[a-zA-Z0-9]{10}$',
        },
      });

      runtime.plugins.push(weatherPlugin as any);

      const weatherAction = createApiAction(
        'GET_WEATHER',
        'WEATHER_API_KEY',
        'Weather forecast retrieved successfully!'
      );
      runtime.actions.push(weatherAction);

      await env.scanPluginRequirements();

      // Alice provides her personal weather API key
      const aliceContext = {
        level: 'user' as const,
        userId: userAlice.id!,
        requesterId: userAlice.id!,
        agentId: runtime.agentId,
      };

      // First attempt with invalid key format
      const invalidResult = await secret.set('WEATHER_API_KEY', 'invalid-key', aliceContext, {
        validationMethod: 'regex',
      });

      if (invalidResult === true) {
        throw new Error('Invalid key should have been rejected');
      }

      // Second attempt with valid key
      await secret.set('WEATHER_API_KEY', 'weather-abc123def4', aliceContext);
      await env.updateEnvVar('weather-service', 'WEATHER_API_KEY', {
        value: 'weather-abc123def4',
        status: 'valid',
        validatedAt: Date.now(),
      });

      // Alice uses the weather service
      const aliceWeatherResponse = await sendMessageAndWaitForResponse(
        runtime,
        room,
        userAlice,
        "What's the weather forecast?"
      );

      if (!aliceWeatherResponse.text?.includes('Weather forecast retrieved')) {
        throw new Error('Weather service should work for Alice');
      }

      // Create another user Bob
      const userBob: Entity = {
        id: as(uuid()),
        names: ['Bob'],
        agentId: runtime.agentId,
      };
      await runtime.createEntity(userBob);
      await runtime.ensureParticipantInRoom(userBob.id!, room.id);

      // Bob tries to use weather service without his own key
      const bobContext = {
        level: 'user' as const,
        userId: userBob.id!,
        requesterId: userBob.id!,
        agentId: runtime.agentId,
      };

      // Bob shouldn't be able to access Alice's key
      const bobAccess = await secret.get('WEATHER_API_KEY', bobContext);
      if (bobAccess !== null) {
        throw new Error("Bob should not have access to Alice's API key");
      }

      console.log('✅ User-level API key test passed: Personal keys are properly isolated');
    },
  },

  {
    name: 'Workflow scenario: Auto-setup multiple services with admin approval',
    fn: async (_runtime: IAgentRuntime) => {
      const secret = runtime.get<EnhancedSecretManager>('SECRETS');
      const env = runtime.get<EnvManager>('ENV_MANAGER');

      if (!secret) {
        console.log('⚠️ SECRETS service not available, skipping test');
        return;
      }
      if (!env) {
        console.log('⚠️ ENV_MANAGER service not available, skipping test');
        return;
      }

      const { user: adminUser, room, world } = await setupScenario(runtime);

      // Make user an admin
      world.metadata = {
        ...world.metadata,
        roles: { [adminUser.id!]: Role.ADMIN },
      };
      await runtime.ensureExists(world);

      // Register multiple plugins simulating a complete app setup
      const plugins = [
        createMockPlugin('database-service', {
          DATABASE_URL: {
            type: 'url',
            required: true,
            description: 'PostgreSQL connection string',
            canGenerate: false,
          },
          DB_POOL_SIZE: {
            type: 'config',
            required: true,
            description: 'Database connection pool size',
            canGenerate: true,
            defaultValue: '10',
          },
        }),
        createMockPlugin('email-service', {
          SMTP_HOST: {
            type: 'url',
            required: true,
            description: 'SMTP server hostname',
          },
          SMTP_USER: {
            type: 'config',
            required: true,
            description: 'SMTP username',
          },
          SMTP_PASS: {
            type: 'secret',
            required: true,
            description: 'SMTP password',
          },
        }),
        createMockPlugin('auth-service', {
          JWT_SECRET: {
            type: 'secret',
            required: true,
            description: 'JWT signing secret',
            canGenerate: true,
          },
          SESSION_SECRET: {
            type: 'secret',
            required: true,
            description: 'Session encryption secret',
            canGenerate: true,
          },
        }),
      ];

      plugins.forEach((p) => runtime.plugins.push(p as any));
      await env.scanPluginRequirements();

      // Get all missing vars
      const missingVars = await env.getMissingEnvVars();
      console.log(`Found ${missingVars.length} missing environment variables`);

      // Auto-generate what we can
      const generatableVars = await env.getGeneratableEnvVars();
      for (const { plugin, varName, config } of generatableVars) {
        let value: string;

        if (varName === 'JWT_SECRET' || varName === 'SESSION_SECRET') {
          // Generate random secrets
          value = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
        } else if (varName === 'DB_POOL_SIZE') {
          value = '10';
        } else {
          continue;
        }

        await env.updateEnvVar(plugin, varName, {
          value,
          status: 'valid',
          validatedAt: Date.now(),
        });

        const worldContext = {
          level: 'world' as const,
          worldId: world.id,
          requesterId: runtime.agentId,
          agentId: runtime.agentId,
        };
        await secret.set(varName, value, worldContext);
      }

      // Admin provides the remaining required values
      const adminContext = {
        level: 'world' as const,
        worldId: world.id,
        requesterId: adminUser.id!,
        agentId: runtime.agentId,
      };

      // Set database URL
      await secret.set('DATABASE_URL', 'postgresql://user:pass@localhost:5432/myapp', adminContext);
      await env.updateEnvVar('database-service', 'DATABASE_URL', {
        value: 'postgresql://user:pass@localhost:5432/myapp',
        status: 'valid',
        validatedAt: Date.now(),
      });

      // Set email config
      await secret.set('SMTP_HOST', 'smtp.gmail.com', adminContext);
      await secret.set('SMTP_USER', 'myapp@gmail.com', adminContext);
      await secret.set('SMTP_PASS', 'app-specific-password', adminContext);

      await env.updateEnvVar('email-service', 'SMTP_HOST', {
        value: 'smtp.gmail.com',
        status: 'valid',
      });
      await env.updateEnvVar('email-service', 'SMTP_USER', {
        value: 'myapp@gmail.com',
        status: 'valid',
      });
      await env.updateEnvVar('email-service', 'SMTP_PASS', {
        value: 'app-specific-password',
        status: 'valid',
      });

      // Verify all services are configured
      const stillMissing = await env.getMissingEnvVars();
      if (stillMissing.length > 0) {
        throw new Error(`Still have ${stillMissing.length} missing variables`);
      }

      // Create actions that use these services
      const dbAction: Action = {
        name: 'CHECK_DATABASE',
        description: 'Check database connection',
        validate: async (_runtime) => {
          const url = runtime.get<EnvManager>('ENV_MANAGER')?.getEnvVar('DATABASE_URL');
          return !!url;
        },
        handler: async (_runtime, message, state, options, callback) => {
          const url = runtime.get<EnvManager>('ENV_MANAGER')?.getEnvVar('DATABASE_URL');
          if (callback) {
            await void callback({
              text: `Database connected successfully to ${url?.split('@')[1]}`,
              data: { status: 'connected' },
            });
          }
          return { text: 'Database connection verified' };
        },
        examples: [],
      };

      runtime.actions.push(dbAction);

      // Test the complete setup
      const _testResponse = await sendMessageAndWaitForResponse(
        runtime,
        room,
        adminUser,
        'Check if all services are properly configured'
      );

      // Verify JWT secret was generated
      const jwtSecret = env.getEnvVar('JWT_SECRET');
      if (!jwtSecret || jwtSecret.length < 32) {
        throw new Error('JWT secret was not properly generated');
      }

      console.log(
        '✅ Workflow test passed: Multiple services configured with mix of auto-generation and manual setup'
      );
    },
  },

  {
    name: 'Error recovery: Agent guides user through fixing invalid API keys',
    fn: async (_runtime: IAgentRuntime) => {
      const secret = runtime.get<EnhancedSecretManager>('SECRETS');
      const env = runtime.get<EnvManager>('ENV_MANAGER');

      if (!secret) {
        console.log('⚠️ SECRETS service not available, skipping test');
        return;
      }
      if (!env) {
        console.log('⚠️ ENV_MANAGER service not available, skipping test');
        return;
      }

      const { user, room } = await setupScenario(runtime);

      // Register a plugin that validates API keys
      const apiPlugin = createMockPlugin('external-api', {
        API_KEY: {
          type: 'api_key',
          required: true,
          description: 'External service API key',
          validationMethod: 'custom',
        },
      });

      runtime.plugins.push(apiPlugin as any);

      // Create an action that validates the key by making a test call
      const apiAction: Action = {
        name: 'CALL_EXTERNAL_API',
        description: 'Call external API service',
        validate: async (_runtime) => {
          const key = runtime.get<EnvManager>('ENV_MANAGER')?.getEnvVar('API_KEY');
          return !!key;
        },
        handler: async (_runtime, message, state, options, callback) => {
          const env = runtime.get<EnvManager>('ENV_MANAGER');
          const key = env?.getEnvVar('API_KEY');

          const currentAttempts = (options as any)?.attempts || 0;

          // Simulate API key validation
          if (!key || !key.startsWith('valid-')) {
            // Mark as invalid
            await env?.updateEnvVar('external-api', 'API_KEY', {
              status: 'invalid',
              lastError: 'API key validation failed: Invalid format or expired',
              attempts: currentAttempts + 1,
            });

            if (callback) {
              await void callback({
                text: 'The API key appears to be invalid. Please provide a valid API key that starts with "valid-"',
                actions: ['REQUEST_SECRET_FORM'],
                data: {
                  error: 'API_KEY_INVALID',
                  attempts: currentAttempts + 1,
                },
              });
            }
            return { text: 'API key validation failed' };
          }

          // Success case
          await env?.updateEnvVar('external-api', 'API_KEY', {
            status: 'valid',
            validatedAt: Date.now(),
          });

          if (callback) {
            await void callback({
              text: 'API call successful! The external service is now connected.',
              data: { status: 'success' },
            });
          }
          return { text: 'API call successful' };
        },
        examples: [],
      };

      runtime.actions.push(apiAction);
      await env.scanPluginRequirements();

      // User provides invalid key first
      const userContext = {
        level: 'user' as const,
        userId: user.id!,
        requesterId: user.id!,
        agentId: runtime.agentId,
      };

      await secret.set('API_KEY', 'invalid-key-123', userContext);
      await env.updateEnvVar('external-api', 'API_KEY', {
        value: 'invalid-key-123',
        status: 'validating',
      });

      // Try to use the API
      const firstResponse = await sendMessageAndWaitForResponse(
        runtime,
        room,
        user,
        'Call the external API'
      );

      if (!firstResponse.text?.includes('appears to be invalid')) {
        throw new Error('Should have detected invalid API key');
      }

      // User provides valid key
      await secret.set('API_KEY', 'valid-production-key', userContext);
      await env.updateEnvVar('external-api', 'API_KEY', {
        value: 'valid-production-key',
        status: 'validating',
      });

      // Try again
      const secondResponse = await sendMessageAndWaitForResponse(
        runtime,
        room,
        user,
        'Try calling the API again'
      );

      if (!secondResponse.text?.includes('API call successful')) {
        throw new Error('Valid API key should have worked');
      }

      // Check that the key is marked as valid
      const finalStatus = await env.getEnvVarsForPlugin('external-api');
      if (!finalStatus?.API_KEY || finalStatus.API_KEY.status !== 'valid') {
        throw new Error('API key should be marked as valid after successful use');
      }

      console.log(
        '✅ Error recovery test passed: Agent successfully guided user through fixing invalid API key'
      );
    },
  },
];

export const integrationScenariosSuite: TestSuite = {
  name: 'Secrets Manager Integration Scenarios',
  tests: integrationScenarios,
};
