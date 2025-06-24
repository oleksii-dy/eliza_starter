import { logger } from '@elizaos/core';
import {
  BaseRobotInterface,
  RobotCommand,
  ExecutionResult,
  RobotCapabilities,
} from '../interfaces/robot-interface';
import {
  RobotState,
  RobotMode,
  RobotStatus,
  JointState,
  Pose,
  Motion,
  IMUData,
  RobotCommandType,
} from '../types';

// Default joint configuration for mock robot
const MOCK_JOINTS = [
  'head_yaw',
  'head_pitch',
  'left_shoulder_pitch',
  'left_shoulder_roll',
  'left_elbow_pitch',
  'left_wrist_yaw',
  'left_wrist_pitch',
  'left_gripper',
  'right_shoulder_pitch',
  'right_shoulder_roll',
  'right_elbow_pitch',
  'right_wrist_yaw',
  'right_wrist_pitch',
  'right_gripper',
  'waist_yaw',
  'left_hip_yaw',
  'left_hip_roll',
  'left_hip_pitch',
  'left_knee_pitch',
  'left_ankle_pitch',
  'left_ankle_roll',
  'right_hip_yaw',
  'right_hip_roll',
  'right_hip_pitch',
  'right_knee_pitch',
  'right_ankle_pitch',
  'right_ankle_roll',
];

export interface MockRobotConfig {
  simulateDelay?: boolean;
  defaultDelay?: number;
  failureRate?: number;
  initialPose?: { [jointName: string]: number };
}

export class MockRobotAdapter extends BaseRobotInterface {
  private jointStates: Map<string, JointState> = new Map();
  private storedPoses: Map<string, Pose> = new Map();
  private storedMotions: Map<string, Motion> = new Map();
  private isTeaching = false;
  private teachingBuffer: Pose[] = [];
  private imuData: IMUData;
  private commandHistory: RobotCommand[] = [];
  private stateUpdateInterval?: NodeJS.Timeout;

  constructor(private config: MockRobotConfig = {}) {
    super();

    // Initialize joint states
    MOCK_JOINTS.forEach((jointName) => {
      const initialPosition = this.config.initialPose?.[jointName] || 0;
      this.jointStates.set(jointName, {
        name: jointName,
        position: initialPosition,
        velocity: 0,
        effort: 0,
      });
    });

    // Initialize IMU data
    this.imuData = {
      timestamp: Date.now(),
      accelerometer: { x: 0, y: 0, z: 9.81 },
      gyroscope: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    };

    // Load default poses
    this.loadDefaultPoses();

    // Update initial state
    this.updateState();

    logger.info('[MockRobotAdapter] Initialized with config:', this.config);
  }

  async connect(): Promise<void> {
    logger.info('[MockRobotAdapter] Connecting to mock robot...');

    // Simulate connection delay
    if (this.config.simulateDelay) {
      await new Promise((resolve) => setTimeout(resolve, this.config.defaultDelay || 500));
    }

    // Simulate potential connection failure
    if (this.config.failureRate && Math.random() < this.config.failureRate) {
      throw new Error('Mock connection failed (simulated)');
    }

    this.connected = true;
    this.currentState.status = RobotStatus.OK;
    this.currentState.mode = RobotMode.IDLE;

    // Start state update simulation
    this.startStateSimulation();

    logger.info('[MockRobotAdapter] Connected successfully');
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      // Stop state simulation
      if (this.stateUpdateInterval) {
        clearInterval(this.stateUpdateInterval);
        this.stateUpdateInterval = undefined;
      }

      this.connected = false;
      this.currentState.status = RobotStatus.DISCONNECTED;

      logger.info('[MockRobotAdapter] Disconnected');
      this.emit('disconnected');
    }
  }

  async executeCommand(command: RobotCommand): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Store command in history
    this.commandHistory.push(command);

    try {
      // Check connection
      if (!this.connected) {
        return {
          success: false,
          command_id: command.id,
          executed_at: startTime,
          error: 'Robot not connected',
        };
      }

      // Check emergency stop
      if (this.currentState.isEmergencyStopped) {
        return {
          success: false,
          command_id: command.id,
          executed_at: startTime,
          error: 'Robot is emergency stopped',
        };
      }

      // Simulate execution delay
      if (this.config.simulateDelay) {
        await new Promise((resolve) => setTimeout(resolve, this.config.defaultDelay || 100));
      }

      // Execute based on command type
      let result: ExecutionResult;

      switch (command.type) {
        case RobotCommandType.MOVE_JOINT:
          result = await this.executeMoveJoint(command);
          break;

        case RobotCommandType.MOVE_TO_POSE:
          result = await this.executeMoveToPose(command);
          break;

        case RobotCommandType.EXECUTE_MOTION:
          result = await this.executeMotionSequence(command);
          break;

        case RobotCommandType.STOP:
          result = await this.executeStop(command);
          break;

        case RobotCommandType.EMERGENCY_STOP:
          await this.emergencyStop();
          result = {
            success: true,
            command_id: command.id,
            executed_at: startTime,
          };
          break;

        case RobotCommandType.RESET:
          await this.reset();
          result = {
            success: true,
            command_id: command.id,
            executed_at: startTime,
          };
          break;

        case RobotCommandType.SET_MODE:
          // Mode should be passed as target parameter
          const modeParam = command.parameters?.target;
          if (modeParam && Object.values(RobotMode).includes(modeParam as RobotMode)) {
            await this.setMode(modeParam as RobotMode);
            result = {
              success: true,
              command_id: command.id,
              executed_at: startTime,
            };
          } else {
            result = {
              success: false,
              command_id: command.id,
              executed_at: startTime,
              error: 'Invalid or missing mode parameter',
            };
          }
          break;

        case RobotCommandType.START_TEACHING:
          await this.startTeaching();
          result = {
            success: true,
            command_id: command.id,
            executed_at: startTime,
          };
          break;

        case RobotCommandType.STOP_TEACHING:
          await this.stopTeaching();
          result = {
            success: true,
            command_id: command.id,
            executed_at: startTime,
          };
          break;

        case RobotCommandType.RECORD_POSE:
          const poseName = command.parameters?.target || `pose_${Date.now()}`;
          const pose = await this.recordPose(poseName);
          result = {
            success: true,
            command_id: command.id,
            executed_at: startTime,
            metadata: { pose },
          };
          break;

        default:
          result = {
            success: false,
            command_id: command.id,
            executed_at: startTime,
            error: `Unsupported command type: ${command.type}`,
          };
      }

      // Add timing info
      result.completed_at = Date.now();
      result.duration = result.completed_at - startTime;

      // Update state
      result.state = this.getState();

      // Emit command executed event
      this.emit('commandExecuted', result);

      return result;
    } catch (error) {
      logger.error('[MockRobotAdapter] Command execution failed:', error);
      return {
        success: false,
        command_id: command.id,
        executed_at: startTime,
        completed_at: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Teaching methods
  async startTeaching(): Promise<void> {
    logger.info('[MockRobotAdapter] Starting teaching mode');
    this.isTeaching = true;
    this.teachingBuffer = [];
    this.currentState.mode = RobotMode.TEACHING;
    this.emit('teachingStarted');
  }

  async stopTeaching(): Promise<void> {
    logger.info('[MockRobotAdapter] Stopping teaching mode');
    this.isTeaching = false;
    this.currentState.mode = RobotMode.IDLE;
    this.emit('teachingStopped');
  }

  async recordPose(name: string): Promise<Pose> {
    if (!this.isTeaching) {
      throw new Error('Not in teaching mode');
    }

    // Get current joint positions
    const joints: { [name: string]: number } = {};
    for (const jointState of this.jointStates.values()) {
      joints[jointState.name] = jointState.position;
    }

    const pose: Pose = {
      name,
      joints,
      duration: 1000,
    };

    this.storedPoses.set(name, pose);
    this.teachingBuffer.push(pose);

    logger.info(`[MockRobotAdapter] Recorded pose: ${name}`);
    this.emit('poseRecorded', pose);

    return pose;
  }

  // Query methods
  getJointLimits(): { [jointName: string]: { min: number; max: number } } {
    const limits: { [jointName: string]: { min: number; max: number } } = {};

    for (const joint of MOCK_JOINTS) {
      if (joint.includes('yaw')) {
        limits[joint] = { min: -1.57, max: 1.57 };
      } else if (joint.includes('pitch')) {
        limits[joint] = { min: -1.57, max: 1.57 };
      } else if (joint.includes('roll')) {
        limits[joint] = { min: -0.785, max: 0.785 };
      } else if (joint.includes('gripper')) {
        limits[joint] = { min: 0, max: 1 };
      } else {
        limits[joint] = { min: -3.14, max: 3.14 };
      }
    }

    return limits;
  }

  getStoredMotions(): string[] {
    return Array.from(this.storedMotions.keys());
  }

  getIMUData(): IMUData | null {
    return this.imuData;
  }

  getCommandHistory(): RobotCommand[] {
    return [...this.commandHistory];
  }

  clearCommandHistory(): void {
    this.commandHistory = [];
  }

  // Protected implementations
  protected async executeEmergencyStop(): Promise<void> {
    this.currentState.isEmergencyStopped = true;
    logger.warn('[MockRobotAdapter] Emergency stop activated');
  }

  protected async executeReset(): Promise<void> {
    // Reset to home pose
    if (this.storedPoses.has('home')) {
      await this.moveToPose(this.storedPoses.get('home')!);
    } else {
      // Reset all joints to zero
      for (const jointState of this.jointStates.values()) {
        jointState.position = 0;
        jointState.velocity = 0;
        jointState.effort = 0;
      }
    }

    this.updateState();
    logger.info('[MockRobotAdapter] Robot reset to home position');
  }

  protected getInitialState(): RobotState {
    // Return a valid initial state even before joint states are initialized
    const joints = this.jointStates ? Array.from(this.jointStates.values()) : [];
    return {
      timestamp: Date.now(),
      joints,
      isEmergencyStopped: false,
      mode: RobotMode.IDLE,
      status: RobotStatus.DISCONNECTED,
      imuData: this.imuData || null,
    };
  }

  protected getDefaultCapabilities(): RobotCapabilities {
    return {
      name: 'Mock Robot',
      type: 'humanoid',
      model: 'MockBot-1000',
      version: '1.0',
      dof: 27,
      joints: MOCK_JOINTS,
      sensors: ['imu', 'joint_states'],
      capabilities: {
        walking: true,
        running: false,
        manipulation: true,
        dual_arm_coordination: true,
        vision: false,
        speech: false,
        teaching: true,
      },
      limits: {
        max_velocity: 2.0,
        max_acceleration: 5.0,
        max_payload: 1.0,
        max_reach: 0.6,
      },
    };
  }

  // Private helper methods
  private async executeMoveJoint(command: RobotCommand): Promise<ExecutionResult> {
    const { target, amount, speed, duration: _duration } = command.parameters || {};

    if (!target) {
      return {
        success: false,
        command_id: command.id,
        executed_at: Date.now(),
        error: 'No target joint specified',
      };
    }

    const jointState = this.jointStates.get(target);
    if (!jointState) {
      return {
        success: false,
        command_id: command.id,
        executed_at: Date.now(),
        error: `Joint not found: ${target}`,
      };
    }

    // Simulate joint movement
    if (amount !== undefined) {
      // Convert degrees to radians
      const radians = (amount * Math.PI) / 180;
      const limits = this.getJointLimits()[target];
      jointState.position = Math.max(limits.min, Math.min(limits.max, radians));
    }

    if (speed !== undefined) {
      jointState.velocity = speed * 2.0; // Scale to max velocity
    }

    this.updateState();

    return {
      success: true,
      command_id: command.id,
      executed_at: Date.now(),
    };
  }

  private async executeMoveToPose(command: RobotCommand): Promise<ExecutionResult> {
    const poseName = command.parameters?.pose;

    if (!poseName) {
      return {
        success: false,
        command_id: command.id,
        executed_at: Date.now(),
        error: 'No pose name specified',
      };
    }

    const pose = this.storedPoses.get(poseName);
    if (!pose) {
      return {
        success: false,
        command_id: command.id,
        executed_at: Date.now(),
        error: `Pose not found: ${poseName}`,
      };
    }

    await this.internalMoveToPose(pose);

    return {
      success: true,
      command_id: command.id,
      executed_at: Date.now(),
    };
  }

  private async executeMotionSequence(command: RobotCommand): Promise<ExecutionResult> {
    const motionName = command.parameters?.motion;

    if (!motionName) {
      return {
        success: false,
        command_id: command.id,
        executed_at: Date.now(),
        error: 'No motion name specified',
      };
    }

    const motion = this.storedMotions.get(motionName);
    if (!motion) {
      return {
        success: false,
        command_id: command.id,
        executed_at: Date.now(),
        error: `Motion not found: ${motionName}`,
      };
    }

    // Simulate motion execution
    for (const pose of motion.poses) {
      await this.moveToPose(pose);
      if (this.config.simulateDelay) {
        await new Promise((resolve) => setTimeout(resolve, pose.duration || 1000));
      }
    }

    return {
      success: true,
      command_id: command.id,
      executed_at: Date.now(),
    };
  }

  private async executeStop(command: RobotCommand): Promise<ExecutionResult> {
    // Stop all joint velocities
    for (const jointState of this.jointStates.values()) {
      jointState.velocity = 0;
    }

    this.updateState();

    return {
      success: true,
      command_id: command.id,
      executed_at: Date.now(),
    };
  }

  // Internal helper for moving to pose
  private async internalMoveToPose(pose: Pose): Promise<void> {
    for (const [jointName, position] of Object.entries(pose.joints)) {
      const jointState = this.jointStates.get(jointName);
      if (jointState) {
        const limits = this.getJointLimits()[jointName];
        jointState.position = Math.max(limits.min, Math.min(limits.max, position));
      }
    }

    this.updateState();
  }

  private updateState(): void {
    this.currentState.timestamp = Date.now();
    this.currentState.joints = Array.from(this.jointStates.values());
    this.currentState.imuData = this.imuData;
  }

  private startStateSimulation(): void {
    // Simulate state updates at 10Hz
    this.stateUpdateInterval = setInterval(() => {
      // Simulate small joint movements if velocities are set
      for (const jointState of this.jointStates.values()) {
        if (jointState.velocity && jointState.velocity !== 0) {
          const dt = 0.1; // 100ms
          jointState.position += jointState.velocity * dt;

          // Apply limits
          const limits = this.getJointLimits()[jointState.name];
          jointState.position = Math.max(limits.min, Math.min(limits.max, jointState.position));
        }
      }

      // Simulate IMU data variations
      this.imuData.timestamp = Date.now();
      this.imuData.gyroscope.x = (Math.random() - 0.5) * 0.1;
      this.imuData.gyroscope.y = (Math.random() - 0.5) * 0.1;
      this.imuData.gyroscope.z = (Math.random() - 0.5) * 0.1;

      this.updateState();
      this.emit('stateUpdate', this.currentState);
    }, 100);
  }

  private loadDefaultPoses(): void {
    // Home pose
    this.storedPoses.set('home', {
      name: 'home',
      joints: Object.fromEntries(MOCK_JOINTS.map((j) => [j, 0])),
      duration: 2000,
    });

    // Wave pose
    const waveJoints = Object.fromEntries(MOCK_JOINTS.map((j) => [j, 0]));
    waveJoints['right_shoulder_pitch'] = -1.57;
    waveJoints['right_elbow_pitch'] = -0.5;
    waveJoints['right_wrist_pitch'] = 0.5;
    this.storedPoses.set('wave', {
      name: 'wave',
      joints: waveJoints,
      duration: 1500,
    });

    // Ready pose
    const readyJoints = Object.fromEntries(MOCK_JOINTS.map((j) => [j, 0]));
    readyJoints['left_shoulder_pitch'] = 0.3;
    readyJoints['right_shoulder_pitch'] = 0.3;
    readyJoints['left_elbow_pitch'] = -0.5;
    readyJoints['right_elbow_pitch'] = -0.5;
    this.storedPoses.set('ready', {
      name: 'ready',
      joints: readyJoints,
      duration: 1000,
    });
  }
}
