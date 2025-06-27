import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { RobotService } from '../../services/robot-service';
import type { IAgentRuntime } from '@elizaos/core';
import { RobotMode, RobotStatus } from '../../types';

// Simplified TestSuite implementation for local use
class TestSuite {
  constructor(private name: string, private config: any) {}
  
  addTest(test: any) {
    it(test.name, async () => {
      const context = this.config.beforeEach ? await this.config.beforeEach() : {};
      try {
        await test.fn(context);
      } finally {
        if (this.config.afterEach) {
          await this.config.afterEach(context);
        }
      }
    });
  }
  
  run() {
    // No-op, bun:test handles execution
  }
}

const createUnitTest = (config: { name: string; fn: (context?: any) => Promise<void> | void }) => config;

// Mock runtime helper
function createMockRuntime(overrides: any = {}): IAgentRuntime {
  return {
    agentId: 'test-agent',
    character: {
      name: 'TestAgent',
      bio: ['Test bio'],
      system: 'Test system prompt',
    },
    getSetting: mock((key: string) => {
      const settings: Record<string, string> = {
        USE_SIMULATION: 'true', // Use simulation mode for testing
        ROBOT_SERIAL_PORT: '/dev/ttyUSB0',
        ROBOT_BAUD_RATE: '115200',
        ROS_WEBSOCKET_URL: 'ws://localhost:9090',
        ...overrides.settings,
      };
      return settings[key];
    }),
    ...overrides,
  } as unknown as IAgentRuntime;
}

describe('RobotService', () => {
  let service: RobotService | undefined;
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    mock.restore();
    mockRuntime = createMockRuntime();
  });

  afterEach(async () => {
    if (service) {
      await service.stop();
    }
  });

  // Initialization tests
  const initializationSuite = new TestSuite('RobotService Initialization', {
    beforeEach: () => {
      mock.restore();
      const mockRuntime = createMockRuntime();
      return { mockRuntime };
    },
  });

  initializationSuite.addTest(
    createUnitTest({
      name: 'should have correct service name',
      fn: () => {
        expect(RobotService.serviceName).toBe('ROBOT');
      },
    })
  );

  initializationSuite.addTest(
    createUnitTest({
      name: 'should have proper capability description',
      fn: ({ mockRuntime }) => {
        const tempService = new RobotService(mockRuntime);
        expect(tempService.capabilityDescription).toContain('robot control');
      },
    })
  );

  initializationSuite.addTest(
    createUnitTest({
      name: 'should start successfully with valid configuration',
      fn: async ({ mockRuntime }) => {
        const startedService = await RobotService.start(mockRuntime);
        const service = startedService as RobotService;
        
        expect(service).toBeInstanceOf(RobotService);
        
        // Cleanup
        await service.stop();
      },
    })
  );

  initializationSuite.run();

  // Mode control tests
  const modeControlSuite = new TestSuite('RobotService Mode Control', {
    beforeEach: async () => {
      mock.restore();
      const mockRuntime = createMockRuntime();
      const startedService = await RobotService.start(mockRuntime);
      const service = startedService as RobotService;
      return { service, mockRuntime };
    },
    afterEach: async ({ service }: { service: RobotService }) => {
      if (service) {
        await service.stop();
      }
    },
  });

  modeControlSuite.addTest(
    createUnitTest({
      name: 'should start in IDLE mode',
      fn: ({ service }) => {
        const state = service.getState();
        expect(state.mode).toBe(RobotMode.IDLE);
      },
    })
  );

  modeControlSuite.addTest(
    createUnitTest({
      name: 'should allow mode changes',
      fn: async ({ service }) => {
        await service.setMode(RobotMode.MANUAL);
        expect(service.getState().mode).toBe(RobotMode.MANUAL);

        await service.setMode(RobotMode.AUTONOMOUS);
        expect(service.getState().mode).toBe(RobotMode.AUTONOMOUS);
      },
    })
  );

  modeControlSuite.addTest(
    createUnitTest({
      name: 'should handle emergency stop',
      fn: async ({ service }) => {
        await service.setMode(RobotMode.MANUAL);
        await service.emergencyStop();
        expect(service.getState().mode).toBe(RobotMode.EMERGENCY_STOP);
        expect(service.getState().isEmergencyStopped).toBe(true);
      },
    })
  );

  modeControlSuite.addTest(
    createUnitTest({
      name: 'should release emergency stop',
      fn: async ({ service }) => {
        await service.emergencyStop();
        await service.releaseEmergencyStop();
        expect(service.getState().mode).toBe(RobotMode.IDLE);
        expect(service.getState().isEmergencyStopped).toBe(false);
      },
    })
  );

  modeControlSuite.run();

  // Joint control tests
  const jointControlSuite = new TestSuite('RobotService Joint Control', {
    beforeEach: async () => {
      mock.restore();
      const mockRuntime = createMockRuntime();
      const startedService = await RobotService.start(mockRuntime);
      const service = startedService as RobotService;
      await service.setMode(RobotMode.MANUAL);
      return { service, mockRuntime };
    },
    afterEach: async ({ service }: { service: RobotService }) => {
      if (service) {
        await service.stop();
      }
    },
  });

  jointControlSuite.addTest(
    createUnitTest({
      name: 'should validate joint names',
      fn: async ({ service }) => {
        await expect(service.moveJoint('invalid_joint', 0)).rejects.toThrow('Unknown joint');
      },
    })
  );

  jointControlSuite.addTest(
    createUnitTest({
      name: 'should accept valid joint movements',
      fn: async ({ service }) => {
        await expect(service.moveJoint('head_yaw', 0.5)).resolves.not.toThrow();
        await expect(service.moveJoint('left_shoulder_pitch', 1.0)).resolves.not.toThrow();
      },
    })
  );

  jointControlSuite.addTest(
    createUnitTest({
      name: 'should not allow movement during emergency stop',
      fn: async ({ service }) => {
        await service.emergencyStop();
        await expect(service.moveJoint('head_yaw', 0.5)).rejects.toThrow(
          'Cannot move joints during emergency stop'
        );
      },
    })
  );

  jointControlSuite.run();

  // Teaching mode tests
  const teachingModeSuite = new TestSuite('RobotService Teaching Mode', {
    beforeEach: async () => {
      mock.restore();
      const mockRuntime = createMockRuntime();
      const startedService = await RobotService.start(mockRuntime);
      const service = startedService as RobotService;
      return { service, mockRuntime };
    },
    afterEach: async ({ service }: { service: RobotService }) => {
      if (service) {
        await service.stop();
      }
    },
  });

  teachingModeSuite.addTest(
    createUnitTest({
      name: 'should enter teaching mode',
      fn: async ({ service }) => {
        await service.setMode(RobotMode.TEACHING);
        expect(service.getState().mode).toBe(RobotMode.TEACHING);
      },
    })
  );

  teachingModeSuite.addTest(
    createUnitTest({
      name: 'should record poses in teaching mode',
      fn: async ({ service }) => {
        await service.setMode(RobotMode.TEACHING);
        await service.recordPose('test_pose');
        await service.saveMotion('test_motion_with_pose');

        const motions = service.getStoredMotions();
        expect(motions).toContain('test_motion_with_pose');
      },
    })
  );

  teachingModeSuite.addTest(
    createUnitTest({
      name: 'should save motion sequences',
      fn: async ({ service }) => {
        await service.setMode(RobotMode.TEACHING);
        await service.recordPose('pose1');
        await service.recordPose('pose2');
        await service.saveMotion('test_motion', 'Test motion sequence');

        const motions = service.getStoredMotions();
        expect(motions).toContain('test_motion');
      },
    })
  );

  teachingModeSuite.run();

  // Motion execution tests
  const motionExecutionSuite = new TestSuite('RobotService Motion Execution', {
    beforeEach: async () => {
      mock.restore();
      const mockRuntime = createMockRuntime();
      const startedService = await RobotService.start(mockRuntime);
      const service = startedService as RobotService;
      await service.setMode(RobotMode.MANUAL);
      return { service, mockRuntime };
    },
    afterEach: async ({ service }: { service: RobotService }) => {
      if (service) {
        await service.stop();
      }
    },
  });

  motionExecutionSuite.addTest(
    createUnitTest({
      name: 'should execute poses',
      fn: async ({ service }) => {
        const pose = {
          name: 'test_pose',
          joints: {
            head_yaw: 0,
            head_pitch: 0,
            left_shoulder_pitch: 0,
          },
        };

        await expect(service.moveToPose(pose)).resolves.not.toThrow();
      },
    })
  );

  motionExecutionSuite.addTest(
    createUnitTest({
      name: 'should throw error for unknown motions',
      fn: async ({ service }) => {
        await expect(service.executeMotion('unknown_motion')).rejects.toThrow('Motion not found');
      },
    })
  );

  motionExecutionSuite.addTest(
    createUnitTest({
      name: 'should execute stored motions',
      fn: async ({ service }) => {
        // First record a motion
        await service.setMode(RobotMode.TEACHING);
        await service.recordPose('custom_pose');
        await service.saveMotion('custom_motion');
        await service.setMode(RobotMode.MANUAL);

        // Then execute it
        await expect(service.executeMotion('custom_motion')).resolves.not.toThrow();
      },
    })
  );

  motionExecutionSuite.run();

  // State monitoring tests
  const stateMonitoringSuite = new TestSuite('RobotService State Monitoring', {
    beforeEach: async () => {
      mock.restore();
      const mockRuntime = createMockRuntime();
      const startedService = await RobotService.start(mockRuntime);
      const service = startedService as RobotService;
      return { service, mockRuntime };
    },
    afterEach: async ({ service }: { service: RobotService }) => {
      if (service) {
        await service.stop();
      }
    },
  });

  stateMonitoringSuite.addTest(
    createUnitTest({
      name: 'should provide complete state information',
      fn: ({ service }) => {
        const state = service.getState();

        expect(state).toHaveProperty('timestamp');
        expect(state).toHaveProperty('joints');
        expect(state).toHaveProperty('mode');
        expect(state).toHaveProperty('status');
        expect(state).toHaveProperty('isEmergencyStopped');
      },
    })
  );

  stateMonitoringSuite.addTest(
    createUnitTest({
      name: 'should track connection status',
      fn: ({ service }) => {
        const isConnected = service.isConnected();
        expect(typeof isConnected).toBe('boolean');
      },
    })
  );

  stateMonitoringSuite.addTest(
    createUnitTest({
      name: 'should provide joint states',
      fn: ({ service }) => {
        const state = service.getState();

        // Should have joints array
        expect(Array.isArray(state.joints)).toBe(true);
        expect(state.joints.length).toBeGreaterThan(0);

        // Check joint structure
        const joint = state.joints[0];
        expect(joint).toHaveProperty('name');
        expect(joint).toHaveProperty('position');
      },
    })
  );

  stateMonitoringSuite.addTest(
    createUnitTest({
      name: 'should get specific joint state',
      fn: ({ service }) => {
        const jointState = service.getJointState('head_yaw');
        expect(jointState).toBeDefined();
        expect(jointState?.name).toBe('head_yaw');
      },
    })
  );

  stateMonitoringSuite.addTest(
    createUnitTest({
      name: 'should return null for unknown joint',
      fn: ({ service }) => {
        const jointState = service.getJointState('unknown_joint');
        expect(jointState).toBeNull();
      },
    })
  );

  stateMonitoringSuite.run();

  // Event handling tests
  const eventHandlingSuite = new TestSuite('RobotService Event Handling', {
    beforeEach: async () => {
      mock.restore();
      const mockRuntime = createMockRuntime();
      const startedService = await RobotService.start(mockRuntime);
      const service = startedService as RobotService;
      return { service, mockRuntime };
    },
    afterEach: async ({ service }: { service: RobotService }) => {
      if (service) {
        await service.stop();
      }
    },
  });

  eventHandlingSuite.addTest(
    createUnitTest({
      name: 'should support event listeners',
      fn: ({ service }) => {
        const listener = mock();
        service.on('stateUpdate', listener);

        // Trigger state update (would happen automatically in real service)
        // For now just verify the method exists
        expect(() => service.off('stateUpdate', listener)).not.toThrow();
      },
    })
  );

  eventHandlingSuite.run();

  // Cleanup tests
  const cleanupSuite = new TestSuite('RobotService Cleanup', {
    beforeEach: () => {
      mock.restore();
      const mockRuntime = createMockRuntime();
      return { mockRuntime };
    },
  });

  cleanupSuite.addTest(
    createUnitTest({
      name: 'should stop cleanly',
      fn: async ({ mockRuntime }) => {
        const startedService = await RobotService.start(mockRuntime);
        const service = startedService as RobotService;

        await expect(service.stop()).resolves.not.toThrow();
      },
    })
  );

  cleanupSuite.addTest(
    createUnitTest({
      name: 'should handle multiple stop calls',
      fn: async ({ mockRuntime }) => {
        const startedService = await RobotService.start(mockRuntime);
        const service = startedService as RobotService;

        await service.stop();
        await expect(service.stop()).resolves.not.toThrow();
      },
    })
  );

  cleanupSuite.run();
});
