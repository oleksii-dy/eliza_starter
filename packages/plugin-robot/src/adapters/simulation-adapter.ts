import { logger } from '@elizaos/core';
import { 
  BaseRobotInterface,
  RobotCommand,
  ExecutionResult,
  RobotCapabilities
} from '../interfaces/robot-interface';
import {
  RobotState,
  RobotMode,
  RobotStatus,
  JointState,
  Pose,
  Motion,
  IMUData,
  RobotCommandType
} from '../types';
import { ROS2Bridge, ROS2Config } from '../communication/ros2-bridge';

// Joint names for simulation (matching URDF model)
const SIMULATION_JOINTS = [
  // Head
  'head_yaw_joint', 'head_pitch_joint',
  // Arms
  'left_shoulder_pitch_joint', 'left_shoulder_roll_joint', 'left_elbow_pitch_joint',
  'left_wrist_yaw_joint', 'left_wrist_pitch_joint', 'left_gripper_joint',
  'right_shoulder_pitch_joint', 'right_shoulder_roll_joint', 'right_elbow_pitch_joint',
  'right_wrist_yaw_joint', 'right_wrist_pitch_joint', 'right_gripper_joint',
  // Waist
  'waist_yaw_joint',
  // Legs
  'left_hip_yaw_joint', 'left_hip_roll_joint', 'left_hip_pitch_joint',
  'left_knee_pitch_joint', 'left_ankle_pitch_joint', 'left_ankle_roll_joint',
  'right_hip_yaw_joint', 'right_hip_roll_joint', 'right_hip_pitch_joint',
  'right_knee_pitch_joint', 'right_ankle_pitch_joint', 'right_ankle_roll_joint',
];

export class SimulationAdapter extends BaseRobotInterface {
  private ros2Bridge: ROS2Bridge;
  private jointStates: Map<string, JointState> = new Map();
  private storedPoses: Map<string, Pose> = new Map();
  private storedMotions: Map<string, Motion> = new Map();
  private isTeaching = false;
  private teachingBuffer: Pose[] = [];
  private imuData: IMUData | null = null;
  
  constructor(
    private config: {
      rosWebsocketUrl: string;
      jointStateTopic?: string;
      jointCommandTopic?: string;
      imuTopic?: string;
      emergencyStopTopic?: string;
    }
  ) {
    super();
    
    // Initialize ROS2 bridge
    const ros2Config: ROS2Config = {
      url: config.rosWebsocketUrl,
      jointStateTopic: config.jointStateTopic || '/joint_states',
      jointCommandTopic: config.jointCommandTopic || '/joint_trajectory_controller/joint_trajectory',
      imuTopic: config.imuTopic || '/imu/data',
      emergencyStopTopic: config.emergencyStopTopic || '/emergency_stop',
    };
    
    this.ros2Bridge = new ROS2Bridge(ros2Config);
    
    // Initialize joint states
    SIMULATION_JOINTS.forEach(jointName => {
      this.jointStates.set(jointName, {
        name: jointName,
        position: 0,
        velocity: 0,
        effort: 0,
      });
    });
    
    // Load default poses
    this.loadDefaultPoses();
    
    // Set up event handlers
    this.setupEventHandlers();
  }
  
  async connect(): Promise<void> {
    try {
      await this.ros2Bridge.connect();
      this.connected = true;
      
      // Update state
      this.currentState.status = RobotStatus.OK;
      this.currentState.mode = RobotMode.IDLE;
      
      logger.info('[SimulationAdapter] Connected to ROS2/Gazebo');
      this.emit('connected');
    } catch (error) {
      logger.error('[SimulationAdapter] Connection failed:', error);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.ros2Bridge.disconnect();
      this.connected = false;
      this.currentState.status = RobotStatus.DISCONNECTED;
      
      logger.info('[SimulationAdapter] Disconnected from ROS2/Gazebo');
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
      
      // Validate command
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
          
        case RobotCommandType.LOOK_AT:
          result = await this.executeLookAt(command);
          break;
          
        case RobotCommandType.WALK:
          result = await this.executeWalk(command);
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
      logger.error('[SimulationAdapter] Command execution failed:', error);
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
    logger.info('[SimulationAdapter] Starting teaching mode');
    this.isTeaching = true;
    this.teachingBuffer = [];
    this.currentState.mode = RobotMode.TEACHING;
    
    // In simulation, we can record poses by reading joint states
    this.emit('teachingStarted');
  }
  
  async stopTeaching(): Promise<void> {
    logger.info('[SimulationAdapter] Stopping teaching mode');
    this.isTeaching = false;
    this.currentState.mode = RobotMode.IDLE;
    
    this.emit('teachingStopped');
  }
  
  async recordPose(name: string): Promise<Pose> {
    if (!this.isTeaching) {
      throw new Error('Not in teaching mode');
    }
    
    // Get current joint positions from state
    const joints: { [name: string]: number } = {};
    
    for (const jointState of this.jointStates.values()) {
      joints[jointState.name] = jointState.position;
    }
    
    const pose: Pose = {
      name,
      joints,
      duration: 1000, // Default 1 second
    };
    
    this.storedPoses.set(name, pose);
    this.teachingBuffer.push(pose);
    
    logger.info(`[SimulationAdapter] Recorded pose: ${name}`);
    this.emit('poseRecorded', pose);
    
    return pose;
  }
  
  // Query methods
  getJointLimits(): { [jointName: string]: { min: number; max: number } } {
    // Standard limits for simulation
    const limits: { [jointName: string]: { min: number; max: number } } = {};
    
    for (const joint of SIMULATION_JOINTS) {
      if (joint.includes('yaw')) {
        limits[joint] = { min: -1.57, max: 1.57 };
      } else if (joint.includes('pitch')) {
        limits[joint] = { min: -1.57, max: 1.57 };
      } else if (joint.includes('roll')) {
        limits[joint] = { min: -0.785, max: 0.785 };
      } else if (joint.includes('gripper')) {
        limits[joint] = { min: 0, max: 0.04 }; // 4cm gripper opening
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
  
  // Protected implementations
  protected async executeEmergencyStop(): Promise<void> {
    await this.ros2Bridge.sendEmergencyStop(true);
  }
  
  protected async executeReset(): Promise<void> {
    await this.ros2Bridge.sendEmergencyStop(false);
    
    // Move to home pose if it exists
    if (this.storedPoses.has('home')) {
      await this.moveToPose(this.storedPoses.get('home')!);
    }
  }
  
  protected getInitialState(): RobotState {
    return {
      timestamp: Date.now(),
      joints: Array.from(this.jointStates.values()),
      isEmergencyStopped: false,
      mode: RobotMode.IDLE,
      status: RobotStatus.DISCONNECTED,
    };
  }
  
  protected getDefaultCapabilities(): RobotCapabilities {
    return {
      name: 'AiNex Simulation Robot',
      type: 'humanoid',
      model: 'AiNex-Gazebo',
      version: '1.0',
      dof: 27, // 24 + 3 for base movement in simulation
      joints: SIMULATION_JOINTS,
      sensors: ['imu', 'joint_states', 'camera', 'lidar'],
      capabilities: {
        walking: true,
        running: true,
        manipulation: true,
        dual_arm_coordination: true,
        vision: true,
        speech: false,
        teaching: true,
        autonomous_navigation: true,
        object_recognition: true,
      },
      limits: {
        max_velocity: 3.0, // rad/s
        max_acceleration: 10.0, // rad/s²
        max_payload: 1.0, // kg per arm
        max_reach: 0.8, // meters
      },
      specifications: {
        height: 1.65, // meters
        weight: 45, // kg
        footprint: {
          length: 0.4,
          width: 0.3,
        },
      },
    };
  }
  
  // Private helper methods
  private setupEventHandlers(): void {
    // Handle joint state updates from ROS2
    this.ros2Bridge.on('jointStates', (jointStates: JointState[]) => {
      for (const state of jointStates) {
        this.jointStates.set(state.name, state);
      }
      
      // Update robot state
      this.currentState.timestamp = Date.now();
      this.currentState.joints = Array.from(this.jointStates.values());
      
      this.emit('stateUpdate', this.currentState);
    });
    
    // Handle IMU data
    this.ros2Bridge.on('imuData', (imuData: IMUData) => {
      this.imuData = imuData;
      this.currentState.imuData = imuData;
    });
    
    // Handle disconnection
    this.ros2Bridge.on('disconnected', () => {
      this.connected = false;
      this.currentState.status = RobotStatus.DISCONNECTED;
      this.emit('disconnected');
    });
  }
  
  private async validateCommand(command: RobotCommand): Promise<{
    valid: boolean;
    error?: string;
    warnings?: string[];
  }> {
    const warnings: string[] = [];
    
    // Check mode compatibility
    if (this.currentState.mode === RobotMode.TEACHING && 
        command.type !== RobotCommandType.RECORD_POSE && 
        command.type !== RobotCommandType.STOP_TEACHING) {
      return {
        valid: false,
        error: 'Cannot execute motion commands in teaching mode',
      };
    }
    
    // Validate parameters based on command type
    if (command.type === RobotCommandType.MOVE_JOINT && !command.parameters?.target) {
      return {
        valid: false,
        error: 'MOVE_JOINT requires target parameter',
      };
    }
    
    return { valid: true, warnings };
  }
  
  private async executeMoveJoint(command: RobotCommand): Promise<ExecutionResult> {
    const { target, direction, amount, speed, duration } = command.parameters || {};
    
    if (!target) {
      return {
        success: false,
        command_id: command.id,
        executed_at: Date.now(),
        error: 'No target joint specified',
      };
    }
    
    // Find matching joints
    const matchingJoints = SIMULATION_JOINTS.filter(joint => 
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
    
    // Build joint command
    const jointCommands: { [name: string]: number } = {};
    
    for (const jointName of matchingJoints) {
      const currentPos = this.jointStates.get(jointName)?.position || 0;
      let targetPos = currentPos;
      
      if (direction && amount) {
        const delta = (amount * Math.PI / 180); // Convert degrees to radians
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
      
      // Apply limits
      const limits = this.getJointLimits()[jointName];
      targetPos = Math.max(limits.min, Math.min(limits.max, targetPos));
      
      jointCommands[jointName] = targetPos;
    }
    
    // Send command via ROS2
    await this.ros2Bridge.sendJointCommand(
      jointCommands, 
      duration ? duration / 1000 : 1.0 // Convert ms to seconds
    );
    
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
    
    // Send all joint commands
    await this.ros2Bridge.sendJointCommand(
      pose.joints,
      (command.parameters?.duration || pose.duration || 1000) / 1000
    );
    
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
    
    // Execute each pose in sequence
    for (const pose of motion.poses) {
      await this.ros2Bridge.sendJointCommand(
        pose.joints,
        (pose.duration || 1000) / 1000
      );
      
      // Wait for pose to complete
      await new Promise(resolve => setTimeout(resolve, pose.duration || 1000));
    }
    
    return {
      success: true,
      command_id: command.id,
      executed_at: Date.now(),
      state: this.getState(),
    };
  }
  
  private async executeStop(command: RobotCommand): Promise<ExecutionResult> {
    // In simulation, we can stop by sending current positions as targets
    const currentJoints: { [name: string]: number } = {};
    
    for (const [name, state] of this.jointStates) {
      currentJoints[name] = state.position;
    }
    
    await this.ros2Bridge.sendJointCommand(currentJoints, 0.1); // Quick stop
    
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
    const yaw = Math.atan2(position.y, position.x);
    const pitch = Math.atan2(position.z, Math.sqrt(position.x ** 2 + position.y ** 2));
    
    // Send joint commands
    await this.ros2Bridge.sendJointCommand({
      'head_yaw_joint': yaw,
      'head_pitch_joint': pitch,
    }, 0.5);
    
    return {
      success: true,
      command_id: command.id,
      executed_at: Date.now(),
      state: this.getState(),
    };
  }
  
  private async executeWalk(command: RobotCommand): Promise<ExecutionResult> {
    const { direction, amount, speed } = command.parameters || {};
    
    // In simulation, we can send base velocity commands
    // This would interface with the navigation stack
    logger.info(`[SimulationAdapter] Walking ${direction} for ${amount} meters at speed ${speed}`);
    
    // For now, just return success
    // Real implementation would interface with move_base or nav2
    return {
      success: true,
      command_id: command.id,
      executed_at: Date.now(),
      state: this.getState(),
      warnings: ['Walking in simulation requires navigation stack setup'],
    };
  }
  
  private loadDefaultPoses(): void {
    // Home pose
    const homeJoints: { [name: string]: number } = {};
    for (const joint of SIMULATION_JOINTS) {
      homeJoints[joint] = 0;
    }
    
    this.storedPoses.set('home', {
      name: 'home',
      joints: homeJoints,
    });
    
    // T-pose
    this.storedPoses.set('t-pose', {
      name: 't-pose',
      joints: {
        ...homeJoints,
        'left_shoulder_roll_joint': -1.57,
        'right_shoulder_roll_joint': 1.57,
      },
    });
    
    // Wave pose
    this.storedPoses.set('wave', {
      name: 'wave',
      joints: {
        ...homeJoints,
        'right_shoulder_pitch_joint': -1.0,
        'right_shoulder_roll_joint': 0.5,
        'right_elbow_pitch_joint': -1.5,
        'right_wrist_pitch_joint': 0.5,
      },
    });
  }
} 