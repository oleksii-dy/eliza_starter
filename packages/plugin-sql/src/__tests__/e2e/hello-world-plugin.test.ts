import { logger } from '@elizaos/core';
import helloWorldPlugin from '../../plugins/hello-world';

// Define TestSuite interface
interface TestSuite {
  name: string;
  description?: string;
  tests: Array<{
    name: string;
    fn: (runtime: any) => Promise<void> | void;
  }>;
}

export class HelloWorldPluginTestSuite implements TestSuite {
  name = 'hello-world-plugin-e2e';
  description = 'End-to-end tests for hello world plugin with real runtime';

  tests = [
    {
      name: 'Plugin should register with runtime successfully',
      fn: async (runtime: any) => {
        // Verify runtime has database
        if (!runtime.db) {
          throw new Error('Runtime does not have database adapter');
        }

        // Register the plugin
        await runtime.registerPlugin(helloWorldPlugin);

        // Verify actions were registered
        const createAction = runtime.actions.find((a: any) => a.name === 'CREATE_HELLO_WORLD');
        const listAction = runtime.actions.find((a: any) => a.name === 'LIST_HELLO_WORLDS');
        const greetingAction = runtime.actions.find((a: any) => a.name === 'CREATE_GREETING');

        if (!createAction) {
          throw new Error('CREATE_HELLO_WORLD action not registered');
        }
        if (!listAction) {
          throw new Error('LIST_HELLO_WORLDS action not registered');
        }
        if (!greetingAction) {
          throw new Error('CREATE_GREETING action not registered');
        }

        // Verify provider was registered
        const provider = runtime.providers.find((p: any) => p.name === 'helloWorldContext');
        if (!provider) {
          throw new Error('helloWorldContext provider not registered');
        }

        logger.info('✅ Plugin registered successfully with all components');
      },
    },

    {
      name: 'CREATE_HELLO_WORLD action should work through runtime',
      fn: async (runtime: any) => {
        // Create a test message
        const testMessage = {
          id: `test-msg-${Date.now()}`,
          entityId: 'test-user',
          agentId: runtime.agentId,
          roomId: `test-room-${Date.now()}`,
          content: {
            text: 'Create a hello world message saying "Testing with real runtime!"',
            type: 'text',
          },
          createdAt: Date.now(),
        };

        // Process the message through runtime
        await runtime.processMessage(testMessage);

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify the agent responded
        const messages = await runtime.messageManager.getMessages({
          roomId: testMessage.roomId,
          limit: 10,
        });

        const agentResponse = messages.find((m: any) => 
          m.userId === runtime.agentId && 
          m.id !== testMessage.id
        );

        if (!agentResponse) {
          throw new Error('Agent did not respond to CREATE_HELLO_WORLD request');
        }

        // Check if response indicates success
        const responseText = agentResponse.content.text || '';
        if (!responseText.includes('Created hello world message') && !responseText.includes('✅')) {
          throw new Error(`Unexpected response: ${responseText}`);
        }

        logger.info('✅ CREATE_HELLO_WORLD action executed successfully through runtime');
      },
    },

    {
      name: 'LIST_HELLO_WORLDS action should retrieve created entries',
      fn: async (runtime: any) => {
        // First create some entries
        const createMessage = {
          id: `test-create-${Date.now()}`,
          entityId: 'test-user',
          agentId: runtime.agentId,
          roomId: `test-room-list-${Date.now()}`,
          content: {
            text: 'Create a hello world message saying "Entry for listing test"',
            type: 'text',
          },
          createdAt: Date.now(),
        };

        await runtime.processMessage(createMessage);
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Now request the list
        const listMessage = {
          id: `test-list-${Date.now()}`,
          entityId: 'test-user',
          agentId: runtime.agentId,
          roomId: createMessage.roomId,
          content: {
            text: 'List all hello world messages',
            type: 'text',
          },
          createdAt: Date.now() + 1000,
        };

        await runtime.processMessage(listMessage);
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Get all messages
        const messages = await runtime.messageManager.getMessages({
          roomId: createMessage.roomId,
          limit: 20,
        });

        // Find the list response
        const listResponse = messages.find((m: any) => 
          m.userId === runtime.agentId && 
          m.createdAt > listMessage.createdAt &&
          (m.content.text?.includes('Found') || m.content.text?.includes('hello world message'))
        );

        if (!listResponse) {
          throw new Error('Agent did not respond to LIST_HELLO_WORLDS request');
        }

        logger.info('✅ LIST_HELLO_WORLDS action executed successfully');
      },
    },

    {
      name: 'CREATE_GREETING action should handle multiple languages',
      fn: async (runtime: any) => {
        const roomId = `test-room-greetings-${Date.now()}`;
        const greetings = [
          { text: 'Create a greeting in Spanish saying "Hola Mundo"', expected: 'Spanish' },
          { text: 'Add a greeting "Bonjour le monde" in French', expected: 'French' },
          { text: 'Create greeting "Konnichiwa" in Japanese', expected: 'Japanese' },
        ];

        for (const greeting of greetings) {
          const message = {
            id: `test-greeting-${Date.now()}-${Math.random()}`,
            entityId: 'test-user',
            agentId: runtime.agentId,
            roomId: roomId,
            content: {
              text: greeting.text,
              type: 'text',
            },
            createdAt: Date.now(),
          };

          await runtime.processMessage(message);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Get all responses
        const messages = await runtime.messageManager.getMessages({
          roomId: roomId,
          limit: 20,
        });

        const agentResponses = messages.filter((m: any) => m.userId === runtime.agentId);

        // Verify we got responses for each greeting
        if (agentResponses.length < greetings.length) {
          throw new Error(`Expected ${greetings.length} responses, got ${agentResponses.length}`);
        }

        // Check each response mentions the correct language
        for (const greeting of greetings) {
          const hasResponse = agentResponses.some((r: any) => 
            r.content.text?.includes(greeting.expected)
          );
          if (!hasResponse) {
            throw new Error(`No response found for ${greeting.expected} greeting`);
          }
        }

        logger.info('✅ CREATE_GREETING action handled multiple languages correctly');
      },
    },

    {
      name: 'Provider should provide context about created data',
      fn: async (runtime: any) => {
        // Get the provider
        const provider = runtime.providers.find((p: any) => p.name === 'helloWorldContext');
        if (!provider) {
          throw new Error('helloWorldContext provider not found');
        }

        // Call the provider
        const context = await provider.get(runtime, {
          content: { text: 'test' },
          entityId: 'test',
          roomId: 'test',
        });

        // Verify it returns valid context
        if (!context) {
          throw new Error('Provider returned no context');
        }

        if (!context.text) {
          throw new Error('Provider returned no text');
        }

        logger.info('Provider context:', context.text);
        logger.info('✅ Provider successfully provides context');
      },
    },

    {
      name: 'Tables should be created dynamically on first use',
      fn: async (runtime: any) => {
        // This test verifies that tables are created when first accessed
        // We'll use a unique message to ensure it's a fresh operation
        const uniqueMessage = `Dynamic table test ${Date.now()} ${Math.random()}`;
        
        const message = {
          id: `test-dynamic-${Date.now()}`,
          entityId: 'test-user',
          agentId: runtime.agentId,
          roomId: `test-room-dynamic-${Date.now()}`,
          content: {
            text: `Create a hello world message saying "${uniqueMessage}"`,
            type: 'text',
          },
          createdAt: Date.now(),
        };

        // Process message - this should trigger table creation if needed
        await runtime.processMessage(message);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify by listing messages
        const listMessage = {
          id: `test-list-dynamic-${Date.now()}`,
          entityId: 'test-user',
          agentId: runtime.agentId,
          roomId: message.roomId,
          content: {
            text: 'List all hello world messages',
            type: 'text',
          },
          createdAt: Date.now() + 1000,
        };

        await runtime.processMessage(listMessage);
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Get messages to verify
        const messages = await runtime.messageManager.getMessages({
          roomId: message.roomId,
          limit: 20,
        });

        const hasUniqueMessage = messages.some((m: any) => 
          m.content.text?.includes(uniqueMessage)
        );

        if (!hasUniqueMessage) {
          throw new Error('Dynamic table creation may have failed - unique message not found');
        }

        logger.info('✅ Tables created dynamically and data persisted correctly');
      },
    },
  ];
}

export default new HelloWorldPluginTestSuite(); 