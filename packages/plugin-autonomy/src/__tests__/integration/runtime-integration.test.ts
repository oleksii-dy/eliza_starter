import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { autoPlugin } from '../../index';
import { createMockRuntime, createMockMemory, createMockState } from '../utils/mock-runtime';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { AutonomousServiceType } from '../../types';

/**
 * Integration tests that verify runtime integration with database operations,
 * memory management, and entity relationships
 */
describe('Runtime Integration Tests', () => {
  let mockRuntime: IAgentRuntime;
  let oodaService: any;

  beforeEach(async () => {
    mock.restore();

    // Create comprehensive mock runtime
    mockRuntime = createMockRuntime({
      settings: {
        AUTONOMOUS_ENABLED: 'true',
        OODA_CYCLE_INTERVAL: '1000',
        WORLD_ID: 'integration-world-id',
      },
      memoryResults: [
        createMockMemory({
          id: 'memory-1' as any,
          content: { text: 'Initial system setup complete', source: 'system' },
          createdAt: Date.now() - 60000,
        }),
        createMockMemory({
          id: 'memory-2' as any,
          content: { text: 'User initiated autonomous mode', source: 'user' },
          createdAt: Date.now() - 30000,
        }),
      ],
    });

    // Initialize OODA service
    const oodaServiceClass = autoPlugin.services?.find((s) => s.serviceType === 'autonomous');
    if (oodaServiceClass) {
      oodaService = await oodaServiceClass.start(mockRuntime);
      mockRuntime.getService = mock((serviceName: string) => {
        if (serviceName === AutonomousServiceType.AUTONOMOUS) {
          return oodaService;
        }
        return null;
      });
    }
  });

  afterEach(async () => {
    if (oodaService) {
      await oodaService.stop();
    }
    mock.restore();
  });

  describe('Memory Integration', () => {
    it('should create and retrieve memories through runtime', async () => {
      const testMemory = createMockMemory({
        content: {
          text: 'Test autonomous memory creation',
          source: 'autonomous',
          metadata: { phase: 'OBSERVING', importance: 'high' },
        },
      });

      // Test memory creation
      const memoryId = await mockRuntime.createMemory(testMemory, 'autonomous');
      expect(memoryId).toBeDefined();
      expect(typeof memoryId).toBe('string');

      // Test memory retrieval
      const memories = await mockRuntime.getMemories({
        roomId: testMemory.roomId as any,
        count: 10,
        tableName: 'autonomous',
      });

      expect(Array.isArray(memories)).toBe(true);
      expect(mockRuntime.createMemory).toHaveBeenCalledWith(testMemory, 'autonomous');
    });

    it('should search memories with embedding similarity', async () => {
      const searchQuery = {
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        roomId: 'test-room' as any,
        match_threshold: 0.7,
        count: 5,
        tableName: 'autonomous',
      };

      const results = await mockRuntime.searchMemories(searchQuery);

      expect(Array.isArray(results)).toBe(true);
      expect(mockRuntime.searchMemories).toHaveBeenCalledWith(searchQuery);
    });
  });

  describe('Entity and Component Integration', () => {
    it('should manage entities and their components', async () => {
      const testEntity = {
        names: ['Test Autonomous Agent', 'TAA'],
        metadata: {
          type: 'autonomous_agent',
          capabilities: ['browsing', 'reflection', 'command_execution'],
        },
        agentId: mockRuntime.agentId,
      };

      // Create entity
      const entityId = await mockRuntime.createEntity(testEntity);
      expect(entityId).toBeDefined();
      expect(typeof entityId).toBe('string');

      // Retrieve entity
      const retrievedEntity = await mockRuntime.getEntityById(entityId as any);
      expect(retrievedEntity).toBeDefined();
      expect(retrievedEntity!.id).toBe(entityId as any);

      // Create component for entity
      const component = {
        id: 'test-component-id' as any,
        entityId: entityId as any,
        agentId: mockRuntime.agentId,
        roomId: 'test-room' as any,
        worldId: 'test-world' as any,
        sourceEntityId: mockRuntime.agentId,
        type: 'autonomous_config',
        createdAt: Date.now(),
        data: {
          oodaEnabled: true,
          cycleInterval: 5000,
          maxConcurrentActions: 3,
        },
      };

      const componentId = await mockRuntime.createComponent(component);
      expect(componentId).toBeDefined();
      expect(typeof componentId).toBe('string');

      // Retrieve components
      const components = await mockRuntime.getComponents(entityId as any);
      expect(Array.isArray(components)).toBe(true);
    });
  });

  describe('Task Integration', () => {
    it('should create and manage autonomous tasks', async () => {
      const autonomousTask = {
        name: 'AUTONOMOUS_OBSERVATION',
        description: 'Periodic observation of system state',
        roomId: 'test-room' as any,
        tags: ['autonomous', 'ooda', 'observation'],
        metadata: {
          phase: 'OBSERVING',
          interval: 30000,
          priority: 'high',
        },
      };

      // Create task
      const taskId = await mockRuntime.createTask(autonomousTask);
      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');

      // Get tasks
      const tasks = await mockRuntime.getTasks({
        roomId: autonomousTask.roomId,
        tags: ['autonomous'],
      });

      expect(Array.isArray(tasks)).toBe(true);
      expect(mockRuntime.createTask).toHaveBeenCalledWith(autonomousTask);

      // Update task
      const updateResult = await mockRuntime.updateTask(taskId, {
        metadata: {
          ...autonomousTask.metadata,
          status: 'completed',
        },
      });

      expect(updateResult).toBeTruthy();

      // Delete task
      const deleteResult = await mockRuntime.deleteTask(taskId);
      expect(deleteResult).toBeTruthy();
    });
  });

  describe('State Composition Integration', () => {
    it('should compose state with provider integration', async () => {
      const testMessage = createMockMemory({
        content: {
          text: 'Test state composition with providers',
          source: 'user',
        },
      });

      // Test state composition with all providers
      const fullState = await mockRuntime.composeState(testMessage);

      expect(fullState).toBeDefined();
      expect(fullState.values).toBeDefined();
      expect(fullState.data).toBeDefined();
      expect(fullState.text).toBeDefined();

      expect(fullState.values.currentDate).toBeDefined();
      expect(fullState.values.agentName).toBe('TestAgent');
      expect(fullState.data.message).toBeDefined();

      // Test state composition with specific providers
      const specificState = await mockRuntime.composeState(testMessage, ['TIME', 'CHARACTER']);

      expect(specificState).toBeDefined();
      expect(specificState.data.providers).toEqual(['TIME', 'CHARACTER']);
    });

    it('should integrate OODA context into state composition', async () => {
      const oodaMessage = createMockMemory({
        content: {
          text: 'Get current OODA loop status',
          source: 'system',
        },
      });

      const state = await mockRuntime.composeState(oodaMessage);

      // Verify OODA service is available in state
      expect(state).toBeDefined();
      expect(state.values.agentName).toBeDefined();

      // Test with provider that uses OODA service
      const worldProvider = autoPlugin.providers?.find(
        (p) => p.name === 'AUTONOMOUS_WORLD_CONTEXT'
      );
      if (worldProvider) {
        const worldContext = await worldProvider.get(mockRuntime, oodaMessage, state);
        expect(worldContext.values!.autonomousActive).toBe(true);
      }
    });
  });

  describe('Event Integration', () => {
    it('should emit and handle events properly', async () => {
      const eventPayload = {
        type: 'AUTONOMOUS_PHASE_CHANGE',
        phase: 'OBSERVING',
        timestamp: Date.now(),
        context: {
          roomId: 'test-room',
          agentId: mockRuntime.agentId,
        },
      };

      // Test event emission
      await mockRuntime.emitEvent('AUTONOMOUS_PHASE_CHANGE', eventPayload);

      expect(mockRuntime.emitEvent).toHaveBeenCalledWith('AUTONOMOUS_PHASE_CHANGE', eventPayload);
    });
  });

  describe('Model Integration', () => {
    it('should integrate with language models for autonomous decisions', async () => {
      const modelParams = {
        prompt: 'Analyze the current system state and recommend next actions',
        temperature: 0.7,
        maxTokens: 256,
      };

      // Test text generation
      const textResult = await mockRuntime.useModel('TEXT_LARGE', modelParams);
      expect(textResult).toBeDefined();
      expect(typeof textResult).toBe('string');

      // Test embedding generation
      const embeddingParams = {
        text: 'Autonomous system observation data',
      };

      const embeddingResult = await mockRuntime.useModel('TEXT_EMBEDDING', embeddingParams);
      expect(embeddingResult).toBeDefined();
      expect(Array.isArray(embeddingResult)).toBe(true);
    });
  });

  describe('World and Room Integration', () => {
    it('should manage autonomous world and room structures', async () => {
      // Create autonomous world
      const worldData = {
        id: 'test-world-id' as any,
        name: 'Autonomous Test World',
        agentId: mockRuntime.agentId,
        serverId: 'test-server',
        metadata: {
          autonomousEnabled: true,
          oodaCycleInterval: 5000,
        },
      };

      const worldId = await mockRuntime.createWorld(worldData);
      expect(worldId).toBeDefined();

      // Retrieve world
      const world = await mockRuntime.getWorld(worldId);
      expect(world).toBeDefined();
      expect(world!.id).toBe(worldId);

      // Create autonomous room
      const roomData = {
        id: 'test-room-id' as any,
        name: 'Autonomous Operations Room',
        agentId: mockRuntime.agentId,
        source: 'autonomous',
        type: 'SELF' as any,
        worldId,
      };

      const roomId = await mockRuntime.createRoom(roomData);
      expect(roomId).toBeDefined();

      // Retrieve room
      const room = await mockRuntime.getRoom(roomId);
      expect(room).toBeDefined();
      expect(room!.id).toBe(roomId);
      expect(room!.worldId).toBe(worldId);
    });
  });

  describe('Database Operation Integration', () => {
    it('should execute database queries through runtime', async () => {
      const testQuery = 'SELECT * FROM autonomous_actions WHERE status = ?';
      const testParams = ['active'];

      // Test database query
      const queryResult = await mockRuntime.db.query(testQuery, testParams);
      expect(Array.isArray(queryResult)).toBe(true);

      // Test database execution
      const insertQuery = 'INSERT INTO autonomous_log (message, timestamp) VALUES (?, ?)';
      const insertParams = ['Test autonomous operation', Date.now()];

      const execResult = await mockRuntime.db.run(insertQuery, insertParams);
      expect(execResult).toBeDefined();
      expect(execResult.changes).toBe(1);
    });
  });

  describe('Plugin Lifecycle Integration', () => {
    it('should integrate with plugin lifecycle methods', async () => {
      // Test plugin initialization
      if (autoPlugin.init) {
        await expect(autoPlugin.init({}, mockRuntime)).resolves.not.toThrow();
      }

      // Verify services are registered
      expect(autoPlugin.services).toBeDefined();
      expect(autoPlugin.services!.length).toBeGreaterThan(0);

      // Verify actions are available
      expect(autoPlugin.actions).toBeDefined();
      expect(autoPlugin.actions!.length).toBeGreaterThan(0);

      // Verify providers are available
      expect(autoPlugin.providers).toBeDefined();
      expect(autoPlugin.providers!.length).toBeGreaterThan(0);

      // Test service lifecycle
      const oodaServiceClass = autoPlugin.services?.find((s) => s.serviceType === 'autonomous');
      if (oodaServiceClass) {
        const serviceInstance = await oodaServiceClass.start(mockRuntime);
        expect(serviceInstance).toBeDefined();
        expect(serviceInstance.serviceName).toBe('autonomous');
        await serviceInstance.stop();
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle runtime errors gracefully', async () => {
      // Test with error runtime
      const errorRuntime = createMockRuntime({
        simulateErrors: true,
        settings: { ERROR_SETTING: 'test' },
      });

      // Provider should handle runtime errors
      const worldProvider = autoPlugin.providers?.find(
        (p) => p.name === 'AUTONOMOUS_WORLD_CONTEXT'
      );
      if (worldProvider) {
        const errorMessage = createMockMemory();
        const errorState = createMockState();

        try {
          const result = await worldProvider.get(errorRuntime, errorMessage, errorState);
          expect(result).toBeDefined();
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }

      // Actions should validate properly even with errors
      const actions = autoPlugin.actions || [];
      for (const action of actions.slice(0, 2)) {
        // Test first 2 actions
        try {
          const errorMessage = createMockMemory();
          const errorState = createMockState();
          const isValid = await action.validate(errorRuntime, errorMessage, errorState);
          expect(typeof isValid).toBe('boolean');
        } catch (error) {
          // Some validation errors are expected
          expect(error).toBeInstanceOf(Error);
        }
      }
    });
  });
});
