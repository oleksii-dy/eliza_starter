import {
  Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  type ProviderResult,
  logger,
} from '@elizaos/core';
import { RobotService } from '../services/robot-service';
import { RobotServiceType, RobotStatus } from '../types';

export const robotStateProvider: Provider = {
  name: 'ROBOT_STATE',
  description:
    'Provides real-time robot hardware status including joint positions, operational mode, battery level, and safety warnings when agent needs to understand physical robot state for movement or troubleshooting decisions',
  dynamic: false, // Always include robot state for context

  get: async (runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<ProviderResult> => {
    try {
      const robotService = runtime.getService<RobotService>(RobotServiceType.ROBOT);

      if (!robotService) {
        return {
          text: 'Robot service is not available.',
          values: {
            robotConnected: false,
            robotStatus: 'SERVICE_UNAVAILABLE',
          },
        };
      }

      if (!robotService.isConnected()) {
        return {
          text: 'Robot is not connected.',
          values: {
            robotConnected: false,
            robotStatus: 'DISCONNECTED',
          },
        };
      }

      // Get current robot state
      const robotState = robotService.getState();

      // Format joint information
      const jointSummary = formatJointSummary(robotState.joints);

      // Build context text
      const contextLines = [
        `Robot Status: ${robotState.status}`,
        `Mode: ${robotState.mode}`,
        `Emergency Stop: ${robotState.isEmergencyStopped ? 'ACTIVE' : 'Released'}`,
      ];

      if (robotState.batteryLevel !== undefined) {
        contextLines.push(`Battery: ${robotState.batteryLevel}%`);
      }

      // Add IMU data if available
      const imuData = robotState.imuData || null;
      if (imuData && imuData.orientation) {
        contextLines.push(
          `Orientation: pitch=${((Math.asin(imuData.orientation.x) * 180) / Math.PI).toFixed(1)}°, ` +
            `roll=${((Math.atan2(imuData.orientation.y, imuData.orientation.z) * 180) / Math.PI).toFixed(1)}°`
        );
      }

      contextLines.push('', 'Joint Summary:', jointSummary);

      // Check for any warnings
      const warnings = checkRobotWarnings(robotState);
      if (warnings.length > 0) {
        contextLines.push('', 'Warnings:', ...warnings.map((w) => `- ${w}`));
      }

      // Return provider result
      return {
        text: contextLines.join('\n'),
        values: {
          robotConnected: true,
          robotMode: robotState.mode,
          robotStatus: robotState.status,
          emergencyStop: robotState.isEmergencyStopped,
          batteryLevel: robotState.batteryLevel,
          jointCount: robotState.joints.length,
          hasIMU: !!robotState.imuData,
          warnings,
        },
        data: {
          fullState: robotState,
          timestamp: robotState.timestamp,
        },
      };
    } catch (error) {
      logger.error('[RobotStateProvider] Error getting robot state:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        text: 'Error retrieving robot state.',
        values: {
          robotConnected: false,
          robotStatus: 'ERROR',
          error: errorMessage,
        },
      };
    }
  },
};

// Helper function to format joint summary
function formatJointSummary(joints: any[]): string {
  if (joints.length === 0) {
    return 'No joint data available';
  }

  // Group joints by body part
  const groups: { [key: string]: any[] } = {
    head: [],
    leftArm: [],
    rightArm: [],
    leftLeg: [],
    rightLeg: [],
  };

  for (const joint of joints) {
    if (joint.name.includes('head')) {
      groups.head.push(joint);
    } else if (
      joint.name.includes('left') &&
      (joint.name.includes('shoulder') ||
        joint.name.includes('elbow') ||
        joint.name.includes('wrist') ||
        joint.name.includes('gripper'))
    ) {
      groups.leftArm.push(joint);
    } else if (
      joint.name.includes('right') &&
      (joint.name.includes('shoulder') ||
        joint.name.includes('elbow') ||
        joint.name.includes('wrist') ||
        joint.name.includes('gripper'))
    ) {
      groups.rightArm.push(joint);
    } else if (joint.name.includes('left')) {
      groups.leftLeg.push(joint);
    } else if (joint.name.includes('right')) {
      groups.rightLeg.push(joint);
    }
  }

  const lines: string[] = [];

  // Head
  if (groups.head.length > 0) {
    const headPositions = groups.head
      .map((j) => `${j.name}: ${((j.position * 180) / Math.PI).toFixed(1)}°`)
      .join(', ');
    lines.push(`- Head: ${headPositions}`);
  }

  // Arms
  if (groups.leftArm.length > 0) {
    const avgPos =
      groups.leftArm.reduce((sum, j) => sum + Math.abs(j.position), 0) / groups.leftArm.length;
    lines.push(
      `- Left Arm: ${groups.leftArm.length} joints, avg position ${((avgPos * 180) / Math.PI).toFixed(1)}°`
    );
  }

  if (groups.rightArm.length > 0) {
    const avgPos =
      groups.rightArm.reduce((sum, j) => sum + Math.abs(j.position), 0) / groups.rightArm.length;
    lines.push(
      `- Right Arm: ${groups.rightArm.length} joints, avg position ${((avgPos * 180) / Math.PI).toFixed(1)}°`
    );
  }

  // Legs
  if (groups.leftLeg.length > 0) {
    const avgPos =
      groups.leftLeg.reduce((sum, j) => sum + Math.abs(j.position), 0) / groups.leftLeg.length;
    lines.push(
      `- Left Leg: ${groups.leftLeg.length} joints, avg position ${((avgPos * 180) / Math.PI).toFixed(1)}°`
    );
  }

  if (groups.rightLeg.length > 0) {
    const avgPos =
      groups.rightLeg.reduce((sum, j) => sum + Math.abs(j.position), 0) / groups.rightLeg.length;
    lines.push(
      `- Right Leg: ${groups.rightLeg.length} joints, avg position ${((avgPos * 180) / Math.PI).toFixed(1)}°`
    );
  }

  // Add total joint count
  lines.push(`- Total: ${joints.length} joints tracked`);

  return lines.join('\n');
}

// Helper function to check for warnings
function checkRobotWarnings(state: any): string[] {
  const warnings: string[] = [];

  // Check battery
  if (state.batteryLevel !== undefined && state.batteryLevel < 20) {
    warnings.push(`Low battery: ${state.batteryLevel}%`);
  }

  // Check emergency stop
  if (state.isEmergencyStopped) {
    warnings.push('Emergency stop is active');
  }

  // Check status
  if (state.status === RobotStatus.ERROR) {
    warnings.push('Robot is in error state');
  } else if (state.status === RobotStatus.WARNING) {
    warnings.push('Robot has warnings');
  }

  // Check joint temperatures if available
  const hotJoints = state.joints.filter((j: any) => j.temperature && j.temperature > 60);
  if (hotJoints.length > 0) {
    warnings.push(`${hotJoints.length} joints running hot (>60°C)`);
  }

  // Check for high velocities
  const fastJoints = state.joints.filter((j: any) => j.velocity && Math.abs(j.velocity) > 3.0);
  if (fastJoints.length > 0) {
    warnings.push(`${fastJoints.length} joints moving fast (>3 rad/s)`);
  }

  return warnings;
}
