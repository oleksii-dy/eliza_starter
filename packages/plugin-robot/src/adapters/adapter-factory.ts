import { logger } from '@elizaos/core';
import { BaseRobotInterface } from '../interfaces/robot-interface';
import { RealRobotAdapter } from './real-robot-adapter';
import { SimulationAdapter } from './simulation-adapter';
import { MockRobotAdapter } from './mock-robot-adapter';
import type { IAgentRuntime } from '@elizaos/core';

export enum AdapterType {
  REAL = 'real',
  SIMULATION = 'simulation',
  MOCK = 'mock',
}

export interface AdapterConfig {
  type: AdapterType;
  serialPort?: string;
  baudRate?: number;
  rosWebsocketUrl?: string;
  jointStateTopic?: string;
  jointCommandTopic?: string;
  imuTopic?: string;
  emergencyStopTopic?: string;
  simulateDelay?: boolean;
  defaultDelay?: number;
  failureRate?: number;
}

export class AdapterFactory {
  static createAdapter(config: AdapterConfig): BaseRobotInterface {
    logger.info(`[AdapterFactory] Creating ${config.type} adapter`);

    switch (config.type) {
      case AdapterType.REAL:
        if (!config.serialPort) {
          throw new Error('Serial port required for real robot adapter');
        }
        return new RealRobotAdapter({
          serialPort: config.serialPort,
          baudRate: config.baudRate || 115200,
        });

      case AdapterType.SIMULATION:
        if (!config.rosWebsocketUrl) {
          throw new Error('ROS websocket URL required for simulation adapter');
        }
        return new SimulationAdapter({
          rosWebsocketUrl: config.rosWebsocketUrl,
          jointStateTopic: config.jointStateTopic,
          jointCommandTopic: config.jointCommandTopic,
          imuTopic: config.imuTopic,
          emergencyStopTopic: config.emergencyStopTopic,
        });

      case AdapterType.MOCK:
        return new MockRobotAdapter({
          simulateDelay: config.simulateDelay ?? true,
          defaultDelay: config.defaultDelay ?? 100,
          failureRate: config.failureRate ?? 0,
        });

      default:
        throw new Error(`Unknown adapter type: ${config.type}`);
    }
  }

  static getAdapterType(runtime: any): AdapterType {
    // Check environment variables
    const useSimulation = runtime.getSetting('USE_SIMULATION') === 'true';
    const useMock = runtime.getSetting('USE_MOCK_ROBOT') === 'true';
    const isTest =
      runtime.getSetting('NODE_ENV') === 'test' || runtime.getSetting('ELIZA_TEST') === 'true';

    // Priority: Mock > Simulation > Real
    if (useMock || isTest) {
      return AdapterType.MOCK;
    } else if (useSimulation) {
      return AdapterType.SIMULATION;
    } else {
      return AdapterType.REAL;
    }
  }

  static createFromRuntime(runtime: IAgentRuntime): BaseRobotInterface {
    // Force mock adapter in test environment
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.ELIZA_TEST === 'true' ||
      runtime.getSetting('USE_MOCK_ROBOT') === 'true'
    ) {
      logger.info('[AdapterFactory] Creating mock adapter (test environment)');
      return AdapterFactory.createAdapter({
        type: AdapterType.MOCK,
        simulateDelay: runtime.getSetting('MOCK_SIMULATE_DELAY') === 'true',
        defaultDelay: parseInt(runtime.getSetting('MOCK_DEFAULT_DELAY') || '50', 10),
        failureRate: parseFloat(runtime.getSetting('MOCK_FAILURE_RATE') || '0'),
      });
    }

    // Check if simulation is enabled
    const useSimulation = runtime.getSetting('USE_SIMULATION') === 'true';

    if (useSimulation) {
      logger.info('[AdapterFactory] Creating simulation adapter');
      return AdapterFactory.createAdapter({
        type: AdapterType.SIMULATION,
        rosWebsocketUrl: runtime.getSetting('ROS_WEBSOCKET_URL') || 'ws://localhost:9090',
        jointStateTopic: runtime.getSetting('JOINT_STATE_TOPIC') || '/joint_states',
        jointCommandTopic: runtime.getSetting('JOINT_COMMAND_TOPIC') || '/joint_commands',
        imuTopic: runtime.getSetting('IMU_TOPIC') || '/imu/data',
        emergencyStopTopic: runtime.getSetting('EMERGENCY_STOP_TOPIC') || '/emergency_stop',
      });
    }

    // Default to real hardware
    logger.info('[AdapterFactory] Creating real adapter');
    return AdapterFactory.createAdapter({
      type: AdapterType.REAL,
      serialPort: runtime.getSetting('ROBOT_SERIAL_PORT') || '/dev/ttyUSB0',
      baudRate: parseInt(runtime.getSetting('ROBOT_BAUD_RATE') || '115200', 10),
    });
  }
}
