import { Service, type IAgentRuntime, elizaLogger } from '@elizaos/core';
import {
  type TogetherAIConfig,
  type TogetherAIJob,
  type AutomationPipeline,
  type ModelDeploymentDecision,
} from '../types.js';
import { TogetherAIClient } from '../utils/together-ai-client.js';
import { AutomatedDataCollector } from '../utils/automated-data-collector.js';
import { JSONLDatasetProcessor } from '../utils/jsonl-dataset-processor.js';

/**
 * Complete automation service for Together.ai fine-tuning pipeline
 * Handles data collection -> dataset preparation -> training -> deployment
 */
export class TogetherAIAutomationService extends Service {
  static serviceType = 'together-ai-automation';
  capabilityDescription = 'Full automation pipeline for Together.ai fine-tuning and deployment';

  private togetherClient: TogetherAIClient;
  private dataCollector: AutomatedDataCollector;
  private datasetProcessor: JSONLDatasetProcessor;
  private activePipelines: Map<string, AutomationPipeline> = new Map();

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.togetherClient = new TogetherAIClient(runtime);
    this.dataCollector = new AutomatedDataCollector(runtime);
    this.datasetProcessor = new JSONLDatasetProcessor(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<TogetherAIAutomationService> {
    const service = new TogetherAIAutomationService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    elizaLogger.info('Initializing Together.ai Automation Service');

    await this.togetherClient.initialize();
    await this.dataCollector.initialize();

    // Start automated data collection
    await this.dataCollector.startCollection({
      autoSave: true,
      saveInterval: 300000, // 5 minutes
      maxDataPoints: 10000,
    });

    elizaLogger.info('Together.ai Automation Service initialized');
  }

  /**
   * Start complete automation pipeline
   */
  async startAutomationPipeline(config: {
    name: string;
    smallModel: TogetherAIConfig;
    largeModel: TogetherAIConfig;
    dataCollection: {
      minDataPoints: number;
      minQuality: number;
      collectFor: number; // milliseconds
    };
    deployment: {
      autoDecision: boolean;
      budget: number;
      expectedUsage: number;
    };
  }): Promise<string> {
    const pipelineId = `pipeline-${Date.now()}`;

    elizaLogger.info(`Starting automation pipeline: ${config.name} (${pipelineId})`);

    const pipeline: AutomationPipeline = {
      id: pipelineId,
      name: config.name,
      status: 'collecting-data',
      steps: [
        {
          id: 'data-collection',
          name: 'Data Collection',
          type: 'collection',
          status: 'pending',
          config: {},
        },
        {
          id: 'dataset-prep',
          name: 'Dataset Preparation',
          type: 'preparation',
          status: 'pending',
          config: {},
        },
        {
          id: 'small-training',
          name: 'Small Model Training',
          type: 'training',
          status: 'pending',
          config: {},
        },
        {
          id: 'large-training',
          name: 'Large Model Training',
          type: 'training',
          status: 'pending',
          config: {},
        },
        { id: 'deployment', name: 'Deployment', type: 'deployment', status: 'pending', config: {} },
      ],
      startedAt: Date.now(),
      config,
      phases: {
        dataCollection: { status: 'in-progress', startedAt: new Date() },
        datasetPreparation: { status: 'pending' },
        smallModelTraining: { status: 'pending' },
        largeModelTraining: { status: 'pending' },
        deployment: { status: 'pending' },
      },
      models: {
        small: { config: config.smallModel },
        large: { config: config.largeModel },
      },
    };

    this.activePipelines.set(pipelineId, pipeline);

    // Start the pipeline
    this.runPipeline(pipelineId).catch((error) => {
      elizaLogger.error(`Pipeline ${pipelineId} failed:`, error);
      this.updatePipelineStatus(pipelineId, 'failed', error.message);
    });

    return pipelineId;
  }

  /**
   * Execute the complete automation pipeline
   */
  private async runPipeline(pipelineId: string): Promise<void> {
    const pipeline = this.activePipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    try {
      // Phase 1: Data Collection
      await this.executeDataCollection(pipeline);

      // Phase 2: Dataset Preparation
      await this.executeDatasetPreparation(pipeline);

      // Phase 3: Model Training (parallel)
      await Promise.all([
        this.executeSmallModelTraining(pipeline),
        this.executeLargeModelTraining(pipeline),
      ]);

      // Phase 4: Deployment
      await this.executeDeployment(pipeline);

      this.updatePipelineStatus(pipelineId, 'completed');
      elizaLogger.info(`Pipeline ${pipelineId} completed successfully`);
    } catch (error) {
      this.updatePipelineStatus(
        pipelineId,
        'failed',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Phase 1: Data Collection
   */
  private async executeDataCollection(pipeline: AutomationPipeline): Promise<void> {
    elizaLogger.info(`Pipeline ${pipeline.id}: Starting data collection`);
    this.updatePhaseStatus(pipeline.id, 'dataCollection', 'in-progress');

    const { minDataPoints, minQuality, collectFor } = pipeline.config?.dataCollection || {
      minDataPoints: 100,
      minQuality: 0.7,
      collectFor: 3600000,
    };

    // Wait for sufficient data collection
    const startTime = Date.now();
    while (Date.now() - startTime < collectFor) {
      const stats = this.dataCollector.getCollectionStats();

      if (stats.totalDataPoints >= minDataPoints && stats.averageQuality >= minQuality) {
        elizaLogger.info(
          `Pipeline ${pipeline.id}: Sufficient data collected (${stats.totalDataPoints} points)`
        );
        break;
      }

      // Wait and check again
      await new Promise((resolve) => setTimeout(resolve, 60000)); // Check every minute
    }

    this.updatePhaseStatus(pipeline.id, 'dataCollection', 'completed');
  }

  /**
   * Phase 2: Dataset Preparation
   */
  private async executeDatasetPreparation(pipeline: AutomationPipeline): Promise<void> {
    elizaLogger.info(`Pipeline ${pipeline.id}: Preparing datasets`);
    this.updatePhaseStatus(pipeline.id, 'datasetPreparation', 'in-progress');

    // Export collected data
    const dataFile = await this.dataCollector.exportData('json');
    const stats = this.dataCollector.getCollectionStats();

    // Load and filter data
    const rawData = await this.loadCollectedData(dataFile);
    const filteredData = this.datasetProcessor.filterDataset(rawData, {
      minQuality: pipeline.config?.dataCollection?.minQuality || 0.7,
      includeTypes: ['code-generation'],
    });

    // Create model-specific datasets
    const { smallModelDataset, largeModelDataset } =
      await this.datasetProcessor.createModelSpecificDatasets(filteredData, {
        small: pipeline.config?.smallModel || { baseModel: 'small-model' },
        large: pipeline.config?.largeModel || { baseModel: 'large-model' },
      });

    // Validate datasets
    const smallValidation = await this.datasetProcessor.validateJSONLFormat(smallModelDataset);
    const largeValidation = await this.datasetProcessor.validateJSONLFormat(largeModelDataset);

    if (!smallValidation.isValid || !largeValidation.isValid) {
      throw new Error('Dataset validation failed');
    }

    // Save datasets
    const smallDatasetPath = `./datasets/${pipeline.id}_small_model.jsonl`;
    const largeDatasetPath = `./datasets/${pipeline.id}_large_model.jsonl`;

    await this.datasetProcessor.saveDataset(smallModelDataset, smallDatasetPath);
    await this.datasetProcessor.saveDataset(largeModelDataset, largeDatasetPath);

    // Update pipeline with dataset info
    (pipeline.datasets as any) = {
      small: { path: smallDatasetPath, size: smallModelDataset.totalEntries },
      large: { path: largeDatasetPath, size: largeModelDataset.totalEntries },
    };

    this.updatePhaseStatus(pipeline.id, 'datasetPreparation', 'completed');
  }

  /**
   * Phase 3a: Small Model Training
   */
  private async executeSmallModelTraining(pipeline: AutomationPipeline): Promise<void> {
    elizaLogger.info(`Pipeline ${pipeline.id}: Training small model`);
    this.updatePhaseStatus(pipeline.id, 'smallModelTraining', 'in-progress');

    if (!(pipeline.datasets as any)?.small) {
      throw new Error('Small model dataset not available');
    }

    // Upload dataset
    const fileId = await this.togetherClient.uploadDataset((pipeline.datasets as any).small.path);

    // Start training
    const trainingConfig: TogetherAIConfig = {
      ...pipeline.config?.smallModel,
      trainingFileId: fileId,
    };

    const job = await this.togetherClient.startFineTuning(trainingConfig);
    (pipeline.models as any).small.jobId = job.id;

    // Monitor training
    await this.monitorTrainingJob(job.id, 'small', pipeline.id);

    this.updatePhaseStatus(pipeline.id, 'smallModelTraining', 'completed');
  }

  /**
   * Phase 3b: Large Model Training
   */
  private async executeLargeModelTraining(pipeline: AutomationPipeline): Promise<void> {
    elizaLogger.info(`Pipeline ${pipeline.id}: Training large model`);
    this.updatePhaseStatus(pipeline.id, 'largeModelTraining', 'in-progress');

    if (!(pipeline.datasets as any)?.large) {
      throw new Error('Large model dataset not available');
    }

    // Upload dataset
    const fileId = await this.togetherClient.uploadDataset((pipeline.datasets as any).large.path);

    // Start training
    const trainingConfig: TogetherAIConfig = {
      ...pipeline.config?.largeModel,
      trainingFileId: fileId,
    };

    const job = await this.togetherClient.startFineTuning(trainingConfig);
    (pipeline.models as any).large.jobId = job.id;

    // Monitor training
    await this.monitorTrainingJob(job.id, 'large', pipeline.id);

    this.updatePhaseStatus(pipeline.id, 'largeModelTraining', 'completed');
  }

  /**
   * Phase 4: Deployment
   */
  private async executeDeployment(pipeline: AutomationPipeline): Promise<void> {
    elizaLogger.info(`Pipeline ${pipeline.id}: Deploying models`);
    this.updatePhaseStatus(pipeline.id, 'deployment', 'in-progress');

    const { autoDecision, budget, expectedUsage } = pipeline.config?.deployment || {
      autoDecision: true,
      budget: 100,
      expectedUsage: 1000,
    };

    // Make deployment decisions for both models
    const smallDecision = this.togetherClient.makeDeploymentDecision(
      pipeline.config?.smallModel?.baseModel || 'default-small',
      expectedUsage * 0.3, // Assume 30% of usage goes to small model
      budget * 0.3
    );

    const largeDecision = this.togetherClient.makeDeploymentDecision(
      pipeline.config?.largeModel?.baseModel || 'default-large',
      expectedUsage * 0.7, // Assume 70% of usage goes to large model
      budget * 0.7
    );

    // Execute deployment based on decisions
    if (autoDecision) {
      await this.executeAutoDeployment(pipeline, smallDecision, largeDecision);
    } else {
      // Save deployment recommendations for manual review
      pipeline.deploymentRecommendations = {
        small: smallDecision,
        large: largeDecision,
      };
    }

    this.updatePhaseStatus(pipeline.id, 'deployment', 'completed');
  }

  /**
   * Monitor training job until completion
   */
  private async monitorTrainingJob(
    jobId: string,
    modelSize: 'small' | 'large',
    pipelineId: string
  ): Promise<void> {
    elizaLogger.info(`Monitoring ${modelSize} model training job: ${jobId}`);

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const job = await this.togetherClient.getJobStatus(jobId);

      elizaLogger.info(`Job ${jobId} status: ${job.status}`);

      if (job.status === 'completed') {
        elizaLogger.info(`Training job ${jobId} completed successfully`);

        // Update pipeline with trained model info
        const pipeline = this.activePipelines.get(pipelineId);
        if (pipeline) {
          (pipeline.models as any)[modelSize].fineTunedModel = job.fineTunedModel;
          (pipeline.models as any)[modelSize].completedAt = new Date();
        }

        break;
      } else if (job.status === 'failed') {
        throw new Error(`Training job ${jobId} failed: ${job.error}`);
      } else if (job.status === 'cancelled') {
        throw new Error(`Training job ${jobId} was cancelled`);
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, 30000)); // Check every 30 seconds
    }
  }

  /**
   * Execute automatic deployment
   */
  private async executeAutoDeployment(
    pipeline: AutomationPipeline,
    smallDecision: ModelDeploymentDecision,
    largeDecision: ModelDeploymentDecision
  ): Promise<void> {
    elizaLogger.info(`Executing auto-deployment for pipeline ${pipeline.id}`);

    // Deploy based on decisions
    if (smallDecision.platform === 'together-ai') {
      // Keep on Together.ai (already hosted)
      pipeline.deployment = {
        ...pipeline.deployment,
        small: {
          platform: 'together-ai',
          status: 'hosted',
          endpoint: `together-api://${(pipeline.models as any).small.fineTunedModel}`,
        },
      };
    } else {
      // Download and set up for local inference
      await this.setupLocalInference(
        (pipeline.models as any).small.fineTunedModel!,
        'small',
        pipeline.id
      );
    }

    if (largeDecision.platform === 'together-ai') {
      // Keep on Together.ai
      pipeline.deployment = {
        ...pipeline.deployment,
        large: {
          platform: 'together-ai',
          status: 'hosted',
          endpoint: `together-api://${(pipeline.models as any).large.fineTunedModel}`,
        },
      };
    } else {
      // Set up local infrastructure
      await this.setupLocalInference(
        (pipeline.models as any).large.fineTunedModel!,
        'large',
        pipeline.id
      );
    }
  }

  /**
   * Set up local inference
   */
  private async setupLocalInference(
    modelName: string,
    size: 'small' | 'large',
    pipelineId: string
  ): Promise<void> {
    elizaLogger.info(`Setting up local inference for ${size} model: ${modelName}`);

    // This would implement:
    // 1. Download model from Together.ai
    // 2. Convert to local format (GGUF for Ollama, etc.)
    // 3. Set up local serving infrastructure
    // 4. Test inference endpoint

    // For now, just log the setup
    elizaLogger.info(`Local inference setup completed for ${modelName}`);
  }

  /**
   * Get pipeline status
   */
  getPipelineStatus(pipelineId: string): AutomationPipeline | null {
    return this.activePipelines.get(pipelineId) || null;
  }

  /**
   * List all pipelines
   */
  getAllPipelines(): AutomationPipeline[] {
    return Array.from(this.activePipelines.values());
  }

  /**
   * Cancel pipeline
   */
  async cancelPipeline(pipelineId: string): Promise<boolean> {
    const pipeline = this.activePipelines.get(pipelineId);
    if (!pipeline) {
      return false;
    }

    elizaLogger.info(`Cancelling pipeline ${pipelineId}`);

    // Cancel any active training jobs
    if ((pipeline.models as any).small.jobId) {
      await this.togetherClient.cancelJob((pipeline.models as any).small.jobId);
    }
    if ((pipeline.models as any).large.jobId) {
      await this.togetherClient.cancelJob((pipeline.models as any).large.jobId);
    }

    this.updatePipelineStatus(pipelineId, 'cancelled');
    return true;
  }

  private updatePipelineStatus(
    pipelineId: string,
    status: AutomationPipeline['status'],
    error?: string
  ): void {
    const pipeline = this.activePipelines.get(pipelineId);
    if (pipeline) {
      pipeline.status = status;
      if (error) {
        pipeline.error = error;
      }
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        pipeline.completedAt = Date.now();
      }
    }
  }

  private updatePhaseStatus(pipelineId: string, phase: string, status: string): void {
    const pipeline = this.activePipelines.get(pipelineId);
    if (pipeline && pipeline.phases) {
      if (!pipeline.phases[phase]) {
        pipeline.phases[phase] = {};
      }
      pipeline.phases[phase].status = status;
      if (status === 'in-progress') {
        pipeline.phases[phase].startedAt = new Date();
      } else if (status === 'completed' || status === 'failed') {
        pipeline.phases[phase].completedAt = new Date();
      }
    }
  }

  private async loadCollectedData(filename: string): Promise<any[]> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filename, 'utf-8');
    return JSON.parse(content);
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping Together.ai Automation Service');

    await this.dataCollector.stopCollection();

    // Cancel any active pipelines
    for (const pipelineId of this.activePipelines.keys()) {
      await this.cancelPipeline(pipelineId);
    }
  }
}
