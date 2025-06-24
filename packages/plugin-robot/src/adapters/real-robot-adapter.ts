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
  IMUData,
  ServoCommandType,
  Quaternion,
} from '../types';
import { SerialProtocol } from '../communication/serial-protocol';
import { SafetyMonitor } from '../control/safety-monitor';

// Joint name to servo ID mapping for AiNex robot
const JOINT_SERVO_MAP: { [jointName: string]: number } = {
  // Head
  head_yaw: 1,
  head_pitch: 2,

  // Left arm
  left_shoulder_pitch: 3,
  left_shoulder_roll: 4,
  left_elbow_pitch: 5,
  left_wrist_yaw: 6,
  left_wrist_pitch: 7,
  left_gripper: 8,

  // Right arm
  right_shoulder_pitch: 9,
  right_shoulder_roll: 10,
  right_elbow_pitch: 11,
  right_wrist_yaw: 12,
  right_wrist_pitch: 13,
  right_gripper: 14,

  // Waist
  waist_yaw: 15,

  // Left leg
  left_hip_yaw: 16,
  left_hip_roll: 17,
  left_hip_pitch: 18,
  left_knee_pitch: 19,
  left_ankle_pitch: 20,
  left_ankle_roll: 21,

  // Right leg
  right_hip_yaw: 22,
  right_hip_roll: 23,
  right_hip_pitch: 24,
  right_knee_pitch: 25,
  right_ankle_pitch: 26,
  right_ankle_roll: 27,
};

// Default joint limits (radians)
const DEFAULT_JOINT_LIMITS = {
  head_yaw: { min: -1.57, max: 1.57 },
  head_pitch: { min: -0.785, max: 0.785 },
  left_shoulder_pitch: { min: -3.14, max: 3.14 },
  left_shoulder_roll: { min: -1.57, max: 0.5 },
  left_elbow_pitch: { min: -2.0, max: 0 },
  waist_yaw: { min: -1.57, max: 1.57 },
  // ... (simplified for brevity)
};

export class RealRobotAdapter extends BaseRobotInterface {
  private serialProtocol: SerialProtocol;
  private safetyMonitor: SafetyMonitor;
  private jointStates: Map<string, JointState> = new Map();
  private storedPoses: Map<string, Pose> = new Map();
  private storedMotions: Map<string, any> = new Map(); // Motion type
  private isTeaching = false;
  private teachingBuffer: Pose[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private lastIMUData: IMUData | null = null;
  private imuUpdateInterval: NodeJS.Timeout | null = null;

  constructor(
    private config: {
      serialPort: string;
      baudRate: number;
      jointLimits?: { [joint: string]: { min: number; max: number } };
      maxVelocity?: number;
      maxAcceleration?: number;
    }
  ) {
    super();

    // Initialize serial protocol
    this.serialProtocol = new SerialProtocol(config.serialPort, config.baudRate);

    // Initialize safety monitor
    const limits = config.jointLimits || DEFAULT_JOINT_LIMITS;
    this.safetyMonitor = new SafetyMonitor(limits, {
      maxVelocity: config.maxVelocity || 2.0,
      maxAcceleration: config.maxAcceleration || 5.0,
    });

    // Initialize joint states
    Object.keys(JOINT_SERVO_MAP).forEach((jointName) => {
      this.jointStates.set(jointName, {
        name: jointName,
        position: 0,
        velocity: 0,
        effort: 0,
      });
    });

    // Load default poses
    this.loadDefaultPoses();
  }

  async connect(): Promise<void> {
    try {
      await this.serialProtocol.connect();
      this.connected = true;

      // Enable all servos
      for (const [_jointName, servoId] of Object.entries(JOINT_SERVO_MAP)) {
        await this.serialProtocol.enableServo(servoId);
      }

      // Start state update loop
      this.startStateUpdateLoop();
      this.startIMUUpdateLoop();

      // Update state
      this.currentState.status = RobotStatus.OK;
      this.currentState.mode = RobotMode.IDLE;

      logger.info('[RealRobotAdapter] Connected to hardware');
      this.emit('connected');
    } catch (error) {
      logger.error('[RealRobotAdapter] Connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.imuUpdateInterval) {
      clearInterval(this.imuUpdateInterval);
      this.imuUpdateInterval = null;
    }

    if (this.connected) {
      // Disable all servos
      for (const servoId of Object.values(JOINT_SERVO_MAP)) {
        await this.serialProtocol.disableServo(servoId);
      }

      await this.serialProtocol.disconnect();
      this.connected = false;
      this.currentState.status = RobotStatus.DISCONNECTED;

      logger.info('[RealRobotAdapter] Disconnected from hardware');
      this.emit('disconnected');
    }
  }

  async executeCommand(command: RobotCommand): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Check emergency stop
      if (this.currentState.isEmergencyStopped) {
        return {
          success: false,
          command_id: command.id,
          executed_at: startTime,
          error: 'Robot is emergency stopped',
        };
      }

      // Parse and validate command
      const validation = await this.validateCommand(command);
      if (!validation.valid) {
        return {
          success: false,
          command_id: command.id,
          executed_at: startTime,
          error: validation.error,
          warnings: validation.warnings,
        };
      }

      // Execute based on command type
      let result: ExecutionResult;

      switch (command.type) {
        case 'MOVE_JOINT':
          result = await this.executeMoveJoint(command);
          break;

        case 'MOVE_TO_POSE':
          result = await this.executeMoveToPose(command);
          break;

        case 'EXECUTE_MOTION':
          result = await this.executeMotionSequence(command);
          break;

        case 'STOP':
          result = await this.executeStop(command);
          break;

        case 'LOOK_AT':
          result = await this.executeLookAt(command);
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

      // Emit command executed event
      this.emit('commandExecuted', result);

      return result;
    } catch (error) {
      logger.error('[RealRobotAdapter] Command execution failed:', error);
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
    logger.info('[RealRobotAdapter] Starting teaching mode');
    this.isTeaching = true;
    this.teachingBuffer = [];
    this.currentState.mode = RobotMode.TEACHING;

    // Set servos to compliant mode (reduced torque)
    for (const servoId of Object.values(JOINT_SERVO_MAP)) {
      await this.serialProtocol.setServoTorque(servoId, 300); // 30% torque
    }

    this.emit('teachingStarted');
  }

  async stopTeaching(): Promise<void> {
    logger.info('[RealRobotAdapter] Stopping teaching mode');
    this.isTeaching = false;
    this.currentState.mode = RobotMode.IDLE;

    // Restore normal torque
    for (const servoId of Object.values(JOINT_SERVO_MAP)) {
      await this.serialProtocol.setServoTorque(servoId, 1000); // 100% torque
    }

    this.emit('teachingStopped');
  }

  async recordPose(name: string): Promise<Pose> {
    if (!this.isTeaching) {
      throw new Error('Not in teaching mode');
    }

    // Read current joint positions
    const joints: { [name: string]: number } = {};

    for (const [jointName, servoId] of Object.entries(JOINT_SERVO_MAP)) {
      const position = await this.serialProtocol.readServoPosition(servoId);
      // Convert servo position (0-1000) to radians
      const limits = this.getJointLimits()[jointName];
      const range = limits.max - limits.min;
      joints[jointName] = limits.min + (position / 1000) * range;
    }

    const pose: Pose = {
      name,
      joints,
      duration: 1000, // Default 1 second
    };

    this.storedPoses.set(name, pose);
    this.teachingBuffer.push(pose);

    logger.info(`[RealRobotAdapter] Recorded pose: ${name}`);
    this.emit('poseRecorded', pose);

    return pose;
  }

  // Query methods
  getJointLimits(): { [jointName: string]: { min: number; max: number } } {
    return this.config.jointLimits || DEFAULT_JOINT_LIMITS;
  }

  getStoredMotions(): string[] {
    return Array.from(this.storedMotions.keys());
  }

  getIMUData(): IMUData | null {
    return this.lastIMUData;
  }

  // Protected implementations
  protected async executeEmergencyStop(): Promise<void> {
    // Disable all servos immediately
    for (const servoId of Object.values(JOINT_SERVO_MAP)) {
      await this.serialProtocol.disableServo(servoId);
    }
  }

  protected async executeReset(): Promise<void> {
    // Re-enable servos and move to home position
    for (const servoId of Object.values(JOINT_SERVO_MAP)) {
      await this.serialProtocol.enableServo(servoId);
    }

    // Move to home pose if it exists
    if (this.storedPoses.has('home')) {
      await this.moveToPose(this.storedPoses.get('home')!);
    }
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
    };
  }

  protected getDefaultCapabilities(): RobotCapabilities {
    return {
      name: 'AiNex Humanoid Robot',
      type: 'humanoid',
      model: 'AiNex-24DOF',
      version: '1.0',
      dof: 24,
      joints: Object.keys(JOINT_SERVO_MAP),
      sensors: ['imu', 'battery', 'temperature'],
      capabilities: {
        walking: true,
        manipulation: true,
        vision: true,
        speech: false,
        teaching: true,
      },
      limits: {
        max_velocity: 2.0, // rad/s
        max_acceleration: 5.0, // rad/s²
        max_payload: 0.5, // kg per arm
      },
    };
  }

  // Private helper methods
  private async validateCommand(command: RobotCommand): Promise<{
    valid: boolean;
    error?: string;
    warnings?: string[];
  }> {
    const warnings: string[] = [];

    // Check mode compatibility
    if (
      this.currentState.mode === RobotMode.TEACHING &&
      command.type !== 'RECORD_POSE' &&
      command.type !== 'STOP_TEACHING'
    ) {
      return {
        valid: false,
        error: 'Cannot execute motion commands in teaching mode',
      };
    }

    // Validate parameters based on command type
    if (command.type === 'MOVE_JOINT' && !command.parameters?.target) {
      return {
        valid: false,
        error: 'MOVE_JOINT requires target parameter',
      };
    }

    // Check safety constraints
    if (
      command.constraints?.maintain_balance &&
      (command.type === 'MOVE_JOINT' || command.type === 'MOVE_TO_POSE')
    ) {
      warnings.push('Balance maintenance not yet implemented');
    }

    return { valid: true, warnings };
  }

  private async executeMoveJoint(command: RobotCommand): Promise<ExecutionResult> {
    const { target, direction, amount, speed } = command.parameters || {};

    if (!target) {
      return {
        success: false,
        command_id: command.id,
        executed_at: Date.now(),
        error: 'No target joint specified',
      };
    }

    // Find matching joints
    const matchingJoints = Object.keys(JOINT_SERVO_MAP).filter((joint) =>
      joint.toLowerCase().includes(target.toLowerCase())
    );

    if (matchingJoints.length === 0) {
      return {
        success: false,
        command_id: command.id,
        executed_at: Date.now(),
        error: `No joints found matching: ${target}`,
      };
    }

    // Calculate target position based on direction and amount
    for (const jointName of matchingJoints) {
      const currentPos = this.jointStates.get(jointName)?.position || 0;
      let targetPos = currentPos;

      if (direction && amount) {
        const delta = (amount * Math.PI) / 180; // Convert degrees to radians
        switch (direction) {
          case 'up':
          case 'forward':
            targetPos += delta;
            break;
          case 'down':
          case 'back':
            targetPos -= delta;
            break;
          case 'left':
            targetPos -= delta;
            break;
          case 'right':
            targetPos += delta;
            break;
        }
      }

      // Apply safety limits
      const limits = this.getJointLimits()[jointName];
      targetPos = Math.max(limits.min, Math.min(limits.max, targetPos));

      // Convert to servo position and send command
      const servoId = JOINT_SERVO_MAP[jointName];
      const range = limits.max - limits.min;
      const servoPos = Math.round(((targetPos - limits.min) / range) * 1000);

      await this.serialProtocol.moveServo(servoId, servoPos, speed ? speed * 1000 : undefined);
    }

    return {
      success: true,
      command_id: command.id,
      executed_at: Date.now(),
      state: this.getState(),
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

    // Move to pose
    await this.moveToPose(pose, command.parameters?.duration);

    return {
      success: true,
      command_id: command.id,
      executed_at: Date.now(),
      state: this.getState(),
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

    // Execute motion
    await this.executeMotion(motion);

    return {
      success: true,
      command_id: command.id,
      executed_at: Date.now(),
      state: this.getState(),
    };
  }

  private async executeStop(command: RobotCommand): Promise<ExecutionResult> {
    // Stop all motion by disabling movement
    // In a real implementation, this would halt ongoing trajectories
    logger.info('[RealRobotAdapter] Stopping all motion');

    return {
      success: true,
      command_id: command.id,
      executed_at: Date.now(),
      state: this.getState(),
    };
  }

  private async executeLookAt(command: RobotCommand): Promise<ExecutionResult> {
    const { position } = command.parameters || {};

    if (!position) {
      return {
        success: false,
        command_id: command.id,
        executed_at: Date.now(),
        error: 'No position specified for look at',
      };
    }

    // Calculate head angles to look at position
    // This is simplified - real implementation would use inverse kinematics
    const yaw = Math.atan2(position.y, position.x);
    const pitch = Math.atan2(position.z, Math.sqrt(position.x ** 2 + position.y ** 2));

    // Move head joints
    await this.executeMoveJoint({
      id: command.id,
      type: 'MOVE_JOINT',
      natural_language: 'Look at position',
      parameters: {
        target: 'head_yaw',
        amount: (yaw * 180) / Math.PI,
      },
    } as RobotCommand);

    await this.executeMoveJoint({
      id: command.id,
      type: 'MOVE_JOINT',
      natural_language: 'Look at position',
      parameters: {
        target: 'head_pitch',
        amount: (pitch * 180) / Math.PI,
      },
    } as RobotCommand);

    return {
      success: true,
      command_id: command.id,
      executed_at: Date.now(),
      state: this.getState(),
    };
  }

  private startStateUpdateLoop(): void {
    this.updateInterval = setInterval(async () => {
      // Read joint positions from hardware
      for (const [jointName, servoId] of Object.entries(JOINT_SERVO_MAP)) {
        try {
          const position = await this.serialProtocol.readServoPosition(servoId);
          const limits = this.getJointLimits()[jointName];
          const range = limits.max - limits.min;
          const radians = limits.min + (position / 1000) * range;

          const jointState = this.jointStates.get(jointName);
          if (jointState) {
            jointState.position = radians;
            jointState.velocity = 0; // TODO: Calculate from position changes
          }
        } catch (error) {
          logger.error(`Failed to read servo ${servoId}:`, error);
        }
      }

      // Update state
      this.currentState.timestamp = Date.now();
      this.currentState.joints = Array.from(this.jointStates.values());

      // Emit state update
      this.emit('stateUpdate', this.currentState);
    }, 100); // 10Hz update rate
  }

  private startIMUUpdateLoop(): void {
    // Update IMU data at 50Hz
    this.imuUpdateInterval = setInterval(async () => {
      try {
        // Read IMU data via serial protocol
        // This assumes the robot firmware sends IMU data on request
        const imuRaw = await this.readIMURawData();

        if (imuRaw) {
          this.lastIMUData = {
            timestamp: Date.now(),
            accelerometer: {
              x: imuRaw.accelX,
              y: imuRaw.accelY,
              z: imuRaw.accelZ,
            },
            gyroscope: {
              x: imuRaw.gyroX,
              y: imuRaw.gyroY,
              z: imuRaw.gyroZ,
            },
            magnetometer:
              imuRaw.magX !== undefined
                ? {
                  x: imuRaw.magX,
                  y: imuRaw.magY || 0,
                  z: imuRaw.magZ || 0,
                }
                : undefined,
            orientation: this.computeOrientationFromIMU(imuRaw),
          };

          // Check for fall detection
          const accelMagnitude = Math.sqrt(
            this.lastIMUData!.accelerometer.x ** 2 +
              this.lastIMUData!.accelerometer.y ** 2 +
              this.lastIMUData!.accelerometer.z ** 2
          );

          // Fall detection: sudden acceleration change or orientation
          if (Math.abs(accelMagnitude - 9.81) > 15.0) {
            // More than 1.5g difference
            logger.warn('[RealRobotAdapter] Fall detected! Triggering emergency stop');
            await this.emergencyStop();
          }
        }
      } catch (error) {
        logger.error('[RealRobotAdapter] Failed to read IMU data:', error);
      }
    }, 20); // 50Hz
  }

  private async readIMURawData(): Promise<{
    accelX: number;
    accelY: number;
    accelZ: number;
    gyroX: number;
    gyroY: number;
    gyroZ: number;
    magX?: number;
    magY?: number;
    magZ?: number;
  } | null> {
    try {
      // Send IMU read command
      // This is robot-specific - adjust based on your protocol
      const IMU_READ_COMMAND = ServoCommandType.IMU_READ;

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('IMU read timeout'));
        }, 50);

        // Register callback for IMU response
        this.serialProtocol['responseCallbacks'].set(
          `255-${IMU_READ_COMMAND}`,
          (packet: Buffer) => {
            clearTimeout(timeout);

            // Parse IMU packet (example format, adjust for your robot)
            // [header, header, 0xFF, command, accelX_L, accelX_H, ..., checksum]
            if (packet.length >= 20) {
              const data = {
                accelX: this.parseIMUValue(packet[4], packet[5]) / 100.0, // Convert to m/s²
                accelY: this.parseIMUValue(packet[6], packet[7]) / 100.0,
                accelZ: this.parseIMUValue(packet[8], packet[9]) / 100.0,
                gyroX: this.parseIMUValue(packet[10], packet[11]) / 100.0, // Convert to rad/s
                gyroY: this.parseIMUValue(packet[12], packet[13]) / 100.0,
                gyroZ: this.parseIMUValue(packet[14], packet[15]) / 100.0,
              };

              // Optional magnetometer data
              if (packet.length >= 26) {
                data['magX'] = this.parseIMUValue(packet[16], packet[17]);
                data['magY'] = this.parseIMUValue(packet[18], packet[19]);
                data['magZ'] = this.parseIMUValue(packet[20], packet[21]);
              }

              resolve(data);
            } else {
              reject(new Error('Invalid IMU packet size'));
            }
          }
        );

        // Send IMU read command
        this.serialProtocol
          .sendCommand({
            header: [0x55, 0x55],
            servoId: 0xff, // Broadcast or IMU address
            command: IMU_READ_COMMAND,
          })
          .catch(reject);
      });
    } catch (error) {
      logger.error('[RealRobotAdapter] IMU read error:', error);
      return null;
    }
  }

  private parseIMUValue(lowByte: number, highByte: number): number {
    // Convert two bytes to signed 16-bit integer
    let value = (highByte << 8) | lowByte;
    if (value > 32767) {
      value -= 65536;
    }
    return value;
  }

  private computeOrientationFromIMU(imuData: any): Quaternion {
    // Simple orientation estimation from accelerometer
    // In production, use proper sensor fusion (Madgwick/Mahony filter)
    const { accelX, accelY, accelZ } = imuData;

    // Normalize acceleration
    const magnitude = Math.sqrt(accelX ** 2 + accelY ** 2 + accelZ ** 2);
    const ax = accelX / magnitude;
    const ay = accelY / magnitude;
    const az = accelZ / magnitude;

    // Estimate pitch and roll from accelerometer
    const pitch = Math.atan2(-ax, Math.sqrt(ay ** 2 + az ** 2));
    const roll = Math.atan2(ay, az);

    // Convert to quaternion (yaw = 0 without magnetometer)
    const cy = Math.cos(0 * 0.5);
    const sy = Math.sin(0 * 0.5);
    const cp = Math.cos(pitch * 0.5);
    const sp = Math.sin(pitch * 0.5);
    const cr = Math.cos(roll * 0.5);
    const sr = Math.sin(roll * 0.5);

    return {
      w: cr * cp * cy + sr * sp * sy,
      x: sr * cp * cy - cr * sp * sy,
      y: cr * sp * cy + sr * cp * sy,
      z: cr * cp * sy - sr * sp * cy,
    };
  }

  private loadDefaultPoses(): void {
    // Home pose
    this.storedPoses.set('home', {
      name: 'home',
      joints: Object.keys(JOINT_SERVO_MAP).reduce(
        (acc, joint) => {
          acc[joint] = 0;
          return acc;
        },
        {} as { [name: string]: number }
      ),
    });

    // Wave pose
    this.storedPoses.set('wave', {
      name: 'wave',
      joints: {
        ...this.storedPoses.get('home')!.joints,
        right_shoulder_pitch: -1.0,
        right_shoulder_roll: 0.5,
        right_elbow_pitch: -1.5,
        right_wrist_pitch: 0.5,
      },
    });
  }
}
