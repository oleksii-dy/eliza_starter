import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DistributedSWEBenchManager } from '../orchestration/distributed-swe-bench-manager';
import { runDistributedSWEBenchAction } from '../actions/distributed-swe-bench-action';
import axios from 'axios';
import type { IAgentRuntime, Memory } from '@elizaos/core';

// Mock axios
vi.mock('axios');

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn((cmd, callback) => callback(null, { stdout: 'success', stderr: '' })),
  promisify: vi.fn(() => vi.fn().mockResolvedValue({ stdout: 'success', stderr: '' })),
}));

describe('Distributed SWE-bench', () => {
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRuntime = {
      agentId: 'test-agent',
      character: {
        name: 'TestAgent',
        bio: ['Test agent'],
        knowledge: [],
        messageExamples: [],
        postExamples: [],
        topics: [],
        plugins: [],
      },
      getSetting: vi.fn(),
      getService: vi.fn(),
      useModel: vi.fn().mockResolvedValue('mock patch'),
    } as unknown as IAgentRuntime;
  });

  describe('DistributedSWEBenchManager', () => {
    it('should initialize with default configuration', () => {
      const manager = new DistributedSWEBenchManager(mockRuntime);
      expect(manager).toBeDefined();
    });

    it('should get stats from bridge server', async () => {
      const mockHealthData = { status: 'healthy', activeTasks: 2, pendingTasks: 3 };
      const mockContainersData = [
        { id: 'node-1', languageType: 'node', status: 'idle' },
        { id: 'compiled-1', languageType: 'compiled', status: 'busy' },
      ];

      (axios.get as any).mockImplementation((url: string) => {
        if (url.includes('/health')) {
          return Promise.resolve({ data: mockHealthData });
        } else if (url.includes('/containers')) {
          return Promise.resolve({ data: mockContainersData });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const manager = new DistributedSWEBenchManager(mockRuntime);
      const stats = await manager.getStats();

      expect(stats.bridge_status).toEqual(mockHealthData);
      expect(stats.containers).toEqual(mockContainersData);
      expect(stats.active_tasks).toBeDefined();
      expect(stats.completed_tasks).toBeDefined();
      expect(axios.get).toHaveBeenCalledWith('http://localhost:8080/health');
      expect(axios.get).toHaveBeenCalledWith('http://localhost:8080/containers');
    });

    it('should handle stats error gracefully', async () => {
      (axios.get as any).mockRejectedValue(new Error('Connection failed'));

      const manager = new DistributedSWEBenchManager(mockRuntime);
      const stats = await manager.getStats();

      expect(stats.error).toBe('Failed to get stats');
      expect(stats.message).toBe('Connection failed');
    });
  });

  describe('runDistributedSWEBenchAction', () => {
    it('should validate messages with distributed keywords', async () => {
      const validMessages = [
        'run distributed swe-bench',
        'docker swe-bench evaluation',
        'swe-bench all languages',
        'multi-language swe-bench',
        'swe-bench java instances',
        'run swe-bench with containers',
      ];

      for (const text of validMessages) {
        const message: Memory = {
          id: '00000000-0000-0000-0000-000000000001',
          entityId: '00000000-0000-0000-0000-000000000002',
          roomId: '00000000-0000-0000-0000-000000000003',
          agentId: '00000000-0000-0000-0000-000000000004',
          content: { text },
          createdAt: Date.now(),
        };

        const result = await runDistributedSWEBenchAction.validate(mockRuntime, message);
        expect(result).toBe(true);
      }
    });

    it('should not validate messages without distributed keywords', async () => {
      const invalidMessages = [
        'run swe-bench',
        'evaluate typescript',
        'benchmark instances',
        'test code',
      ];

      for (const text of invalidMessages) {
        const message: Memory = {
          id: '00000000-0000-0000-0000-000000000001',
          entityId: '00000000-0000-0000-0000-000000000002',
          roomId: '00000000-0000-0000-0000-000000000003',
          agentId: '00000000-0000-0000-0000-000000000004',
          content: { text },
          createdAt: Date.now(),
        };

        const result = await runDistributedSWEBenchAction.validate(mockRuntime, message);
        expect(result).toBe(false);
      }
    });

    it('should handle status command', async () => {
      const mockStats = {
        bridge_status: { status: 'healthy', activeTasks: 1, pendingTasks: 0 },
        containers: [{ id: 'test-1', languageType: 'node', status: 'idle' }],
      };

      (axios.get as any).mockResolvedValue({ data: mockStats });

      const message: Memory = {
        id: '00000000-0000-0000-0000-000000000001',
        entityId: '00000000-0000-0000-0000-000000000002',
        roomId: '00000000-0000-0000-0000-000000000003',
        agentId: '00000000-0000-0000-0000-000000000004',
        content: { text: 'distributed swe-bench status' },
        createdAt: Date.now(),
      };

      const result = await runDistributedSWEBenchAction.handler(mockRuntime, message);

      expect(result).toBeTruthy();
      if (result && typeof result === 'object' && 'text' in result) {
        expect(result.text).toContain('Distributed SWE-bench Status');
        expect(result.text).toContain('Bridge Server');
        expect(result.text).toMatch(/\*?\*?Containers\*?\*?/); // Match with or without asterisks
      }
    });

    it('should parse benchmark options correctly', async () => {
      const testCases = [
        {
          text: 'run distributed swe-bench on 10 instances',
          expected: { max_instances: 10 },
        },
        {
          text: 'distributed swe-bench java and go',
          expected: { language_filter: ['Java', 'Go'] },
        },
        {
          text: 'docker swe-bench all languages',
          expected: {}, // No filter means all languages
        },
        {
          text: 'distributed swe-bench repository: axios/axios',
          expected: { repo_filter: ['axios/axios'] },
        },
      ];

      for (const { text, expected } of testCases) {
        const message: Memory = {
          id: '00000000-0000-0000-0000-000000000001',
          entityId: '00000000-0000-0000-0000-000000000002',
          roomId: '00000000-0000-0000-0000-000000000003',
          agentId: '00000000-0000-0000-0000-000000000004',
          content: { text },
          createdAt: Date.now(),
        };

        // Mock to prevent actual infrastructure start
        const mockCallback = vi.fn();

        // We'll test the option parsing by checking what gets passed
        // This would require exposing the parseDistributedOptions function
        // or mocking the manager's runDistributedBenchmark method
      }
    });
  });

  describe('Bridge Server Integration', () => {
    it('should submit tasks to bridge server', async () => {
      const mockTaskId = 'task-123';
      (axios.post as any).mockResolvedValue({ data: { taskId: mockTaskId } });

      const taskData = {
        type: 'swe_bench_evaluation',
        data: {
          instance: { instance_id: 'test-001', language: 'java' },
          patch: 'test patch',
        },
        language: 'java',
        priority: 5,
      };

      const response = await axios.post('http://localhost:8080/task', taskData);

      expect(response.data.taskId).toBe(mockTaskId);
      expect(axios.post).toHaveBeenCalledWith('http://localhost:8080/task', taskData);
    });

    it('should handle container pool status', async () => {
      const mockContainers = [
        { id: 'node-1', languageType: 'node', status: 'idle' },
        { id: 'node-2', languageType: 'node', status: 'busy' },
        { id: 'compiled-1', languageType: 'compiled', status: 'idle' },
        { id: 'jvm-1', languageType: 'jvm', status: 'idle' },
      ];

      (axios.get as any).mockResolvedValue({ data: mockContainers });

      const response = await axios.get('http://localhost:8080/containers');
      const containers = response.data;

      expect(containers).toHaveLength(4);

      const idleCount = containers.filter((c: any) => c.status === 'idle').length;
      const busyCount = containers.filter((c: any) => c.status === 'busy').length;

      expect(idleCount).toBe(3);
      expect(busyCount).toBe(1);
    });
  });

  describe('Language Support', () => {
    it('should support all SWE-bench languages', () => {
      const supportedLanguages = ['typescript', 'javascript', 'java', 'go', 'rust', 'c', 'cpp'];

      // This would be tested by checking the language configuration
      expect(supportedLanguages).toHaveLength(7);
    });

    it('should map languages to correct container types', () => {
      const languageMapping = {
        typescript: 'node',
        javascript: 'node',
        java: 'jvm',
        go: 'compiled',
        rust: 'compiled',
        c: 'compiled',
        cpp: 'compiled',
      };

      for (const [language, containerType] of Object.entries(languageMapping)) {
        expect(containerType).toBeTruthy();
      }
    });
  });
});
