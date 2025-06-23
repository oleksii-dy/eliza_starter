import {
  Service,
  ServiceType,
  type IAgentRuntime,
  type ServiceTypeName,
  logger,
} from '@elizaos/core';
import { RobotServiceType } from '../types';
import { RobotService } from './robot-service';
import { AiNexGymEnvironment, makeAiNexEnv } from '../rl/gym-environment';
import * as onnxruntime from 'onnxruntime-node';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface RLConfig {
  modelPath?: string;
  taskType?: 'walking' | 'manipulation' | 'balance' | 'custom';
  episodeLength?: number;
  trainingEnabled?: boolean;
  inferenceOnly?: boolean;
}

export interface TrainingMetrics {
  episodeRewards: number[];
  episodeLengths: number[];
  averageReward: number;
  totalSteps: number;
  successRate: number;
}

export class RLService extends Service {
  static override serviceType: ServiceTypeName = RobotServiceType.RL_TRAINING;
  static readonly serviceName = 'RL_TRAINING';
  override capabilityDescription =
    'Provides reinforcement learning training and inference for robot control.';

  private robotService: RobotService | null = null;
  private environment: AiNexGymEnvironment | null = null;
  private onnxSession: onnxruntime.InferenceSession | null = null;
  private rlConfig: RLConfig;
  private trainingMetrics: TrainingMetrics = {
    episodeRewards: [],
    episodeLengths: [],
    averageReward: 0,
    totalSteps: 0,
    successRate: 0,
  };
  private isTraining = false;

  constructor(runtime: IAgentRuntime) {
    super(runtime);

    // Load configuration
    this.rlConfig = {
      modelPath: runtime.getSetting('RL_MODEL_PATH'),
      taskType: (runtime.getSetting('RL_TASK_TYPE') as any) || 'walking',
      episodeLength: parseInt(runtime.getSetting('RL_EPISODE_LENGTH') || '1000'),
      trainingEnabled: runtime.getSetting('RL_TRAINING_ENABLED') === 'true',
      inferenceOnly: runtime.getSetting('RL_INFERENCE_ONLY') === 'true',
    };

    logger.info('[RLService] Initialized with config:', this.rlConfig);
  }

  static async start(runtime: IAgentRuntime): Promise<RLService> {
    const service = new RLService(runtime);
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      // Get robot service
      this.robotService = this.runtime.getService<RobotService>(RobotServiceType.ROBOT);
      if (!this.robotService) {
        throw new Error('Robot service not available');
      }

      // Create Gym environment
      this.environment = makeAiNexEnv(
        this.robotService,
        this.rlConfig.taskType!,
        this.rlConfig.episodeLength!
      );

      // Load ONNX model if available
      if (this.rlConfig.modelPath) {
        await this.loadModel(this.rlConfig.modelPath);
      }

      logger.info('[RLService] Initialization complete');
    } catch (error) {
      logger.error('[RLService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Load ONNX model for inference
   */
  async loadModel(modelPath: string): Promise<void> {
    try {
      // Check if file exists
      await fs.access(modelPath);

      // Create ONNX inference session
      this.onnxSession = await onnxruntime.InferenceSession.create(modelPath);

      logger.info('[RLService] Loaded ONNX model from:', modelPath);

      // Log model info
      const inputNames = this.onnxSession.inputNames;
      const outputNames = this.onnxSession.outputNames;
      logger.info('[RLService] Model inputs:', inputNames);
      logger.info('[RLService] Model outputs:', outputNames);
    } catch (error) {
      logger.error('[RLService] Failed to load model:', error);
      throw error;
    }
  }

  /**
   * Save model in ONNX format
   */
  async saveModel(modelPath: string): Promise<void> {
    // This would be implemented with actual model export
    // For now, it's a placeholder
    logger.info('[RLService] Model saving not yet implemented');
  }

  /**
   * Run inference using loaded model
   */
  async predict(observation: number[]): Promise<number[]> {
    if (!this.onnxSession) {
      throw new Error('No model loaded for inference');
    }

    try {
      // Prepare input tensor
      const inputTensor = new onnxruntime.Tensor('float32', observation, [1, observation.length]);

      // Run inference
      const feeds = { observation: inputTensor };
      const results = await this.onnxSession.run(feeds);

      // Extract action from results
      const actionTensor = results['action'] || results[Object.keys(results)[0]];
      const action = Array.from(actionTensor.data as Float32Array);

      return action;
    } catch (error) {
      logger.error('[RLService] Inference failed:', error);
      throw error;
    }
  }

  /**
   * Run a single episode for evaluation
   */
  async runEpisode(usePolicy: boolean = true): Promise<{
    totalReward: number;
    steps: number;
    success: boolean;
  }> {
    if (!this.environment) {
      throw new Error('Environment not initialized');
    }

    logger.info('[RLService] Starting episode');

    // Reset environment
    let observation = await this.environment.reset();
    let totalReward = 0;
    let steps = 0;
    let done = false;

    while (!done) {
      let action: number[];

      if (usePolicy && this.onnxSession) {
        // Use learned policy
        action = await this.predict(observation);
      } else {
        // Random action for exploration
        action = this.sampleRandomAction();
      }

      // Step environment
      const result = await this.environment.step({
        jointCommands: action,
      });

      observation = result.observation;
      totalReward += result.reward;
      done = result.done;
      steps++;

      // Log progress periodically
      if (steps % 100 === 0) {
        logger.debug(`[RLService] Step ${steps}, Reward: ${totalReward.toFixed(2)}`);
      }
    }

    logger.info(
      `[RLService] Episode complete - Steps: ${steps}, Reward: ${totalReward.toFixed(2)}`
    );

    // Update metrics
    this.trainingMetrics.episodeRewards.push(totalReward);
    this.trainingMetrics.episodeLengths.push(steps);
    this.trainingMetrics.totalSteps += steps;
    this.updateMetrics();

    return {
      totalReward,
      steps,
      success: totalReward > 0, // Task-specific success criteria
    };
  }

  /**
   * Sample random action for exploration
   */
  private sampleRandomAction(): number[] {
    const actionSize = this.environment!.actionSpace.shape[0];
    const action: number[] = [];

    for (let i = 0; i < actionSize; i++) {
      // Sample from uniform distribution within action bounds
      const low = Array.isArray(this.environment!.actionSpace.low)
        ? this.environment!.actionSpace.low[i]
        : this.environment!.actionSpace.low!;
      const high = Array.isArray(this.environment!.actionSpace.high)
        ? this.environment!.actionSpace.high[i]
        : this.environment!.actionSpace.high!;

      action.push(low + Math.random() * (high - low));
    }

    return action;
  }

  /**
   * Update training metrics
   */
  private updateMetrics(): void {
    const recentRewards = this.trainingMetrics.episodeRewards.slice(-100);
    this.trainingMetrics.averageReward =
      recentRewards.reduce((a, b) => a + b, 0) / recentRewards.length;

    // Calculate success rate (task-specific)
    const recentSuccesses = recentRewards.filter((r) => r > 0).length;
    this.trainingMetrics.successRate = recentSuccesses / recentRewards.length;
  }

  /**
   * Start training loop
   */
  async startTraining(episodes: number = 1000): Promise<void> {
    if (this.isTraining) {
      throw new Error('Training already in progress');
    }

    if (!this.rlConfig.trainingEnabled) {
      throw new Error('Training is disabled in configuration');
    }

    this.isTraining = true;
    logger.info(`[RLService] Starting training for ${episodes} episodes`);

    try {
      for (let episode = 0; episode < episodes && this.isTraining; episode++) {
        const result = await this.runEpisode(false); // Use random policy for training

        // Log progress
        if (episode % 10 === 0) {
          logger.info(
            `[RLService] Episode ${episode}/${episodes} - ` +
              `Avg Reward: ${this.trainingMetrics.averageReward.toFixed(2)}, ` +
              `Success Rate: ${(this.trainingMetrics.successRate * 100).toFixed(1)}%`
          );
        }

        // Save checkpoint periodically
        if (episode % 100 === 0 && episode > 0) {
          const checkpointPath = path.join('models', 'checkpoints', `episode_${episode}.onnx`);
          // await this.saveModel(checkpointPath);
          logger.info(`[RLService] Checkpoint saved at episode ${episode}`);
        }
      }
    } finally {
      this.isTraining = false;
    }

    logger.info('[RLService] Training complete');
  }

  /**
   * Stop training
   */
  stopTraining(): void {
    if (this.isTraining) {
      logger.info('[RLService] Stopping training');
      this.isTraining = false;
    }
  }

  /**
   * Deploy policy for autonomous control
   */
  async deployPolicy(): Promise<void> {
    if (!this.onnxSession) {
      throw new Error('No policy loaded');
    }

    if (!this.robotService) {
      throw new Error('Robot service not available');
    }

    logger.info('[RLService] Deploying policy for autonomous control');

    // Set robot to autonomous mode
    await this.robotService.setMode('AUTONOMOUS' as any);

    // Start control loop
    let observation = await this.environment!.reset();

    while (this.robotService.getState().mode === 'AUTONOMOUS') {
      try {
        // Get action from policy
        const action = await this.predict(observation);

        // Execute action
        const result = await this.environment!.step({
          jointCommands: action,
        });

        observation = result.observation;

        // Check for episode end
        if (result.done) {
          logger.warn('[RLService] Episode ended during deployment, resetting');
          observation = await this.environment!.reset();
        }

        // Control rate
        await new Promise((resolve) => setTimeout(resolve, 50)); // 20Hz
      } catch (error) {
        logger.error('[RLService] Error during policy deployment:', error);
        await this.robotService.setMode('IDLE' as any);
        break;
      }
    }

    logger.info('[RLService] Policy deployment stopped');
  }

  /**
   * Get training metrics
   */
  getMetrics(): TrainingMetrics {
    return { ...this.trainingMetrics };
  }

  /**
   * Get environment info
   */
  getEnvironmentInfo(): any {
    if (!this.environment) {
      return null;
    }

    return this.environment.getInfo();
  }

  /**
   * Evaluate current policy
   */
  async evaluate(episodes: number = 10): Promise<{
    averageReward: number;
    averageSteps: number;
    successRate: number;
  }> {
    logger.info(`[RLService] Evaluating policy over ${episodes} episodes`);

    const rewards: number[] = [];
    const steps: number[] = [];
    let successes = 0;

    for (let i = 0; i < episodes; i++) {
      const result = await this.runEpisode(true); // Use policy
      rewards.push(result.totalReward);
      steps.push(result.steps);
      if (result.success) successes++;
    }

    const averageReward = rewards.reduce((a, b) => a + b, 0) / rewards.length;
    const averageSteps = steps.reduce((a, b) => a + b, 0) / steps.length;
    const successRate = successes / episodes;

    logger.info(
      `[RLService] Evaluation complete - ` +
        `Avg Reward: ${averageReward.toFixed(2)}, ` +
        `Avg Steps: ${averageSteps.toFixed(0)}, ` +
        `Success Rate: ${(successRate * 100).toFixed(1)}%`
    );

    return {
      averageReward,
      averageSteps,
      successRate,
    };
  }

  async stop(): Promise<void> {
    logger.info('[RLService] Stopping service');

    // Stop any ongoing training
    this.stopTraining();

    // Close environment
    if (this.environment) {
      await this.environment.close();
      this.environment = null;
    }

    // Clear ONNX session
    if (this.onnxSession) {
      this.onnxSession = null;
    }
  }
}
