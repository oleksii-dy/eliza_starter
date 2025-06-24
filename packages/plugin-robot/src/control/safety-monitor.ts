import { logger } from '@elizaos/core';

export interface JointLimits {
  [jointName: string]: {
    min: number;
    max: number;
  };
}

export interface SafetyConfig {
  maxVelocity?: number; // rad/s
  maxAcceleration?: number; // rad/s^2
  maxTorque?: number; // Nm
}

export class SafetyMonitor {
  private lastPositions: Map<string, number> = new Map();
  private lastVelocities: Map<string, number> = new Map();
  private lastUpdateTime: Map<string, number> = new Map();

  constructor(
    private jointLimits: JointLimits,
    private safetyConfig: SafetyConfig = {}
  ) {
    logger.info(
      '[SafetyMonitor] Initialized with limits for',
      Object.keys(jointLimits).length,
      'joints'
    );
  }

  /**
   * Check if a joint position is within safe limits
   * @param jointName Name of the joint
   * @param position Desired position in radians
   * @returns Safe position within limits
   */
  checkJointLimit(jointName: string, position: number): number {
    const limits = this.jointLimits[jointName];
    if (!limits) {
      logger.warn(`[SafetyMonitor] No limits defined for joint: ${jointName}`);
      return position;
    }

    // Clamp position to limits
    const safePosition = Math.max(limits.min, Math.min(limits.max, position));

    if (safePosition !== position) {
      logger.warn(
        `[SafetyMonitor] Joint ${jointName} position clamped from ${position.toFixed(3)} to ${safePosition.toFixed(3)} rad`
      );
    }

    return safePosition;
  }

  /**
   * Check if joint velocity is within safe limits
   * @param jointName Name of the joint
   * @param currentPosition Current position in radians
   * @param targetPosition Target position in radians
   * @param timestep Time step in seconds
   * @returns Safe target position or null if velocity would be too high
   */
  checkVelocityLimit(
    jointName: string,
    currentPosition: number,
    targetPosition: number,
    timestep: number
  ): number | null {
    if (!this.safetyConfig.maxVelocity || timestep <= 0) {
      return targetPosition;
    }

    const requiredVelocity = Math.abs(targetPosition - currentPosition) / timestep;

    if (requiredVelocity > this.safetyConfig.maxVelocity) {
      // Calculate safe target position based on max velocity
      const maxDelta = this.safetyConfig.maxVelocity * timestep;
      const direction = Math.sign(targetPosition - currentPosition);
      const safeTarget = currentPosition + direction * maxDelta;

      logger.warn(
        `[SafetyMonitor] Joint ${jointName} velocity limited: ${requiredVelocity.toFixed(2)} rad/s > ${this.safetyConfig.maxVelocity} rad/s`
      );

      return this.checkJointLimit(jointName, safeTarget);
    }

    return targetPosition;
  }

  /**
   * Check if joint acceleration is within safe limits
   * @param jointName Name of the joint
   * @param currentVelocity Current velocity in rad/s
   * @param targetVelocity Target velocity in rad/s
   * @param timestep Time step in seconds
   * @returns Safe target velocity or null if acceleration would be too high
   */
  checkAccelerationLimit(
    jointName: string,
    currentVelocity: number,
    targetVelocity: number,
    timestep: number
  ): number | null {
    if (!this.safetyConfig.maxAcceleration || timestep <= 0) {
      return targetVelocity;
    }

    const requiredAcceleration = Math.abs(targetVelocity - currentVelocity) / timestep;

    if (requiredAcceleration > this.safetyConfig.maxAcceleration) {
      // Calculate safe target velocity based on max acceleration
      const maxDelta = this.safetyConfig.maxAcceleration * timestep;
      const direction = Math.sign(targetVelocity - currentVelocity);
      const safeVelocity = currentVelocity + direction * maxDelta;

      logger.warn(
        `[SafetyMonitor] Joint ${jointName} acceleration limited: ${requiredAcceleration.toFixed(2)} rad/s² > ${this.safetyConfig.maxAcceleration} rad/s²`
      );

      return safeVelocity;
    }

    return targetVelocity;
  }

  /**
   * Update tracking data for a joint
   * @param jointName Name of the joint
   * @param position Current position in radians
   * @param timestamp Current timestamp in milliseconds
   */
  updateJointTracking(jointName: string, position: number, timestamp: number): void {
    const lastTime = this.lastUpdateTime.get(jointName);
    const lastPos = this.lastPositions.get(jointName);

    if (lastTime && lastPos !== undefined) {
      const dt = (timestamp - lastTime) / 1000; // Convert to seconds
      if (dt > 0) {
        const velocity = (position - lastPos) / dt;

        const lastVel = this.lastVelocities.get(jointName);
        if (lastVel !== undefined) {
          const acceleration = (velocity - lastVel) / dt;

          // Check for excessive acceleration
          if (
            this.safetyConfig.maxAcceleration &&
            Math.abs(acceleration) > this.safetyConfig.maxAcceleration * 1.5
          ) {
            logger.error(
              `[SafetyMonitor] WARNING: Joint ${jointName} acceleration ${acceleration.toFixed(2)} rad/s² exceeds safety threshold!`
            );
          }
        }

        this.lastVelocities.set(jointName, velocity);
      }
    }

    this.lastPositions.set(jointName, position);
    this.lastUpdateTime.set(jointName, timestamp);
  }

  /**
   * Check if all joints are within safe operating parameters
   * @param jointStates Current joint states
   * @returns true if all joints are safe, false otherwise
   */
  checkOverallSafety(
    jointStates: Array<{ name: string; position: number; velocity?: number }>
  ): boolean {
    let allSafe = true;

    for (const joint of jointStates) {
      // Check position limits
      const limits = this.jointLimits[joint.name];
      if (limits) {
        if (joint.position < limits.min || joint.position > limits.max) {
          logger.error(
            `[SafetyMonitor] Joint ${joint.name} position ${joint.position.toFixed(3)} rad is outside limits [${limits.min}, ${limits.max}]`
          );
          allSafe = false;
        }
      }

      // Check velocity limits
      if (joint.velocity !== undefined && this.safetyConfig.maxVelocity) {
        if (Math.abs(joint.velocity) > this.safetyConfig.maxVelocity) {
          logger.error(
            `[SafetyMonitor] Joint ${joint.name} velocity ${joint.velocity.toFixed(2)} rad/s exceeds limit ${this.safetyConfig.maxVelocity} rad/s`
          );
          allSafe = false;
        }
      }
    }

    return allSafe;
  }

  /**
   * Reset tracking data for all joints
   */
  resetTracking(): void {
    this.lastPositions.clear();
    this.lastVelocities.clear();
    this.lastUpdateTime.clear();
    logger.info('[SafetyMonitor] Tracking data reset');
  }

  /**
   * Get current safety status
   */
  getStatus(): {
    jointsTracked: number;
    violationsDetected: boolean;
    config: SafetyConfig;
    } {
    return {
      jointsTracked: this.lastPositions.size,
      violationsDetected: false, // TODO: Track violations
      config: this.safetyConfig,
    };
  }
}
