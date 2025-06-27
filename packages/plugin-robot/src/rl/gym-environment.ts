import { EventEmitter } from 'events';
import { logger } from '@elizaos/core';
import { RobotService } from '../services/robot-service';
import {
  RobotMode,
  RobotState,
  JointState as _JointState,
  RLState,
  RLAction,
  Vector3 as _Vector3,
} from '../types';

export interface GymSpace {
  shape: number[];
  dtype: string;
  low?: number | number[];
  high?: number | number[];
}

export interface GymEnvironmentConfig {
  robotService: RobotService;
  taskType: 'walking' | 'manipulation' | 'balance' | 'custom';
  episodeLength: number;
  rewardFunction?: (state: RobotState, action: RLAction) => number;
  observationSpace?: GymSpace;
  actionSpace?: GymSpace;
  resetPosition?: { [jointName: string]: number };
}

export class AiNexGymEnvironment extends EventEmitter {
  private robotService: RobotService;
  private config: GymEnvironmentConfig;
  private currentStep: number = 0;
  private episodeReward: number = 0;
  private previousState: RobotState | null = null;
  private initialPosition: { [jointName: string]: number } = {};

  // Standard OpenAI Gym spaces
  public observationSpace: GymSpace;
  public actionSpace: GymSpace;

  constructor(config: GymEnvironmentConfig) {
    super();
    this.config = config;
    this.robotService = config.robotService;

    // Define observation space (joint positions, velocities, IMU data)
    this.observationSpace = config.observationSpace || {
      shape: [24 * 2 + 7], // 24 joints * (pos + vel) + IMU quaternion + angular velocity
      dtype: 'float32',
      low: -10,
      high: 10,
    };

    // Define action space (joint velocity commands)
    this.actionSpace = config.actionSpace || {
      shape: [24], // 24 joint velocity commands
      dtype: 'float32',
      low: -2.0, // rad/s
      high: 2.0,
    };

    // Store initial positions for reset
    const state = this.robotService.getState();
    for (const joint of state.joints) {
      this.initialPosition[joint.name] = joint.position;
    }

    logger.info(`[GymEnvironment] Initialized ${config.taskType} environment`);
  }

  /**
   * Reset the environment to initial state
   */
  async reset(): Promise<number[]> {
    logger.debug('[GymEnvironment] Resetting environment');

    // Reset robot to initial position
    await this.robotService.setMode(RobotMode.MANUAL);

    // Move all joints to reset position
    const resetPosition = this.config.resetPosition || this.initialPosition;
    for (const [jointName, position] of Object.entries(resetPosition)) {
      await this.robotService.moveJoint(jointName, position);
    }

    // Wait for robot to reach position
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Reset episode variables
    this.currentStep = 0;
    this.episodeReward = 0;
    this.previousState = null;

    // Get initial observation
    const observation = await this.getObservation();

    this.emit('reset', { observation });
    return observation;
  }

  /**
   * Execute one step in the environment
   */
  async step(action: RLAction): Promise<RLState> {
    logger.debug('[GymEnvironment] Step', this.currentStep);

    // Store previous state
    this.previousState = this.robotService.getState();

    // Execute action
    await this.executeAction(action);

    // Wait for action to take effect
    await new Promise((resolve) => setTimeout(resolve, 50)); // 20Hz control

    // Get new state
    const currentState = this.robotService.getState();

    // Calculate reward
    const reward = this.calculateReward(currentState, action);
    this.episodeReward += reward;

    // Check if episode is done
    const done = this.isDone(currentState);

    // Get observation
    const observation = await this.getObservation();

    // Increment step
    this.currentStep++;

    const rlState: RLState = {
      observation,
      reward,
      done,
      info: {
        step: this.currentStep,
        episodeReward: this.episodeReward,
        robotMode: currentState.mode,
        isEmergencyStopped: currentState.isEmergencyStopped,
      },
    };

    this.emit('step', rlState);
    return rlState;
  }

  /**
   * Execute action on the robot
   */
  private async executeAction(action: RLAction): Promise<void> {
    if (action.jointCommands) {
      // Apply joint velocity commands
      const joints = this.robotService.getState().joints;
      for (let i = 0; i < joints.length && i < action.jointCommands.length; i++) {
        const joint = joints[i];
        const velocityCommand = action.jointCommands[i];

        // Simple velocity integration (could be improved with proper control)
        const newPosition = joint.position + velocityCommand * 0.05; // dt = 50ms

        try {
          await this.robotService.moveJoint(joint.name, newPosition);
        } catch (error) {
          logger.error(`[GymEnvironment] Failed to move joint ${joint.name}:`, error);
        }
      }
    } else if (action.discrete !== undefined) {
      // Handle discrete actions (e.g., for simplified action spaces)
      await this.executeDiscreteAction(action.discrete);
    }
  }

  /**
   * Execute discrete action
   */
  private async executeDiscreteAction(actionIndex: number): Promise<void> {
    // Map discrete actions to specific behaviors
    switch (this.config.taskType) {
      case 'walking':
        await this.executeWalkingAction(actionIndex);
        break;
      case 'manipulation':
        await this.executeManipulationAction(actionIndex);
        break;
      case 'balance':
        await this.executeBalanceAction(actionIndex);
        break;
      default:
        logger.warn(`[GymEnvironment] Unknown discrete action ${actionIndex}`);
    }
  }

  /**
   * Walking-specific discrete actions
   */
  private async executeWalkingAction(actionIndex: number): Promise<void> {
    const actions = [
      'step_forward',
      'step_backward',
      'step_left',
      'step_right',
      'turn_left',
      'turn_right',
      'stand',
    ];

    const action = actions[actionIndex] || 'stand';
    logger.debug(`[GymEnvironment] Walking action: ${action}`);

    // Execute predefined walking primitives
    // This would be expanded with actual walking gaits
  }

  /**
   * Manipulation-specific discrete actions
   */
  private async executeManipulationAction(actionIndex: number): Promise<void> {
    const actions = [
      'reach_forward',
      'reach_up',
      'reach_down',
      'grasp',
      'release',
      'move_left',
      'move_right',
    ];

    const action = actions[actionIndex] || 'stand';
    logger.debug(`[GymEnvironment] Manipulation action: ${action}`);
  }

  /**
   * Balance-specific discrete actions
   */
  private async executeBalanceAction(actionIndex: number): Promise<void> {
    const actions = ['lean_forward', 'lean_backward', 'lean_left', 'lean_right', 'center'];

    const action = actions[actionIndex] || 'center';
    logger.debug(`[GymEnvironment] Balance action: ${action}`);
  }

  /**
   * Get current observation vector
   */
  private async getObservation(): Promise<number[]> {
    const state = this.robotService.getState();
    const observation: number[] = [];

    // Add joint positions and velocities
    for (const joint of state.joints) {
      observation.push(joint.position);
      observation.push(joint.velocity || 0);
    }

    // Add IMU observations (if available)
    if (state.imuData) {
      if (state.imuData.orientation) {
        observation.push(state.imuData.orientation.x);
        observation.push(state.imuData.orientation.y);
        observation.push(state.imuData.orientation.z);
        observation.push(state.imuData.orientation.w);
      } else {
        observation.push(0, 0, 0, 1); // Default quaternion
      }

      observation.push(state.imuData.gyroscope.x);
      observation.push(state.imuData.gyroscope.y);
      observation.push(state.imuData.gyroscope.z);
    } else {
      // No IMU data - add zeros
      observation.push(0, 0, 0, 1); // Quaternion
      observation.push(0, 0, 0); // Angular velocity
    }

    return observation;
  }

  /**
   * Calculate reward based on task
   */
  private calculateReward(state: RobotState, action: RLAction): number {
    if (this.config.rewardFunction) {
      return this.config.rewardFunction(state, action);
    }

    // Default reward functions based on task
    switch (this.config.taskType) {
      case 'walking':
        return this.calculateWalkingReward(state);
      case 'manipulation':
        return this.calculateManipulationReward(state);
      case 'balance':
        return this.calculateBalanceReward(state);
      default:
        return 0;
    }
  }

  /**
   * Walking task reward
   */
  private calculateWalkingReward(state: RobotState): number {
    let reward = 0;

    // Reward for forward progress (would need position tracking)
    // reward += forwardVelocity * 10;

    // Penalty for falling (check IMU orientation)
    if (state.imuData && state.imuData.orientation) {
      const uprightness = state.imuData.orientation.w; // Simplified
      reward += uprightness * 2;

      // Penalty for excessive angular velocity (instability)
      const angularMagnitude = Math.sqrt(
        state.imuData.gyroscope.x ** 2 +
          state.imuData.gyroscope.y ** 2 +
          state.imuData.gyroscope.z ** 2
      );
      reward -= angularMagnitude * 0.1;
    }

    // Penalty for high joint velocities (energy efficiency)
    let velocityPenalty = 0;
    for (const joint of state.joints) {
      velocityPenalty += Math.abs(joint.velocity || 0);
    }
    reward -= velocityPenalty * 0.01;

    // Alive bonus
    reward += 1.0;

    return reward;
  }

  /**
   * Manipulation task reward
   */
  private calculateManipulationReward(state: RobotState): number {
    let reward = 0;

    // Task-specific rewards would go here
    // e.g., distance to target, grasp success, etc.

    // Penalty for dropping (check gripper state)
    const _leftGripper = state.joints.find((j) => j.name === 'left_gripper');
    const _rightGripper = state.joints.find((j) => j.name === 'right_gripper');

    // Alive bonus
    reward += 0.1;

    return reward;
  }

  /**
   * Balance task reward
   */
  private calculateBalanceReward(state: RobotState): number {
    let reward = 0;

    // Check balance
    if (state.imuData && state.imuData.orientation) {
      const pitch = Math.asin(state.imuData.orientation.x);
      const roll = Math.atan2(state.imuData.orientation.y, state.imuData.orientation.z);

      // Reward upright posture
      reward += (1.0 - Math.abs(pitch)) * 5.0;
      reward += (1.0 - Math.abs(roll)) * 5.0;

      // Check for fall
      if (Math.abs(pitch) > Math.PI / 3 || Math.abs(roll) > Math.PI / 3) {
        reward -= 50;
      }
    }

    // Check angular velocity
    if (state.imuData) {
      const angularSpeed = Math.sqrt(
        state.imuData.gyroscope.x ** 2 +
          state.imuData.gyroscope.y ** 2 +
          state.imuData.gyroscope.z ** 2
      );

      // Penalize spinning
      if (angularSpeed > 1.0) {
        reward -= angularSpeed * 5.0;
      }
    }

    return reward;
  }

  /**
   * Check if episode is done
   */
  private isDone(state: RobotState): boolean {
    // Check max steps
    if (this.currentStep >= this.config.episodeLength) {
      logger.debug('[GymEnvironment] Episode done: max steps reached');
      return true;
    }

    // Check emergency stop
    if (state.isEmergencyStopped) {
      logger.debug('[GymEnvironment] Episode done: emergency stop');
      return true;
    }

    // Check for fall (IMU-based)
    if (state.imuData && state.imuData.orientation) {
      const uprightThreshold = 0.5; // Quaternion w component
      if (state.imuData.orientation.w < uprightThreshold) {
        logger.debug('[GymEnvironment] Episode done: robot fell');
        return true;
      }
    }

    return false;
  }

  /**
   * Render the environment (for visualization)
   */
  async render(mode: 'human' | 'rgb_array' = 'human'): Promise<void | Buffer> {
    if (mode === 'human') {
      // Log current state
      const state = this.robotService.getState();
      console.log(`Step: ${this.currentStep}, Reward: ${this.episodeReward.toFixed(2)}`);
      console.log(`Mode: ${state.mode}, Status: ${state.status}`);

      // Could integrate with a 3D viewer here
    } else if (mode === 'rgb_array') {
      // Return camera image if available
      // This would integrate with the vision service
      return Buffer.from([]);
    }
  }

  /**
   * Close the environment
   */
  async close(): Promise<void> {
    logger.info('[GymEnvironment] Closing environment');
    this.removeAllListeners();
  }

  /**
   * Get environment info for debugging
   */
  getInfo(): any {
    return {
      taskType: this.config.taskType,
      currentStep: this.currentStep,
      episodeReward: this.episodeReward,
      observationSpace: this.observationSpace,
      actionSpace: this.actionSpace,
    };
  }
}

// Factory function for creating environments
export function makeAiNexEnv(
  robotService: RobotService,
  taskType: GymEnvironmentConfig['taskType'] = 'walking',
  episodeLength: number = 1000
): AiNexGymEnvironment {
  return new AiNexGymEnvironment({
    robotService,
    taskType,
    episodeLength,
  });
}
