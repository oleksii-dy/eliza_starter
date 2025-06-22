import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autonomousWorldProvider, worldProvider } from '../../worldProvider';
import { createMockRuntime, createMockMemory, createMockState, createMockService } from '../utils/mock-runtime';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { OODAPhase, AutonomousServiceType } from '../../types';

// Mock addHeader utility
vi.mock('@elizaos/core', async () => {
  const actual = await vi.importActual('@elizaos/core');
  return {
    ...actual,
    addHeader: vi.fn((header: string, content: string) => `${header}\n\n${content}`),
    createUniqueUuid: vi.fn((runtime: any, seed: string) => `unique-${seed}-${runtime.agentId}`),
  };
});

describe('autonomousWorldProvider', () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime = createMockRuntime({
      settings: {
        WORLD_ID: 'test-world-id',
      },
    });
    mockMessage = createMockMemory();
    mockState = createMockState();
  });

  describe('provider structure', () => {
    it('should have correct provider metadata', () => {
      expect(autonomousWorldProvider.name).toBe('AUTONOMOUS_WORLD');
      expect(autonomousWorldProvider.description).toContain('autonomous world and room setup');
      expect(autonomousWorldProvider.position).toBe(50);
      expect(typeof autonomousWorldProvider.get).toBe('function');
    });

    it('should not be marked as dynamic or private', () => {
      expect(autonomousWorldProvider.dynamic).toBeUndefined();
      expect(autonomousWorldProvider.private).toBeUndefined();
    });
  });

  describe('get method', () => {
    it('should handle missing WORLD_ID setting', async () => {
      const noWorldRuntime = createMockRuntime({
        settings: {},
      });

      const result = await autonomousWorldProvider.get(noWorldRuntime, mockMessage, mockState);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data!.worldId).toBeNull();
      expect(result.data!.status).toBe('no_world_id');
      expect(result.text).toContain('No WORLD_ID configured');
      expect(result.values!.autonomousWorld).toContain('may not be fully initialized');
    });

    it('should retrieve world and room information when available', async () => {
      const mockWorld = {
        id: 'test-world-id',
        name: 'Test World',
        serverId: 'server-123',
        agentId: 'agent-456',
      };

      const mockRoom = {
        id: 'unique-autonomous_room_singleton-test-agent',
        name: 'Autonomous Room',
        type: 'AUTONOMOUS',
        worldId: 'test-world-id',
        source: 'autonomous',
      };

      mockRuntime.getWorld = vi.fn().mockResolvedValue(mockWorld);
      mockRuntime.getRoom = vi.fn().mockResolvedValue(mockRoom);

      const result = await autonomousWorldProvider.get(mockRuntime, mockMessage, mockState);

      expect(result).toBeDefined();
      expect(result.data!.worldId).toBe('test-world-id');
      expect(result.data!.worldInfo).toEqual({
        id: mockWorld.id,
        name: mockWorld.name,
        serverId: mockWorld.serverId,
        agentId: mockWorld.agentId,
      });
      expect(result.data!.roomInfo).toEqual({
        id: mockRoom.id,
        name: mockRoom.name,
        type: mockRoom.type,
        worldId: mockRoom.worldId,
        source: mockRoom.source,
      });
      expect(result.data!.status).toBe('ready');
      expect(result.values!.worldStatus).toBe('ready');
      expect(result.values!.roomStatus).toBe('ready');
    });

    it('should handle world not found', async () => {
      mockRuntime.getWorld = vi.fn().mockResolvedValue(null);
      mockRuntime.getRoom = vi.fn().mockResolvedValue(null);

      const result = await autonomousWorldProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.data!.worldInfo).toBeNull();
      expect(result.data!.roomInfo).toBeNull();
      expect(result.data!.status).toBe('incomplete');
      expect(result.values!.worldStatus).toBe('missing');
      expect(result.values!.roomStatus).toBe('missing');
      expect(result.text).toContain('World Status:** Not Found');
      expect(result.text).toContain('Room Status:** Not Found');
    });

    it('should handle runtime without getWorld/getRoom methods', async () => {
      const limitedRuntime = createMockRuntime({
        settings: {
          WORLD_ID: 'test-world-id',
        },
      });
      // Remove the methods to simulate older runtime
      delete (limitedRuntime as any).getWorld;
      delete (limitedRuntime as any).getRoom;

      const result = await autonomousWorldProvider.get(limitedRuntime, mockMessage, mockState);

      expect(result).toBeDefined();
      expect(result.data!.worldInfo).toBeNull();
      expect(result.data!.roomInfo).toBeNull();
      expect(result.data!.status).toBe('incomplete');
    });

    it('should handle database query errors gracefully', async () => {
      mockRuntime.getWorld = vi.fn().mockRejectedValue(new Error('Database connection failed'));
      mockRuntime.getRoom = vi.fn().mockRejectedValue(new Error('Database connection failed'));

      const result = await autonomousWorldProvider.get(mockRuntime, mockMessage, mockState);

      expect(result).toBeDefined();
      expect(result.data!.worldInfo).toBeNull();
      expect(result.data!.roomInfo).toBeNull();
      expect(result.data!.status).toBe('incomplete');
    });

    it('should format status text correctly with all information', async () => {
      const mockWorld = {
        id: 'test-world-id',
        name: 'Test World',
        serverId: 'server-123',
        agentId: 'agent-456',
      };

      const mockRoom = {
        id: 'unique-autonomous_room_singleton-test-agent',
        name: 'Autonomous Room',
        type: 'AUTONOMOUS',
        worldId: 'test-world-id',
        source: 'autonomous',
      };

      mockRuntime.getWorld = vi.fn().mockResolvedValue(mockWorld);
      mockRuntime.getRoom = vi.fn().mockResolvedValue(mockRoom);

      const result = await autonomousWorldProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.text).toContain('# Autonomous World Information');
      expect(result.text).toContain('# Autonomous World Status');
      expect(result.text).toContain('**World ID:** test-world-id');
      expect(result.text).toContain('**World Status:** Found');
      expect(result.text).toContain('**World Name:** Test World');
      expect(result.text).toContain('**Room Status:** Found');
      expect(result.text).toContain('**Room Name:** Autonomous Room');
      expect(result.text).toContain('**Room Type:** AUTONOMOUS');
      expect(result.text).toContain('**Agent ID:** test-agent');
      expect(result.text).toContain('**Character Name:** TestAgent');
    });

    it('should include character and agent information', async () => {
      const result = await autonomousWorldProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.data!.agentId).toBe(mockRuntime.agentId);
      expect(result.data!.characterName).toBe(mockRuntime.character.name);
      expect(result.text).toContain(`**Agent ID:** ${mockRuntime.agentId}`);
      expect(result.text).toContain(`**Character Name:** ${mockRuntime.character.name}`);
    });

    it('should generate unique room ID based on agent', async () => {
      const result = await autonomousWorldProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.data!.roomId).toMatch(/unique-autonomous_room_singleton-.+/);
    });

    it('should handle partial world/room availability', async () => {
      const mockWorld = {
        id: 'test-world-id',
        name: 'Test World',
        serverId: 'server-123',
        agentId: 'agent-456',
      };

      mockRuntime.getWorld = vi.fn().mockResolvedValue(mockWorld);
      mockRuntime.getRoom = vi.fn().mockResolvedValue(null); // Room not found

      const result = await autonomousWorldProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.data!.worldInfo).toBeDefined();
      expect(result.data!.roomInfo).toBeNull();
      expect(result.data!.status).toBe('incomplete');
      expect(result.values!.worldStatus).toBe('ready');
      expect(result.values!.roomStatus).toBe('missing');
    });
  });

  describe('error handling', () => {
    it('should handle general errors gracefully', async () => {
      const errorRuntime = createMockRuntime({
        settings: {
          WORLD_ID: 'test-world-id',
        },
      });

      // Mock getSetting to throw an error
      errorRuntime.getSetting = vi.fn().mockImplementation(() => {
        throw new Error('Settings system failure');
      });

      const result = await autonomousWorldProvider.get(errorRuntime, mockMessage, mockState);

      expect(result).toBeDefined();
      expect(result.data!.error).toBe('Settings system failure');
      expect(result.data!.status).toBe('error');
      expect(result.text).toContain('Error retrieving autonomous world information');
      expect(result.values!.autonomousWorld).toContain('Error retrieving');
    });

    it('should handle non-Error exceptions', async () => {
      const errorRuntime = createMockRuntime({
        settings: {
          WORLD_ID: 'test-world-id',
        },
      });

      errorRuntime.getSetting = vi.fn().mockImplementation(() => {
        throw 'String error';
      });

      const result = await autonomousWorldProvider.get(errorRuntime, mockMessage, mockState);

      expect(result.data!.error).toBe('String error');
      expect(result.data!.status).toBe('error');
    });

    it('should handle null message gracefully', async () => {
      const result = await autonomousWorldProvider.get(mockRuntime, null as any, mockState);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle null state gracefully', async () => {
      const result = await autonomousWorldProvider.get(mockRuntime, mockMessage, null as any);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });
  });
});

describe('worldProvider (AUTONOMOUS_WORLD_CONTEXT)', () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;
  let mockOODAService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock OODA service with comprehensive context
    mockOODAService = createMockService('autonomous', {
      currentContext: {
        phase: OODAPhase.ORIENTING,
        runId: 'run-123',
        startTime: Date.now() - 60000, // 1 minute ago
        observations: [
          {
            type: 'system_state',
            source: 'resource_monitor',
            relevance: 0.8,
            timestamp: Date.now() - 30000,
          },
          {
            type: 'user_activity',
            source: 'message_handler',
            relevance: 0.6,
            timestamp: Date.now() - 20000,
          },
          {
            type: 'performance_metric',
            source: 'metrics_collector',
            relevance: 0.9,
            timestamp: Date.now() - 10000,
          },
        ],
        actions: [
          {
            name: 'ANALYZE_DATA',
            status: 'completed',
            timestamp: Date.now() - 25000,
          },
          {
            name: 'MONITOR_SYSTEM',
            status: 'running',
            timestamp: Date.now() - 15000,
          },
        ],
        errors: [
          {
            message: 'Network timeout',
            timestamp: Date.now() - 35000,
            phase: OODAPhase.OBSERVING,
          },
        ],
        orientation: {
          resourceStatus: {
            cpu: 45.5,
            memory: 60.2,
            disk: 75.8,
            taskSlots: {
              used: 2,
              total: 5,
            },
          },
          environmentalFactors: [
            {
              type: 'network_latency',
              value: 150,
              impact: 0.3,
            },
          ],
        },
        metrics: {
          cycleTime: 2500,
          actionSuccessRate: 0.85,
          errorRate: 0.1,
          resourceEfficiency: 0.72,
        },
      },
      goals: [
        {
          description: 'Learn from user interactions',
          progress: 0.65,
          priority: 1,
        },
        {
          description: 'Maintain system health',
          progress: 0.8,
          priority: 2,
        },
        {
          description: 'Complete pending tasks',
          progress: 0.4,
          priority: 3,
        },
      ],
    });

    mockRuntime = createMockRuntime({
      services: {
        [AutonomousServiceType.AUTONOMOUS]: mockOODAService,
      },
    });
    
    mockMessage = createMockMemory();
    mockState = createMockState();
  });

  describe('provider structure', () => {
    it('should have correct provider metadata', () => {
      expect(worldProvider.name).toBe('AUTONOMOUS_WORLD_CONTEXT');
      expect(worldProvider.description).toContain('dynamic context about the autonomous world');
      expect(worldProvider.dynamic).toBe(true);
      expect(worldProvider.position).toBe(1);
      expect(typeof worldProvider.get).toBe('function');
    });
  });

  describe('get method', () => {
    it('should return comprehensive OODA context when service is active', async () => {
      const result = await worldProvider.get(mockRuntime, mockMessage, mockState);

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.values).toBeDefined();
      expect(result.data).toBeDefined();

      // Check values structure
      expect(result.values!.autonomousActive).toBe(true);
      expect(result.values!.oodaRunning).toBe(true);
      expect(result.values!.currentPhase).toBe(OODAPhase.ORIENTING);
      expect(result.values!.runId).toBe('run-123');
      expect(typeof result.values!.uptime).toBe('number');
      expect(result.values!.observationCount).toBe(3);
      expect(result.values!.actionCount).toBe(2);
      expect(result.values!.runningActions).toBe(1);
      expect(result.values!.errorCount).toBe(1);

      // Check goals structure
      expect(Array.isArray(result.values!.goals)).toBe(true);
      expect(result.values!.goals).toHaveLength(3);
      expect(result.values!.goals[0]).toHaveProperty('description');
      expect(result.values!.goals[0]).toHaveProperty('progress');
      expect(result.values!.goals[0]).toHaveProperty('priority');

      // Check resource status
      expect(result.values!.resourceStatus).toBeDefined();
      expect(result.values!.resourceStatus.cpu).toBe(45.5);
      expect(result.values!.resourceStatus.memory).toBe(60.2);
      expect(result.values!.resourceStatus.taskSlots.used).toBe(2);

      // Check metrics
      expect(result.values!.metrics).toBeDefined();
      expect(result.values!.metrics.cycleTime).toBe(2500);
      expect(result.values!.metrics.actionSuccessRate).toBe(0.85);

      // Check recent observations
      expect(Array.isArray(result.values!.recentObservations)).toBe(true);
      expect(result.values!.recentObservations).toHaveLength(3);

      // Check data
      expect(result.data!.fullContext).toBeDefined();
    });

    it('should format context text correctly', async () => {
      const result = await worldProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.text).toContain('Current OODA Phase:');
      expect(result.text).toContain('Run ID: run-123');
      expect(result.text).toContain('Active for:');
      expect(result.text).toContain('System Status:');
      expect(result.text).toContain('3 observations collected');
      expect(result.text).toContain('2 actions executed (1 running)');
      expect(result.text).toContain('1 errors encountered');
      expect(result.text).toContain('Resource Usage:');
      expect(result.text).toContain('CPU: 45.5%');
      expect(result.text).toContain('Memory: 60.2%');
      expect(result.text).toContain('Task Slots: 2/5');
      expect(result.text).toContain('Active Goals:');
      expect(result.text).toContain('Learn from user interactions (Progress: 65%)');
      expect(result.text).toContain('Recent Observations:');
      expect(result.text).toContain('Performance Metrics:');
      expect(result.text).toContain('Success Rate: 85.0%');
      expect(result.text).toContain('Error Rate: 10.0%');
    });

    it('should handle OODA service not available', async () => {
      const noServiceRuntime = createMockRuntime({
        services: {},
      });

      const result = await worldProvider.get(noServiceRuntime, mockMessage, mockState);

      expect(result.text).toBe('Autonomous OODA loop service is not active.');
      expect(result.values!.autonomousActive).toBe(false);
    });

    it('should handle runtime without getService method', async () => {
      const limitedRuntime = createMockRuntime();
      delete (limitedRuntime as any).getService;

      const result = await worldProvider.get(limitedRuntime, mockMessage, mockState);

      expect(result.text).toBe('Autonomous OODA loop service is not active.');
      expect(result.values!.autonomousActive).toBe(false);
    });

    it('should handle OODA service without active context', async () => {
      const noContextService = createMockService('autonomous', {
        currentContext: null,
      });

      const noContextRuntime = createMockRuntime({
        services: {
          [AutonomousServiceType.AUTONOMOUS]: noContextService,
        },
      });

      const result = await worldProvider.get(noContextRuntime, mockMessage, mockState);

      expect(result.text).toBe('OODA loop is running but no active context available.');
      expect(result.values!.autonomousActive).toBe(true);
      expect(result.values!.oodaRunning).toBe(true);
      expect(result.values!.contextAvailable).toBe(false);
    });

    it('should handle minimal context without optional fields', async () => {
      const minimalService = createMockService('autonomous', {
        currentContext: {
          phase: OODAPhase.OBSERVING,
          runId: 'minimal-run',
          startTime: Date.now() - 30000,
        },
        goals: [],
      });

      const minimalRuntime = createMockRuntime({
        services: {
          [AutonomousServiceType.AUTONOMOUS]: minimalService,
        },
      });

      const result = await worldProvider.get(minimalRuntime, mockMessage, mockState);

      expect(result.values!.autonomousActive).toBe(true);
      expect(result.values!.currentPhase).toBe(OODAPhase.OBSERVING);
      expect(result.values!.observationCount).toBe(0);
      expect(result.values!.actionCount).toBe(0);
      expect(result.values!.errorCount).toBe(0);
      expect(result.values!.goals).toEqual([]);
      expect(result.text).toContain('0 observations collected');
      expect(result.text).toContain('0 actions executed');
    });

    it('should format duration correctly', async () => {
      // Test different duration formats
      const testCases = [
        { startTime: Date.now() - 500, expected: 'ms' },
        { startTime: Date.now() - 5000, expected: 's' },
        { startTime: Date.now() - 150000, expected: 'm' },
        { startTime: Date.now() - 7200000, expected: 'h' },
      ];

      for (const testCase of testCases) {
        const serviceWithTime = createMockService('autonomous', {
          currentContext: {
            phase: OODAPhase.ACTING,
            runId: 'time-test',
            startTime: testCase.startTime,
          },
          goals: [],
        });

        const runtimeWithTime = createMockRuntime({
          services: {
            [AutonomousServiceType.AUTONOMOUS]: serviceWithTime,
          },
        });

        const result = await worldProvider.get(runtimeWithTime, mockMessage, mockState);
        expect(result.text).toMatch(new RegExp(`Active for: .*${testCase.expected}`));
      }
    });

    it('should handle context with resource status but no metrics', async () => {
      const noMetricsService = createMockService('autonomous', {
        currentContext: {
          phase: OODAPhase.DECIDING,
          runId: 'no-metrics',
          startTime: Date.now() - 45000,
          orientation: {
            resourceStatus: {
              cpu: 30,
              memory: 50,
              disk: 20,
              taskSlots: { used: 1, total: 3 },
            },
          },
        },
        goals: [],
      });

      const noMetricsRuntime = createMockRuntime({
        services: {
          [AutonomousServiceType.AUTONOMOUS]: noMetricsService,
        },
      });

      const result = await worldProvider.get(noMetricsRuntime, mockMessage, mockState);

      expect(result.text).toContain('Resource Usage:');
      expect(result.text).toContain('CPU: 30%');
      expect(result.text).not.toContain('Performance Metrics:');
      expect(result.values!.resourceStatus).toBeDefined();
      expect(result.values!.metrics).toBeUndefined();
    });

    it('should limit recent observations to last 3', async () => {
      const manyObservationsService = createMockService('autonomous', {
        currentContext: {
          phase: OODAPhase.REFLECTING,
          runId: 'many-obs',
          startTime: Date.now() - 120000,
          observations: Array.from({ length: 10 }, (_, i) => ({
            type: `observation_${i}`,
            source: `source_${i}`,
            relevance: 0.5 + (i * 0.05),
            timestamp: Date.now() - (10000 * (10 - i)),
          })),
        },
        goals: [],
      });

      const manyObsRuntime = createMockRuntime({
        services: {
          [AutonomousServiceType.AUTONOMOUS]: manyObservationsService,
        },
      });

      const result = await worldProvider.get(manyObsRuntime, mockMessage, mockState);

      expect(result.values!.observationCount).toBe(10);
      expect(result.values!.recentObservations).toHaveLength(3);
      // Should contain the last 3 observations
      expect(result.values!.recentObservations[0].type).toBe('observation_7');
      expect(result.values!.recentObservations[1].type).toBe('observation_8');
      expect(result.values!.recentObservations[2].type).toBe('observation_9');
    });
  });

  describe('error handling', () => {
    it('should handle service access errors gracefully', async () => {
      const errorRuntime = createMockRuntime();
      errorRuntime.getService = vi.fn().mockImplementation(() => {
        throw new Error('Service access denied');
      });

      const result = await worldProvider.get(errorRuntime, mockMessage, mockState);

      expect(result.text).toBe('Failed to retrieve autonomous world context.');
      expect(result.values!.autonomousActive).toBe(false);
      expect(result.values!.error).toBe('Service access denied');
    });

    it('should handle null message gracefully', async () => {
      const result = await worldProvider.get(mockRuntime, null as any, mockState);

      expect(result).toBeDefined();
      expect(result.values!.autonomousActive).toBe(true);
    });

    it('should handle null state gracefully', async () => {
      const result = await worldProvider.get(mockRuntime, mockMessage, null as any);

      expect(result).toBeDefined();
      expect(result.values!.autonomousActive).toBe(true);
    });

    it('should handle corrupted context data', async () => {
      const corruptedService = createMockService('autonomous', {
        currentContext: {
          phase: 'INVALID_PHASE' as any,
          // Missing required fields
        },
        goals: null as any, // Invalid goals
      });

      const corruptedRuntime = createMockRuntime({
        services: {
          [AutonomousServiceType.AUTONOMOUS]: corruptedService,
        },
      });

      const result = await worldProvider.get(corruptedRuntime, mockMessage, mockState);

      expect(result).toBeDefined();
      expect(result.values!.autonomousActive).toBe(true);
      // Should handle gracefully even with corrupted data
    });
  });
});