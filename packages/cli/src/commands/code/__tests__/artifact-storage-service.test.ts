import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { ArtifactStorageService, type ArtifactStorageOptions } from '../services/artifact-storage-service.js';

// Mock fs operations
const mockFs = {
  mkdir: mock(() => Promise.resolve()),
  writeFile: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve('test content')),
  access: mock(() => Promise.reject(new Error('File not found'))),
  stat: mock(() => Promise.resolve({ 
    size: 1024,
    isFile: () => true,
    isDirectory: () => false,
    mtime: new Date(),
  })),
  readdir: mock(() => Promise.resolve([])),
  unlink: mock(() => Promise.resolve()),
};

const mockPath = {
  dirname: mock(() => '/test/dir'),
  resolve: mock(() => '/test/dir/.test-artifacts'),
  join: mock((...args: string[]) => args.join('/')),
  extname: mock((filePath: string) => {
    const parts = filePath.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  }),
};

// Apply mocks
mock.module('fs/promises', () => mockFs);
mock.module('path', () => mockPath);

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

const mockGitHubCoordinator = {
  storeArtifact: mock(() => Promise.resolve({
    id: 'artifact-123',
    sessionId: 'session-123',
    name: 'test.js',
    path: 'artifacts/test.js',
    type: 'code',
    agentId: 'agent-1',
    version: 1,
    createdAt: new Date().toISOString(),
    githubUrl: 'https://github.com/test-org/test-repo/blob/main/artifacts/test.js',
  })),
  getArtifact: mock(() => Promise.resolve({
    id: 'artifact-123',
    content: 'test content',
  })),
  listArtifacts: mock(() => Promise.resolve([])),
};

describe('ArtifactStorageService', () => {
  let artifactStorageService: ArtifactStorageService;
  let mockOptions: ArtifactStorageOptions;

  beforeEach(() => {
    // Clear all mocks
    Object.values(mockFs).forEach(mockFn => mockFn.mockReset());
    Object.values(mockPath).forEach(mockFn => mockFn.mockReset());
    mockTelemetryService.logEvent.mockReset();
    mockErrorLogService.logError.mockReset();
    mockErrorLogService.logWarning.mockReset();
    mockGitHubCoordinator.storeArtifact.mockReset();
    mockGitHubCoordinator.getArtifact.mockReset();
    mockGitHubCoordinator.listArtifacts.mockReset();
    
    mockOptions = {
      enabled: true,
      storageDirectory: '.test-artifacts',
      maxArtifactSize: 1024 * 1024, // 1MB
      enableGitHubStorage: true,
      telemetryService: mockTelemetryService as any,
      errorLogService: mockErrorLogService as any,
      githubCoordinator: mockGitHubCoordinator as any,
      debug: true,
    };

    // Setup path mocks
    mockPath.dirname.mockReturnValue('/test/dir');
    mockPath.resolve.mockReturnValue('/test/dir/.test-artifacts');
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.extname.mockImplementation((filePath) => {
      const parts = filePath.split('.');
      return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
    });

    // Setup fs mocks
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('test content');
    mockFs.access.mockRejectedValue(new Error('File not found'));
    mockFs.stat.mockResolvedValue({ 
      size: 1024,
      isFile: () => true,
      isDirectory: () => false,
      mtime: new Date(),
    } as any);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.unlink.mockResolvedValue(undefined);

    artifactStorageService = new ArtifactStorageService(mockOptions);
  });

  afterEach(async () => {
    if (artifactStorageService) {
      await artifactStorageService.stop();
    }
  });

  describe('initialization', () => {
    it('should create an ArtifactStorageService instance', () => {
      expect(artifactStorageService).toBeInstanceOf(ArtifactStorageService);
    });

    it('should start successfully with enabled storage', async () => {
      await expect(artifactStorageService.start()).resolves.not.toThrow();
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.test-artifacts'),
        { recursive: true }
      );
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'artifact_storage_started',
        expect.objectContaining({
          storageDirectory: '.test-artifacts',
          maxArtifactSize: 1024 * 1024,
          enableGitHubStorage: true,
        }),
        'storage'
      );
    });

    it('should skip initialization when disabled', async () => {
      const disabledService = new ArtifactStorageService({ 
        ...mockOptions, 
        enabled: false 
      });
      
      await disabledService.start();
      expect(mockFs.mkdir).not.toHaveBeenCalled();
      expect(mockTelemetryService.logEvent).not.toHaveBeenCalled();
    });

    it('should handle directory creation errors', async () => {
      mockFs.mkdir.mockRejectedValueOnce(new Error('Permission denied'));
      
      await expect(artifactStorageService.start()).rejects.toThrow('Permission denied');
      expect(mockErrorLogService.logError).toHaveBeenCalled();
    });

    it('should initialize project structure', async () => {
      await artifactStorageService.start();
      
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('projects'),
        { recursive: true }
      );
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('sessions'),
        { recursive: true }
      );
    });
  });

  describe('artifact storage', () => {
    beforeEach(async () => {
      await artifactStorageService.start();
    });

    it('should store artifacts locally', async () => {
      const artifact = {
        name: 'test-component.tsx',
        content: 'import React from "react";',
        type: 'code' as const,
        agentId: 'agent-1',
        projectId: 'project-123',
      };

      const result = await artifactStorageService.storeArtifact(artifact);
      
      expect(result).toEqual({
        id: expect.any(String),
        name: 'test-component.tsx',
        path: expect.stringContaining('test-component.tsx'),
        type: 'code',
        agentId: 'agent-1',
        projectId: 'project-123',
        version: 1,
        size: expect.any(Number),
        createdAt: expect.any(String),
        localPath: expect.stringContaining('test-component.tsx'),
      });

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-component.tsx'),
        'import React from "react";',
        'utf8'
      );

      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'artifact_stored',
        expect.objectContaining({
          artifactId: result.id,
          type: 'code',
          size: expect.any(Number),
        }),
        'storage'
      );
    });

    it('should store artifacts to GitHub when enabled', async () => {
      const artifact = {
        name: 'api.js',
        content: 'module.exports = {};',
        type: 'code' as const,
        agentId: 'agent-2',
        projectId: 'project-456',
        sessionId: 'session-123',
      };

      const result = await artifactStorageService.storeArtifact(artifact);
      
      expect(mockGitHubCoordinator.storeArtifact).toHaveBeenCalledWith(
        'session-123',
        {
          name: 'api.js',
          content: 'module.exports = {};',
          type: 'code',
          agentId: 'agent-2',
        }
      );

      expect(result).toHaveProperty('githubUrl');
    });

    it('should reject artifacts exceeding size limit', async () => {
      const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
      const artifact = {
        name: 'large-file.txt',
        content: largeContent,
        type: 'documentation' as const,
        agentId: 'agent-1',
        projectId: 'project-123',
      };

      await expect(artifactStorageService.storeArtifact(artifact)).rejects.toThrow(
        'Artifact size exceeds maximum allowed size'
      );

      expect(mockErrorLogService.logError).toHaveBeenCalled();
    });

    it('should handle different artifact types', async () => {
      const artifactTypes = [
        { type: 'code', content: 'console.log("test");' },
        { type: 'documentation', content: '# README\n\nThis is a test.' },
        { type: 'configuration', content: '{"version": "1.0.0"}' },
        { type: 'test', content: 'describe("test", () => {});' },
        { type: 'data', content: '[{"id": 1, "name": "test"}]' },
      ] as const;

      for (const { type, content } of artifactTypes) {
        const artifact = {
          name: `test.${type}`,
          content,
          type,
          agentId: 'agent-1',
          projectId: 'project-123',
        };

        const result = await artifactStorageService.storeArtifact(artifact);
        expect(result.type).toBe(type);
      }
    });

    it('should handle versioning for existing artifacts', async () => {
      const artifact = {
        name: 'versioned-file.js',
        content: 'version 1',
        type: 'code' as const,
        agentId: 'agent-1',
        projectId: 'project-123',
      };

      // Store first version
      const result1 = await artifactStorageService.storeArtifact(artifact);
      expect(result1.version).toBe(1);

      // Store second version
      const updatedArtifact = { ...artifact, content: 'version 2' };
      const result2 = await artifactStorageService.storeArtifact(updatedArtifact);
      expect(result2.version).toBe(2);

      // Verify both files exist
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('versioned-file.js'),
        'version 1',
        'utf8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('versioned-file.v2.js'),
        'version 2',
        'utf8'
      );
    });

    it('should sanitize file names', async () => {
      const artifact = {
        name: 'invalid/file:name*.txt',
        content: 'test content',
        type: 'documentation' as const,
        agentId: 'agent-1',
        projectId: 'project-123',
      };

      const result = await artifactStorageService.storeArtifact(artifact);
      
      expect(result.name).toMatch(/^invalid-file-name.*\.txt$/);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/invalid-file-name.*\.txt$/),
        'test content',
        'utf8'
      );
    });
  });

  describe('artifact retrieval', () => {
    beforeEach(async () => {
      await artifactStorageService.start();
    });

    it('should retrieve artifacts by ID', async () => {
      // First store an artifact
      const stored = await artifactStorageService.storeArtifact({
        name: 'retrieve-test.js',
        content: 'test content',
        type: 'code',
        agentId: 'agent-1',
        projectId: 'project-123',
      });

      const retrieved = await artifactStorageService.getArtifact(stored.id);
      
      expect(retrieved).toEqual({
        ...stored,
        content: 'test content',
      });

      expect(mockFs.readFile).toHaveBeenCalledWith(
        stored.localPath,
        'utf8'
      );
    });

    it('should handle retrieval of non-existent artifacts', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));
      
      const result = await artifactStorageService.getArtifact('non-existent-id');
      expect(result).toBeNull();
    });

    it('should retrieve artifacts from GitHub when local copy missing', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));
      
      const artifactId = 'github-artifact-123';
      await artifactStorageService.getArtifact(artifactId);
      
      // Should attempt GitHub retrieval as fallback
      expect(mockGitHubCoordinator.getArtifact).toHaveBeenCalled();
    });

    it('should list artifacts by project', async () => {
      const projectId = 'test-project-123';
      
      // Store multiple artifacts
      await artifactStorageService.storeArtifact({
        name: 'file1.js',
        content: 'content 1',
        type: 'code',
        agentId: 'agent-1',
        projectId,
      });

      await artifactStorageService.storeArtifact({
        name: 'file2.md',
        content: 'content 2',
        type: 'documentation',
        agentId: 'agent-2',
        projectId,
      });

      const artifacts = await artifactStorageService.listArtifacts({ projectId });
      
      expect(artifacts).toHaveLength(2);
      expect(artifacts.every(a => a.projectId === projectId)).toBe(true);
    });

    it('should list artifacts by agent', async () => {
      const agentId = 'specific-agent';
      
      await artifactStorageService.storeArtifact({
        name: 'agent-file.js',
        content: 'agent content',
        type: 'code',
        agentId,
        projectId: 'project-123',
      });

      const artifacts = await artifactStorageService.listArtifacts({ agentId });
      
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].agentId).toBe(agentId);
    });

    it('should filter artifacts by type', async () => {
      const projectId = 'filter-test-project';
      
      await artifactStorageService.storeArtifact({
        name: 'code.js',
        content: 'code content',
        type: 'code',
        agentId: 'agent-1',
        projectId,
      });

      await artifactStorageService.storeArtifact({
        name: 'test.spec.js',
        content: 'test content',
        type: 'test',
        agentId: 'agent-1',
        projectId,
      });

      const codeArtifacts = await artifactStorageService.listArtifacts({ 
        projectId, 
        type: 'code' 
      });
      
      expect(codeArtifacts).toHaveLength(1);
      expect(codeArtifacts[0].type).toBe('code');
    });

    it('should search artifacts by name pattern', async () => {
      const projectId = 'search-test-project';
      
      await Promise.all([
        artifactStorageService.storeArtifact({
          name: 'user-component.tsx',
          content: 'user component',
          type: 'code',
          agentId: 'agent-1',
          projectId,
        }),
        artifactStorageService.storeArtifact({
          name: 'user-service.js',
          content: 'user service',
          type: 'code',
          agentId: 'agent-1',
          projectId,
        }),
        artifactStorageService.storeArtifact({
          name: 'product-component.tsx',
          content: 'product component',
          type: 'code',
          agentId: 'agent-1',
          projectId,
        }),
      ]);

      const userArtifacts = await artifactStorageService.searchArtifacts('user', { projectId });
      
      expect(userArtifacts).toHaveLength(2);
      expect(userArtifacts.every(a => a.name.includes('user'))).toBe(true);
    });
  });

  describe('project management', () => {
    beforeEach(async () => {
      await artifactStorageService.start();
    });

    it('should create projects', async () => {
      const project = {
        name: 'Test Project',
        description: 'A test project for unit tests',
        agentIds: ['agent-1', 'agent-2'],
      };

      const result = await artifactStorageService.createProject(project);
      
      expect(result).toEqual({
        id: expect.any(String),
        name: 'Test Project',
        description: 'A test project for unit tests',
        agentIds: ['agent-1', 'agent-2'],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        artifactCount: 0,
        totalSize: 0,
      });

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining(result.id),
        { recursive: true }
      );
    });

    it('should get project information', async () => {
      const created = await artifactStorageService.createProject({
        name: 'Get Test Project',
        description: 'Test getting project info',
        agentIds: ['agent-1'],
      });

      const retrieved = await artifactStorageService.getProject(created.id);
      
      expect(retrieved).toEqual(created);
    });

    it('should list all projects', async () => {
      await Promise.all([
        artifactStorageService.createProject({
          name: 'Project 1',
          description: 'First project',
          agentIds: ['agent-1'],
        }),
        artifactStorageService.createProject({
          name: 'Project 2',
          description: 'Second project',
          agentIds: ['agent-2'],
        }),
      ]);

      const projects = await artifactStorageService.listProjects();
      
      expect(projects).toHaveLength(2);
      expect(projects.map(p => p.name)).toEqual(['Project 1', 'Project 2']);
    });

    it('should update project statistics when artifacts are added', async () => {
      const project = await artifactStorageService.createProject({
        name: 'Stats Test Project',
        description: 'Testing statistics updates',
        agentIds: ['agent-1'],
      });

      await artifactStorageService.storeArtifact({
        name: 'stats-test.js',
        content: 'test content for stats',
        type: 'code',
        agentId: 'agent-1',
        projectId: project.id,
      });

      const updated = await artifactStorageService.getProject(project.id);
      
      expect(updated?.artifactCount).toBe(1);
      expect(updated?.totalSize).toBeGreaterThan(0);
    });

    it('should delete projects and their artifacts', async () => {
      const project = await artifactStorageService.createProject({
        name: 'Delete Test Project',
        description: 'Project to be deleted',
        agentIds: ['agent-1'],
      });

      // Add some artifacts
      await artifactStorageService.storeArtifact({
        name: 'delete-test.js',
        content: 'content to delete',
        type: 'code',
        agentId: 'agent-1',
        projectId: project.id,
      });

      await artifactStorageService.deleteProject(project.id);
      
      const retrieved = await artifactStorageService.getProject(project.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('export functionality', () => {
    beforeEach(async () => {
      await artifactStorageService.start();
    });

    it('should export project artifacts', async () => {
      const project = await artifactStorageService.createProject({
        name: 'Export Test Project',
        description: 'Test project export',
        agentIds: ['agent-1'],
      });

      await artifactStorageService.storeArtifact({
        name: 'export-test.js',
        content: 'export test content',
        type: 'code',
        agentId: 'agent-1',
        projectId: project.id,
      });

      const exportData = await artifactStorageService.exportProject(project.id);
      
      expect(exportData).toEqual({
        project: expect.objectContaining({
          id: project.id,
          name: 'Export Test Project',
        }),
        artifacts: expect.arrayContaining([
          expect.objectContaining({
            name: 'export-test.js',
            content: 'export test content',
            type: 'code',
          }),
        ]),
        summary: expect.objectContaining({
          totalArtifacts: 1,
          artifactsByType: expect.any(Object),
          artifactsByAgent: expect.any(Object),
          totalSize: expect.any(Number),
        }),
        exportedAt: expect.any(String),
      });
    });

    it('should export storage summary', async () => {
      // Create projects and artifacts
      const project1 = await artifactStorageService.createProject({
        name: 'Summary Project 1',
        description: 'First project',
        agentIds: ['agent-1'],
      });

      const project2 = await artifactStorageService.createProject({
        name: 'Summary Project 2',
        description: 'Second project',
        agentIds: ['agent-2'],
      });

      await artifactStorageService.storeArtifact({
        name: 'summary1.js',
        content: 'content 1',
        type: 'code',
        agentId: 'agent-1',
        projectId: project1.id,
      });

      await artifactStorageService.storeArtifact({
        name: 'summary2.md',
        content: 'content 2',
        type: 'documentation',
        agentId: 'agent-2',
        projectId: project2.id,
      });

      const summary = await artifactStorageService.exportSummary();
      
      expect(summary).toEqual({
        totalProjects: 2,
        totalArtifacts: 2,
        totalSize: expect.any(Number),
        artifactsByType: expect.any(Object),
        artifactsByAgent: expect.any(Object),
        projects: expect.arrayContaining([
          expect.objectContaining({ name: 'Summary Project 1' }),
          expect.objectContaining({ name: 'Summary Project 2' }),
        ]),
        exportedAt: expect.any(String),
      });
    });
  });

  describe('cleanup and maintenance', () => {
    beforeEach(async () => {
      await artifactStorageService.start();
    });

    it('should clean up old artifacts', async () => {
      // Mock old files
      mockFs.readdir.mockResolvedValue([
        'old-artifact-1.js',
        'old-artifact-2.md',
        'recent-artifact.js',
      ] as any);

      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const recentDate = new Date();

      mockFs.stat.mockImplementation((filePath) => {
        const isOld = (filePath as string).includes('old-artifact');
        return Promise.resolve({
          size: 1024,
          isFile: () => true,
          isDirectory: () => false,
          mtime: isOld ? oldDate : recentDate,
        } as any);
      });

      await (artifactStorageService as any).cleanupOldArtifacts(30); // Keep 30 days
      
      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('old-artifact-1.js')
      );
      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('old-artifact-2.md')
      );
      expect(mockFs.unlink).not.toHaveBeenCalledWith(
        expect.stringContaining('recent-artifact.js')
      );
    });

    it('should calculate storage metrics', async () => {
      await artifactStorageService.storeArtifact({
        name: 'metrics-test.js',
        content: 'test content for metrics',
        type: 'code',
        agentId: 'agent-1',
        projectId: 'project-123',
      });

      const metrics = await artifactStorageService.getStorageMetrics();
      
      expect(metrics).toEqual({
        totalArtifacts: 1,
        totalSize: expect.any(Number),
        artifactsByType: expect.any(Object),
        artifactsByAgent: expect.any(Object),
        artifactsByProject: expect.any(Object),
        averageArtifactSize: expect.any(Number),
        lastUpdated: expect.any(String),
      });
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await artifactStorageService.start();
    });

    it('should handle file system errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValueOnce(new Error('Disk full'));
      
      await expect(artifactStorageService.storeArtifact({
        name: 'error-test.js',
        content: 'test content',
        type: 'code',
        agentId: 'agent-1',
        projectId: 'project-123',
      })).rejects.toThrow('Disk full');

      expect(mockErrorLogService.logError).toHaveBeenCalled();
    });

    it('should handle GitHub storage failures gracefully', async () => {
      mockGitHubCoordinator.storeArtifact.mockRejectedValueOnce(new Error('GitHub API error'));
      
      const result = await artifactStorageService.storeArtifact({
        name: 'github-error-test.js',
        content: 'test content',
        type: 'code',
        agentId: 'agent-1',
        projectId: 'project-123',
        sessionId: 'session-123',
      });

      // Should still store locally even if GitHub fails
      expect(result).toHaveProperty('localPath');
      expect(result).not.toHaveProperty('githubUrl');
      expect(mockErrorLogService.logError).toHaveBeenCalled();
    });

    it('should validate artifact data', async () => {
      await expect(artifactStorageService.storeArtifact({
        name: '',
        content: 'test',
        type: 'code',
        agentId: 'agent-1',
        projectId: 'project-123',
      })).rejects.toThrow('Artifact name cannot be empty');

      await expect(artifactStorageService.storeArtifact({
        name: 'test.js',
        content: '',
        type: 'code',
        agentId: 'agent-1',
        projectId: 'project-123',
      })).rejects.toThrow('Artifact content cannot be empty');
    });
  });

  describe('stop and cleanup', () => {
    beforeEach(async () => {
      await artifactStorageService.start();
    });

    it('should stop gracefully', async () => {
      await expect(artifactStorageService.stop()).resolves.not.toThrow();
      expect(mockFs.writeFile).toHaveBeenCalled(); // Index written
    });

    it('should handle stop errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));
      await expect(artifactStorageService.stop()).resolves.not.toThrow();
    });

    it('should write final summary on stop', async () => {
      await artifactStorageService.storeArtifact({
        name: 'final-test.js',
        content: 'final test content',
        type: 'code',
        agentId: 'agent-1',
        projectId: 'project-123',
      });

      await artifactStorageService.stop();
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('storage-summary.json'),
        expect.any(String),
        'utf8'
      );
    });
  });
});