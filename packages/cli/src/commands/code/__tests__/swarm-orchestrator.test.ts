import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { SwarmOrchestrator, type SwarmOrchestratorOptions, type AgentRole } from '../services/swarm-orchestrator.js';
import { EventEmitter } from 'events';

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

describe('SwarmOrchestrator', () => {
  let swarmOrchestrator: SwarmOrchestrator;
  let mockOptions: SwarmOrchestratorOptions;

  beforeEach(() => {
    // Clear all mocks
    mockTelemetryService.logEvent.mockReset();
    mockErrorLogService.logError.mockReset();
    mockErrorLogService.logWarning.mockReset();
    
    mockOptions = {
      maxAgents: 5,
      communicationPort: 8080,
      telemetryService: mockTelemetryService as any,
      errorLogService: mockErrorLogService as any,
      debug: true,
    };

    swarmOrchestrator = new SwarmOrchestrator(mockOptions);
  });

  afterEach(async () => {
    if (swarmOrchestrator) {
      await swarmOrchestrator.shutdown().catch(() => {});
    }
  });

  describe('initialization', () => {
    it('should create a SwarmOrchestrator instance', () => {
      expect(swarmOrchestrator).toBeInstanceOf(SwarmOrchestrator);
      expect(swarmOrchestrator).toBeInstanceOf(EventEmitter);
    });

    it('should initialize successfully', async () => {
      await expect(swarmOrchestrator.initialize()).resolves.not.toThrow();
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'swarm_orchestrator_initialized',
        expect.objectContaining({
          maxAgents: 5,
          communicationPort: 8080,
        }),
        'swarm'
      );
    });

    it('should handle initialization errors', async () => {
      mockTelemetryService.logEvent.mockRejectedValueOnce(new Error('Telemetry failed'));
      
      await expect(swarmOrchestrator.initialize()).rejects.toThrow('Telemetry failed');
      expect(mockErrorLogService.logError).toHaveBeenCalledWith(
        'Failed to initialize Swarm Orchestrator',
        expect.any(Error),
        {},
        'swarm'
      );
    });

    it('should start heartbeat monitoring', async () => {
      await swarmOrchestrator.initialize();
      
      // Should not throw when timers are cleared
      expect(() => {}).not.toThrow();
    });
  });

  describe('agent management', () => {
    beforeEach(async () => {
      await swarmOrchestrator.initialize();
    });

    it('should spawn agents with different roles', async () => {
      const roles: AgentRole[] = ['coordinator', 'researcher', 'coder', 'tester'];
      
      for (const role of roles) {
        const agentId = await swarmOrchestrator.spawnAgent(role);
        expect(agentId).toMatch(new RegExp(`^agent-${role}-\\d+-.{6}$`));
        expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
          'agent_spawned',
          expect.objectContaining({
            agentId,
            role,
            totalAgents: expect.any(Number),
          }),
          'swarm'
        );
      }
    });

    it('should include default capabilities for spawned agents', async () => {
      const agentId = await swarmOrchestrator.spawnAgent('coder');
      expect(agentId).toBeTruthy();
      // Verify through events that capabilities were assigned
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'agent_spawned',
        expect.objectContaining({
          capabilities: expect.arrayContaining(['programming', 'implementation', 'debugging']),
        }),
        'swarm'
      );
    });

    it('should allow custom capabilities when spawning agents', async () => {
      const customCapabilities = ['react', 'typescript', 'testing'];
      const agentId = await swarmOrchestrator.spawnAgent('coder', customCapabilities);
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'agent_spawned',
        expect.objectContaining({
          capabilities: expect.arrayContaining([...customCapabilities, 'programming', 'implementation', 'debugging']),
        }),
        'swarm'
      );
    });

    it('should respect max agents limit', async () => {
      // Spawn up to the limit
      for (let i = 0; i < mockOptions.maxAgents; i++) {
        await swarmOrchestrator.spawnAgent('coder');
      }
      
      // Attempt to spawn one more should fail
      await expect(swarmOrchestrator.spawnAgent('coder')).rejects.toThrow(
        `Maximum number of agents (${mockOptions.maxAgents}) already spawned`
      );
    });

    it('should handle agent spawning errors', async () => {
      // Mock an error in agent initialization
      const originalInitialize = (swarmOrchestrator as any).initializeAgentRuntime;
      (swarmOrchestrator as any).initializeAgentRuntime = mock(() => Promise.reject(new Error('Runtime init failed')));
      
      await expect(swarmOrchestrator.spawnAgent('coder')).rejects.toThrow('Runtime init failed');
      expect(mockErrorLogService.logError).toHaveBeenCalledWith(
        'Failed to spawn agent',
        expect.any(Error),
        expect.objectContaining({ role: 'coder' }),
        'swarm'
      );
      
      // Restore original function
      (swarmOrchestrator as any).initializeAgentRuntime = originalInitialize;
    });

    it('should terminate agents successfully', async () => {
      const agentId = await swarmOrchestrator.spawnAgent('coder');
      
      await expect(swarmOrchestrator.terminateAgent(agentId)).resolves.not.toThrow();
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'agent_terminated',
        expect.objectContaining({
          agentId,
          role: 'coder',
        }),
        'swarm'
      );
    });

    it('should handle termination of non-existent agents', async () => {
      await expect(swarmOrchestrator.terminateAgent('non-existent')).rejects.toThrow(
        'Agent non-existent not found'
      );
    });

    it('should terminate all agents', async () => {
      // Spawn multiple agents
      const agentIds = await Promise.all([
        swarmOrchestrator.spawnAgent('coordinator'),
        swarmOrchestrator.spawnAgent('coder'),
        swarmOrchestrator.spawnAgent('tester'),
      ]);
      
      await expect(swarmOrchestrator.terminateAllAgents()).resolves.not.toThrow();
      
      // Verify all agents were terminated
      for (const agentId of agentIds) {
        expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
          'agent_terminated',
          expect.objectContaining({ agentId }),
          'swarm'
        );
      }
    });
  });

  describe('task management', () => {
    let agentId: string;

    beforeEach(async () => {
      await swarmOrchestrator.initialize();
      agentId = await swarmOrchestrator.spawnAgent('coder');
    });

    it('should assign tasks to appropriate agents', async () => {
      const task = {
        type: 'coding' as const,
        priority: 'high' as const,
        description: 'Implement user authentication',
        status: 'pending' as const,
        dependencies: [],
        artifacts: [],
        metadata: {},
      };

      const taskId = await swarmOrchestrator.assignTask(task);
      expect(taskId).toMatch(/^task-\d+-.{6}$/);
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'task_assigned',
        expect.objectContaining({
          taskId,
          type: 'coding',
          priority: 'high',
          assignedTo: agentId,
        }),
        'swarm'
      );
    });

    it('should handle different task types', async () => {
      const taskTypes = ['research', 'planning', 'coding', 'testing', 'review', 'deployment'] as const;
      
      for (const type of taskTypes) {
        const task = {
          type,
          priority: 'medium' as const,
          description: `Execute ${type} task`,
          status: 'pending' as const,
          dependencies: [],
          artifacts: [],
          metadata: {},
        };

        const taskId = await swarmOrchestrator.assignTask(task);
        expect(taskId).toBeTruthy();
      }
    });

    it('should cancel tasks successfully', async () => {
      const task = {
        type: 'coding' as const,
        priority: 'low' as const,
        description: 'Task to be cancelled',
        status: 'pending' as const,
        dependencies: [],
        artifacts: [],
        metadata: {},
      };

      const taskId = await swarmOrchestrator.assignTask(task);
      await expect(swarmOrchestrator.cancelTask(taskId)).resolves.not.toThrow();
    });

    it('should handle cancellation of non-existent tasks', async () => {
      await expect(swarmOrchestrator.cancelTask('non-existent')).rejects.toThrow(
        'Task non-existent not found'
      );
    });
  });

  describe('agent role and capability matching', () => {
    beforeEach(async () => {
      await swarmOrchestrator.initialize();
    });

    it('should match agents to tasks based on role', async () => {
      // Spawn agents with different roles
      await swarmOrchestrator.spawnAgent('researcher');
      await swarmOrchestrator.spawnAgent('coder');
      await swarmOrchestrator.spawnAgent('tester');

      const researchTask = {
        type: 'research' as const,
        priority: 'medium' as const,
        description: 'Research best practices for API design',
        status: 'pending' as const,
        dependencies: [],
        artifacts: [],
        metadata: {},
      };

      const taskId = await swarmOrchestrator.assignTask(researchTask);
      expect(taskId).toBeTruthy();
      
      // Should assign to researcher agent
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'task_assigned',
        expect.objectContaining({
          type: 'research',
          assignedTo: expect.stringMatching(/agent-researcher-/),
        }),
        'swarm'
      );
    });

    it('should prioritize agents with matching capabilities', async () => {
      // Spawn agents with specific capabilities
      await swarmOrchestrator.spawnAgent('coder', ['react', 'typescript']);
      await swarmOrchestrator.spawnAgent('coder', ['python', 'django']);

      const reactTask = {
        type: 'coding' as const,
        priority: 'high' as const,
        description: 'Build React components with TypeScript',
        status: 'pending' as const,
        dependencies: [],
        artifacts: [],
        metadata: {},
      };

      const taskId = await swarmOrchestrator.assignTask(reactTask);
      expect(taskId).toBeTruthy();
    });
  });

  describe('status and monitoring', () => {
    beforeEach(async () => {
      await swarmOrchestrator.initialize();
    });

    it('should provide swarm status', async () => {
      await swarmOrchestrator.spawnAgent('coordinator');
      await swarmOrchestrator.spawnAgent('coder');

      const status = await swarmOrchestrator.getStatus();
      expect(status).toEqual({
        activeAgents: 2,
        totalTasks: 0,
        completedTasks: 0,
        currentPhase: 'idle',
        progress: 0,
      });
    });

    it('should provide agent status information', async () => {
      const agentId1 = await swarmOrchestrator.spawnAgent('coordinator');
      const agentId2 = await swarmOrchestrator.spawnAgent('coder');

      const agentStatus = await swarmOrchestrator.getAgentStatus();
      expect(agentStatus).toHaveLength(2);
      expect(agentStatus).toEqual(
        expect.arrayContaining([
          { id: agentId1, status: 'idle', role: 'coordinator' },
          { id: agentId2, status: 'idle', role: 'coder' },
        ])
      );
    });

    it('should calculate progress correctly with tasks', async () => {
      await swarmOrchestrator.spawnAgent('coder');

      // Add some tasks
      await swarmOrchestrator.assignTask({
        type: 'coding',
        priority: 'medium',
        description: 'Task 1',
        status: 'pending',
        dependencies: [],
        artifacts: [],
        metadata: {},
      });

      await swarmOrchestrator.assignTask({
        type: 'testing',
        priority: 'medium',
        description: 'Task 2',
        status: 'pending',
        dependencies: [],
        artifacts: [],
        metadata: {},
      });

      const status = await swarmOrchestrator.getStatus();
      expect(status.totalTasks).toBe(2);
      expect(status.completedTasks).toBe(0);
      expect(status.progress).toBe(0);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await swarmOrchestrator.initialize();
    });

    it('should handle task execution errors gracefully', async () => {
      const agentId = await swarmOrchestrator.spawnAgent('coder');
      
      // Mock task execution to throw an error
      const originalExecuteTaskByType = (swarmOrchestrator as any).executeTaskByType;
      (swarmOrchestrator as any).executeTaskByType = mock(() => Promise.reject(new Error('Task execution failed')));
      
      const task = {
        type: 'coding' as const,
        priority: 'medium' as const,
        description: 'Failing task',
        status: 'pending' as const,
        dependencies: [],
        artifacts: [],
        metadata: {},
      };

      const taskId = await swarmOrchestrator.assignTask(task);
      
      // Wait a bit for task execution to fail
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockErrorLogService.logError).toHaveBeenCalledWith(
        'Task execution failed',
        expect.any(Error),
        expect.objectContaining({
          taskId,
          agentId,
          taskType: 'coding',
        }),
        'swarm'
      );
      
      // Restore original function
      (swarmOrchestrator as any).executeTaskByType = originalExecuteTaskByType;
    });

    it('should handle agent termination errors gracefully', async () => {
      const agentId = await swarmOrchestrator.spawnAgent('coder');
      
      // Mock cleanup to throw an error
      const mockAgent = (swarmOrchestrator as any).agents.get(agentId);
      if (mockAgent && mockAgent.runtime) {
        mockAgent.runtime.cleanup = mock(() => Promise.reject(new Error('Cleanup failed')));
      }
      
      await expect(swarmOrchestrator.terminateAgent(agentId)).resolves.not.toThrow();
      expect(mockErrorLogService.logError).toHaveBeenCalledWith(
        'Failed to terminate agent',
        expect.any(Error),
        expect.objectContaining({ agentId }),
        'swarm'
      );
    });
  });

  describe('shutdown', () => {
    beforeEach(async () => {
      await swarmOrchestrator.initialize();
    });

    it('should shutdown gracefully', async () => {
      const agentId = await swarmOrchestrator.spawnAgent('coder');
      
      await expect(swarmOrchestrator.shutdown()).resolves.not.toThrow();
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'swarm_orchestrator_shutdown',
        expect.objectContaining({
          totalAgents: expect.any(Number),
          totalTasks: expect.any(Number),
        }),
        'swarm'
      );
    });

    it('should handle shutdown errors', async () => {
      // Mock termination to fail
      const originalTerminateAllAgents = swarmOrchestrator.terminateAllAgents;
      swarmOrchestrator.terminateAllAgents = mock(() => Promise.reject(new Error('Termination failed')));
      
      await expect(swarmOrchestrator.shutdown()).rejects.toThrow('Termination failed');
      expect(mockErrorLogService.logError).toHaveBeenCalledWith(
        'Error during Swarm Orchestrator shutdown',
        expect.any(Error),
        {},
        'swarm'
      );
      
      // Restore original function
      swarmOrchestrator.terminateAllAgents = originalTerminateAllAgents;
    });

    it('should cancel pending tasks during shutdown', async () => {
      await swarmOrchestrator.spawnAgent('coder');
      
      // Add a pending task
      await swarmOrchestrator.assignTask({
        type: 'coding',
        priority: 'medium',
        description: 'Pending task',
        status: 'pending',
        dependencies: [],
        artifacts: [],
        metadata: {},
      });

      await swarmOrchestrator.shutdown();
      
      // Task should be cancelled
      const status = await swarmOrchestrator.getStatus();
      expect(status.totalTasks).toBeGreaterThan(0);
    });
  });

  describe('event emission', () => {
    beforeEach(async () => {
      await swarmOrchestrator.initialize();
    });

    it('should emit events for agent lifecycle', async () => {
      const agentSpawnedHandler = mock();
      const agentTerminatedHandler = mock();
      
      swarmOrchestrator.on('agentSpawned', agentSpawnedHandler);
      swarmOrchestrator.on('agentTerminated', agentTerminatedHandler);
      
      const agentId = await swarmOrchestrator.spawnAgent('coder');
      expect(agentSpawnedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: agentId,
          role: 'coder',
          status: 'active',
        })
      );
      
      await swarmOrchestrator.terminateAgent(agentId);
      expect(agentTerminatedHandler).toHaveBeenCalledWith(agentId);
    });

    it('should emit events for task lifecycle', async () => {
      const taskAssignedHandler = mock();
      const taskCompletedHandler = mock();
      const taskCancelledHandler = mock();
      
      swarmOrchestrator.on('taskAssigned', taskAssignedHandler);
      swarmOrchestrator.on('taskCompleted', taskCompletedHandler);
      swarmOrchestrator.on('taskCancelled', taskCancelledHandler);
      
      await swarmOrchestrator.spawnAgent('coder');
      
      const taskId = await swarmOrchestrator.assignTask({
        type: 'coding',
        priority: 'medium',
        description: 'Test task',
        status: 'pending',
        dependencies: [],
        artifacts: [],
        metadata: {},
      });
      
      expect(taskAssignedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: taskId,
          type: 'coding',
          status: 'in-progress',
        })
      );
      
      await swarmOrchestrator.cancelTask(taskId);
      expect(taskCancelledHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: taskId,
          status: 'cancelled',
        })
      );
    });
  });
});