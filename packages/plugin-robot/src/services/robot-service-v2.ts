import {
  Service,
  ServiceType as _ServiceType,
  type IAgentRuntime,
  type ServiceTypeName,
  logger,
} from '@elizaos/core';
import {
  RobotServiceType,
  RobotState,
  RobotMode,
  RobotStatus,
  JointState,
  Pose,
  Motion,
  IMUData,
  RobotCommand,
  RobotCommandType,
  ExecutionResult,
} from '../types';
import { BaseRobotInterface, RobotCapabilities } from '../interfaces/robot-interface';
import { AdapterFactory } from '../adapters/adapter-factory';

/**
 * Robot Service V2 - Uses adapter pattern for better testability
 */
export class RobotServiceV2 extends Service {
  static override serviceType: ServiceTypeName = RobotServiceType.ROBOT;
  static readonly serviceName = 'ROBOT';
  override capabilityDescription =
    'Provides robot control and state management using adapter pattern.';

  private adapter: BaseRobotInterface | null = null;
  private storedMotions: Map<string, Motion> = new Map();
  private isTeaching = false;
  private teachingBuffer: Pose[] = [];

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    logger.info('[RobotServiceV2] Initialized');
  }

  static async start(runtime: IAgentRuntime): Promise<RobotServiceV2> {
    const service = new RobotServiceV2(runtime);
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      // Create adapter based on configuration
      this.adapter = AdapterFactory.createFromRuntime(this.runtime);

      // Set up event handlers
      this.adapter.on('connected', () => {
        logger.info('[RobotServiceV2] Adapter connected');
      });

      this.adapter.on('disconnected', () => {
        logger.warn('[RobotServiceV2] Adapter disconnected');
      });

      this.adapter.on('stateUpdate', (_state: RobotState) => {
        // Handle state updates
      });

      this.adapter.on('commandExecuted', (result: ExecutionResult) => {
        logger.debug('[RobotServiceV2] Command executed:', result);
      });

      this.adapter.on('emergencyStop', () => {
        logger.warn('[RobotServiceV2] Emergency stop activated');
      });

      // Connect to robot
      await this.adapter.connect();

      // Load stored motions from database/config
      await this.loadStoredMotions();

      logger.info('[RobotServiceV2] Initialization complete');
    } catch (error) {
      logger.error('[RobotServiceV2] Failed to initialize:', error);
      throw error;
    }
  }

  // Public API methods

  async setMode(mode: RobotMode): Promise<void> {
    if (!this.adapter) {
      throw new Error('Robot service not initialized');
    }

    logger.info(`[RobotServiceV2] Setting mode to ${mode}`);
    await this.adapter.setMode(mode);

    if (mode === RobotMode.TEACHING) {
      this.startTeaching();
    } else if (this.isTeaching) {
      this.stopTeaching();
    }
  }

  async emergencyStop(): Promise<void> {
    if (!this.adapter) {
      throw new Error('Robot service not initialized');
    }

    logger.warn('[RobotServiceV2] EMERGENCY STOP activated');
    await this.adapter.emergencyStop();
  }

  async releaseEmergencyStop(): Promise<void> {
    if (!this.adapter) {
      throw new Error('Robot service not initialized');
    }

    logger.info('[RobotServiceV2] Releasing emergency stop');
    await this.adapter.reset();
  }

  async moveJoint(jointName: string, position: number, speed?: number): Promise<void> {
    if (!this.adapter) {
      throw new Error('Robot service not initialized');
    }

    const command: RobotCommand = {
      id: `joint-${Date.now()}`,
      type: RobotCommandType.MOVE_JOINT,
      natural_language: `Move ${jointName} to ${position} radians`,
      parameters: {
        target: jointName,
        amount: (position * 180) / Math.PI, // Convert to degrees for command
        speed,
      },
      metadata: {
        timestamp: Date.now(),
        source: 'moveJoint',
      },
    };

    const result = await this.adapter.executeCommand(command);
    if (!result.success) {
      throw new Error(result.error || 'Failed to move joint');
    }
  }

  async moveToPose(pose: Pose): Promise<void> {
    if (!this.adapter) {
      throw new Error('Robot service not initialized');
    }

    logger.info(`[RobotServiceV2] Moving to pose: ${pose.name}`);
    const result = await this.adapter.moveToPose(pose, pose.duration);

    if (!result.success) {
      throw new Error(result.error || 'Failed to move to pose');
    }
  }

  async executeMotion(motionName: string): Promise<void> {
    if (!this.adapter) {
      throw new Error('Robot service not initialized');
    }

    const motion = this.storedMotions.get(motionName);
    if (!motion) {
      throw new Error(`Motion not found: ${motionName}`);
    }

    logger.info(`[RobotServiceV2] Executing motion: ${motionName}`);
    const result = await this.adapter.executeMotion(motion);

    if (!result.success) {
      throw new Error(result.error || 'Failed to execute motion');
    }
  }

  private startTeaching(): void {
    logger.info('[RobotServiceV2] Starting teaching mode');
    this.isTeaching = true;
    this.teachingBuffer = [];

    if (this.adapter) {
      this.adapter.startTeaching();
    }
  }

  private stopTeaching(): void {
    logger.info('[RobotServiceV2] Stopping teaching mode');
    this.isTeaching = false;

    if (this.adapter) {
      this.adapter.stopTeaching();
    }
  }

  async recordPose(name: string): Promise<void> {
    if (!this.adapter) {
      throw new Error('Robot service not initialized');
    }

    if (!this.isTeaching) {
      throw new Error('Not in teaching mode');
    }

    const pose = await this.adapter.recordPose(name);
    this.teachingBuffer.push(pose);
    logger.info(`[RobotServiceV2] Recorded pose: ${name}`);
  }

  async saveMotion(name: string, description?: string): Promise<void> {
    if (this.teachingBuffer.length === 0) {
      throw new Error('No poses recorded');
    }

    const motion: Motion = {
      name,
      description: description || '',
      poses: [...this.teachingBuffer],
      loop: false,
    };

    this.storedMotions.set(name, motion);
    logger.info(`[RobotServiceV2] Saved motion: ${name} with ${motion.poses.length} poses`);

    // Clear teaching buffer
    this.teachingBuffer = [];
  }

  getState(): RobotState {
    if (!this.adapter) {
      return {
        timestamp: Date.now(),
        joints: [],
        isEmergencyStopped: false,
        mode: RobotMode.IDLE,
        status: RobotStatus.DISCONNECTED,
      };
    }

    return this.adapter.getState();
  }

  getJointState(jointName: string): JointState | null {
    const state = this.getState();
    return state.joints.find((j) => j.name === jointName) || null;
  }

  getStoredMotions(): string[] {
    return Array.from(this.storedMotions.keys());
  }

  isConnected(): boolean {
    return this.adapter?.isConnected() || false;
  }

  getCapabilities(): RobotCapabilities | null {
    return this.adapter?.getCapabilities() || null;
  }

  getIMUData(): IMUData | null {
    return this.adapter?.getIMUData() || null;
  }

  private async loadStoredMotions(): Promise<void> {
    // Load predefined motions
    this.storedMotions.set('wave', {
      name: 'wave',
      description: 'Wave hello',
      poses: [
        {
          name: 'wave_start',
          joints: { right_shoulder_pitch: -1.57, right_elbow_pitch: -0.5 },
          duration: 1000,
        },
        {
          name: 'wave_mid',
          joints: { right_shoulder_pitch: -1.57, right_elbow_pitch: -0.8, right_wrist_pitch: 0.3 },
          duration: 500,
        },
        {
          name: 'wave_end',
          joints: { right_shoulder_pitch: -1.57, right_elbow_pitch: -0.5, right_wrist_pitch: -0.3 },
          duration: 500,
        },
      ],
      loop: false,
    });

    // TODO: Load from database or configuration
    logger.info(`[RobotServiceV2] Loaded ${this.storedMotions.size} motions`);
  }

  async stop(): Promise<void> {
    logger.info('[RobotServiceV2] Stopping service');

    if (this.adapter) {
      await this.adapter.disconnect();
      this.adapter = null;
    }
  }
}
