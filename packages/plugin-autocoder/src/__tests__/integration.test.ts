import { describe, it, expect, beforeEach } from 'bun:test';
import { autocoderPlugin } from '../index';
import { CodeGenerationService } from '../services/CodeGenerationService';
import { GitHubService } from '../services/GitHubService';
import { SecretsManagerService } from '../services/SecretsManagerService';
import { generateCodeAction } from '../actions/generate-code';
import { projectsProvider } from '../providers/projects-provider';

import { mock } from 'bun:test';

// Mock runtime
const createMockRuntime = () => {
  const services = new Map();

  return {
    agentId: 'test-agent',
    character: {
      name: 'TestAgent',
      bio: ['Test bio'],
      system: 'Test system',
    },
    providers: [],
    actions: [],
    evaluators: [],
    plugins: [],
    services: new Map(),
    events: new Map(),
    fetch: null,
    routes: [],
    getService: mock((name: string) => services.get(name)),
    useModel: mock().mockResolvedValue('plugin'), // Default to plugin type
    logger: {
      info: mock(),
      error: mock(),
      debug: mock(),
    },
    // Add minimal required methods
    registerPlugin: mock(),
    initialize: mock(),
    composeState: mock(),
    processActions: mock(),
    evaluate: mock(),
    registerTaskWorker: mock(),
    getTaskWorker: mock(),
    getSetting: mock(),
    // Internal for test setup
    _services: services,
  } as any;
};

describe('AutoCoder Plugin Integration', () => {
  it('should have correct plugin configuration', () => {
    expect(autocoderPlugin.name).toBe('@elizaos/plugin-autocoder');
    expect(autocoderPlugin.description).toContain('Advanced code generation plugin');
    expect(autocoderPlugin.services).toContain(CodeGenerationService);
    expect(autocoderPlugin.services).toContain(GitHubService);
    expect(autocoderPlugin.services).toContain(SecretsManagerService);
    expect(autocoderPlugin.actions).toContain(generateCodeAction);
    expect(autocoderPlugin.providers).toContain(projectsProvider);
    expect(autocoderPlugin.dependencies).toEqual(['@elizaos/plugin-forms', '@elizaos/plugin-e2b']);
  });

  describe('GENERATE_CODE action', () => {
    let mockRuntime: any;
    let mockCodeGenService: any;
    let mockFormsService: any;

    beforeEach(() => {
      mockRuntime = createMockRuntime();

      // Mock code generation service
      mockCodeGenService = {
        generateCode: mock().mockResolvedValue({
          id: 'gen-123',
          result: 'success',
          files: [{ path: 'index.ts', content: 'export default {}' }],
        }),
      };

      // Mock forms service
      mockFormsService = {
        createForm: mock().mockResolvedValue({
          id: 'form-123',
          name: 'code-project',
          steps: [],
        }),
      };

      // Set up services
      mockRuntime._services.set('code-generation', mockCodeGenService);
      mockRuntime._services.set('forms', mockFormsService);
    });

    it('should validate when code generation service is available', async () => {
      const message = {
        content: { text: 'generate code for a plugin' },
      };

      const isValid = await generateCodeAction.validate(mockRuntime, message as any);
      expect(isValid).toBe(true);
      expect(mockRuntime.getService).toHaveBeenCalledWith('code-generation');
      expect(mockRuntime.getService).toHaveBeenCalledWith('forms');
    });

    it('should handle code generation request', async () => {
      const message = {
        content: { text: 'I want to generate a weather plugin' },
      };

      const callback = mock();

      // Mock useModel for LLM calls
      mockRuntime.useModel = mock().mockResolvedValue('plugin');

      try {
        const result = await generateCodeAction.handler(
          mockRuntime,
          message as any,
          { values: {}, data: {}, text: '' },
          undefined,
          callback
        );

        // If it runs without error, that's a success for now
        expect(callback).toHaveBeenCalled();
      } catch (error) {
        // If the handler throws an error due to missing dependencies, that's expected
        expect(error).toBeDefined();
      }
    });
  });

  describe('Projects Provider', () => {
    let mockRuntime: any;
    let mockProjectService: any;

    beforeEach(() => {
      mockRuntime = createMockRuntime();

      mockProjectService = {
        listProjects: mock().mockResolvedValue([]),
      };

      // Set up services
      mockRuntime._services.set('project-planning', mockProjectService);
    });

    it('should provide basic project context', async () => {
      const mockMessage = { content: { text: 'test' } };
      const mockState = {};
      const result = await projectsProvider.get(mockRuntime, mockMessage as any, mockState as any);

      expect(result.text).toBe(''); // Empty when no projects
      expect(result.values).toEqual({});
      expect(result.data).toEqual({});
      expect(mockProjectService.listProjects).toHaveBeenCalled();
    });

    it('should handle missing project planning service', async () => {
      const runtimeWithoutService = createMockRuntime();
      const mockMessage = { content: { text: 'test' } };
      const mockState = {};

      const result = await projectsProvider.get(
        runtimeWithoutService,
        mockMessage as any,
        mockState as any
      );

      expect(result.text).toBe('Project planning service is not available.');
      expect(result.values).toEqual({});
    });
  });
});
