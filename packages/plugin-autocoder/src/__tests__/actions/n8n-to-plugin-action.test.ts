import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPluginAction,
  checkPluginStatusAction,
  createPluginWithWorkflowsAction,
} from '../../actions/n8n-to-plugin-action';
import { createMockRuntime, createMockMemory, createMockState } from '../test-utils';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';

describe('n8n-to-plugin-action', () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;
  let mockCallback: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime = createMockRuntime();
    mockMessage = createMockMemory({
      content: { text: 'create a weather plugin', source: 'test' },
    });
    mockState = createMockState();
    mockCallback = vi.fn();

    // Mock the N8nToPluginService
    mockRuntime.getService = vi.fn().mockReturnValue({
      createPluginFromDescription: vi.fn().mockResolvedValue({
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'started',
        pluginName: 'weather-plugin',
        description: 'Weather information plugin',
      }),
      checkPluginStatus: vi.fn().mockResolvedValue({
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'completed',
        result: {
          pluginPath: '/path/to/weather-plugin',
          components: {
            actions: ['getWeather', 'getForecast'],
            providers: ['weatherProvider'],
            services: ['weatherUpdateService'],
          },
        },
      }),
      createPluginWithWorkflows: vi.fn().mockResolvedValue({
        projectId: '456e7890-e89b-12d3-a456-426614174001',
        status: 'started',
        pluginName: 'custom-plugin',
      }),
    });
  });

  describe('createPluginAction', () => {
    it('should have correct metadata', () => {
      expect(createPluginAction.name).toBe('createPlugin');
      expect(createPluginAction.similes).toContain('create a plugin');
      expect(createPluginAction.similes).toContain('build a plugin');
      expect(createPluginAction.similes).toContain('generate a plugin');
    });

    it('should validate when n8n-to-plugin service is available', async () => {
      const isValid = await createPluginAction.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(true);
    });

    it('should not validate when service is unavailable', async () => {
      mockRuntime.getService = vi.fn().mockReturnValue(null);
      const isValid = await createPluginAction.validate(mockRuntime, mockMessage, mockState);
      expect(isValid).toBe(false);
    });

    it('should handle plugin creation from description', async () => {
      mockMessage.content.text =
        'Create a plugin that fetches weather data and sends notifications';

      await createPluginAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);

      const service = mockRuntime.getService('n8n-to-plugin') as any;
      expect(service.createPluginFromDescription).toHaveBeenCalledWith(
        expect.stringContaining('fetches weather data and sends notifications')
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Creating plugin from description'),
          content: expect.objectContaining({
            projectId: '123e4567-e89b-12d3-a456-426614174000',
            status: 'started',
            pluginName: 'weather-plugin',
          }),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const service = mockRuntime.getService('n8n-to-plugin') as any;
      service.createPluginFromDescription = vi.fn().mockRejectedValue(new Error('Service error'));

      await createPluginAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Failed to create plugin'),
          content: expect.objectContaining({
            error: 'Service error',
          }),
        })
      );
    });
  });

  describe('checkPluginStatusAction', () => {
    it('should have correct metadata', () => {
      expect(checkPluginStatusAction.name).toBe('checkPluginStatus');
      expect(checkPluginStatusAction.similes).toContain('check plugin status');
      expect(checkPluginStatusAction.similes).toContain('generation status');
    });

    it('should check status of plugin generation', async () => {
      mockMessage.content.text = 'Check status of project 123e4567-e89b-12d3-a456-426614174000';

      await checkPluginStatusAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);

      expect(mockRuntime.getService).toHaveBeenCalledWith('n8n-to-plugin');

      // Since the mocked service will return the test data, it should show completed status
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Plugin generation completed'),
          content: expect.objectContaining({
            projectId: '123e4567-e89b-12d3-a456-426614174000',
            status: 'completed',
          }),
        })
      );
    });

    it('should handle in-progress status', async () => {
      (mockRuntime.getService as any).mockReturnValue({
        checkPluginStatus: vi.fn().mockResolvedValue({
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'in_progress',
          progress: 65,
        }),
      });

      mockMessage.content.text = 'Check status of 123e4567-e89b-12d3-a456-426614174000';

      await checkPluginStatusAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Plugin generation is in_progress (65% complete)'),
          content: expect.objectContaining({
            status: 'in_progress',
            progress: 65,
          }),
        })
      );
    });

    it('should handle missing project ID', async () => {
      mockMessage.content.text = 'Check plugin status';

      await checkPluginStatusAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Please provide the project ID'),
          content: expect.objectContaining({
            error: 'No project ID provided',
          }),
        })
      );
    });
  });

  describe('createPluginWithWorkflowsAction', () => {
    it('should have correct metadata', () => {
      expect(createPluginWithWorkflowsAction.name).toBe('createPluginWithWorkflows');
      expect(createPluginWithWorkflowsAction.similes).toContain('create plugin with workflows');
      expect(createPluginWithWorkflowsAction.similes).toContain('design plugin workflows');
    });

    it('should create plugin with custom workflows', async () => {
      mockMessage.content.text = 'Create a data processing plugin with ETL workflows';

      await createPluginWithWorkflowsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Creating plugin with custom workflows'),
          content: expect.objectContaining({
            projectId: '456e7890-e89b-12d3-a456-426614174001',
            status: 'started',
          }),
        })
      );
    });

    it('should accept workflow JSON objects', async () => {
      const workflowJson = {
        nodes: [
          { id: '1', type: 'webhook', parameters: {} },
          { id: '2', type: 'httpRequest', parameters: {} },
        ],
        connections: { '1': { main: [[{ node: '2', type: 'main', index: 0 }]] } },
      };

      mockMessage.content = {
        text: 'Create plugin with this workflow',
        workflows: [workflowJson],
        source: 'test',
      };

      await createPluginWithWorkflowsAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      const service = mockRuntime.getService('n8n-to-plugin') as any;
      expect(service.createPluginWithWorkflows).toHaveBeenCalledWith(expect.any(String), [
        workflowJson,
      ]);
    });
  });

  describe('backward compatibility', () => {
    it('should export legacy action names', async () => {
      const {
        convertN8nToPluginAction,
        checkN8nPluginStatusAction,
        createN8nPluginFromDescriptionAction,
      } = await import('../../actions/n8n-to-plugin-action');

      expect(convertN8nToPluginAction).toBe(createPluginAction);
      expect(checkN8nPluginStatusAction).toBe(checkPluginStatusAction);
      expect(createN8nPluginFromDescriptionAction).toBe(createPluginWithWorkflowsAction);
    });
  });
});
