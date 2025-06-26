import { EventEmitter } from 'events';
import { logger } from '@elizaos/core';
import {
  RobotState,
  RobotMode,
  JointState as _JointState,
  Pose,
  Motion,
  IMUData,
  RobotCapabilities,
  RobotCommand,
  RobotCommandType,
  ExecutionResult,
} from '../types';

// Re-export for convenience
export type { RobotCommand, ExecutionResult, RobotCapabilities } from '../types';

/**
 * Isomorphic Robot Interface
 * Provides a unified API for controlling both real robots and simulations
 */
export interface IRobotInterface extends EventEmitter {
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // State
  getState(): RobotState;
  getCapabilities(): RobotCapabilities;

  // Control
  executeCommand(command: RobotCommand): Promise<ExecutionResult>;
  setMode(mode: RobotMode): Promise<void>;
  emergencyStop(): Promise<void>;
  reset(): Promise<void>;

  // Motion
  moveToPose(pose: Pose, duration?: number): Promise<ExecutionResult>;
  executeMotion(motion: Motion): Promise<ExecutionResult>;
  stopMotion(): Promise<void>;

  // Teaching
  startTeaching(): Promise<void>;
  stopTeaching(): Promise<void>;
  recordPose(name: string): Promise<Pose>;

  // Queries
  getJointLimits(): { [jointName: string]: { min: number; max: number } };
  getStoredMotions(): string[];
  getIMUData(): IMUData | null;
}

/**
 * Base implementation with common functionality
 */
export abstract class BaseRobotInterface extends EventEmitter implements IRobotInterface {
  protected connected = false;
  protected currentState: RobotState;
  protected capabilities: RobotCapabilities;

  constructor() {
    super();
    this.currentState = this.getInitialState();
    this.capabilities = this.getDefaultCapabilities();
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract executeCommand(command: RobotCommand): Promise<ExecutionResult>;

  isConnected(): boolean {
    return this.connected;
  }

  getState(): RobotState {
    return { ...this.currentState };
  }

  getCapabilities(): RobotCapabilities {
    return { ...this.capabilities };
  }

  async setMode(mode: RobotMode): Promise<void> {
    logger.info(`[RobotInterface] Setting mode to ${mode}`);
    this.currentState.mode = mode;
    this.emit('modeChanged', mode);
  }

  async emergencyStop(): Promise<void> {
    logger.warn('[RobotInterface] EMERGENCY STOP');
    this.currentState.isEmergencyStopped = true;
    this.currentState.mode = RobotMode.EMERGENCY_STOP;
    await this.executeEmergencyStop();
    this.emit('emergencyStop');
  }

  async reset(): Promise<void> {
    logger.info('[RobotInterface] Resetting robot');
    this.currentState.isEmergencyStopped = false;
    this.currentState.mode = RobotMode.IDLE;
    await this.executeReset();
    this.emit('reset');
  }

  async moveToPose(pose: Pose, duration?: number): Promise<ExecutionResult> {
    const command: RobotCommand = {
      id: `pose-${Date.now()}`,
      type: RobotCommandType.MOVE_TO_POSE,
      natural_language: `Move to pose ${pose.name}`,
      parameters: {
        pose: pose.name,
        duration,
      },
      metadata: {
        timestamp: Date.now(),
        source: 'moveToPose',
      },
    };

    return this.executeCommand(command);
  }

  async executeMotion(motion: Motion): Promise<ExecutionResult> {
    const command: RobotCommand = {
      id: `motion-${Date.now()}`,
      type: RobotCommandType.EXECUTE_MOTION,
      natural_language: `Execute motion ${motion.name}`,
      parameters: {
        motion: motion.name,
      },
      metadata: {
        timestamp: Date.now(),
        source: 'executeMotion',
      },
    };

    return this.executeCommand(command);
  }

  async stopMotion(): Promise<void> {
    const command: RobotCommand = {
      id: `stop-${Date.now()}`,
      type: RobotCommandType.STOP,
      natural_language: 'Stop all motion',
      metadata: {
        timestamp: Date.now(),
        source: 'stopMotion',
      },
    };

    await this.executeCommand(command);
  }

  // Abstract methods for implementation
  abstract startTeaching(): Promise<void>;
  abstract stopTeaching(): Promise<void>;
  abstract recordPose(name: string): Promise<Pose>;
  abstract getJointLimits(): { [jointName: string]: { min: number; max: number } };
  abstract getStoredMotions(): string[];
  abstract getIMUData(): IMUData | null;

  // Protected methods for implementations
  protected abstract executeEmergencyStop(): Promise<void>;
  protected abstract executeReset(): Promise<void>;
  protected abstract getInitialState(): RobotState;
  protected abstract getDefaultCapabilities(): RobotCapabilities;

  // Helper method for natural language parsing
  protected parseNaturalLanguage(text: string): Partial<RobotCommand> {
    // This will be enhanced with NLP
    const lower = text.toLowerCase();

    // Detect command type
    let type = RobotCommandType.UNKNOWN;
    if (lower.includes('move') || lower.includes('go')) {
      type = RobotCommandType.MOVE_JOINT;
    } else if (lower.includes('wave') || lower.includes('gesture')) {
      type = RobotCommandType.EXECUTE_MOTION;
    } else if (lower.includes('stop')) {
      type = RobotCommandType.STOP;
    } else if (lower.includes('look')) {
      type = RobotCommandType.LOOK_AT;
    }

    // Extract parameters
    const parameters: any = {};

    // Target detection
    if (lower.includes('arm')) {
      parameters.target = 'arm';
    }
    if (lower.includes('left')) {
      parameters.target = `left_${parameters.target || 'arm'}`;
    }
    if (lower.includes('right')) {
      parameters.target = `right_${parameters.target || 'arm'}`;
    }
    if (lower.includes('head')) {
      parameters.target = 'head';
    }

    // Direction detection
    if (lower.includes('up')) {
      parameters.direction = 'up';
    }
    if (lower.includes('down')) {
      parameters.direction = 'down';
    }
    if (lower.includes('left')) {
      parameters.direction = 'left';
    }
    if (lower.includes('right')) {
      parameters.direction = 'right';
    }
    if (lower.includes('forward')) {
      parameters.direction = 'forward';
    }
    if (lower.includes('back')) {
      parameters.direction = 'back';
    }

    // Amount detection (simple regex for now)
    const degreeMatch = lower.match(/(\d+)\s*degree/);
    if (degreeMatch) {
      parameters.amount = parseInt(degreeMatch[1], 10);
    }

    return { type, parameters };
  }
}
