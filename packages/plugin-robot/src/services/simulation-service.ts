import {
  Service,
  ServiceType,
  type IAgentRuntime,
  type ServiceTypeName,
  logger,
} from '@elizaos/core';
import { RobotServiceType, RobotState, JointState } from '../types';
import { ROS2Bridge } from '../communication/ros2-bridge';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface SimulationConfig {
  gazeboWorldFile?: string;
  urdfPath?: string;
  launchFile?: string;
  rosWebsocketUrl?: string;
  autoStart?: boolean;
  headless?: boolean;
  physics?: {
    updateRate?: number;
    gravity?: { x: number; y: number; z: number };
    solver?: 'ode' | 'bullet' | 'dart';
  };
}

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  simTime: number;
  realTimeFactor: number;
  worldName?: string;
  modelCount: number;
}

export class SimulationService extends Service {
  static override serviceType: ServiceTypeName = RobotServiceType.SIMULATION;
  static readonly serviceName = 'SIMULATION';
  override capabilityDescription = 'Manages Gazebo simulation for robot testing and development.';

  private ros2Bridge: ROS2Bridge | null = null;
  private gazeboProcess: ChildProcess | null = null;
  private ros2LaunchProcess: ChildProcess | null = null;
  private simulationConfig: SimulationConfig;
  private simulationState: SimulationState = {
    isRunning: false,
    isPaused: false,
    simTime: 0,
    realTimeFactor: 1.0,
    modelCount: 0,
  };

  constructor(runtime: IAgentRuntime) {
    super(runtime);

    // Load configuration
    this.simulationConfig = {
      gazeboWorldFile:
        runtime.getSetting('GAZEBO_WORLD_FILE') ||
        path.join(process.cwd(), 'gazebo', 'worlds', 'ainex_world.world'),
      urdfPath:
        runtime.getSetting('ROBOT_URDF_PATH') ||
        path.join(process.cwd(), 'urdf', 'ainex-humanoid.urdf'),
      launchFile: runtime.getSetting('ROS2_LAUNCH_FILE'),
      rosWebsocketUrl: runtime.getSetting('ROS_WEBSOCKET_URL') || 'ws://localhost:9090',
      autoStart: runtime.getSetting('SIMULATION_AUTO_START') === 'true',
      headless: runtime.getSetting('SIMULATION_HEADLESS') === 'true',
      physics: {
        updateRate: parseInt(runtime.getSetting('PHYSICS_UPDATE_RATE') || '1000', 10),
        gravity: { x: 0, y: 0, z: -9.81 },
        solver: (runtime.getSetting('PHYSICS_SOLVER') as any) || 'ode',
      },
    };

    logger.info('[SimulationService] Initialized with config:', this.simulationConfig);
  }

  static async start(runtime: IAgentRuntime): Promise<SimulationService> {
    const service = new SimulationService(runtime);
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      // Check if required files exist
      await this.validateFiles();

      // Initialize ROS 2 bridge
      this.ros2Bridge = new ROS2Bridge({
        url: this.simulationConfig.rosWebsocketUrl!,
      });

      // Set up simulation control topics
      this.setupSimulationTopics();

      // Auto-start if configured
      if (this.simulationConfig.autoStart) {
        await this.startSimulation();
      }

      logger.info('[SimulationService] Initialization complete');
    } catch (error) {
      logger.error('[SimulationService] Failed to initialize:', error);
      throw error;
    }
  }

  private async validateFiles(): Promise<void> {
    // Check URDF exists
    if (this.simulationConfig.urdfPath) {
      try {
        await fs.access(this.simulationConfig.urdfPath);
        logger.info('[SimulationService] URDF found:', this.simulationConfig.urdfPath);
      } catch {
        logger.warn('[SimulationService] URDF not found, will need to generate');
      }
    }

    // Check world file exists
    if (this.simulationConfig.gazeboWorldFile) {
      try {
        await fs.access(this.simulationConfig.gazeboWorldFile);
        logger.info('[SimulationService] World file found:', this.simulationConfig.gazeboWorldFile);
      } catch {
        logger.warn('[SimulationService] World file not found, will use empty world');
      }
    }
  }

  private setupSimulationTopics(): void {
    if (!this.ros2Bridge) {
      return;
    }

    // Subscribe to simulation status
    this.ros2Bridge.subscribeTopic('/clock', 'rosgraph_msgs/Clock', (message: any) => {
      this.simulationState.simTime = message.clock.secs + message.clock.nsecs / 1e9;
    });

    // Subscribe to physics properties
    this.ros2Bridge.subscribeTopic(
      '/gazebo/performance_metrics',
      'gazebo_msgs/PerformanceMetrics',
      (message: any) => {
        this.simulationState.realTimeFactor = message.real_time_factor;
      }
    );
  }

  /**
   * Start Gazebo simulation
   */
  async startSimulation(): Promise<void> {
    if (this.simulationState.isRunning) {
      logger.warn('[SimulationService] Simulation already running');
      return;
    }

    logger.info('[SimulationService] Starting Gazebo simulation');

    try {
      // Start Gazebo
      await this.startGazebo();

      // Wait for Gazebo to initialize
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Start ROS 2 launch file if specified
      if (this.simulationConfig.launchFile) {
        await this.startROS2Launch();
      }

      // Connect ROS 2 bridge
      if (this.ros2Bridge && !this.ros2Bridge.isConnected()) {
        await this.ros2Bridge.connect();
      }

      // Spawn robot model
      await this.spawnRobot();

      this.simulationState.isRunning = true;
      logger.info('[SimulationService] Simulation started successfully');
    } catch (error) {
      logger.error('[SimulationService] Failed to start simulation:', error);
      await this.stopSimulation();
      throw error;
    }
  }

  private async startGazebo(): Promise<void> {
    const args: string[] = [];

    // Add world file if specified
    if (this.simulationConfig.gazeboWorldFile) {
      args.push(this.simulationConfig.gazeboWorldFile);
    }

    // Add headless flag if configured
    if (this.simulationConfig.headless) {
      args.push('-s', 'libgazebo_ros_init.so');
      args.push('-s', 'libgazebo_ros_factory.so');
      args.push('--headless');
    }

    // Add physics properties
    if (this.simulationConfig.physics) {
      args.push('--physics', this.simulationConfig.physics.solver!);
      args.push('--iters', '50');
      args.push('--update-rate', this.simulationConfig.physics.updateRate!.toString());
    }

    // Spawn Gazebo process
    this.gazeboProcess = spawn('gazebo', args, {
      stdio: 'pipe',
      env: {
        ...process.env,
        GAZEBO_MODEL_PATH: path.join(process.cwd(), 'gazebo', 'models'),
        GAZEBO_PLUGIN_PATH: '/opt/ros/humble/lib',
      },
    });

    this.gazeboProcess.stdout?.on('data', (data) => {
      logger.debug('[Gazebo]', data.toString().trim());
    });

    this.gazeboProcess.stderr?.on('data', (data) => {
      logger.error('[Gazebo Error]', data.toString().trim());
    });

    this.gazeboProcess.on('exit', (code) => {
      logger.info(`[SimulationService] Gazebo exited with code ${code}`);
      this.simulationState.isRunning = false;
    });
  }

  private async startROS2Launch(): Promise<void> {
    if (!this.simulationConfig.launchFile) {
      return;
    }

    this.ros2LaunchProcess = spawn('ros2', ['launch', this.simulationConfig.launchFile], {
      stdio: 'pipe',
    });

    this.ros2LaunchProcess.stdout?.on('data', (data) => {
      logger.debug('[ROS2 Launch]', data.toString().trim());
    });

    this.ros2LaunchProcess.stderr?.on('data', (data) => {
      logger.error('[ROS2 Launch Error]', data.toString().trim());
    });
  }

  private async spawnRobot(): Promise<void> {
    if (!this.simulationConfig.urdfPath) {
      logger.warn('[SimulationService] No URDF path specified, skipping robot spawn');
      return;
    }

    try {
      // Read URDF file
      const urdfContent = await fs.readFile(this.simulationConfig.urdfPath, 'utf-8');

      // Call spawn service
      const _response = await this.ros2Bridge!.callService(
        '/spawn_entity',
        'gazebo_msgs/SpawnEntity',
        {
          name: 'ainex_robot',
          xml: urdfContent,
          robot_namespace: '/ainex',
          initial_pose: {
            position: { x: 0, y: 0, z: 0.5 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
          reference_frame: 'world',
        }
      );

      logger.info('[SimulationService] Robot spawned successfully');
      this.simulationState.modelCount++;
    } catch (error) {
      logger.error('[SimulationService] Failed to spawn robot:', error);
      throw error;
    }
  }

  /**
   * Stop Gazebo simulation
   */
  async stopSimulation(): Promise<void> {
    logger.info('[SimulationService] Stopping simulation');

    // Disconnect ROS 2 bridge
    if (this.ros2Bridge?.isConnected()) {
      await this.ros2Bridge.disconnect();
    }

    // Stop ROS 2 launch
    if (this.ros2LaunchProcess) {
      this.ros2LaunchProcess.kill('SIGTERM');
      this.ros2LaunchProcess = null;
    }

    // Stop Gazebo
    if (this.gazeboProcess) {
      this.gazeboProcess.kill('SIGTERM');

      // Wait for process to exit
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          this.gazeboProcess?.kill('SIGKILL');
          resolve();
        }, 5000);

        this.gazeboProcess!.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.gazeboProcess = null;
    }

    this.simulationState.isRunning = false;
    logger.info('[SimulationService] Simulation stopped');
  }

  /**
   * Pause simulation
   */
  async pauseSimulation(): Promise<void> {
    if (!this.simulationState.isRunning) {
      throw new Error('Simulation not running');
    }

    await this.ros2Bridge!.callService('/pause_physics', 'std_srvs/Empty', {});

    this.simulationState.isPaused = true;
    logger.info('[SimulationService] Simulation paused');
  }

  /**
   * Resume simulation
   */
  async resumeSimulation(): Promise<void> {
    if (!this.simulationState.isRunning) {
      throw new Error('Simulation not running');
    }

    await this.ros2Bridge!.callService('/unpause_physics', 'std_srvs/Empty', {});

    this.simulationState.isPaused = false;
    logger.info('[SimulationService] Simulation resumed');
  }

  /**
   * Reset simulation
   */
  async resetSimulation(): Promise<void> {
    if (!this.simulationState.isRunning) {
      throw new Error('Simulation not running');
    }

    await this.ros2Bridge!.callService('/reset_simulation', 'std_srvs/Empty', {});

    this.simulationState.simTime = 0;
    logger.info('[SimulationService] Simulation reset');
  }

  /**
   * Set simulation time factor
   */
  async setTimeFactor(factor: number): Promise<void> {
    if (!this.simulationState.isRunning) {
      throw new Error('Simulation not running');
    }

    if (factor < 0.1 || factor > 10) {
      throw new Error('Time factor must be between 0.1 and 10');
    }

    await this.ros2Bridge!.callService(
      '/set_physics_properties',
      'gazebo_msgs/SetPhysicsProperties',
      {
        time_step: 0.001,
        max_update_rate: 1000 * factor,
      }
    );

    logger.info(`[SimulationService] Time factor set to ${factor}x`);
  }

  /**
   * Spawn object in simulation
   */
  async spawnObject(
    name: string,
    modelPath: string,
    position: { x: number; y: number; z: number }
  ): Promise<void> {
    if (!this.simulationState.isRunning) {
      throw new Error('Simulation not running');
    }

    // Read model file
    const modelContent = await fs.readFile(modelPath, 'utf-8');

    await this.ros2Bridge!.callService('/spawn_entity', 'gazebo_msgs/SpawnEntity', {
      name,
      xml: modelContent,
      initial_pose: {
        position,
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      reference_frame: 'world',
    });

    this.simulationState.modelCount++;
    logger.info(`[SimulationService] Spawned object: ${name}`);
  }

  /**
   * Delete object from simulation
   */
  async deleteObject(name: string): Promise<void> {
    if (!this.simulationState.isRunning) {
      throw new Error('Simulation not running');
    }

    await this.ros2Bridge!.callService('/delete_entity', 'gazebo_msgs/DeleteEntity', { name });

    this.simulationState.modelCount--;
    logger.info(`[SimulationService] Deleted object: ${name}`);
  }

  /**
   * Get simulation state
   */
  getState(): SimulationState {
    return { ...this.simulationState };
  }

  /**
   * Check if simulation is running
   */
  isRunning(): boolean {
    return this.simulationState.isRunning;
  }

  async stop(): Promise<void> {
    logger.info('[SimulationService] Stopping service');

    // Stop simulation if running
    if (this.simulationState.isRunning) {
      await this.stopSimulation();
    }

    // Clear ROS 2 bridge
    this.ros2Bridge = null;
  }
}
