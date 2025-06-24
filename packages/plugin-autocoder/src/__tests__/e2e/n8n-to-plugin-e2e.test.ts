import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { mkdtemp, rm, readFile, pathExists } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { N8nToPluginService } from '../../services/n8n-to-plugin-service';
import { convertN8nToPlugin } from '../../actions/n8n-to-plugin-action';

describe('N8n to Plugin E2E Tests', () => {
  let runtime: IAgentRuntime;
  let tempDir: string;
  let service: N8nToPluginService;

  beforeEach(async () => {
    // Create temporary directory for test output
    tempDir = await mkdtemp(path.join(tmpdir(), 'n8n-plugin-test-'));

    // Create minimal runtime for testing
    runtime = {
      agentId: '00000000-0000-0000-0000-000000000000',
      character: {
        name: 'TestAgent',
        bio: ['Test agent for n8n plugin conversion'],
        system: 'You are a test agent.',
        settings: {
          PLUGIN_OUTPUT_DIR: tempDir,
        },
      },
      getSetting: (key: string) => {
        const settings: Record<string, any> = {
          PLUGIN_OUTPUT_DIR: tempDir,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        };
        return settings[key] || process.env[key];
      },
      getService: (name: string) => {
        if (name === 'n8n-to-plugin') {return service;}
        return null;
      },
      services: new Map(),
      registerService: () => {},
      logger: {
        info: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
      },
    } as any;

    // Initialize service
    service = new N8nToPluginService(runtime);
    await service.start();
  });

  afterEach(async () => {
    // Clean up
    await service.stop();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('Webhook to Action Conversion', () => {
    it('should convert a simple webhook workflow to an action', async () => {
      const webhookWorkflow = {
        name: 'webhook-example',
        nodes: [
          {
            id: '1',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            parameters: {
              path: 'test-webhook',
              responseMode: 'onReceived',
              responseData: 'firstEntryJson',
            },
            position: [250, 300],
          },
          {
            id: '2',
            name: 'Set',
            type: 'n8n-nodes-base.set',
            parameters: {
              values: {
                string: [
                  {
                    name: 'message',
                    value: '=Hello {{$json["name"]}}!',
                  },
                ],
              },
            },
            position: [450, 300],
          },
        ],
        connections: {
          'Webhook': {
            main: [[{ node: 'Set', type: 'main', index: 0 }]],
          },
        },
      };

      const result = await service.convertWorkflowToPlugin(webhookWorkflow);

      expect(result.success).toBe(true);
      expect(result.plugin).toBeDefined();
      expect(result.plugin?.actions).toHaveLength(1);

      const action = result.plugin?.actions?.[0];
      expect(action?.name).toBe('webhook-example');
      expect(action?.description).toContain('webhook');

      // Verify files were created
      const pluginPath = path.join(tempDir, 'webhook-example-plugin');
      expect(await pathExists(pluginPath)).toBe(true);

      // Check action file
      const actionPath = path.join(pluginPath, 'src/actions/webhook-example.ts');
      expect(await pathExists(actionPath)).toBe(true);

      const actionContent = await readFile(actionPath, 'utf-8');
      expect(actionContent).toContain('export const webhookExampleAction');
      expect(actionContent).toContain('async handler');
      expect(actionContent).toContain('Hello');
    });

    it('should handle multiple webhook triggers as separate actions', async () => {
      const multiWebhookWorkflow = {
        name: 'multi-webhook',
        nodes: [
          {
            id: '1',
            name: 'User Registration',
            type: 'n8n-nodes-base.webhook',
            parameters: {
              path: 'register',
              httpMethod: 'POST',
            },
            position: [250, 200],
          },
          {
            id: '2',
            name: 'User Login',
            type: 'n8n-nodes-base.webhook',
            parameters: {
              path: 'login',
              httpMethod: 'POST',
            },
            position: [250, 400],
          },
          {
            id: '3',
            name: 'Process Registration',
            type: 'n8n-nodes-base.function',
            parameters: {
              functionCode: 'return { success: true, userId: Math.random() };',
            },
            position: [450, 200],
          },
          {
            id: '4',
            name: 'Process Login',
            type: 'n8n-nodes-base.function',
            parameters: {
              functionCode: 'return { success: true, token: "abc123" };',
            },
            position: [450, 400],
          },
        ],
        connections: {
          'User Registration': {
            main: [[{ node: 'Process Registration', type: 'main', index: 0 }]],
          },
          'User Login': {
            main: [[{ node: 'Process Login', type: 'main', index: 0 }]],
          },
        },
      };

      const result = await service.convertWorkflowToPlugin(multiWebhookWorkflow);

      expect(result.success).toBe(true);
      expect(result.plugin?.actions).toHaveLength(2);

      const actionNames = result.plugin?.actions?.map(a => a.name) || [];
      expect(actionNames).toContain('userRegistration');
      expect(actionNames).toContain('userLogin');
    });
  });

  describe('Data Fetching to Provider Conversion', () => {
    it('should convert HTTP request nodes to providers', async () => {
      const dataFetchingWorkflow = {
        name: 'weather-data',
        nodes: [
          {
            id: '1',
            name: 'Get Weather',
            type: 'n8n-nodes-base.httpRequest',
            parameters: {
              url: 'https://api.weather.com/current',
              method: 'GET',
              queryParameters: {
                parameters: [
                  { name: 'location', value: '={{$json["city"]}}' },
                ],
              },
            },
            position: [250, 300],
          },
          {
            id: '2',
            name: 'Format Weather',
            type: 'n8n-nodes-base.set',
            parameters: {
              values: {
                string: [
                  { name: 'temperature', value: '={{$json["temp"]}}°C' },
                  { name: 'condition', value: '={{$json["weather"]}}' },
                ],
              },
            },
            position: [450, 300],
          },
        ],
        connections: {
          'Get Weather': {
            main: [[{ node: 'Format Weather', type: 'main', index: 0 }]],
          },
        },
      };

      const result = await service.convertWorkflowToPlugin(dataFetchingWorkflow);

      expect(result.success).toBe(true);
      expect(result.plugin?.providers).toHaveLength(1);

      const provider = result.plugin?.providers?.[0];
      expect(provider?.name).toBe('weatherDataProvider');
      expect(provider?.description).toContain('weather');

      // Check provider file
      const providerPath = path.join(tempDir, 'weather-data-plugin/src/providers/weather-data-provider.ts');
      expect(await pathExists(providerPath)).toBe(true);

      const providerContent = await readFile(providerPath, 'utf-8');
      expect(providerContent).toContain('export const weatherDataProvider');
      expect(providerContent).toContain('async get');
      expect(providerContent).toContain('temperature');
      expect(providerContent).toContain('condition');
    });
  });

  describe('Long-Running Workflow to Service Conversion', () => {
    it('should convert scheduled workflows to services', async () => {
      const scheduledWorkflow = {
        name: 'data-sync',
        nodes: [
          {
            id: '1',
            name: 'Schedule',
            type: 'n8n-nodes-base.scheduleTrigger',
            parameters: {
              rule: {
                interval: [{ field: 'minutes', minutesInterval: 30 }],
              },
            },
            position: [250, 300],
          },
          {
            id: '2',
            name: 'Fetch Data',
            type: 'n8n-nodes-base.httpRequest',
            parameters: {
              url: 'https://api.example.com/data',
              method: 'GET',
            },
            position: [450, 300],
          },
          {
            id: '3',
            name: 'Store Data',
            type: 'n8n-nodes-base.function',
            parameters: {
              functionCode: 'items[0].json.stored = true; return items;',
            },
            position: [650, 300],
          },
        ],
        connections: {
          'Schedule': {
            main: [[{ node: 'Fetch Data', type: 'main', index: 0 }]],
          },
          'Fetch Data': {
            main: [[{ node: 'Store Data', type: 'main', index: 0 }]],
          },
        },
      };

      const result = await service.convertWorkflowToPlugin(scheduledWorkflow);

      expect(result.success).toBe(true);
      expect(result.plugin?.services).toHaveLength(1);

      const service = result.plugin?.services?.[0];
      expect(service?.name).toBe('DataSyncService');

      // Check service file
      const servicePath = path.join(tempDir, 'data-sync-plugin/src/services/data-sync-service.ts');
      expect(await pathExists(servicePath)).toBe(true);

      const serviceContent = await readFile(servicePath, 'utf-8');
      expect(serviceContent).toContain('export class DataSyncService');
      expect(serviceContent).toContain('extends Service');
      expect(serviceContent).toContain('async start');
      expect(serviceContent).toContain('setInterval');
      expect(serviceContent).toContain('30 * 60 * 1000'); // 30 minutes in ms
    });
  });

  describe('Complex Workflow Conversion', () => {
    it('should handle workflow with mixed node types', async () => {
      const complexWorkflow = {
        name: 'user-management',
        nodes: [
          // Webhook trigger -> Action
          {
            id: '1',
            name: 'Create User',
            type: 'n8n-nodes-base.webhook',
            parameters: { path: 'users/create', httpMethod: 'POST' },
            position: [250, 200],
          },
          // HTTP Request -> Provider
          {
            id: '2',
            name: 'Check Existing',
            type: 'n8n-nodes-base.httpRequest',
            parameters: {
              url: 'https://api.db.com/users',
              method: 'GET',
              queryParameters: {
                parameters: [{ name: 'email', value: '={{$json["email"]}}' }],
              },
            },
            position: [450, 200],
          },
          // Schedule -> Service
          {
            id: '3',
            name: 'Cleanup Old Users',
            type: 'n8n-nodes-base.scheduleTrigger',
            parameters: {
              rule: { interval: [{ field: 'hours', hoursInterval: 24 }] },
            },
            position: [250, 400],
          },
          // Function nodes for processing
          {
            id: '4',
            name: 'Process User',
            type: 'n8n-nodes-base.function',
            parameters: {
              functionCode: `
                const exists = items[0].json.exists;
                if (exists) {
                  throw new Error('User already exists');
                }
                return [{ json: { created: true, userId: Date.now() } }];
              `,
            },
            position: [650, 200],
          },
        ],
        connections: {
          'Create User': {
            main: [[{ node: 'Check Existing', type: 'main', index: 0 }]],
          },
          'Check Existing': {
            main: [[{ node: 'Process User', type: 'main', index: 0 }]],
          },
        },
      };

      const result = await service.convertWorkflowToPlugin(complexWorkflow);

      expect(result.success).toBe(true);
      expect(result.plugin?.actions).toHaveLength(1);
      expect(result.plugin?.providers).toHaveLength(1);
      expect(result.plugin?.services).toHaveLength(1);

      // Verify the complete plugin structure
      const pluginPath = path.join(tempDir, 'user-management-plugin');
      expect(await pathExists(pluginPath)).toBe(true);

      // Check index.ts
      const indexPath = path.join(pluginPath, 'src/index.ts');
      const indexContent = await readFile(indexPath, 'utf-8');
      expect(indexContent).toContain('import { createUserAction }');
      expect(indexContent).toContain('import { checkExistingProvider }');
      expect(indexContent).toContain('import { CleanupOldUsersService }');
      expect(indexContent).toContain('export const userManagementPlugin');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid workflow gracefully', async () => {
      const invalidWorkflow = {
        name: 'invalid',
        nodes: [], // No nodes
        connections: {},
      };

      const result = await service.convertWorkflowToPlugin(invalidWorkflow);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No convertible nodes found');
    });

    it('should handle unsupported node types', async () => {
      const unsupportedWorkflow = {
        name: 'unsupported',
        nodes: [
          {
            id: '1',
            name: 'Unknown Node',
            type: 'n8n-nodes-base.unknownType',
            parameters: {},
            position: [250, 300],
          },
        ],
        connections: {},
      };

      const result = await service.convertWorkflowToPlugin(unsupportedWorkflow);

      expect(result.success).toBe(true); // Should still succeed but skip unsupported nodes
      expect(result.plugin?.actions).toHaveLength(0);
      expect(result.plugin?.providers).toHaveLength(0);
      expect(result.plugin?.services).toHaveLength(0);
    });
  });

  describe('Action Integration', () => {
    it('should process n8n workflow through action', async () => {
      const message: Memory = {
        id: '00000000-0000-0000-0000-000000000001',
        entityId: '00000000-0000-0000-0000-000000000002',
        roomId: '00000000-0000-0000-0000-000000000003',
        content: {
          text: `Convert this n8n workflow to plugin:
          {
            "name": "simple-api",
            "nodes": [{
              "id": "1",
              "name": "API Endpoint",
              "type": "n8n-nodes-base.webhook",
              "parameters": {
                "path": "api/data",
                "responseMode": "lastNode"
              }
            }],
            "connections": {}
          }`,
        },
        createdAt: Date.now(),
      };

      const state: State = { values: {}, data: {}, text: '' };
      const responses: Memory[] = [];
      const callback = async (response: any) => {
        responses.push({ ...message, content: response });
        return responses;
      };

      // Execute action
      await convertN8nToPlugin.handler(runtime, message, state, {}, callback);

      // Verify response
      expect(responses).toHaveLength(1);
      expect(responses[0].content.text).toContain('successfully converted');
      expect(responses[0].content.text).toContain('simple-api-plugin');

      // Verify plugin was created
      const pluginPath = path.join(tempDir, 'simple-api-plugin');
      expect(await pathExists(pluginPath)).toBe(true);
    });
  });
});
