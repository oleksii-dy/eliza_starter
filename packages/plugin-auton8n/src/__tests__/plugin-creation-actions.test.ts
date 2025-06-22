import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createPluginAction,
  checkPluginCreationStatusAction,
  cancelPluginCreationAction,
  createPluginFromDescriptionAction,
} from '../actions/plugin-creation-actions.ts';
import { IAgentRuntime, Memory, State, ActionResult } from '@elizaos/core';
import { PluginCreationService } from '../services/plugin-creation-service.ts';
import { getPluginCreationService } from '../utils/get-plugin-creation-service.ts';
// Mock Memory with proper UUID
const createMockMemory = (text: string): Memory =>
  ({
    id: crypto.randomUUID() as any,
    content: { text },
    userId: crypto.randomUUID() as any,
    roomId: crypto.randomUUID() as any,
    entityId: 'entity-id',
    createdAt: Date.now(),
  }) as unknown as Memory;

// Mock Runtime
const createMockRuntime = (): IAgentRuntime => {
  const service = {
    getAllJobs: vi.fn().mockReturnValue([]),
    createPlugin: vi.fn().mockReturnValue('job-123'),
    getJobStatus: vi.fn(),
    cancelJob: vi.fn(),
  } as unknown as PluginCreationService;

  return {
    services: {
      get: vi.fn().mockReturnValue(service),
    },
    getSetting: vi.fn(),
    useModel: vi.fn().mockImplementation(async (modelType, params) => {
      // Mock response for plugin specification generation
      if (params.prompt?.includes('todo')) {
        return JSON.stringify({
          name: '@elizaos/plugin-todo',
          description: 'A plugin for managing todo lists',
          version: '1.0.0',
          actions: [
            { name: 'addTodo', description: 'Add a new todo item' },
            { name: 'removeTodo', description: 'Remove a todo item' },
            { name: 'listTodos', description: 'List all todo items' },
          ],
        });
      } else if (params.prompt?.includes('weather')) {
        return JSON.stringify({
          name: '@elizaos/plugin-weather',
          description: 'A weather information plugin',
          version: '1.0.0',
          actions: [
            { name: 'getCurrentWeather', description: 'Get current weather' },
            { name: 'getWeatherForecast', description: 'Get weather forecast' },
          ],
        });
      } else if (params.prompt?.includes('database')) {
        return JSON.stringify({
          name: '@elizaos/plugin-database',
          description: 'A database management plugin',
          version: '1.0.0',
          actions: [{ name: 'queryDatabase', description: 'Execute SQL queries' }],
        });
      } else if (params.prompt?.includes('user data') && params.prompt?.includes('service')) {
        return JSON.stringify({
          name: '@elizaos/plugin-user-monitor',
          description: 'A plugin for monitoring user activity',
          version: '1.0.0',
          actions: [{ name: 'trackActivity', description: 'Track user activity' }],
          providers: [{ name: 'userDataProvider', description: 'Provides user data' }],
          services: [{ name: 'userMonitorService', description: 'Monitors user changes' }],
          evaluators: [{ name: 'activityEvaluator', description: 'Evaluates activity patterns' }],
        });
      } else if (params.prompt?.includes('blockchain')) {
        return JSON.stringify({
          name: '@elizaos/plugin-blockchain',
          description: 'A blockchain integration plugin',
          version: '1.0.0',
          actions: [
            { name: 'deployContract', description: 'Deploy smart contract' },
            { name: 'callContract', description: 'Call smart contract method' },
          ],
        });
      } else {
        return JSON.stringify({
          name: '@elizaos/plugin-utility',
          description: 'A simple utility plugin',
          version: '1.0.0',
          actions: [{ name: 'utilityAction', description: 'Perform utility action' }],
        });
      }
    }),
  } as any;
};

describe('Plugin Creation Actions', () => {
  let runtime: IAgentRuntime;
  let state: State;

  beforeEach(() => {
    runtime = createMockRuntime();
    state = { values: {}, data: {}, text: '' };
    vi.clearAllMocks();
  });

  describe('createPluginAction', () => {
    const validSpec = JSON.stringify({
      name: '@test/plugin',
      description: 'Test plugin for testing',
      version: '1.0.0',
      actions: [{ name: 'testAction', description: 'Test' }],
    });

    it('should validate when no active jobs and valid JSON', async () => {
      const message = createMockMemory(validSpec);
      const result = await createPluginAction.validate(runtime, message, state);
      expect(result).toBe(true);
    });

    it('should not validate when active job exists', async () => {
      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      (service.getAllJobs as any).mockReturnValue([{ status: 'running' }]);

      const message = createMockMemory(validSpec);
      const result = await createPluginAction.validate(runtime, message, state);
      expect(result).toBe(false);
    });

    it('should not validate with invalid JSON', async () => {
      const message = createMockMemory('not json');
      const result = await createPluginAction.validate(runtime, message, state);
      expect(result).toBe(false);
    });

    it('should not validate when service unavailable', async () => {
      (runtime.services.get as any).mockReturnValue(null);
      const message = createMockMemory(validSpec);
      const result = await createPluginAction.validate(runtime, message, state);
      expect(result).toBe(false);
    });

    it('should handle plugin creation with valid spec', async () => {
      (runtime.getSetting as any).mockReturnValue('test-api-key');
      const message = createMockMemory(validSpec);
      const result = (await createPluginAction.handler(runtime, message, state)) as ActionResult;

      expect(result).toBeDefined();
      expect(result.text).toContain('Plugin creation job started successfully!');
      expect(result.text).toContain('Job ID: job-123');
      expect(result.text).toContain('@test/plugin');

      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      expect(service.createPlugin).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '@test/plugin',
          description: 'Test plugin for testing',
        }),
        'test-api-key'
      );
    });

    it('should validate plugin specification', async () => {
      const invalidSpecs = [
        { name: 'invalid name', description: 'test' },
        { name: '@test/plugin', description: 'short' },
        {
          name: '@test/plugin',
          description: 'Valid description',
          version: 'invalid',
        },
        { name: '../../../etc/passwd', description: 'Path traversal attempt' },
      ];

      for (const spec of invalidSpecs) {
        const message = createMockMemory(JSON.stringify(spec));
        const result = (await createPluginAction.handler(runtime, message, state)) as ActionResult;
        expect(result.text).toContain('Invalid plugin specification');
      }
    });

    it('should handle missing API key', async () => {
      (runtime.getSetting as any).mockReturnValue(null);
      const message = createMockMemory(validSpec);
      const result = (await createPluginAction.handler(runtime, message, state)) as ActionResult;

      expect(result.text).toContain('ANTHROPIC_API_KEY is not configured');
    });

    it('should handle service unavailable', async () => {
      (runtime.services.get as any).mockReturnValue(null);
      const message = createMockMemory(validSpec);
      const result = (await createPluginAction.handler(runtime, message, state)) as ActionResult;

      expect(result.text).toContain('Plugin creation service not available');
    });

    it('should handle invalid JSON', async () => {
      const message = createMockMemory('{ invalid json }');
      const result = (await createPluginAction.handler(runtime, message, state)) as ActionResult;

      expect(result.text).toContain('Failed to parse specification');
    });

    it('should handle service errors', async () => {
      // First provide API key so we can reach the service error
      (runtime.getSetting as any).mockReturnValue('test-api-key');

      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      (service.createPlugin as any).mockRejectedValue(new Error('Service error'));

      const message = createMockMemory(validSpec);
      const result = (await createPluginAction.handler(runtime, message, state)) as ActionResult;

      expect(result.text).toContain('Failed to create plugin: Service error');
    });
  });

  describe('checkPluginCreationStatusAction', () => {
    it('should validate when jobs exist', async () => {
      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      (service.getAllJobs as any).mockReturnValue([{ id: 'job-123' }]);

      const message = createMockMemory('check status');
      const result = await checkPluginCreationStatusAction.validate(runtime, message, state);
      expect(result).toBe(true);
    });

    it('should not validate when no jobs', async () => {
      const message = createMockMemory('check status');
      const result = await checkPluginCreationStatusAction.validate(runtime, message, state);
      expect(result).toBe(false);
    });

    it('should show detailed job status', async () => {
      const mockJob = {
        id: 'job-123',
        specification: { name: '@test/plugin' },
        status: 'running',
        currentPhase: 'building',
        progress: 60,
        startedAt: new Date(),
        logs: ['[2024-01-01T10:00:00Z] Starting job', '[2024-01-01T10:01:00Z] Building plugin'],
      };

      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      (service.getAllJobs as any).mockReturnValue([mockJob]);
      (service.getJobStatus as any).mockReturnValue(mockJob);

      const message = createMockMemory('check status');
      const result = (await checkPluginCreationStatusAction.handler(
        runtime,
        message,
        state
      )) as ActionResult;

      expect(result.text).toContain('Plugin Creation Status');
      expect(result.text).toContain('Job ID: job-123');
      expect(result.text).toContain('Status: RUNNING');
      expect(result.text).toContain('Phase: building');
      expect(result.text).toContain('Progress: 60%');
      expect(result.text).toContain('Recent Activity:');
    });

    it('should handle specific job ID in message', async () => {
      const jobId = '12345678-1234-1234-1234-123456789012';
      const mockJob = {
        id: jobId,
        specification: { name: '@test/plugin' },
        status: 'completed',
        currentPhase: 'done',
        progress: 100,
        startedAt: new Date(),
        completedAt: new Date(),
        outputPath: '/path/to/plugin',
        logs: [],
      };

      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      (service.getAllJobs as any).mockReturnValue([mockJob]);
      (service.getJobStatus as any).mockReturnValue(mockJob);

      const message = createMockMemory(`Check status for ${jobId}`);
      const result = (await checkPluginCreationStatusAction.handler(
        runtime,
        message,
        state
      )) as ActionResult;

      expect(service.getJobStatus).toHaveBeenCalledWith(jobId);
      expect(result.text).toContain('Plugin created successfully!');
      expect(result.text).toContain('Location: /path/to/plugin');
    });

    it('should show failed job details', async () => {
      const mockJob = {
        id: 'job-123',
        specification: { name: '@test/plugin' },
        status: 'failed',
        currentPhase: 'testing',
        progress: 80,
        startedAt: new Date(),
        completedAt: new Date(),
        error: 'Tests failed: 3 failing tests',
        logs: [],
      };

      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      (service.getAllJobs as any).mockReturnValue([mockJob]);

      const message = createMockMemory('status');
      const result = (await checkPluginCreationStatusAction.handler(
        runtime,
        message,
        state
      )) as ActionResult;

      expect(result.text).toContain('Plugin creation failed');
      expect(result.text).toContain('Tests failed: 3 failing tests');
    });

    it('should handle no jobs found', async () => {
      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      (service.getAllJobs as any).mockReturnValue([]);

      const message = createMockMemory('check status');
      const result = (await checkPluginCreationStatusAction.handler(
        runtime,
        message,
        state
      )) as ActionResult;

      expect(result.text).toBe('No plugin creation jobs found.');
    });

    it('should handle job not found by ID', async () => {
      const jobId = '12345678-1234-1234-1234-123456789012';
      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      (service.getAllJobs as any).mockReturnValue([{ id: 'other-job' }]);
      (service.getJobStatus as any).mockReturnValue(null);

      const message = createMockMemory(`Check ${jobId}`);
      const result = (await checkPluginCreationStatusAction.handler(
        runtime,
        message,
        state
      )) as ActionResult;

      expect(result.text).toContain(`Job with ID ${jobId} not found`);
    });
  });

  describe('cancelPluginCreationAction', () => {
    it('should validate when active job exists', async () => {
      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      (service.getAllJobs as any).mockReturnValue([{ id: 'job-123', status: 'running' }]);

      const message = createMockMemory('cancel');
      const result = await cancelPluginCreationAction.validate(runtime, message, state);
      expect(result).toBe(true);
    });

    it('should not validate when no active job', async () => {
      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      (service.getAllJobs as any).mockReturnValue([{ id: 'job-123', status: 'completed' }]);

      const message = createMockMemory('cancel');
      const result = await cancelPluginCreationAction.validate(runtime, message, state);
      expect(result).toBe(false);
    });

    it('should cancel active job with details', async () => {
      const mockJob = {
        id: 'job-123',
        status: 'running',
        specification: { name: '@test/plugin' },
      };

      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      (service.getAllJobs as any).mockReturnValue([mockJob]);

      const message = createMockMemory('cancel');
      const result = (await cancelPluginCreationAction.handler(
        runtime,
        message,
        state
      )) as ActionResult;

      expect(result.text).toContain('Plugin creation job has been cancelled');
      expect(result.text).toContain('Job ID: job-123');
      expect(result.text).toContain('@test/plugin');
      expect(service.cancelJob).toHaveBeenCalledWith('job-123');
    });

    it('should handle no active job to cancel', async () => {
      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      (service.getAllJobs as any).mockReturnValue([]);

      const message = createMockMemory('cancel');
      const result = (await cancelPluginCreationAction.handler(
        runtime,
        message,
        state
      )) as ActionResult;

      expect(result.text).toBe('No active plugin creation job to cancel.');
    });
  });

  describe('createPluginFromDescriptionAction', () => {
    it('should validate with long description', async () => {
      const message = createMockMemory(
        'I need a plugin that manages user preferences with storage and retrieval'
      );
      const result = await createPluginFromDescriptionAction.validate(runtime, message, state);
      expect(result).toBe(true);
    });

    it('should not validate with short description', async () => {
      const message = createMockMemory('plugin');
      const result = await createPluginFromDescriptionAction.validate(runtime, message, state);
      expect(result).toBe(false);
    });

    it('should not validate when active job exists', async () => {
      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      (service.getAllJobs as any).mockReturnValue([{ status: 'running' }]);

      const message = createMockMemory('I need a plugin that manages todo lists');
      const result = await createPluginFromDescriptionAction.validate(runtime, message, state);
      expect(result).toBe(false);
    });

    it('should create plugin from todo description', async () => {
      (runtime.getSetting as any).mockReturnValue('test-api-key');

      const message = createMockMemory(
        'I need a plugin that manages todo lists with add, remove, and list functionality'
      );
      const result = (await createPluginFromDescriptionAction.handler(
        runtime,
        message,
        state
      )) as ActionResult;

      expect(result.text).toContain("I'm creating a plugin based on your description!");
      expect(result.text).toContain('Plugin: @elizaos/plugin-todo');
      expect(result.text).toContain('Job ID: job-123');
      expect(result.text).toContain('actions');

      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      expect(service.createPlugin).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '@elizaos/plugin-todo',
          actions: expect.arrayContaining([
            expect.objectContaining({ name: expect.stringContaining('Todo') }),
          ]),
        }),
        'test-api-key'
      );
    });

    it('should create weather plugin from description', async () => {
      (runtime.getSetting as any).mockReturnValue('test-api-key');

      const message = createMockMemory(
        'Create a weather information plugin that can fetch current weather and forecasts'
      );
      const result = (await createPluginFromDescriptionAction.handler(
        runtime,
        message,
        state
      )) as ActionResult;

      expect(result.text).toContain('@elizaos/plugin-weather');

      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      const callArgs = (service.createPlugin as any).mock.calls[0][0];
      expect(callArgs.name).toBe('@elizaos/plugin-weather');
      expect(callArgs.actions).toBeDefined();
      expect(callArgs.actions.length).toBeGreaterThan(0);
    });

    it('should create database plugin from description', async () => {
      (runtime.getSetting as any).mockReturnValue('test-api-key');

      const message = createMockMemory(
        'Build a database plugin for SQL queries and data management'
      );
      const result = (await createPluginFromDescriptionAction.handler(
        runtime,
        message,
        state
      )) as ActionResult;

      expect(result.text).toContain('@elizaos/plugin-database');
    });

    it('should detect multiple component types', async () => {
      (runtime.getSetting as any).mockReturnValue('test-api-key');

      const message = createMockMemory(
        'I need a plugin that provides user data, has a background service to monitor changes, ' +
          'and can evaluate user activity patterns'
      );
      const result = (await createPluginFromDescriptionAction.handler(
        runtime,
        message,
        state
      )) as ActionResult;

      expect(result.text).toContain('providers');
      expect(result.text).toContain('services');
      expect(result.text).toContain('evaluators');

      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      const callArgs = (service.createPlugin as any).mock.calls[0][0];
      expect(callArgs.providers?.length).toBeGreaterThan(0);
      expect(callArgs.services?.length).toBeGreaterThan(0);
      expect(callArgs.evaluators?.length).toBeGreaterThan(0);
    });

    it('should handle missing API key', async () => {
      (runtime.getSetting as any).mockReturnValue(null);

      const message = createMockMemory('I need a todo plugin');
      const result = (await createPluginFromDescriptionAction.handler(
        runtime,
        message,
        state
      )) as ActionResult;

      expect(result.text).toContain('ANTHROPIC_API_KEY is not configured');
    });

    it('should create custom plugin for unrecognized type', async () => {
      (runtime.getSetting as any).mockReturnValue('test-api-key');

      const message = createMockMemory(
        'I need a blockchain integration plugin for smart contracts'
      );
      const result = (await createPluginFromDescriptionAction.handler(
        runtime,
        message,
        state
      )) as ActionResult;

      expect(result.text).toContain('@elizaos/plugin-blockchain');

      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      const callArgs = (service.createPlugin as any).mock.calls[0][0];
      expect(callArgs.name).toContain('blockchain');
      expect(callArgs.actions?.length).toBeGreaterThan(0);
    });

    it('should ensure at least one component exists', async () => {
      (runtime.getSetting as any).mockReturnValue('test-api-key');

      const message = createMockMemory('I need a simple utility plugin');
      const result = (await createPluginFromDescriptionAction.handler(
        runtime,
        message,
        state
      )) as ActionResult;

      const service = getPluginCreationService(runtime);
      if (!service) throw new Error('Service should be available');
      const callArgs = (service.createPlugin as any).mock.calls[0][0];

      // Should have at least one component
      const hasComponents =
        callArgs.actions?.length > 0 ||
        callArgs.providers?.length > 0 ||
        callArgs.services?.length > 0 ||
        callArgs.evaluators?.length > 0;

      expect(hasComponents).toBe(true);
    });
  });
});
