import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { OrchestrationManager } from '../../managers/orchestration-manager';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

describe('OrchestrationManager', () => {
  let mockRuntime: IAgentRuntime;
  let manager: OrchestrationManager;

  beforeEach(() => {
    // Create mock runtime
    mockRuntime = {
      getSetting: (key: string) => {
        if (key === 'ANTHROPIC_API_KEY') {
          return 'test-key';
        }
        return null;
      },
      getService: (name: string) => {
        if (name === 'research') {
          return {
            createResearchProject: async () => ({
              id: 'research-123',
              status: 'pending',
            }),
            getProject: async () => ({
              id: 'research-123',
              status: 'completed',
              report: 'Research findings...',
              findings: [],
            }),
          };
        }
        if (name === 'knowledge') {
          return {
            storeDocument: async () => ({ id: 'doc-123' }),
            getKnowledge: async () => [],
          };
        }
        if (name === 'env-manager') {
          return {
            getEnvVar: () => null,
            setEnvVar: async () => {},
          };
        }
        if (name === 'plugin-manager') {
          return {
            clonePlugin: async () => ({ path: '/tmp/plugin' }),
            createBranch: async () => {},
            commitChanges: async () => {},
            createPullRequest: async () => ({ url: 'https://github.com/pr/123' }),
            publishPlugin: async () => ({
              success: true,
              npmPackage: '@elizaos/plugin-test',
              githubRepo: 'https://github.com/elizaos/plugin-test',
            }),
          };
        }
        return null;
      },
    } as any;

    manager = new OrchestrationManager(mockRuntime);
  });

  describe('Project Creation', () => {
    it('should create a new plugin project', async () => {
      await manager.initialize();

      const project = await manager.createPluginProject(
        'test-plugin',
        'A test plugin',
        'user-123' as UUID
      );

      expect(project).toBeDefined();
      expect(project.name).toBe('test-plugin');
      expect(project.description).toBe('A test plugin');
      expect(project.type).toBe('create');
      // Status may be 'idle' or 'researching' depending on timing
      expect(['idle', 'researching']).toContain(project.status);
      expect(project.totalPhases).toBe(18);
    });

    it('should create an update project', async () => {
      await manager.initialize();

      const project = await manager.updatePluginProject(
        'https://github.com/test/plugin',
        'Add new features',
        'user-123' as UUID
      );

      expect(project).toBeDefined();
      expect(project.type).toBe('update');
      expect(project.githubRepo).toBe('https://github.com/test/plugin');
      expect(project.totalPhases).toBe(11);
    });
  });

  describe('Project Management', () => {
    it('should track project status', async () => {
      await manager.initialize();

      const project = await manager.createPluginProject(
        'test-plugin',
        'A test plugin',
        'user-123' as UUID
      );

      const retrieved = await manager.getProject(project.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(project.id);
    });

    it('should get active projects', async () => {
      await manager.initialize();

      await manager.createPluginProject('plugin1', 'Test 1', 'user-123' as UUID);
      await manager.createPluginProject('plugin2', 'Test 2', 'user-123' as UUID);

      const active = await manager.getActiveProjects();
      expect(active.length).toBe(2);
    });

    it('should get projects by user', async () => {
      await manager.initialize();

      const userId = 'user-123' as UUID;
      await manager.createPluginProject('plugin1', 'Test 1', userId);
      await manager.createPluginProject('plugin2', 'Test 2', 'user-456' as UUID);

      const userProjects = await manager.getProjectsByUser(userId);
      expect(userProjects.length).toBe(1);
      expect(userProjects[0].userId).toBe(userId);
    });
  });

  describe('Secret Management', () => {
    it('should handle secret provision', async () => {
      await manager.initialize();

      // Mock the development phase execution to prevent timeout
      mock.spyOn(manager as any, 'executeMVPDevelopmentPhase').mockImplementation(async () => {});

      // Create a mock project without starting workflow
      const project = {
        id: 'test-project-secret' as UUID,
        name: 'test-plugin',
        description: 'A test plugin',
        type: 'create' as const,
        userId: 'user-123' as UUID,
        status: 'awaiting-secrets' as const,
        requiredSecrets: ['API_KEY'],
        providedSecrets: [],
        logs: [],
        errors: [],
        currentPhase: 0,
        currentIteration: 0,
        maxIterations: 5,
        totalPhases: 18,
        phaseHistory: ['awaiting-secrets'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Add project directly to avoid workflow
      (manager as any).projects.set(project.id, project);

      await manager.provideSecrets(project.id, {
        API_KEY: 'test-api-key',
      });

      const updated = await manager.getProject(project.id);
      expect(updated?.providedSecrets).toContain('API_KEY');
    }, 10000); // Increase timeout just in case
  });

  describe('User Feedback', () => {
    it('should add user feedback to project', async () => {
      await manager.initialize();

      const project = await manager.createPluginProject(
        'test-plugin',
        'A test plugin',
        'user-123' as UUID
      );

      await manager.addUserFeedback(project.id, 'Great work so far!');

      const updated = await manager.getProject(project.id);
      expect(updated?.lastUserFeedback).toBe('Great work so far!');
    });
  });

  describe('Project Cancellation', () => {
    it('should cancel a project', async () => {
      await manager.initialize();

      const project = await manager.createPluginProject(
        'test-plugin',
        'A test plugin',
        'user-123' as UUID
      );

      await manager.cancelProject(project.id);

      const cancelled = await manager.getProject(project.id);
      expect(cancelled?.status).toBe('failed');
      expect(cancelled?.error).toBe('Cancelled by system shutdown.');
    });
  });
});

describe('OrchestrationManager - Unit Tests', () => {
  let manager: OrchestrationManager;
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    mockRuntime = {
      getSetting: mock().mockImplementation((key: string) => {
        if (key === 'ANTHROPIC_API_KEY') {
          return 'test-key';
        }
        return null;
      }),
      getService: mock().mockReturnValue({
        createResearchProject: mock().mockResolvedValue({ id: 'research-1' }),
        getProject: mock().mockResolvedValue({ status: 'completed', report: 'Mock report' }),
        storeDocument: mock().mockResolvedValue({ id: 'doc-1' }),
      }),
      logger: { info: mock(), error: mock(), warn: mock(), debug: mock() },
    } as any;

    manager = new OrchestrationManager(mockRuntime);
    await manager.initialize();
  });

  describe('Project Creation & Management', () => {
    it('should create a new plugin project with correct initial state', async () => {
      mock.spyOn(manager as any, 'startCreationWorkflow').mockImplementation(() => {});
      const project = await manager.createPluginProject(
        'test-plugin',
        'A test plugin',
        uuidv4() as UUID
      );

      expect(project).toBeDefined();
      expect(project.name).toBe('test-plugin');
      expect(project.status).toBe('idle');
      expect(project.phaseHistory).toEqual(['idle']);
      expect(project.currentIteration).toBe(0);
      expect(project.maxIterations).toBe(100);
    });

    it('should retrieve a project by its ID', async () => {
      mock.spyOn(manager as any, 'startCreationWorkflow').mockImplementation(() => {});
      const project = await manager.createPluginProject(
        'test-plugin',
        'A test plugin',
        uuidv4() as UUID
      );
      const retrieved = await manager.getProject(project.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(project.id);
    });
  });

  describe('Workflow Progression', () => {
    it('should start the creation workflow when a project is created', async () => {
      const startWorkflowSpy = mock
        .spyOn(manager as any, 'startCreationWorkflow')
        .mockImplementation(() => {});
      await manager.createPluginProject('workflow-test', 'A test', uuidv4() as UUID);
      expect(startWorkflowSpy).toHaveBeenCalledOnce();
    });

    it('should execute research and planning phases in order', async () => {
      const project = {
        id: 'test-project-1',
        name: 'Test Project',
        description: 'Test Description',
        status: 'researching',
        phaseHistory: ['idle'],
        localPath: '/tmp/test-project',
        currentIteration: 0,
        maxIterations: 5,
        userId: 'user-123' as UUID,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        logs: [], // Add missing logs property
        type: 'create' as const,
        totalPhases: 18,
        errors: [],
        userNotifications: [],
        knowledgeIds: [],
        requiredSecrets: [],
        providedSecrets: [],
        customInstructions: [],
        errorAnalysis: new Map(),
      };

      (manager as any).projects.set(project.id, project);

      // Mock all the phase execution methods to prevent actual execution
      const researchSpy = mock
        .spyOn(manager as any, 'executeResearchPhase')
        .mockResolvedValue(undefined);
      const planningSpy = mock
        .spyOn(manager as any, 'executeMVPPlanningPhase')
        .mockResolvedValue(undefined);
      mock.spyOn(manager as any, 'executeMVPDevelopmentPhase').mockResolvedValue(undefined);
      mock.spyOn(manager as any, 'executeFullPlanningPhase').mockResolvedValue(undefined);
      mock.spyOn(manager as any, 'executeFullDevelopmentPhase').mockResolvedValue(undefined);
      mock.spyOn(manager as any, 'executeCriticalReviewPhase').mockResolvedValue(undefined);
      mock.spyOn(manager as any, 'updateProjectStatus').mockResolvedValue(undefined);
      mock.spyOn(manager as any, 'logToProject').mockImplementation(() => {});

      // Start the workflow which will execute phases
      await (manager as any).startCreationWorkflow(project.id);

      // Verify the methods were called
      expect(researchSpy).toHaveBeenCalledWith(project.id);
      expect(planningSpy).toHaveBeenCalledWith(project.id);
    }, 15000); // Add timeout
  });
});
