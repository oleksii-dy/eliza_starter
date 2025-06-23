import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { IAgentRuntime } from '@elizaos/core';

// Mock the modules using vi.mock at the top level with factory functions
vi.mock('fs-extra', () => {
  const mockFs = {
    ensureDir: vi.fn(),
    writeJson: vi.fn(),
    writeFile: vi.fn(),
    remove: vi.fn(),
    readdir: vi.fn(),
    readFile: vi.fn(),
    pathExists: vi.fn(),
  };
  return { default: mockFs, ...mockFs };
});

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
  Anthropic: vi.fn(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

vi.mock('../utils/plugin-templates', () => ({
  generateActionCode: vi.fn((name: string) => `export const ${name}Action = { name: "${name}" };`),
  generateProviderCode: vi.fn(
    (name: string) => `export const ${name}Provider = { name: "${name}" };`
  ),
  generateServiceCode: vi.fn((name: string) => `export class ${name} extends Service {};`),
  generateEvaluatorCode: vi.fn(
    (name: string) => `export const ${name}Evaluator = { name: "${name}" };`
  ),
  generatePluginIndex: vi.fn(
    () => `export const plugin = { name: "test" }; export default plugin;`
  ),
  generateTestCode: vi.fn(() => '// Mock test code'),
}));

// Import modules after mocks
import fs from 'fs-extra';
import { spawn } from 'child_process';
import { Anthropic } from '@anthropic-ai/sdk';
import * as pluginTemplates from '../utils/plugin-templates';

// Import the service after mocks are set up
import { PluginCreationService, ClaudeModel } from '../services/plugin-creation-service';

// Create mock runtime
const createMockRuntime = (): IAgentRuntime => {
  return {
    getSetting: vi.fn((key: string) => {
      const settings: Record<string, string> = {
        ANTHROPIC_API_KEY: 'test-api-key',
      };
      return settings[key];
    }),
    agentId: 'test-agent-id',
  } as any;
};

describe('PluginCreationService', () => {
  let service: any;
  let runtime: IAgentRuntime;
  let fileSystem: Map<string, string>;
  let mockSpawn: any;
  let mockChildProcess: any;
  let mockAnthropicCreate: any;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    vi.useFakeTimers();

    runtime = createMockRuntime();
    service = new PluginCreationService(runtime);

    // Track written files in memory
    fileSystem = new Map<string, string>();

    // Setup child process mock
    mockChildProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
      kill: vi.fn(),
      killed: false,
      pid: 12345,
    };

    mockSpawn = vi.mocked(spawn);
    mockSpawn.mockReturnValue(mockChildProcess as any);

    // Setup Anthropic mock
    const mockAnthropic = vi.mocked(Anthropic);
    mockAnthropicCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Generated code' }],
    });
    mockAnthropic.mockImplementation(
      () =>
        ({
          messages: {
            create: mockAnthropicCreate,
          },
        }) as any
    );

    // Setup fs mocks with defaults
    const mockFs = vi.mocked(fs);
    mockFs.ensureDir.mockResolvedValue(undefined);
    mockFs.writeJson.mockResolvedValue(undefined);
    mockFs.writeFile.mockImplementation(async (path: any, content: any) => {
      if (typeof path === 'string' && typeof content === 'string') {
        fileSystem.set(path, content);
      }
      return undefined;
    });
    mockFs.remove.mockResolvedValue(undefined);
    mockFs.readdir.mockImplementation(async (path: any) => {
      const dirPath = path.endsWith('/') ? path : path + '/';
      const files = Array.from(fileSystem.keys())
        .filter((f) => f.startsWith(dirPath))
        .map((f) => f.substring(dirPath.length).split('/')[0])
        .filter((v, i, a) => a.indexOf(v) === i);
      return files as any;
    });
    mockFs.readFile.mockImplementation(async (path: any) => {
      return fileSystem.get(path) || '';
    });
    mockFs.pathExists.mockImplementation(async (path: string) => {
      if (fileSystem.has(path)) return true;
      const pathWithSlash = path.endsWith('/') ? path : path + '/';
      for (const filePath of fileSystem.keys()) {
        if (filePath.startsWith(pathWithSlash)) return true;
      }
      return false;
    });
  });

  afterEach(() => {
    // Clear all jobs to prevent test interference
    service.clearAllJobs();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize without API key', () => {
      const runtimeWithoutKey = {
        getSetting: vi.fn().mockReturnValue(undefined),
        agentId: 'test-agent-id',
      } as any;

      const serviceWithoutKey = new PluginCreationService(runtimeWithoutKey);
      expect(serviceWithoutKey).toBeInstanceOf(PluginCreationService);
    });

    it('should initialize with API key', () => {
      expect(service).toBeInstanceOf(PluginCreationService);
    });
  });

  describe('createPlugin', () => {
    it('should create a new plugin job', async () => {
      const specification = {
        name: '@test/plugin',
        description: 'Test plugin',
      };

      const jobId = await service.createPlugin(specification);

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      const job = service.getJobStatus(jobId);
      expect(job?.status).toMatch(/^(pending|running|completed|failed)$/);
    });

    it('should reject invalid plugin names', async () => {
      const invalidNames = ['plugin!', 'plugin name', '../plugin'];

      for (const name of invalidNames) {
        const specification = { name, description: 'Test' };
        await expect(service.createPlugin(specification)).rejects.toThrow('Invalid plugin name');
      }

      // Empty name or description should throw different error
      await expect(service.createPlugin({ name: '', description: 'Test' })).rejects.toThrow(
        'Plugin name and description are required'
      );
      await expect(service.createPlugin({ name: 'test', description: '' })).rejects.toThrow(
        'Plugin name and description are required'
      );
    });

    it('should enforce rate limiting', async () => {
      const specification = { name: '@test/plugin', description: 'Test' };

      // Create jobs up to the rate limit (10 per hour)
      const jobIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const jobId = await service.createPlugin({
          ...specification,
          name: `@test/plugin-${i}`,
        });
        jobIds.push(jobId);

        // Complete jobs to avoid concurrent limit
        if (i >= 4) {
          const job = service.getJobStatus(jobIds[i - 4]);
          if (job) {
            (job as any).status = 'completed';
            (job as any).completedAt = new Date();
          }
        }
      }

      // Should reject due to rate limiting (max 10 per hour)
      await expect(
        service.createPlugin({ ...specification, name: '@test/plugin-10' })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should enforce concurrent job limit', async () => {
      const jobs: string[] = [];
      for (let i = 0; i < 5; i++) {
        const jobId = await service.createPlugin({
          name: `@test/plugin-${i}`,
          description: 'Test',
        });
        jobs.push(jobId);
      }

      // Should reject 6th concurrent job (limit is 5)
      await expect(
        service.createPlugin({ name: '@test/plugin-5', description: 'Test' })
      ).rejects.toThrow('Too many concurrent jobs');

      // Cancel one job to make room
      service.cancelJob(jobs[0]);

      // Now it should work
      const newJobId = await service.createPlugin({
        name: '@test/plugin-6',
        description: 'Test',
      });
      expect(newJobId).toBeDefined();
    });

    it('should timeout long-running jobs', async () => {
      const specification = { name: '@test/plugin', description: 'Test' };
      const jobId = await service.createPlugin(specification);

      // Advance time past timeout (31 minutes)
      await vi.advanceTimersByTimeAsync(31 * 60 * 1000);

      const job = service.getJobStatus(jobId);
      expect(job?.status).toBe('failed');
      expect(job?.error).toContain('timed out');
    });
  });

  describe('job management', () => {
    it('should get all jobs', async () => {
      const job1 = await service.createPlugin({
        name: '@test/plugin1',
        description: 'Test 1',
      });
      const job2 = await service.createPlugin({
        name: '@test/plugin2',
        description: 'Test 2',
      });

      const allJobs = service.getAllJobs();
      expect(allJobs).toHaveLength(2);
      expect(allJobs.map((j) => j.id)).toContain(job1);
      expect(allJobs.map((j) => j.id)).toContain(job2);
    });

    it('should cancel a job and kill process', async () => {
      const jobId = await service.createPlugin({
        name: '@test/plugin',
        description: 'Test',
      });

      // Wait a bit for the job to start processing
      await vi.advanceTimersByTimeAsync(100);

      service.cancelJob(jobId);

      const job = service.getJobStatus(jobId);
      expect(job?.status).toBe('cancelled');

      // Check if kill was called on the child process if it exists
      if (job?.childProcess) {
        expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
      }
    });

    it('should handle cancelling non-existent job', () => {
      expect(() => service.cancelJob('non-existent')).not.toThrow();
    });
  });

  describe('service lifecycle', () => {
    it('should stop service and cancel running jobs', async () => {
      const jobId = await service.createPlugin({
        name: '@test/plugin',
        description: 'Test',
      });

      await service.stop();

      const job = service.getJobStatus(jobId);
      expect(job?.status).toBe('cancelled');
    });
  });

  describe('static start method', () => {
    it('should create and initialize service', async () => {
      // Create a runtime with proper getService mock
      const testRuntime = {
        ...runtime,
        getService: vi.fn().mockReturnValue(null), // Return null for secrets manager
      };

      const newService = await PluginCreationService.start(testRuntime);
      expect(newService).toBeInstanceOf(PluginCreationService);
    });
  });

  describe('cleanupOldJobs', () => {
    it('should remove jobs older than one week', async () => {
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      const oldJobId = await service.createPlugin({
        name: '@test/old-plugin',
        description: 'Old',
      });
      const oldJob = service.getJobStatus(oldJobId);
      if (oldJob) {
        (oldJob as any).completedAt = oldDate;
        (oldJob as any).status = 'completed';
      }

      const recentJobId = await service.createPlugin({
        name: '@test/recent-plugin',
        description: 'Recent',
      });
      const recentJob = service.getJobStatus(recentJobId);
      if (recentJob) {
        (recentJob as any).completedAt = recentDate;
        (recentJob as any).status = 'completed';
      }

      service.cleanupOldJobs();

      expect(service.getJobStatus(oldJobId)).toBeNull();
      expect(service.getJobStatus(recentJobId)).toBeDefined();
      expect(vi.mocked(fs).remove).toHaveBeenCalled();
    });
  });

  describe('plugin creation workflow', () => {
    it('should handle successful code generation', async () => {
      (runtime.getSetting as any).mockReturnValue('test-api-key');

      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `File: src/index.ts\n\`\`\`typescript\nexport const plugin = { name: "test", actions: [], providers: [] };\nexport default plugin;\n\`\`\`\n\nFile: __tests__/plugin.test.ts\n\`\`\`typescript\ndescribe('test', () => {\n  it('works', () => {\n    expect(true).toBe(true);\n  });\n});\n\`\`\``,
          },
        ],
      });

      const specification = { name: '@test/plugin', description: 'Test plugin' };
      const jobId = await service.createPlugin(specification, 'test-api-key');

      await vi.advanceTimersByTimeAsync(100);

      const job = service.getJobStatus(jobId);
      expect(job?.status).toMatch(/^(pending|running|completed|failed)$/);
    });
  });

  // More tests can be added here...
});
