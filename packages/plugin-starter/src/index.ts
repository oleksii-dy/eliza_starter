import type { Plugin } from '@elizaos/core';
import {
  type Action,
  type Content,
  type GenerateTextParams,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type Provider,
  type ProviderResult,
  Service,
  type State,
  logger,
  instrument,
} from '@elizaos/core';
import { z } from 'zod';

/**
 * Defines the configuration schema for a plugin, including the validation rules for the plugin name.
 *
 * @type {import('zod').ZodObject<{ EXAMPLE_PLUGIN_VARIABLE: import('zod').ZodString }>}
 */
const configSchema = z.object({
  EXAMPLE_PLUGIN_VARIABLE: z
    .string()
    .min(1, 'Example plugin variable is not provided')
    .optional()
    .transform((val) => {
      if (!val) {
        logger.warn('Example plugin variable is not provided (this is expected)');
      }
      return val;
    }),
});

/**
 * Example HelloWorld action
 * This demonstrates the simplest possible action structure
 */
/**
 * Action representing a hello world message.
 * @typedef {Object} Action
 * @property {string} name - The name of the action.
 * @property {string[]} similes - An array of related actions.
 * @property {string} description - A brief description of the action.
 * @property {Function} validate - Asynchronous function to validate the action.
 * @property {Function} handler - Asynchronous function to handle the action and generate a response.
 * @property {Object[]} examples - An array of example inputs and expected outputs for the action.
 */
const helloWorldAction: Action = {
  name: 'HELLO_WORLD',
  similes: ['GREET', 'SAY_HELLO'],
  description: 'Responds with a simple hello world message',

  validate: async (_runtime: IAgentRuntime, _message: Memory, _state: State): Promise<boolean> => {
    // Always valid
    instrument.logEvent({
      stage: 'action',
      subStage: 'validate',
      event: 'hello_world_validate',
      data: {
        actionName: 'HELLO_WORLD',
        messageId: _message.id,
      },
    });
    return true;
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ) => {
    try {
      logger.info('Handling HELLO_WORLD action');

      instrument.logEvent({
        stage: 'action',
        subStage: 'handler',
        event: 'hello_world_handler_start',
        data: {
          actionName: 'HELLO_WORLD',
          messageId: message.id,
        },
      });

      // Simple response content
      const responseContent: Content = {
        text: 'hello world!',
        actions: ['HELLO_WORLD'],
        source: message.content.source,
      };

      // Call back with the hello world message
      await callback(responseContent);

      instrument.logEvent({
        stage: 'action',
        subStage: 'handler',
        event: 'hello_world_handler_complete',
        data: {
          actionName: 'HELLO_WORLD',
          messageId: message.id,
        },
      });

      return responseContent;
    } catch (error) {
      instrument.logEvent({
        stage: 'action',
        subStage: 'handler',
        event: 'hello_world_handler_error',
        data: {
          actionName: 'HELLO_WORLD',
          messageId: message.id,
          error: error.message,
        },
      });

      logger.error('Error in HELLO_WORLD action:', error);
      throw error;
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Can you say hello?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'hello world!',
          actions: ['HELLO_WORLD'],
        },
      },
    ],
  ],
};

/**
 * Example Hello World Provider
 * This demonstrates the simplest possible provider implementation
 */
const helloWorldProvider: Provider = {
  name: 'HELLO_WORLD_PROVIDER',
  description: 'A simple example provider',

  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    instrument.logEvent({
      stage: 'provider',
      subStage: 'get',
      event: 'hello_world_provider_get',
      data: {
        providerName: 'HELLO_WORLD_PROVIDER',
        messageId: _message.id,
      },
    });

    return {
      text: 'I am a provider',
      values: {},
      data: {},
    };
  },
};

export class StarterService extends Service {
  static serviceType = 'starter';
  capabilityDescription =
    'This is a starter service which is attached to the agent through the starter plugin.';
  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime) {
    logger.info(`*** Starting starter service - MODIFIED: ${new Date().toISOString()} ***`);

    instrument.logEvent({
      stage: 'service',
      subStage: 'start',
      event: 'starter_service_start',
      data: {
        serviceType: StarterService.serviceType,
        timestamp: new Date().toISOString(),
      },
    });

    const service = new StarterService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('*** TESTING DEV MODE - STOP MESSAGE CHANGED! ***');

    instrument.logEvent({
      stage: 'service',
      subStage: 'stop',
      event: 'starter_service_stop',
      data: {
        serviceType: StarterService.serviceType,
        timestamp: new Date().toISOString(),
      },
    });

    // get the service from the runtime
    const service = runtime.getService(StarterService.serviceType);
    if (!service) {
      throw new Error('Starter service not found');
    }
    service.stop();
  }

  async stop() {
    logger.info('*** THIRD CHANGE - TESTING FILE WATCHING! ***');

    instrument.logEvent({
      stage: 'service',
      subStage: 'instance_stop',
      event: 'starter_service_instance_stop',
      data: {
        serviceType: StarterService.serviceType,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

export const starterPlugin: Plugin = {
  name: 'plugin-starter',
  description: 'Plugin starter for elizaOS',
  config: {
    EXAMPLE_PLUGIN_VARIABLE: process.env.EXAMPLE_PLUGIN_VARIABLE,
  },
  async init(config: Record<string, string>) {
    logger.info('*** TESTING DEV MODE - PLUGIN MODIFIED AND RELOADED! ***');

    instrument.logEvent({
      stage: 'plugin',
      subStage: 'init',
      event: 'starter_plugin_init',
      data: {
        pluginName: 'plugin-starter',
        timestamp: new Date().toISOString(),
      },
    });

    try {
      const validatedConfig = await configSchema.parseAsync(config);

      // Set all environment variables at once
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value) process.env[key] = value;
      }

      instrument.logEvent({
        stage: 'plugin',
        subStage: 'init',
        event: 'starter_plugin_init_success',
        data: {
          pluginName: 'plugin-starter',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      instrument.logEvent({
        stage: 'plugin',
        subStage: 'init',
        event: 'starter_plugin_init_error',
        data: {
          pluginName: 'plugin-starter',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
      });

      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid plugin configuration: ${error.errors.map((e) => e.message).join(', ')}`
        );
      }
      throw error;
    }
  },
  models: {
    [ModelType.TEXT_SMALL]: async (
      _runtime,
      { prompt, stopSequences = [] }: GenerateTextParams
    ) => {
      return 'Never gonna give you up, never gonna let you down, never gonna run around and desert you...';
    },
    [ModelType.TEXT_LARGE]: async (
      _runtime,
      {
        prompt,
        stopSequences = [],
        maxTokens = 8192,
        temperature = 0.7,
        frequencyPenalty = 0.7,
        presencePenalty = 0.7,
      }: GenerateTextParams
    ) => {
      return 'Never gonna make you cry, never gonna say goodbye, never gonna tell a lie and hurt you...';
    },
  },
  tests: [
    {
      name: 'plugin_starter_test_suite',
      tests: [
        {
          name: 'example_test',
          fn: async (runtime) => {
            logger.debug('example_test run by ', runtime.character.name);
            // Add a proper assertion that will pass
            if (runtime.character.name !== 'Eliza') {
              throw new Error(
                `Expected character name to be "Eliza" but got "${runtime.character.name}"`
              );
            }
            // Verify the plugin is loaded properly
            const service = runtime.getService('starter');
            if (!service) {
              throw new Error('Starter service not found');
            }
            // Don't return anything to match the void return type
          },
        },
        {
          name: 'should_have_hello_world_action',
          fn: async (runtime) => {
            // Check if the hello world action is registered
            // Look for the action in our plugin's actions
            // The actual action name in this plugin is "helloWorld", not "hello"
            const actionExists = starterPlugin.actions.some((a) => a.name === 'HELLO_WORLD');
            if (!actionExists) {
              throw new Error('Hello world action not found in plugin');
            }
          },
        },
      ],
    },
  ],
  routes: [
    {
      path: '/helloworld',
      type: 'GET',
      handler: async (_req: any, res: any) => {
        // send a response
        res.json({
          message: 'Hello World!',
        });
      },
    },
  ],
  events: {
    MESSAGE_RECEIVED: [
      async (params) => {
        logger.debug('MESSAGE_RECEIVED event received');
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
    VOICE_MESSAGE_RECEIVED: [
      async (params) => {
        logger.debug('VOICE_MESSAGE_RECEIVED event received');
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
    WORLD_CONNECTED: [
      async (params) => {
        logger.debug('WORLD_CONNECTED event received');
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
    WORLD_JOINED: [
      async (params) => {
        logger.debug('WORLD_JOINED event received');
        // print the keys
        logger.debug(Object.keys(params));
      },
    ],
  },
  services: [StarterService],
  actions: [helloWorldAction],
  providers: [helloWorldProvider],
};

export default starterPlugin;