import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { RobotService } from '../../services/robot-service';
import type { IAgentRuntime } from '@elizaos/core';
import { RobotMode, RobotStatus } from '../../types';

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
  let service: RobotService;
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

  describe('initialization', () => {
    it('should have correct service name', () => {
      expect(RobotService.serviceName).toBe('ROBOT');
    });

    it('should have proper capability description', () => {
      const tempService = new RobotService(mockRuntime);
      expect(tempService.capabilityDescription).toContain('robot control');
    });

    it('should start successfully with valid configuration', async () => {
      const startedService = await RobotService.start(mockRuntime);
      service = startedService as RobotService;

      expect(service).toBeInstanceOf(RobotService);
    });
  });

  describe('mode control', () => {
    beforeEach(async () => {
      const startedService = await RobotService.start(mockRuntime);
      service = startedService as RobotService;
    });

    it('should start in IDLE mode', () => {
      const state = service.getState();
      expect(state.mode).toBe(RobotMode.IDLE);
    });

    it('should allow mode changes', async () => {
      await service.setMode(RobotMode.MANUAL);
      expect(service.getState().mode).toBe(RobotMode.MANUAL);

      await service.setMode(RobotMode.AUTONOMOUS);
      expect(service.getState().mode).toBe(RobotMode.AUTONOMOUS);
    });

    it('should handle emergency stop', async () => {
      await service.setMode(RobotMode.MANUAL);
      await service.emergencyStop();
      expect(service.getState().mode).toBe(RobotMode.EMERGENCY_STOP);
      expect(service.getState().isEmergencyStopped).toBe(true);
    });

    it('should release emergency stop', async () => {
      await service.emergencyStop();
      await service.releaseEmergencyStop();
      expect(service.getState().mode).toBe(RobotMode.IDLE);
      expect(service.getState().isEmergencyStopped).toBe(false);
    });
  });

  describe('joint control', () => {
    beforeEach(async () => {
      const startedService = await RobotService.start(mockRuntime);
      service = startedService as RobotService;
      await service.setMode(RobotMode.MANUAL);
    });

    it('should validate joint names', async () => {
      await expect(service.moveJoint('invalid_joint', 0)).rejects.toThrow('Unknown joint');
    });

    it('should accept valid joint movements', async () => {
      await expect(service.moveJoint('head_yaw', 0.5)).resolves.not.toThrow();
      await expect(service.moveJoint('left_shoulder_pitch', 1.0)).resolves.not.toThrow();
    });

    it('should not allow movement during emergency stop', async () => {
      await service.emergencyStop();
      await expect(service.moveJoint('head_yaw', 0.5)).rejects.toThrow(
        'Cannot move joints during emergency stop'
      );
    });
  });

  describe('teaching mode', () => {
    beforeEach(async () => {
      const startedService = await RobotService.start(mockRuntime);
      service = startedService as RobotService;
    });

    it('should enter teaching mode', async () => {
      await service.setMode(RobotMode.TEACHING);
      expect(service.getState().mode).toBe(RobotMode.TEACHING);
    });

    it('should record poses in teaching mode', async () => {
      await service.setMode(RobotMode.TEACHING);
      await service.recordPose('test_pose');
      await service.saveMotion('test_motion_with_pose');

      const motions = service.getStoredMotions();
      expect(motions).toContain('test_motion_with_pose');
    });

    it('should save motion sequences', async () => {
      await service.setMode(RobotMode.TEACHING);
      await service.recordPose('pose1');
      await service.recordPose('pose2');
      await service.saveMotion('test_motion', 'Test motion sequence');

      const motions = service.getStoredMotions();
      expect(motions).toContain('test_motion');
    });
  });

  describe('motion execution', () => {
    beforeEach(async () => {
      const startedService = await RobotService.start(mockRuntime);
      service = startedService as RobotService;
      await service.setMode(RobotMode.MANUAL);
    });

    it('should execute poses', async () => {
      const pose = {
        name: 'test_pose',
        joints: {
          head_yaw: 0,
          head_pitch: 0,
          left_shoulder_pitch: 0,
        },
      };

      await expect(service.moveToPose(pose)).resolves.not.toThrow();
    });

    it('should throw error for unknown motions', async () => {
      await expect(service.executeMotion('unknown_motion')).rejects.toThrow('Motion not found');
    });

    it('should execute stored motions', async () => {
      // First record a motion
      await service.setMode(RobotMode.TEACHING);
      await service.recordPose('custom_pose');
      await service.saveMotion('custom_motion');
      await service.setMode(RobotMode.MANUAL);

      // Then execute it
      await expect(service.executeMotion('custom_motion')).resolves.not.toThrow();
    });
  });

  describe('state monitoring', () => {
    beforeEach(async () => {
      const startedService = await RobotService.start(mockRuntime);
      service = startedService as RobotService;
    });

    it('should provide complete state information', () => {
      const state = service.getState();

      expect(state).toHaveProperty('timestamp');
      expect(state).toHaveProperty('joints');
      expect(state).toHaveProperty('mode');
      expect(state).toHaveProperty('status');
      expect(state).toHaveProperty('isEmergencyStopped');
    });

    it('should track connection status', () => {
      const isConnected = service.isConnected();
      expect(typeof isConnected).toBe('boolean');
    });

    it('should provide joint states', () => {
      const state = service.getState();

      // Should have joints array
      expect(Array.isArray(state.joints)).toBe(true);
      expect(state.joints.length).toBeGreaterThan(0);

      // Check joint structure
      const joint = state.joints[0];
      expect(joint).toHaveProperty('name');
      expect(joint).toHaveProperty('position');
    });

    it('should get specific joint state', () => {
      const jointState = service.getJointState('head_yaw');
      expect(jointState).toBeDefined();
      expect(jointState?.name).toBe('head_yaw');
    });

    it('should return null for unknown joint', () => {
      const jointState = service.getJointState('unknown_joint');
      expect(jointState).toBeNull();
    });
  });

  describe('event handling', () => {
    beforeEach(async () => {
      const startedService = await RobotService.start(mockRuntime);
      service = startedService as RobotService;
    });

    it('should support event listeners', () => {
      const listener = mock();
      service.on('stateUpdate', listener);

      // Trigger state update (would happen automatically in real service)
      // For now just verify the method exists
      expect(() => service.off('stateUpdate', listener)).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should stop cleanly', async () => {
      const startedService = await RobotService.start(mockRuntime);
      service = startedService as RobotService;

      await expect(service.stop()).resolves.not.toThrow();
    });

    it('should handle multiple stop calls', async () => {
      const startedService = await RobotService.start(mockRuntime);
      service = startedService as RobotService;

      await service.stop();
      await expect(service.stop()).resolves.not.toThrow();
    });
  });
});
