import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDatabaseAdapter } from '../../index';
import { stringToUuid, logger } from '@elizaos/core';
import helloWorldPlugin from '../../plugins/hello-world';
import path from 'path';
import fs from 'fs/promises';

describe('Hello World Plugin Runtime Tests', () => {
  let dbAdapter: any;
  let db: any;
  let mockRuntime: any;
  const testDir = path.join(process.cwd(), '.test-db-hello-plugin');
  const agentId = stringToUuid('test-agent-hello-plugin');

  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });

    // Create database adapter
    dbAdapter = createDatabaseAdapter(
      {
        dataDir: testDir,
      },
      agentId
    );

    // Initialize the adapter which will create tables
    await dbAdapter.init();

    // Get the underlying database connection
    db = (dbAdapter as any).db;

    // Create mock runtime
    mockRuntime = {
      agentId: agentId,
      db: dbAdapter,
      actions: [],
      providers: [],
      plugins: [],
      getSetting: (key: string) => {
        const settings: Record<string, string> = {
          PGLITE_PATH: testDir,
        };
        return settings[key];
      },
      registerPlugin: async (plugin: any) => {
        // Initialize the plugin
        if (plugin.init) {
          await plugin.init({}, mockRuntime);
        }

        // Register actions
        if (plugin.actions) {
          mockRuntime.actions.push(...plugin.actions);
        }

        // Register providers
        if (plugin.providers) {
          mockRuntime.providers.push(...plugin.providers);
        }

        // Add to plugins list
        mockRuntime.plugins.push(plugin);
      },
      messageManager: {
        getMessages: async ({ roomId, limit }: any) => {
          // Simple mock implementation
          return [];
        },
      },
      processMessage: async (message: any) => {
        // Find matching action
        for (const action of mockRuntime.actions) {
          if (await action.validate(mockRuntime, message)) {
            const callback = async (response: any) => {
              logger.info('Action response:', response);
            };
            await action.handler(mockRuntime, message, {}, {}, callback);
            break;
          }
        }
      },
    };

    console.log('Test database initialized at:', testDir);
  });

  afterAll(async () => {
    // Clean up test database
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log('Test database cleaned up');
    } catch (error) {
      console.error('Failed to clean up test database:', error);
    }
  });

  describe('Plugin Registration', () => {
    it('should register plugin with runtime successfully', async () => {
      await mockRuntime.registerPlugin(helloWorldPlugin);

      expect(mockRuntime.plugins).toHaveLength(1);
      expect(mockRuntime.plugins[0].name).toBe('hello-world');
      expect(mockRuntime.actions).toHaveLength(3);
      expect(mockRuntime.providers).toHaveLength(1);
    });

    it('should have all expected actions', async () => {
      const actionNames = mockRuntime.actions.map((a: any) => a.name);
      expect(actionNames).toContain('CREATE_HELLO_WORLD');
      expect(actionNames).toContain('LIST_HELLO_WORLDS');
      expect(actionNames).toContain('CREATE_GREETING');
    });

    it('should have hello world provider', async () => {
      const provider = mockRuntime.providers.find((p: any) => p.name === 'helloWorldContext');
      expect(provider).toBeDefined();
      expect(provider.description).toBe(
        'Provides context about hello world messages and greetings'
      );
    });
  });

  describe('CREATE_HELLO_WORLD Action', () => {
    it('should validate messages correctly', async () => {
      const createAction = mockRuntime.actions.find((a: any) => a.name === 'CREATE_HELLO_WORLD');

      const validMessage = {
        content: { text: 'Create a hello world message saying "Test"' },
      };

      const invalidMessage = {
        content: { text: 'Do something else' },
      };

      expect(await createAction.validate(mockRuntime, validMessage)).toBe(true);
      expect(await createAction.validate(mockRuntime, invalidMessage)).toBe(false);
    });

    it('should create hello world entries', async () => {
      const createAction = mockRuntime.actions.find((a: any) => a.name === 'CREATE_HELLO_WORLD');

      const message = {
        content: {
          text: 'Create a hello world message saying "Runtime test message" by "Test Author"',
        },
      };

      let responseReceived = false;
      const callback = async (response: any) => {
        responseReceived = true;
        expect(response.text).toContain('Created hello world message');
        expect(response.text).toContain('Runtime test message');
        expect(response.text).toContain('Test Author');
      };

      const result = await createAction.handler(mockRuntime, message, {}, {}, callback);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.message).toBe('Runtime test message');
      expect(result.data.author).toBe('Test Author');
      expect(responseReceived).toBe(true);
    });
  });

  describe('LIST_HELLO_WORLDS Action', () => {
    it('should list created entries', async () => {
      // First create an entry
      const createAction = mockRuntime.actions.find((a: any) => a.name === 'CREATE_HELLO_WORLD');
      await createAction.handler(
        mockRuntime,
        { content: { text: 'Create hello world "List test entry"' } },
        {},
        {},
        () => {}
      );

      // Then list
      const listAction = mockRuntime.actions.find((a: any) => a.name === 'LIST_HELLO_WORLDS');

      let listResponse: any;
      const callback = async (response: any) => {
        listResponse = response;
      };

      const result = await listAction.handler(
        mockRuntime,
        { content: { text: 'List all hello world messages' } },
        {},
        {},
        callback
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(listResponse.text).toContain('Found');
      expect(listResponse.text).toContain('hello world message');
    });
  });

  describe('CREATE_GREETING Action', () => {
    it('should create greetings in different languages', async () => {
      const createGreetingAction = mockRuntime.actions.find(
        (a: any) => a.name === 'CREATE_GREETING'
      );

      const testCases = [
        { text: 'Create a greeting in Spanish saying "Hola"', expectedLang: 'es' },
        { text: 'Add greeting "Bonjour" in French', expectedLang: 'fr' },
        { text: 'Create greeting "Konnichiwa" in Japanese', expectedLang: 'ja' },
      ];

      for (const testCase of testCases) {
        const result = await createGreetingAction.handler(
          mockRuntime,
          { content: { text: testCase.text } },
          {},
          {},
          () => {}
        );

        expect(result.success).toBe(true);
        expect(result.data.language).toBe(testCase.expectedLang);
      }
    });
  });

  describe('Provider', () => {
    it('should provide context about hello world data', async () => {
      const provider = mockRuntime.providers.find((p: any) => p.name === 'helloWorldContext');

      const context = await provider.get(mockRuntime, {
        content: { text: 'test' },
        entityId: 'test',
        roomId: 'test',
      });

      expect(context).toBeDefined();
      expect(context.text).toBeDefined();
      expect(context.values).toBeDefined();
      expect(context.values.helloWorldCount).toBeGreaterThanOrEqual(0);
      expect(context.values.greetingLanguages).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Dynamic Table Creation', () => {
    it('should create tables dynamically when first accessed', async () => {
      // Tables should have been created during the previous tests
      // Verify by checking if we can query them
      const listAction = mockRuntime.actions.find((a: any) => a.name === 'LIST_HELLO_WORLDS');
      const result = await listAction.handler(
        mockRuntime,
        { content: { text: 'List all hello world messages' } },
        {},
        {},
        () => {}
      );

      // If tables weren't created, this would throw an error
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Full Message Processing', () => {
    it('should process messages through runtime', async () => {
      const testMessage = {
        id: `test-msg-${Date.now()}`,
        entityId: 'test-user',
        agentId: mockRuntime.agentId,
        roomId: `test-room-${Date.now()}`,
        content: {
          text: 'Create a hello world message saying "Full runtime test!"',
          type: 'text',
        },
        createdAt: Date.now(),
      };

      // Process the message
      await mockRuntime.processMessage(testMessage);

      // If we got here without throwing, the test passes
    });
  });
});
