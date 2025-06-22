import {
  Service,
  ServiceType,
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
  RobotConfig,
  Pose,
  Motion,
  IMUData,
} from '../types';
import { SerialProtocol } from '../communication/serial-protocol';
import { ROS2Bridge, ROS2Config } from '../communication/ros2-bridge';
import { SafetyMonitor } from '../control/safety-monitor';
import { EventEmitter } from 'events';

// Default robot configuration
const DEFAULT_CONFIG: RobotConfig = {
  serialPort: '/dev/ttyUSB0',
  baudRate: 115200,
  jointNames: [
    // Head
    'head_yaw', 'head_pitch',
    // Arms
    'left_shoulder_pitch', 'left_shoulder_roll', 'left_elbow_pitch',
    'left_wrist_yaw', 'left_wrist_pitch', 'left_gripper',
    'right_shoulder_pitch', 'right_shoulder_roll', 'right_elbow_pitch',
    'right_wrist_yaw', 'right_wrist_pitch', 'right_gripper',
    // Legs
    'left_hip_yaw', 'left_hip_roll', 'left_hip_pitch',
    'left_knee_pitch', 'left_ankle_pitch', 'left_ankle_roll',
    'right_hip_yaw', 'right_hip_roll', 'right_hip_pitch',
    'right_knee_pitch', 'right_ankle_pitch', 'right_ankle_roll',
  ],
  jointLimits: {
    // Head limits (radians)
    'head_yaw': { min: -1.57, max: 1.57 },
    'head_pitch': { min: -0.785, max: 0.785 },
    // Arm limits
    'left_shoulder_pitch': { min: -3.14, max: 3.14 },
    'left_shoulder_roll': { min: -1.57, max: 0.5 },
    'left_elbow_pitch': { min: -2.0, max: 0 },
    'left_wrist_yaw': { min: -1.57, max: 1.57 },
    'left_wrist_pitch': { min: -1.57, max: 1.57 },
    'left_gripper': { min: 0, max: 1.0 },
    // Mirror for right arm
    'right_shoulder_pitch': { min: -3.14, max: 3.14 },
    'right_shoulder_roll': { min: -0.5, max: 1.57 },
    'right_elbow_pitch': { min: -2.0, max: 0 },
    'right_wrist_yaw': { min: -1.57, max: 1.57 },
    'right_wrist_pitch': { min: -1.57, max: 1.57 },
    'right_gripper': { min: 0, max: 1.0 },
    // Leg limits
    'left_hip_yaw': { min: -0.785, max: 0.785 },
    'left_hip_roll': { min: -0.5, max: 0.5 },
    'left_hip_pitch': { min: -1.57, max: 1.57 },
    'left_knee_pitch': { min: 0, max: 2.0 },
    'left_ankle_pitch': { min: -0.785, max: 0.785 },
    'left_ankle_roll': { min: -0.5, max: 0.5 },
    // Mirror for right leg
    'right_hip_yaw': { min: -0.785, max: 0.785 },
    'right_hip_roll': { min: -0.5, max: 0.5 },
    'right_hip_pitch': { min: -1.57, max: 1.57 },
    'right_knee_pitch': { min: 0, max: 2.0 },
    'right_ankle_pitch': { min: -0.785, max: 0.785 },
    'right_ankle_roll': { min: -0.5, max: 0.5 },
  },
  rosWebsocketUrl: 'ws://localhost:9090',
  jointStateTopic: '/joint_states',
  jointCommandTopic: '/ainex_joint_commands',
  maxJointVelocity: 2.0, // rad/s
  maxJointAcceleration: 5.0, // rad/s^2
  emergencyStopTopic: '/emergency_stop',
};

// Servo ID mapping (1-24 for the 24 DOF)
const SERVO_ID_MAP: { [jointName: string]: number } = {
  'head_yaw': 1,
  'head_pitch': 2,
  'left_shoulder_pitch': 3,
  'left_shoulder_roll': 4,
  'left_elbow_pitch': 5,
  'left_wrist_yaw': 6,
  'left_wrist_pitch': 7,
  'left_gripper': 8,
  'right_shoulder_pitch': 9,
  'right_shoulder_roll': 10,
  'right_elbow_pitch': 11,
  'right_wrist_yaw': 12,
  'right_wrist_pitch': 13,
  'right_gripper': 14,
  'left_hip_yaw': 15,
  'left_hip_roll': 16,
  'left_hip_pitch': 17,
  'left_knee_pitch': 18,
  'left_ankle_pitch': 19,
  'left_ankle_roll': 20,
  'right_hip_yaw': 21,
  'right_hip_roll': 22,
  'right_hip_pitch': 23,
  'right_knee_pitch': 24,
  'right_ankle_pitch': 25,
  'right_ankle_roll': 26,
};

export class RobotService extends Service {
  static override serviceType: ServiceTypeName = RobotServiceType.ROBOT;
  static readonly serviceName = 'ROBOT';
  override capabilityDescription = 'Provides robot control and state management for AiNex humanoid robot.';

  private robotConfig: RobotConfig;
  private serialProtocol: SerialProtocol | null = null;
  private ros2Bridge: ROS2Bridge | null = null;
  private safetyMonitor: SafetyMonitor;
  private eventEmitter: EventEmitter;
  
  // Robot state
  private currentState: RobotState;
  private targetJoints: Map<string, number> = new Map();
  private storedMotions: Map<string, Motion> = new Map();
  private isTeaching = false;
  private teachingBuffer: Pose[] = [];
  
  // Update intervals
  private stateUpdateInterval: NodeJS.Timeout | null = null;
  private controlLoopInterval: NodeJS.Timeout | null = null;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    
    // Load configuration
    this.robotConfig = this.loadConfig(runtime);
    
    // Initialize safety monitor
    this.safetyMonitor = new SafetyMonitor(this.robotConfig.jointLimits, {
      maxVelocity: this.robotConfig.maxJointVelocity,
      maxAcceleration: this.robotConfig.maxJointAcceleration,
    });
    
    // Initialize event emitter
    this.eventEmitter = new EventEmitter();
    
    // Initialize robot state
    this.currentState = {
      timestamp: Date.now(),
      joints: this.robotConfig.jointNames.map(name => ({
        name,
        position: 0,
        velocity: 0,
        effort: 0,
      })),
      isEmergencyStopped: false,
      mode: RobotMode.IDLE,
      status: RobotStatus.DISCONNECTED,
    };
    
    logger.info('[RobotService] Initialized with config:', this.robotConfig);
  }

  private loadConfig(runtime: IAgentRuntime): RobotConfig {
    const config = { ...DEFAULT_CONFIG };
    
    // Load from runtime settings
    const serialPort = runtime.getSetting('ROBOT_SERIAL_PORT');
    if (serialPort) config.serialPort = serialPort;
    
    const baudRate = runtime.getSetting('ROBOT_BAUD_RATE');
    if (baudRate) config.baudRate = parseInt(baudRate);
    
    const rosUrl = runtime.getSetting('ROS_WEBSOCKET_URL');
    if (rosUrl) config.rosWebsocketUrl = rosUrl;
    
    const useSimulation = runtime.getSetting('USE_SIMULATION') === 'true';
    config.useSimulation = useSimulation;
    
    return config;
  }

  static async start(runtime: IAgentRuntime): Promise<RobotService> {
    const service = new RobotService(runtime);
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize communication based on mode
      if (this.robotConfig.useSimulation) {
        await this.initializeSimulation();
      } else {
        await this.initializeHardware();
      }
      
      // Start update loops
      this.startStateUpdateLoop();
      this.startControlLoop();
      
      // Set initial mode
      this.currentState.mode = RobotMode.IDLE;
      this.currentState.status = RobotStatus.OK;
      
      logger.info('[RobotService] Initialization complete');
    } catch (error) {
      logger.error('[RobotService] Failed to initialize:', error);
      this.currentState.status = RobotStatus.ERROR;
      throw error;
    }
  }

  private async initializeHardware(): Promise<void> {
    // Initialize serial communication
    this.serialProtocol = new SerialProtocol(
      this.robotConfig.serialPort,
      this.robotConfig.baudRate
    );
    
    try {
      await this.serialProtocol.connect();
      logger.info('[RobotService] Connected to hardware via serial');
      
      // Enable all servos
      for (const [jointName, servoId] of Object.entries(SERVO_ID_MAP)) {
        await this.serialProtocol.enableServo(servoId);
      }
    } catch (error) {
      logger.error('[RobotService] Failed to connect to hardware:', error);
      throw error;
    }
  }

  private async initializeSimulation(): Promise<void> {
    // Initialize ROS 2 bridge
    const ros2Config: ROS2Config = {
      url: this.robotConfig.rosWebsocketUrl!,
      jointStateTopic: this.robotConfig.jointStateTopic,
      jointCommandTopic: this.robotConfig.jointCommandTopic,
      emergencyStopTopic: this.robotConfig.emergencyStopTopic,
      imuTopic: '/imu/data',
    };
    
    this.ros2Bridge = new ROS2Bridge(ros2Config);
    
    // Set up event handlers
    this.ros2Bridge.on('jointStates', (jointStates: JointState[]) => {
      this.updateJointStates(jointStates);
    });
    
    this.ros2Bridge.on('imuData', (imuData: IMUData) => {
      this.currentState.imuData = imuData;
    });
    
    this.ros2Bridge.on('disconnected', () => {
      this.currentState.status = RobotStatus.DISCONNECTED;
    });
    
    try {
      await this.ros2Bridge.connect();
      logger.info('[RobotService] Connected to ROS 2 simulation');
    } catch (error) {
      logger.error('[RobotService] Failed to connect to ROS 2:', error);
      throw error;
    }
  }

  private updateJointStates(jointStates: JointState[]): void {
    // Update current state with new joint data
    for (const jointState of jointStates) {
      const index = this.currentState.joints.findIndex(j => j.name === jointState.name);
      if (index >= 0) {
        this.currentState.joints[index] = jointState;
      }
    }
    this.currentState.timestamp = Date.now();
  }

  private startStateUpdateLoop(): void {
    this.stateUpdateInterval = setInterval(async () => {
      if (!this.robotConfig.useSimulation && this.serialProtocol?.isReady()) {
        // Read joint positions from hardware
        for (const [jointName, servoId] of Object.entries(SERVO_ID_MAP)) {
          try {
            const position = await this.serialProtocol.readServoPosition(servoId);
            const jointIndex = this.currentState.joints.findIndex(j => j.name === jointName);
            if (jointIndex >= 0) {
              // Convert servo position (0-1000) to radians
              const limits = this.robotConfig.jointLimits[jointName];
              const range = limits.max - limits.min;
              this.currentState.joints[jointIndex].position = 
                limits.min + (position / 1000) * range;
            }
          } catch (error) {
            logger.error(`[RobotService] Failed to read servo ${servoId}:`, error);
          }
        }
      }
      
      // Emit state update
      this.eventEmitter.emit('stateUpdate', this.currentState);
    }, 100); // 10Hz update rate
  }

  private startControlLoop(): void {
    this.controlLoopInterval = setInterval(async () => {
      if (this.currentState.mode === RobotMode.MANUAL || 
          this.currentState.mode === RobotMode.AUTONOMOUS) {
        await this.executeControl();
      }
    }, 50); // 20Hz control rate
  }

  private async executeControl(): Promise<void> {
    // Apply safety checks
    const safeCommands = new Map<string, number>();
    
    for (const [jointName, targetPosition] of this.targetJoints) {
      const currentJoint = this.currentState.joints.find(j => j.name === jointName);
      if (!currentJoint) continue;
      
      // Check safety limits
      const safePosition = this.safetyMonitor.checkJointLimit(jointName, targetPosition);
      const safeVelocity = this.safetyMonitor.checkVelocityLimit(
        jointName,
        currentJoint.position,
        safePosition,
        0.05 // 50ms timestep
      );
      
      if (safeVelocity !== null) {
        safeCommands.set(jointName, safePosition);
      }
    }
    
    // Send commands
    if (this.robotConfig.useSimulation && this.ros2Bridge?.isConnected()) {
      // Send via ROS 2
      const jointCommands: { [name: string]: number } = {};
      for (const [name, position] of safeCommands) {
        jointCommands[name] = position;
      }
      await this.ros2Bridge.sendJointCommand(jointCommands, 0.05);
    } else if (this.serialProtocol?.isReady()) {
      // Send via serial
      for (const [jointName, position] of safeCommands) {
        const servoId = SERVO_ID_MAP[jointName];
        if (servoId) {
          // Convert radians to servo position (0-1000)
          const limits = this.robotConfig.jointLimits[jointName];
          const range = limits.max - limits.min;
          const servoPosition = Math.round(
            ((position - limits.min) / range) * 1000
          );
          await this.serialProtocol.moveServo(servoId, servoPosition);
        }
      }
    }
  }

  // Public API methods
  
  async setMode(mode: RobotMode): Promise<void> {
    logger.info(`[RobotService] Setting mode to ${mode}`);
    this.currentState.mode = mode;
    
    if (mode === RobotMode.EMERGENCY_STOP) {
      await this.emergencyStop();
    } else if (mode === RobotMode.TEACHING) {
      this.startTeaching();
    } else if (this.isTeaching) {
      this.stopTeaching();
    }
  }

  async emergencyStop(): Promise<void> {
    logger.warn('[RobotService] EMERGENCY STOP activated');
    this.currentState.isEmergencyStopped = true;
    this.currentState.mode = RobotMode.EMERGENCY_STOP;
    
    // Clear all target positions
    this.targetJoints.clear();
    
    // Send emergency stop command
    if (this.ros2Bridge?.isConnected()) {
      await this.ros2Bridge.sendEmergencyStop(true);
    }
    
    // Disable all servos if using hardware
    if (this.serialProtocol?.isReady()) {
      for (const servoId of Object.values(SERVO_ID_MAP)) {
        await this.serialProtocol.disableServo(servoId);
      }
    }
  }

  async releaseEmergencyStop(): Promise<void> {
    logger.info('[RobotService] Releasing emergency stop');
    this.currentState.isEmergencyStopped = false;
    
    if (this.ros2Bridge?.isConnected()) {
      await this.ros2Bridge.sendEmergencyStop(false);
    }
    
    // Re-enable servos if using hardware
    if (this.serialProtocol?.isReady()) {
      for (const servoId of Object.values(SERVO_ID_MAP)) {
        await this.serialProtocol.enableServo(servoId);
      }
    }
    
    this.currentState.mode = RobotMode.IDLE;
  }

  async moveJoint(jointName: string, position: number, speed?: number): Promise<void> {
    if (this.currentState.isEmergencyStopped) {
      throw new Error('Cannot move joints during emergency stop');
    }
    
    if (!this.robotConfig.jointNames.includes(jointName)) {
      throw new Error(`Unknown joint: ${jointName}`);
    }
    
    // Apply safety limits
    const safePosition = this.safetyMonitor.checkJointLimit(jointName, position);
    this.targetJoints.set(jointName, safePosition);
    
    logger.debug(`[RobotService] Moving ${jointName} to ${safePosition.toFixed(3)} rad`);
  }

  async moveToPose(pose: Pose): Promise<void> {
    if (this.currentState.isEmergencyStopped) {
      throw new Error('Cannot move during emergency stop');
    }
    
    logger.info(`[RobotService] Moving to pose: ${pose.name}`);
    
    // Set all joint targets
    for (const [jointName, position] of Object.entries(pose.joints)) {
      await this.moveJoint(jointName, position);
    }
    
    // Wait for motion to complete if duration specified
    if (pose.duration) {
      await new Promise(resolve => setTimeout(resolve, pose.duration));
    }
  }

  async executeMotion(motionName: string): Promise<void> {
    const motion = this.storedMotions.get(motionName);
    if (!motion) {
      throw new Error(`Motion not found: ${motionName}`);
    }
    
    logger.info(`[RobotService] Executing motion: ${motionName}`);
    
    do {
      for (const pose of motion.poses) {
        await this.moveToPose(pose);
      }
    } while (motion.loop && this.currentState.mode === RobotMode.AUTONOMOUS);
  }

  private startTeaching(): void {
    logger.info('[RobotService] Starting teaching mode');
    this.isTeaching = true;
    this.teachingBuffer = [];
  }

  private stopTeaching(): void {
    logger.info('[RobotService] Stopping teaching mode');
    this.isTeaching = false;
  }

  async recordPose(name: string): Promise<void> {
    if (!this.isTeaching) {
      throw new Error('Not in teaching mode');
    }
    
    // Capture current joint positions
    const joints: { [name: string]: number } = {};
    for (const joint of this.currentState.joints) {
      joints[joint.name] = joint.position;
    }
    
    const pose: Pose = {
      name,
      joints,
      duration: 1000, // Default 1 second
    };
    
    this.teachingBuffer.push(pose);
    logger.info(`[RobotService] Recorded pose: ${name}`);
  }

  async saveMotion(name: string, description?: string): Promise<void> {
    if (this.teachingBuffer.length === 0) {
      throw new Error('No poses recorded');
    }
    
    const motion: Motion = {
      name,
      description,
      poses: [...this.teachingBuffer],
      loop: false,
    };
    
    this.storedMotions.set(name, motion);
    this.teachingBuffer = [];
    
    logger.info(`[RobotService] Saved motion: ${name} with ${motion.poses.length} poses`);
  }

  getState(): RobotState {
    return { ...this.currentState };
  }

  getJointState(jointName: string): JointState | null {
    return this.currentState.joints.find(j => j.name === jointName) || null;
  }

  getStoredMotions(): string[] {
    return Array.from(this.storedMotions.keys());
  }

  isConnected(): boolean {
    if (this.robotConfig.useSimulation) {
      return this.ros2Bridge?.isConnected() || false;
    } else {
      return this.serialProtocol?.isReady() || false;
    }
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  async stop(): Promise<void> {
    logger.info('[RobotService] Stopping service');
    
    // Stop update loops
    if (this.stateUpdateInterval) {
      clearInterval(this.stateUpdateInterval);
      this.stateUpdateInterval = null;
    }
    
    if (this.controlLoopInterval) {
      clearInterval(this.controlLoopInterval);
      this.controlLoopInterval = null;
    }
    
    // Disconnect communication
    if (this.serialProtocol) {
      await this.serialProtocol.disconnect();
      this.serialProtocol = null;
    }
    
    if (this.ros2Bridge) {
      await this.ros2Bridge.disconnect();
      this.ros2Bridge = null;
    }
    
    this.currentState.status = RobotStatus.DISCONNECTED;
  }
} 