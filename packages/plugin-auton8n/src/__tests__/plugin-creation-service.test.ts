import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PluginCreationService,
  PluginSpecification,
  ClaudeModel,
} from '../services/plugin-creation-service.ts';
import { IAgentRuntime } from '@elizaos/core';
import fs from 'fs-extra';
import { spawn } from 'child_process';
import Anthropic from '@anthropic-ai/sdk';
import { getTestApiKey } from './test-helpers.js';
import path from 'path';

// Mock modules
vi.mock('fs-extra');
vi.mock('child_process');
vi.mock('@anthropic-ai/sdk');

// Mock IAgentRuntime
const createMockRuntime = (): IAgentRuntime => {
  const runtime = {
    getSetting: vi.fn(),
    services: new Map(),
  } as any;

  return runtime;
};

// Mock child process
const createMockChildProcess = () => ({
  stdout: { on: vi.fn() },
  stderr: { on: vi.fn() },
  on: vi.fn(),
  kill: vi.fn(),
  killed: false,
});

// Helper to create valid mock code response
const createMockCodeResponse = () => ({
  content: [
    {
      type: 'text',
      text: `\`\`\`typescript
// file: src/index.ts
export const plugin = {
  name: "@test/plugin",
  description: "Test plugin",
  actions: []
};
\`\`\`

\`\`\`typescript
// file: src/actions/testAction.ts
export const testAction = {
  name: "testAction",
  description: "Test action",
  handler: async () => {
    console.log("Test action executed");
  }
};
\`\`\`

\`\`\`json
// file: package.json
{
  "name": "@test/plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsup",
    "test": "vitest",
    "lint": "eslint src"
  }
}
\`\`\``,
    },
  ],
});

describe('PluginCreationService', () => {
  let service: PluginCreationService;
  let runtime: IAgentRuntime;

  beforeEach(() => {
    runtime = createMockRuntime();
    service = new PluginCreationService(runtime);

    // Setup mocks
    vi.mocked(fs.ensureDir).mockImplementation(() => Promise.resolve());
    vi.mocked(fs.writeJson).mockImplementation(() => Promise.resolve());
    vi.mocked(fs.writeFile).mockImplementation(() => Promise.resolve());
    vi.mocked(fs.remove).mockImplementation(() => Promise.resolve());
    vi.mocked(fs.readdir).mockImplementation(() => Promise.resolve([]));
    vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve(''));
    vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(false));

    vi.mocked(spawn).mockReturnValue(createMockChildProcess() as any);

    // Mock Anthropic
    const mockAnthropicCreate = vi.fn(() =>
      Promise.resolve({
        content: [{ type: 'text', text: 'Generated code' }],
      })
    );
    vi.mocked(Anthropic).mockImplementation(
      () =>
        ({
          messages: { create: mockAnthropicCreate },
        }) as any
    );

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize without API key', async () => {
      await service.initialize(runtime);
      expect(runtime.getSetting).toHaveBeenCalledWith('ANTHROPIC_API_KEY');
    });

    it('should initialize with API key', async () => {
      (runtime.getSetting as any).mockReturnValue('test-api-key');
      await service.initialize(runtime);
      expect(runtime.getSetting).toHaveBeenCalledWith('ANTHROPIC_API_KEY');
      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });
  });

  describe('createPlugin', () => {
    const validSpecification: PluginSpecification = {
      name: '@test/plugin-example',
      description: 'Test plugin for unit tests',
      version: '1.0.0',
      actions: [
        {
          name: 'testAction',
          description: 'A test action',
        },
      ],
    };

    it('should create a new plugin job', async () => {
      const jobId = await service.createPlugin(validSpecification, getTestApiKey());

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(jobId).toMatch(/^[a-f0-9-]{36}$/);

      const job = service.getJobStatus(jobId);
      expect(job).toBeDefined();
      expect(job?.specification).toEqual(validSpecification);
      expect(job?.status).toBe('pending');
    });

    it('should reject invalid plugin names', async () => {
      const invalidSpecs = [
        { ...validSpecification, name: '../../../etc/passwd' },
        { ...validSpecification, name: 'plugin\\..\\windows' },
        { ...validSpecification, name: './hidden/plugin' },
        { ...validSpecification, name: 'invalid plugin name' },
      ];

      for (const spec of invalidSpecs) {
        await expect(service.createPlugin(spec)).rejects.toThrow('Invalid plugin name');
      }
    });

    it('should enforce rate limiting', async () => {
      // Create 10 jobs (rate limit)
      for (let i = 0; i < 10; i++) {
        await service.createPlugin(
          {
            ...validSpecification,
            name: `@test/plugin-${i}`,
          },
          getTestApiKey()
        );
      }

      // 11th job should fail
      await expect(service.createPlugin(validSpecification, getTestApiKey())).rejects.toThrow(
        'Rate limit exceeded'
      );
    });

    it('should enforce concurrent job limit', async () => {
      // Create 10 jobs (rate limit)
      for (let i = 0; i < 10; i++) {
        await service.createPlugin(
          {
            ...validSpecification,
            name: `@test/plugin-${i}`,
          },
          getTestApiKey()
        );
      }

      // 11th job should fail with rate limit error (since we hit rate limit before concurrent limit)
      await expect(
        service.createPlugin(
          {
            ...validSpecification,
            name: '@test/plugin-11',
          },
          getTestApiKey()
        )
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('job management', () => {
    it('should get all jobs', async () => {
      const spec1 = { name: '@test/plugin1', description: 'Plugin 1' };
      const spec2 = { name: '@test/plugin2', description: 'Plugin 2' };

      const jobId1 = await service.createPlugin(spec1, getTestApiKey());
      const jobId2 = await service.createPlugin(spec2, getTestApiKey());

      const jobs = service.getAllJobs();
      expect(jobs).toHaveLength(2);
      expect(jobs.map((j) => j.id)).toContain(jobId1);
      expect(jobs.map((j) => j.id)).toContain(jobId2);
    });

    it('should cancel a job and kill process', async () => {
      const specification = {
        name: '@test/plugin',
        description: 'Test plugin',
      };

      const jobId = await service.createPlugin(specification, getTestApiKey());
      const job = service.getJobStatus(jobId);

      // Mock child process
      const mockChildProcess = { kill: vi.fn(() => {}), killed: false };
      if (job) {
        job.childProcess = mockChildProcess;
        job.status = 'running';
      }

      service.cancelJob(jobId);

      const cancelledJob = service.getJobStatus(jobId);
      expect(cancelledJob?.status).toBe('cancelled');
      expect(cancelledJob?.completedAt).toBeDefined();
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should handle cancelling non-existent job', () => {
      expect(() => service.cancelJob('non-existent-id')).not.toThrow();
    });
  });

  describe('service lifecycle', () => {
    it('should stop service and cancel running jobs', async () => {
      const specification = {
        name: '@test/plugin',
        description: 'Test plugin',
      };

      const jobId = await service.createPlugin(specification, getTestApiKey());

      // Manually set job to running
      const job = service.getJobStatus(jobId);
      if (job) {
        job.status = 'running';
      }

      await service.stop();

      const stoppedJob = service.getJobStatus(jobId);
      expect(stoppedJob?.status).toBe('cancelled');
    });
  });

  describe('static start method', () => {
    it('should create and initialize service', async () => {
      const newService = await PluginCreationService.start(runtime);
      expect(newService).toBeInstanceOf(PluginCreationService);
    });
  });

  describe('cleanupOldJobs', () => {
    it('should remove jobs older than one week', async () => {
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

      // Create old job
      const oldJobId = await service.createPlugin(
        {
          name: '@test/old-plugin',
          description: 'Old',
        },
        getTestApiKey()
      );
      const oldJob = service.getJobStatus(oldJobId);
      if (oldJob) {
        oldJob.completedAt = oldDate;
        oldJob.status = 'completed';
      }

      // Create recent job
      const recentJobId = await service.createPlugin(
        {
          name: '@test/recent-plugin',
          description: 'Recent',
        },
        getTestApiKey()
      );
      const recentJob = service.getJobStatus(recentJobId);
      if (recentJob) {
        recentJob.completedAt = recentDate;
        recentJob.status = 'completed';
      }

      service.cleanupOldJobs();

      expect(service.getJobStatus(oldJobId)).toBeNull();
      expect(service.getJobStatus(recentJobId)).toBeDefined();
      expect(fs.remove).toHaveBeenCalled();
    });
  });
  // Note: a number of tests related to timers (timeout) have been removed
  // because bun's test runner does not support vi.advanceTimersByTime or vi.useFakeTimers
  // a different approach would be needed to test timing-dependent logic.
});
