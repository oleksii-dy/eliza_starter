/**
 * Sandbox Multi-Agent Development Team Test
 * Tests the complete workflow of spawning and coordinating a development team
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { IAgentRuntime, Memory, UUID } from '@elizaos/core';
import { AgentRuntime, logger } from '@elizaos/core';
import { MockSandboxManager } from '../MockSandboxManager.js';
import { spawnDevTeamAction } from '../actions/spawnDevTeam.js';
import { delegateTaskAction } from '../actions/delegateTask.js';

// Mock character for testing
const testCharacter = {
  name: 'Sandbox Test Agent',
  bio: ['Test agent for sandbox development team functionality'],
  system:
    'You are a project orchestrator that can spawn specialized development teams in sandboxes.',
  plugins: ['elizaos-services'],
};

/**
 * Create a test runtime with mock sandbox manager
 */
async function createTestRuntime(): Promise<IAgentRuntime> {
  // Create mock adapter with all required methods
  const createdEntities = new Map();
  const createdRooms = new Map();
  const mockAdapter = {
    init: async () => {},
    createMemory: async (memory: any) => memory.id || `mem-${Date.now()}`,
    getMemories: async () => [],
    searchMemories: async () => [],
    getMemoryById: async () => null,
    updateMemory: async () => {},
    deleteMemory: async () => {},
    createEntity: async (entity: any) => {
      const id = entity.id || `entity-${Date.now()}`;
      createdEntities.set(id, { ...entity, id });
      return id;
    },
    createEntities: async (entities: any[]) => {
      return entities.map((entity) => {
        const id = entity.id || `entity-${Date.now()}`;
        createdEntities.set(id, { ...entity, id });
        return id;
      });
    },
    getEntityById: async (id: string) => createdEntities.get(id) || null,
    getEntitiesByIds: async (ids: string[]) =>
      ids.map((id) => createdEntities.get(id)).filter(Boolean),
    updateEntity: async () => {},
    deleteEntity: async () => {},
    createTask: async (task: any) => task.id || `task-${Date.now()}`,
    getTasks: async () => [],
    updateTask: async () => {},
    deleteTask: async () => {},
    addParticipant: async () => {},
    removeParticipant: async () => {},
    getParticipants: async () => [],
    getParticipantsForRoom: async () => [],
    getParticipantUserState: async () => null,
    setParticipantUserState: async () => {},
    addRole: async () => {},
    removeRole: async () => {},
    getRoles: async () => [],
    getCachedEmbeddings: async () => [],
    isReady: () => true,
    waitForReady: async () => true,
    getCapabilities: async () => ({ isReady: true, tables: [], hasVector: false }),
    ensureEmbeddingDimension: async () => {},
    close: async () => {},
    createRoom: async (room?: any) => {
      const id = room?.id || `room-${Date.now()}`;
      createdRooms.set(id, { ...room, id });
      return id;
    },
    createRooms: async (rooms: any[]) => {
      return rooms.map((room) => {
        const id = room.id || `room-${Date.now()}`;
        createdRooms.set(id, { ...room, id });
        return { ...room, id };
      });
    },
    getRoomsByIds: async (ids: string[]) => ids.map((id) => createdRooms.get(id)).filter(Boolean),
    sendMessage: async () => {},
    // Add missing methods required by AgentRuntime
    getAgents: async () => [],
    createAgent: async (agent: any) => agent.id || `agent-${Date.now()}`,
    updateAgent: async () => {},
    deleteAgent: async () => {},
    createWorld: async (world: any) => world.id || `world-${Date.now()}`,
    getWorlds: async () => [],
    updateWorld: async () => {},
    deleteWorld: async () => {},
  };

  const runtime = new AgentRuntime({
    character: testCharacter,
    adapter: mockAdapter as any,
    plugins: [], // Don't load full plugins for this test
  });

  await runtime.initialize();

  // Register mock sandbox manager
  const mockSandboxManager = await MockSandboxManager.start(runtime);
  runtime.registerService(mockSandboxManager);

  return runtime;
}

describe('Sandbox Multi-Agent Development Team', () => {
  let runtime: IAgentRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime();
  });

  afterEach(async () => {
    if (runtime && typeof runtime.stop === 'function') {
      await runtime.stop();
    }
  });

  describe('SPAWN_DEV_TEAM Action', () => {
    it('should validate correctly for development requests', async () => {
      const message: Memory = {
        id: 'test-msg-1' as UUID,
        entityId: 'user-1' as UUID,
        roomId: 'room-1' as UUID,
        content: {
          text: 'Create a todo list app with React, Express, and SQLite',
        },
      };

      const isValid = await spawnDevTeamAction.validate(runtime, message);
      expect(isValid).toBe(true);
    });

    it('should reject non-development requests', async () => {
      const message: Memory = {
        id: 'test-msg-2' as UUID,
        entityId: 'user-1' as UUID,
        roomId: 'room-1' as UUID,
        content: {
          text: 'What is the weather today?',
        },
      };

      const isValid = await spawnDevTeamAction.validate(runtime, message);
      expect(isValid).toBe(false);
    });

    it('should spawn development team successfully', async () => {
      const message: Memory = {
        id: 'test-msg-3' as UUID,
        entityId: 'user-1' as UUID,
        roomId: 'room-1' as UUID,
        content: {
          text: 'Create a todo list app with React, Express, and SQLite. I want users to be able to add, edit, delete, and mark todos as complete.',
        },
      };

      const result = await spawnDevTeamAction.handler(runtime, message);

      expect(result).toBeDefined();
      expect(result.text).toContain('Development Team Assembled');
      expect(result.text).toContain('Backend Agent');
      expect(result.text).toContain('Frontend Agent');
      expect(result.text).toContain('DevOps Agent');
      expect(result.data).toBeDefined();
      expect(result.data.sandboxId).toMatch(/^mock-sandbox-/);
      expect(result.data.agents).toEqual(['backend', 'frontend', 'devops']);
    });

    it('should handle errors gracefully', async () => {
      // Remove sandbox manager to simulate error
      runtime.getService = () => null;

      const message: Memory = {
        id: 'test-msg-4' as UUID,
        entityId: 'user-1' as UUID,
        roomId: 'room-1' as UUID,
        content: {
          text: 'Create a todo app',
        },
      };

      const result = await spawnDevTeamAction.handler(runtime, message);

      expect(result.text).toContain('Failed to spawn development team');
      expect(result.error).toBeDefined();
    });
  });

  describe('DELEGATE_TASK Action', () => {
    it('should validate task delegation requests', async () => {
      const message: Memory = {
        id: 'test-msg-5' as UUID,
        entityId: 'user-1' as UUID,
        roomId: 'room-1' as UUID,
        content: {
          text: 'Assign the backend team to create user authentication and the frontend team to build the login form',
        },
      };

      const isValid = await delegateTaskAction.validate(runtime, message);
      expect(isValid).toBe(true);
    });

    it('should delegate tasks successfully', async () => {
      const message: Memory = {
        id: 'test-msg-6' as UUID,
        entityId: 'user-1' as UUID,
        roomId: 'room-1' as UUID,
        content: {
          text: 'Assign the backend team to create user authentication and the frontend team to build the login form',
        },
      };

      const result = await delegateTaskAction.handler(runtime, message);

      expect(result).toBeDefined();
      expect(result.text).toContain('Tasks Delegated Successfully');
      expect(result.data).toBeDefined();
      expect(result.data.tasksCreated).toBeGreaterThan(0);
      expect(result.data.assignments).toBeDefined();
    });
  });

  describe('Mock Sandbox Manager', () => {
    it('should create sandbox successfully', async () => {
      const sandboxManager = runtime.getService('sandbox-manager') as MockSandboxManager;
      expect(sandboxManager).toBeDefined();

      const sandboxId = await sandboxManager.createSandbox();
      expect(sandboxId).toMatch(/^mock-sandbox-/);

      const sandboxInfo = sandboxManager.getSandboxInfo(sandboxId);
      expect(sandboxInfo).toBeDefined();
      expect(sandboxInfo?.status).toBe('running');
    });

    it('should deploy agents to sandbox', async () => {
      const sandboxManager = runtime.getService('sandbox-manager') as MockSandboxManager;
      const sandboxId = await sandboxManager.createSandbox();

      const agents = [
        { character: 'backend-agent.json', role: 'backend', workspace: '/workspace', plugins: [] },
        {
          character: 'frontend-agent.json',
          role: 'frontend',
          workspace: '/workspace',
          plugins: [],
        },
        { character: 'devops-agent.json', role: 'devops', workspace: '/workspace', plugins: [] },
      ];

      await sandboxManager.deployAgents(sandboxId, agents);

      const sandboxInfo = sandboxManager.getSandboxInfo(sandboxId);
      expect(sandboxInfo?.agents).toHaveLength(3);
      expect(sandboxInfo?.agents.map((a) => a.role)).toEqual(['backend', 'frontend', 'devops']);
    });

    it('should simulate team collaboration', async () => {
      const sandboxManager = runtime.getService('sandbox-manager') as MockSandboxManager;
      const sandboxId = await sandboxManager.createSandbox();

      const agents = [
        { character: 'backend-agent.json', role: 'backend', workspace: '/workspace', plugins: [] },
        {
          character: 'frontend-agent.json',
          role: 'frontend',
          workspace: '/workspace',
          plugins: [],
        },
        { character: 'devops-agent.json', role: 'devops', workspace: '/workspace', plugins: [] },
      ];

      await sandboxManager.deployAgents(sandboxId, agents);

      const updates = await sandboxManager.simulateTeamCollaboration(sandboxId);

      expect(updates).toBeDefined();
      expect(updates.length).toBeGreaterThan(5);
      expect(updates.some((update) => update.includes('DevOps Agent'))).toBe(true);
      expect(updates.some((update) => update.includes('Backend Agent'))).toBe(true);
      expect(updates.some((update) => update.includes('Frontend Agent'))).toBe(true);
      expect(updates.some((update) => update.includes('Todo list application is complete'))).toBe(
        true
      );
    });

    it('should create rooms and connect to host', async () => {
      const sandboxManager = runtime.getService('sandbox-manager') as MockSandboxManager;
      const sandboxId = await sandboxManager.createSandbox();

      const roomId = await sandboxManager.createRoom(sandboxId, 'Test Dev Room');
      expect(roomId).toMatch(/^mock-room-/);

      await sandboxManager.connectToHost(sandboxId, 'http://localhost:3000', roomId);

      const sandboxInfo = sandboxManager.getSandboxInfo(sandboxId);
      expect(sandboxInfo?.roomId).toBe(roomId);
    });

    it('should cleanup sandbox properly', async () => {
      const sandboxManager = runtime.getService('sandbox-manager') as MockSandboxManager;
      const sandboxId = await sandboxManager.createSandbox();

      expect(sandboxManager.getSandboxInfo(sandboxId)).toBeDefined();

      await sandboxManager.destroySandbox(sandboxId);

      expect(sandboxManager.getSandboxInfo(sandboxId)).toBeNull();
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full todo app development workflow', async () => {
      // 1. Spawn development team
      const spawnMessage: Memory = {
        id: 'e2e-msg-1' as UUID,
        entityId: 'user-1' as UUID,
        roomId: 'room-1' as UUID,
        content: {
          text: 'Create a todo list app with React, Express, and SQLite. Make it responsive with add, edit, delete, and completion features.',
        },
      };

      const spawnResult = await spawnDevTeamAction.handler(runtime, spawnMessage);
      expect(spawnResult.text).toContain('Development Team Assembled');

      // 2. Delegate tasks
      const delegateMessage: Memory = {
        id: 'e2e-msg-2' as UUID,
        entityId: 'user-1' as UUID,
        roomId: 'room-1' as UUID,
        content: {
          text: 'Assign DevOps to set up project structure, Backend to create the API, and Frontend to build the UI',
        },
      };

      const delegateResult = await delegateTaskAction.handler(runtime, delegateMessage);
      expect(delegateResult.text).toContain('Tasks Delegated Successfully');

      // 3. Simulate team development work
      const sandboxManager = runtime.getService('sandbox-manager') as MockSandboxManager;
      const sandboxId = spawnResult.data.sandboxId;

      const updates = await sandboxManager.simulateTeamCollaboration(sandboxId);
      expect(updates.length).toBeGreaterThan(5);

      // 4. Verify final state
      const finalUpdate = updates[updates.length - 1];
      expect(finalUpdate).toContain('http://localhost:3000');

      logger.info('🎉 End-to-end workflow completed successfully!');
      logger.info(`📋 ${updates.length} development updates simulated`);
      logger.info('✅ Todo list application ready for demo');
    });
  });
});
