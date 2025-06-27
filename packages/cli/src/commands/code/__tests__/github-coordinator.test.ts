import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { GitHubCoordinator, type GitHubCoordinatorOptions } from '../services/github-coordinator.js';

// Mock fs operations
const mockFs = {
  mkdir: mock(() => Promise.resolve()),
  writeFile: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve('{}')),
  access: mock(() => Promise.reject(new Error('File not found'))),
  readdir: mock(() => Promise.resolve([])),
};

const mockPath = {
  dirname: mock(() => '/test/dir'),
  resolve: mock(() => '/test/dir/.github-cache'),
  join: mock((...args: string[]) => args.join('/')),
};

// Apply mocks
mock.module('fs/promises', () => mockFs);
mock.module('path', () => mockPath);

// Mock dependencies
const mockTelemetryService = {
  logEvent: mock(() => Promise.resolve()),
  start: mock(() => Promise.resolve()),
  stop: mock(() => Promise.resolve()),
};

const mockErrorLogService = {
  logError: mock(() => Promise.resolve()),
  logWarning: mock(() => Promise.resolve()),
  start: mock(() => Promise.resolve()),
  stop: mock(() => Promise.resolve()),
};

// Mock fetch for GitHub API
global.fetch = mock();
const mockFetch = mock.module('fetch', () => global.fetch);

describe('GitHubCoordinator', () => {
  let gitHubCoordinator: GitHubCoordinator;
  let mockOptions: GitHubCoordinatorOptions;

  beforeEach(() => {
    // Clear all mocks
    Object.values(mockFs).forEach(mockFn => mockFn.mockReset());
    Object.values(mockPath).forEach(mockFn => mockFn.mockReset());
    mockTelemetryService.logEvent.mockReset();
    mockErrorLogService.logError.mockReset();
    global.fetch.mockReset();
    
    mockOptions = {
      githubToken: 'ghp_test_token_1234567890',
      organizationName: 'test-org',
      artifactRepository: 'test-artifacts',
      telemetryService: mockTelemetryService as any,
      errorLogService: mockErrorLogService as any,
      debug: true,
    };

    // Setup path mocks
    mockPath.dirname.mockReturnValue('/test/dir');
    mockPath.resolve.mockReturnValue('/test/dir/.github-cache');
    mockPath.join.mockImplementation((...args) => args.join('/'));

    // Setup fs mocks
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{}');
    mockFs.access.mockRejectedValue(new Error('File not found'));
    mockFs.readdir.mockResolvedValue([]);

    // Setup fetch mocks for GitHub API
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    } as Response);

    gitHubCoordinator = new GitHubCoordinator(mockOptions);
  });

  afterEach(async () => {
    if (gitHubCoordinator) {
      await gitHubCoordinator.stop();
    }
  });

  describe('initialization', () => {
    it('should create a GitHubCoordinator instance', () => {
      expect(gitHubCoordinator).toBeInstanceOf(GitHubCoordinator);
    });

    it('should start successfully with valid token', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ login: 'test-user' }),
      } as Response);

      await expect(gitHubCoordinator.start()).resolves.not.toThrow();
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'github_coordinator_started',
        expect.objectContaining({
          organizationName: 'test-org',
          artifactRepository: 'test-artifacts',
        }),
        'github'
      );
    });

    it('should handle invalid GitHub token', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Bad credentials' }),
      } as Response);

      await expect(gitHubCoordinator.start()).rejects.toThrow('GitHub authentication failed');
      expect(mockErrorLogService.logError).toHaveBeenCalled();
    });

    it('should handle network errors during authentication', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(gitHubCoordinator.start()).rejects.toThrow('Network error');
      expect(mockErrorLogService.logError).toHaveBeenCalled();
    });

    it('should skip initialization when disabled', async () => {
      const disabledCoordinator = new GitHubCoordinator({
        ...mockOptions,
        githubToken: undefined,
      });

      await disabledCoordinator.start();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });

    it('should create cache directory', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ login: 'test-user' }),
      } as Response);

      await gitHubCoordinator.start();
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.github-cache'),
        { recursive: true }
      );
    });
  });

  describe('repository management', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ login: 'test-user' }),
      } as Response);
      await gitHubCoordinator.start();
    });

    it('should create repository successfully', async () => {
      const mockRepo = {
        id: 12345,
        name: 'test-repo',
        full_name: 'test-org/test-repo',
        html_url: 'https://github.com/test-org/test-repo',
        clone_url: 'https://github.com/test-org/test-repo.git',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockRepo),
      } as Response);

      const result = await gitHubCoordinator.createRepository({
        name: 'test-repo',
        description: 'Test repository',
        private: true,
      });

      expect(result).toEqual(mockRepo);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/orgs/test-org/repos',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'token ghp_test_token_1234567890',
          }),
          body: JSON.stringify({
            name: 'test-repo',
            description: 'Test repository',
            private: true,
          }),
        })
      );
    });

    it('should handle repository creation errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () => Promise.resolve({
          message: 'Repository creation failed',
          errors: [{ message: 'name already exists' }],
        }),
      } as Response);

      await expect(gitHubCoordinator.createRepository({
        name: 'existing-repo',
        description: 'Test',
      })).rejects.toThrow('Repository creation failed');

      expect(mockErrorLogService.logError).toHaveBeenCalled();
    });

    it('should get repository information', async () => {
      const mockRepo = {
        id: 12345,
        name: 'test-repo',
        full_name: 'test-org/test-repo',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRepo),
      } as Response);

      const result = await gitHubCoordinator.getRepository('test-repo');
      
      expect(result).toEqual(mockRepo);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/test-org/test-repo',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'token ghp_test_token_1234567890',
          }),
        })
      );
    });

    it('should handle repository not found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not Found' }),
      } as Response);

      const result = await gitHubCoordinator.getRepository('nonexistent-repo');
      expect(result).toBeNull();
    });

    it('should list repositories', async () => {
      const mockRepos = [
        { id: 1, name: 'repo1', full_name: 'test-org/repo1' },
        { id: 2, name: 'repo2', full_name: 'test-org/repo2' },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRepos),
      } as Response);

      const result = await gitHubCoordinator.listRepositories();
      
      expect(result).toEqual(mockRepos);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/orgs/test-org/repos?type=all&sort=updated&direction=desc',
        expect.any(Object)
      );
    });
  });

  describe('coordination session management', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ login: 'test-user' }),
      } as Response);
      await gitHubCoordinator.start();
    });

    it('should create coordination session', async () => {
      const sessionConfig = {
        projectName: 'test-project',
        description: 'Test project description',
        agents: ['agent1', 'agent2'],
        repositoryTemplate: 'basic-web',
      };

      const sessionId = await gitHubCoordinator.createCoordinationSession(sessionConfig);
      
      expect(sessionId).toMatch(/^session-\d+-.{6}$/);
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'coordination_session_created',
        expect.objectContaining({
          sessionId,
          projectName: 'test-project',
          agentCount: 2,
        }),
        'github'
      );
    });

    it('should get session status', async () => {
      const sessionConfig = {
        projectName: 'test-project',
        description: 'Test project',
        agents: ['agent1'],
      };

      const sessionId = await gitHubCoordinator.createCoordinationSession(sessionConfig);
      const status = await gitHubCoordinator.getSessionStatus(sessionId);
      
      expect(status).toEqual({
        sessionId,
        status: 'active',
        projectName: 'test-project',
        agents: ['agent1'],
        createdAt: expect.any(String),
        lastActivity: expect.any(String),
        repositoryUrl: '',
        artifactCount: 0,
      });
    });

    it('should handle invalid session ID', async () => {
      const status = await gitHubCoordinator.getSessionStatus('invalid-session');
      expect(status).toBeNull();
    });

    it('should end coordination session', async () => {
      const sessionId = await gitHubCoordinator.createCoordinationSession({
        projectName: 'test-project',
        description: 'Test',
        agents: ['agent1'],
      });

      await expect(gitHubCoordinator.endCoordinationSession(sessionId)).resolves.not.toThrow();
      
      const status = await gitHubCoordinator.getSessionStatus(sessionId);
      expect(status?.status).toBe('completed');
    });

    it('should list active sessions', async () => {
      await gitHubCoordinator.createCoordinationSession({
        projectName: 'project1',
        description: 'Test 1',
        agents: ['agent1'],
      });

      await gitHubCoordinator.createCoordinationSession({
        projectName: 'project2',
        description: 'Test 2',
        agents: ['agent2'],
      });

      const sessions = await gitHubCoordinator.listActiveSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions.every(s => s.status === 'active')).toBe(true);
    });
  });

  describe('artifact management', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ login: 'test-user' }),
      } as Response);
      await gitHubCoordinator.start();
    });

    it('should store artifact successfully', async () => {
      const sessionId = await gitHubCoordinator.createCoordinationSession({
        projectName: 'test-project',
        description: 'Test',
        agents: ['agent1'],
      });

      const artifact = {
        name: 'test-artifact.js',
        content: 'console.log("Hello, World!");',
        type: 'code' as const,
        agentId: 'agent1',
      };

      // Mock file creation
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ sha: 'abc123' }),
      } as Response);

      const result = await gitHubCoordinator.storeArtifact(sessionId, artifact);
      
      expect(result).toEqual({
        id: expect.any(String),
        sessionId,
        name: 'test-artifact.js',
        path: expect.stringContaining('test-artifact.js'),
        type: 'code',
        agentId: 'agent1',
        version: 1,
        createdAt: expect.any(String),
        githubUrl: expect.any(String),
      });
    });

    it('should retrieve artifact', async () => {
      const sessionId = await gitHubCoordinator.createCoordinationSession({
        projectName: 'test-project',
        description: 'Test',
        agents: ['agent1'],
      });

      // Store an artifact first
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ sha: 'abc123' }),
      } as Response);

      const stored = await gitHubCoordinator.storeArtifact(sessionId, {
        name: 'test.js',
        content: 'test content',
        type: 'code',
        agentId: 'agent1',
      });

      // Mock file retrieval
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          content: Buffer.from('test content').toString('base64'),
          encoding: 'base64',
        }),
      } as Response);

      const retrieved = await gitHubCoordinator.getArtifact(sessionId, stored.id);
      
      expect(retrieved).toEqual({
        ...stored,
        content: 'test content',
      });
    });

    it('should list artifacts for session', async () => {
      const sessionId = await gitHubCoordinator.createCoordinationSession({
        projectName: 'test-project',
        description: 'Test',
        agents: ['agent1'],
      });

      // Store multiple artifacts
      for (let i = 1; i <= 3; i++) {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ sha: `abc${i}` }),
        } as Response);

        await gitHubCoordinator.storeArtifact(sessionId, {
          name: `test${i}.js`,
          content: `content ${i}`,
          type: 'code',
          agentId: 'agent1',
        });
      }

      const artifacts = await gitHubCoordinator.listArtifacts(sessionId);
      expect(artifacts).toHaveLength(3);
      expect(artifacts.every(a => a.sessionId === sessionId)).toBe(true);
    });

    it('should handle artifact storage errors', async () => {
      const sessionId = await gitHubCoordinator.createCoordinationSession({
        projectName: 'test-project',
        description: 'Test',
        agents: ['agent1'],
      });

      // Mock GitHub API error
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ message: 'Validation Failed' }),
      } as Response);

      await expect(gitHubCoordinator.storeArtifact(sessionId, {
        name: 'invalid.js',
        content: 'content',
        type: 'code',
        agentId: 'agent1',
      })).rejects.toThrow('Failed to store artifact');

      expect(mockErrorLogService.logError).toHaveBeenCalled();
    });
  });

  describe('export functionality', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ login: 'test-user' }),
      } as Response);
      await gitHubCoordinator.start();
    });

    it('should export session data', async () => {
      const sessionId = await gitHubCoordinator.createCoordinationSession({
        projectName: 'test-project',
        description: 'Test export',
        agents: ['agent1', 'agent2'],
      });

      // Store some artifacts
      global.fetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ sha: 'abc123' }),
      } as Response);

      await gitHubCoordinator.storeArtifact(sessionId, {
        name: 'test.js',
        content: 'test content',
        type: 'code',
        agentId: 'agent1',
      });

      const exportData = await gitHubCoordinator.exportSession(sessionId);
      
      expect(exportData).toEqual({
        sessionId,
        projectName: 'test-project',
        description: 'Test export',
        agents: ['agent1', 'agent2'],
        artifacts: expect.arrayContaining([
          expect.objectContaining({
            name: 'test.js',
            type: 'code',
            agentId: 'agent1',
          }),
        ]),
        summary: expect.objectContaining({
          totalArtifacts: 1,
          artifactsByType: expect.any(Object),
          artifactsByAgent: expect.any(Object),
        }),
        exportedAt: expect.any(String),
      });
    });

    it('should handle export of non-existent session', async () => {
      await expect(gitHubCoordinator.exportSession('invalid-session')).rejects.toThrow(
        'Session invalid-session not found'
      );
    });
  });

  describe('caching', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ login: 'test-user' }),
      } as Response);
      await gitHubCoordinator.start();
    });

    it('should cache repository information', async () => {
      const mockRepo = { id: 12345, name: 'test-repo' };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRepo),
      } as Response);

      // First call should hit the API
      const result1 = await gitHubCoordinator.getRepository('test-repo');
      expect(result1).toEqual(mockRepo);
      expect(global.fetch).toHaveBeenCalledTimes(2); // auth + repo call

      // Second call should use cache
      const result2 = await gitHubCoordinator.getRepository('test-repo');
      expect(result2).toEqual(mockRepo);
      expect(global.fetch).toHaveBeenCalledTimes(2); // No additional API calls
    });

    it('should respect cache TTL', async () => {
      // This test would require time manipulation to test cache expiration
      // For now, just verify cache is being used
      const mockRepo = { id: 12345, name: 'test-repo' };
      
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockRepo),
      } as Response);

      await gitHubCoordinator.getRepository('test-repo');
      await gitHubCoordinator.getRepository('test-repo');
      
      // Should only make one API call (plus auth)
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling and resilience', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ login: 'test-user' }),
      } as Response);
      await gitHubCoordinator.start();
    });

    it('should handle rate limiting', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Headers({
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
        }),
        json: () => Promise.resolve({ message: 'API rate limit exceeded' }),
      } as Response);

      await expect(gitHubCoordinator.getRepository('test-repo')).rejects.toThrow(
        'GitHub API rate limit exceeded'
      );
    });

    it('should retry on transient errors', async () => {
      // First call fails with 500
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Internal Server Error' }),
      } as Response);

      // Second call succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 12345, name: 'test-repo' }),
      } as Response);

      const result = await gitHubCoordinator.getRepository('test-repo');
      expect(result).toEqual({ id: 12345, name: 'test-repo' });
      
      // Should have made the retry call
      expect(global.fetch).toHaveBeenCalledTimes(3); // auth + first attempt + retry
    });

    it('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(gitHubCoordinator.getRepository('test-repo')).rejects.toThrow('Network error');
      expect(mockErrorLogService.logError).toHaveBeenCalled();
    });
  });

  describe('stop and cleanup', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ login: 'test-user' }),
      } as Response);
      await gitHubCoordinator.start();
    });

    it('should stop gracefully', async () => {
      await expect(gitHubCoordinator.stop()).resolves.not.toThrow();
      expect(mockFs.writeFile).toHaveBeenCalled(); // Cache written
    });

    it('should handle stop errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));
      await expect(gitHubCoordinator.stop()).resolves.not.toThrow();
    });

    it('should write final session summary on stop', async () => {
      const sessionId = await gitHubCoordinator.createCoordinationSession({
        projectName: 'test-project',
        description: 'Test',
        agents: ['agent1'],
      });

      await gitHubCoordinator.stop();
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('sessions-summary.json'),
        expect.any(String),
        'utf8'
      );
    });
  });
});