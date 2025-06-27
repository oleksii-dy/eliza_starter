/**
 * Container Hosting Service
 *
 * Manages container deployment and billing using e2b platform
 * Handles MCPs, agents, and workflow hosting with usage-based billing
 */

import { E2BClient } from '@/lib/mocks/e2b-api';
import { getDatabase } from '../database';
import {
  hostedContainers,
  assetUsageRecords,
  marketplaceAssets,
  assetVersions,
} from '../database/marketplace-schema';
import { eq, and, gte, lte, sum } from 'drizzle-orm';

export interface ContainerDeploymentConfig {
  assetId: string;
  versionId: string;
  userId: string;
  organizationId: string;

  // Resource Requirements
  memory: number; // MB
  cpu: number; // CPU units (1000 = 1 vCPU)
  storage: number; // GB

  // Container Configuration
  image?: string;
  environment?: Record<string, string>;
  ports?: number[];

  // Billing Configuration
  estimatedUsageHours?: number;
}

export interface ContainerInstance {
  id: string;
  assetId: string;
  userId: string;

  // Container Info
  containerName: string;
  e2bDeploymentId: string;
  endpoint?: string;
  internalEndpoint?: string;

  // Status
  status:
    | 'pending'
    | 'starting'
    | 'running'
    | 'stopping'
    | 'stopped'
    | 'failed';
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';

  // Resource Usage
  memory: number;
  cpu: number;
  storage: number;

  // Billing Info
  baseCostPerHour: number;
  markupPercentage: number;
  billedCostPerHour: number;

  // Timestamps
  startedAt?: Date;
  stoppedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageMetrics {
  totalHours: number;
  totalCost: number;
  creatorRevenue: number;
  platformRevenue: number;
  averageCpuUsage: number;
  averageMemoryUsage: number;
}

export class ContainerHostingService {
  private e2bClient: E2BClient;
  private readonly MARKUP_PERCENTAGE = 20; // 20% markup on e2b costs
  private readonly CREATOR_SHARE = 0.5; // 50% revenue share to creators

  // Resource limits and defaults
  private readonly MIN_MEMORY = 128; // 128MB minimum
  private readonly MAX_MEMORY = 8192; // 8GB maximum
  private readonly MIN_CPU = 250; // 0.25 vCPU minimum
  private readonly MAX_CPU = 4000; // 4 vCPU maximum
  private readonly MIN_STORAGE = 1; // 1GB minimum
  private readonly MAX_STORAGE = 100; // 100GB maximum

  constructor() {
    this.e2bClient = new E2BClient({
      apiKey: process.env.E2B_API_KEY!,
    });
  }

  /**
   * Deploy a container for an asset
   */
  async deployContainer(
    config: ContainerDeploymentConfig,
  ): Promise<ContainerInstance> {
    try {
      // Validate deployment configuration
      this.validateDeploymentConfig(config);

      // Get asset and version information
      const db = await getDatabase();
      const [asset, version] = await Promise.all([
        db
          .select()
          .from(marketplaceAssets)
          .where(eq(marketplaceAssets.id, config.assetId))
          .limit(1),
        db
          .select()
          .from(assetVersions)
          .where(eq(assetVersions.id, config.versionId))
          .limit(1),
      ]);

      if (!asset[0] || !version[0]) {
        throw new Error('Asset or version not found');
      }

      const assetData = asset[0];
      const versionData = version[0];

      // Apply resource optimization based on asset type
      const optimizedConfig = this.optimizeResourceAllocation(
        config,
        assetData,
      );

      // Calculate e2b resource costs
      const baseCostPerHour = this.calculateBaseCost(
        optimizedConfig.memory,
        optimizedConfig.cpu,
        optimizedConfig.storage,
      );
      const billedCostPerHour =
        baseCostPerHour * (1 + this.MARKUP_PERCENTAGE / 100);

      // Create container configuration for e2b
      const containerConfig = this.buildEnhancedContainerConfig(
        assetData,
        versionData,
        optimizedConfig,
      );

      // Validate container configuration
      this.validateContainerConfig(containerConfig);

      // Deploy to e2b with retry logic
      const deployment = await this.deployWithRetry({
        name: `${assetData.slug}-${config.userId.slice(0, 8)}-${Date.now()}`,
        template: containerConfig.template,
        environment: containerConfig.environment,
        resources: {
          memory: optimizedConfig.memory,
          cpu: optimizedConfig.cpu,
          storage: optimizedConfig.storage,
        },
      });

      // Store container info in database
      const containerData = {
        organizationId: config.organizationId,
        assetId: config.assetId,
        versionId: config.versionId,
        userId: config.userId,
        containerName: deployment.name,
        e2bDeploymentId: deployment.id,
        endpoint: deployment.url,
        internalEndpoint: deployment.internalUrl,
        memory: optimizedConfig.memory,
        cpu: optimizedConfig.cpu,
        storage: optimizedConfig.storage,
        status: 'starting' as const,
        healthStatus: 'unknown' as const,
        baseCostPerHour: baseCostPerHour.toString(),
        markupPercentage: this.MARKUP_PERCENTAGE.toString(),
        billedCostPerHour: billedCostPerHour.toString(),
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db
        .insert(hostedContainers)
        .values(containerData)
        .returning();
      const container = result[0];

      // Start health monitoring
      await this.startHealthMonitoring(container.id);

      // Start usage billing
      await this.startUsageBilling(container.id);

      return this.mapContainerToInstance(container);
    } catch (error) {
      console.error('Failed to deploy container:', error);
      throw new Error(
        `Container deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Stop and remove a container
   */
  async stopContainer(containerId: string, userId: string): Promise<void> {
    try {
      // Get container info
      const db = await getDatabase();
      const containers = await db
        .select()
        .from(hostedContainers)
        .where(
          and(
            eq(hostedContainers.id, containerId),
            eq(hostedContainers.userId, userId),
          ),
        )
        .limit(1);

      if (!containers[0]) {
        throw new Error('Container not found or access denied');
      }

      const container = containers[0];

      // Stop container on e2b
      await this.e2bClient.deleteSandbox(container.e2bDeploymentId);

      // Update container status
      await db
        .update(hostedContainers)
        .set({
          status: 'stopped',
          stoppedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(hostedContainers.id, containerId));

      // Record final usage
      await this.recordUsage(containerId);
    } catch (error) {
      console.error('Failed to stop container:', error);
      throw new Error(`Container shutdown failed: ${error}`);
    }
  }

  /**
   * Get container status and metrics
   */
  async getContainerStatus(
    containerId: string,
    userId: string,
  ): Promise<ContainerInstance> {
    try {
      const db = await getDatabase();
      const containers = await db
        .select()
        .from(hostedContainers)
        .where(
          and(
            eq(hostedContainers.id, containerId),
            eq(hostedContainers.userId, userId),
          ),
        )
        .limit(1);

      if (!containers[0]) {
        throw new Error('Container not found or access denied');
      }

      const container = containers[0];

      // Get current status from e2b
      if (container.status === 'running') {
        try {
          const deployment = await this.e2bClient.getSandbox(
            container.e2bDeploymentId,
          );

          // Update status if changed (deployment may be null in mock mode)
          if (
            deployment &&
            typeof deployment === 'object' &&
            'status' in deployment
          ) {
            const deploymentStatus = (deployment as any).status;
            if (deploymentStatus && deploymentStatus !== container.status) {
              const db = await getDatabase();
              await db
                .update(hostedContainers)
                .set({
                  status: deploymentStatus,
                  updatedAt: new Date(),
                })
                .where(eq(hostedContainers.id, containerId));

              container.status = deploymentStatus;
            }
          }
        } catch (error) {
          console.error('Failed to get e2b status:', error);
        }
      }

      return this.mapContainerToInstance(container);
    } catch (error) {
      console.error('Failed to get container status:', error);
      throw error;
    }
  }

  /**
   * Get usage metrics for a container
   */
  async getContainerUsage(
    containerId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UsageMetrics> {
    try {
      const start =
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate || new Date();

      // Get usage records
      const db = await getDatabase();
      const usage = await db
        .select({
          totalCost: sum(assetUsageRecords.totalCost),
          creatorRevenue: sum(assetUsageRecords.creatorRevenue),
          platformRevenue: sum(assetUsageRecords.platformRevenue),
          totalHours: sum(assetUsageRecords.quantity),
        })
        .from(assetUsageRecords)
        .where(
          and(
            eq(assetUsageRecords.containerId, containerId),
            eq(assetUsageRecords.userId, userId),
            gte(assetUsageRecords.createdAt, start),
            lte(assetUsageRecords.createdAt, end),
            eq(assetUsageRecords.usageType, 'container_hour'),
          ),
        );

      const metrics = usage[0];

      return {
        totalHours: Number(metrics.totalHours || 0),
        totalCost: Number(metrics.totalCost || 0),
        creatorRevenue: Number(metrics.creatorRevenue || 0),
        platformRevenue: Number(metrics.platformRevenue || 0),
        averageCpuUsage: 0, // TODO: Implement CPU metrics from e2b
        averageMemoryUsage: 0, // TODO: Implement memory metrics from e2b
      };
    } catch (error) {
      console.error('Failed to get container usage:', error);
      throw error;
    }
  }

  /**
   * List user's containers
   */
  async listUserContainers(
    userId: string,
    organizationId: string,
  ): Promise<ContainerInstance[]> {
    try {
      const db = await getDatabase();
      const containers = await db
        .select()
        .from(hostedContainers)
        .where(
          and(
            eq(hostedContainers.userId, userId),
            eq(hostedContainers.organizationId, organizationId),
          ),
        )
        .orderBy(hostedContainers.createdAt);

      return containers.map((container: any) =>
        this.mapContainerToInstance(container),
      );
    } catch (error) {
      console.error('Failed to list containers:', error);
      throw error;
    }
  }

  /**
   * Calculate base cost per hour for given resources
   */
  private calculateBaseCost(
    memory: number,
    cpu: number,
    storage: number,
  ): number {
    // e2b pricing (approximate)
    const memoryCostPerMBHour = 0.000001; // $0.001 per GB-hour
    const cpuCostPerUnitHour = 0.00001; // $0.01 per vCPU-hour
    const storageCostPerGBHour = 0.0000001; // $0.0001 per GB-hour

    return (
      memory * memoryCostPerMBHour +
      cpu * cpuCostPerUnitHour +
      storage * storageCostPerGBHour
    );
  }

  /**
   * Build container configuration for e2b deployment
   */
  private buildContainerConfig(
    asset: any,
    version: any,
    config: ContainerDeploymentConfig,
  ) {
    const containerConfig =
      version.configuration?.containerConfig ||
      asset.configuration?.containerConfig;

    if (!containerConfig) {
      throw new Error('No container configuration found for asset');
    }

    return {
      template: containerConfig.image || 'node:18-alpine',
      environment: {
        ...containerConfig.environment,
        ...config.environment,
        ASSET_ID: config.assetId,
        VERSION_ID: config.versionId,
        USER_ID: config.userId,
      },
      ports: containerConfig.ports || [3000],
      resources: {
        memory: config.memory,
        cpu: config.cpu,
        storage: config.storage,
      },
    };
  }

  /**
   * Start health monitoring for a container
   */
  private async startHealthMonitoring(containerId: string): Promise<void> {
    // Health monitoring is now handled by the ContainerMonitoringService
    // This method registers the container for monitoring
    console.log(`Container ${containerId} registered for health monitoring`);
  }

  /**
   * Start usage billing for a container
   */
  private async startUsageBilling(containerId: string): Promise<void> {
    // Usage billing is now handled by the ContainerMonitoringService
    // This method registers the container for billing cycles
    console.log(`Container ${containerId} registered for usage billing`);
  }

  /**
   * Record usage for billing
   */
  private async recordUsage(containerId: string): Promise<void> {
    try {
      const db = await getDatabase();
      const containers = await db
        .select()
        .from(hostedContainers)
        .where(eq(hostedContainers.id, containerId))
        .limit(1);

      if (!containers[0]) return;

      const container = containers[0];

      // Calculate usage hours
      const startTime = container.startedAt
        ? new Date(container.startedAt).getTime()
        : Date.now();
      const endTime = container.stoppedAt
        ? new Date(container.stoppedAt).getTime()
        : Date.now();
      const hoursUsed = (endTime - startTime) / (1000 * 60 * 60);

      if (hoursUsed <= 0) return;

      const billedCost = parseFloat(container.billedCostPerHour) * hoursUsed;
      const creatorRevenue = billedCost * this.CREATOR_SHARE;
      const platformRevenue = billedCost * (1 - this.CREATOR_SHARE);

      // Record usage
      await db.insert(assetUsageRecords).values({
        organizationId: container.organizationId,
        assetId: container.assetId,
        userId: container.userId,
        containerId: container.id,
        usageType: 'container_hour',
        quantity: hoursUsed.toString(),
        unit: 'hours',
        unitCost: container.billedCostPerHour,
        totalCost: billedCost.toString(),
        creatorRevenue: creatorRevenue.toString(),
        platformRevenue: platformRevenue.toString(),
        metadata: {
          source: 'container_hosting',
          memory: container.memory,
          cpu: container.cpu,
          storage: container.storage,
        },
      });
    } catch (error) {
      console.error('Failed to record usage:', error);
    }
  }

  /**
   * Validate deployment configuration
   */
  private validateDeploymentConfig(config: ContainerDeploymentConfig): void {
    // Validate memory
    if (config.memory < this.MIN_MEMORY || config.memory > this.MAX_MEMORY) {
      throw new Error(
        `Memory must be between ${this.MIN_MEMORY}MB and ${this.MAX_MEMORY}MB`,
      );
    }

    // Validate CPU
    if (config.cpu < this.MIN_CPU || config.cpu > this.MAX_CPU) {
      throw new Error(
        `CPU must be between ${this.MIN_CPU} and ${this.MAX_CPU} units`,
      );
    }

    // Validate storage
    if (
      config.storage < this.MIN_STORAGE ||
      config.storage > this.MAX_STORAGE
    ) {
      throw new Error(
        `Storage must be between ${this.MIN_STORAGE}GB and ${this.MAX_STORAGE}GB`,
      );
    }

    // Validate required fields
    if (
      !config.assetId ||
      !config.versionId ||
      !config.userId ||
      !config.organizationId
    ) {
      throw new Error('Missing required deployment configuration fields');
    }
  }

  /**
   * Optimize resource allocation based on asset type
   */
  private optimizeResourceAllocation(
    config: ContainerDeploymentConfig,
    asset: any,
  ): ContainerDeploymentConfig {
    const optimized = { ...config };

    // Apply asset-type specific optimizations
    switch (asset.assetType) {
      case 'mcp':
        // MCPs are typically lightweight
        optimized.memory = Math.max(config.memory, 256);
        optimized.cpu = Math.max(config.cpu, 500);
        break;

      case 'agent':
        // Agents might need more memory for model processing
        optimized.memory = Math.max(config.memory, 512);
        optimized.cpu = Math.max(config.cpu, 1000);
        break;

      case 'workflow':
        // Workflows might need variable resources
        optimized.memory = Math.max(config.memory, 384);
        optimized.cpu = Math.max(config.cpu, 750);
        break;

      default:
        // Keep original values for unknown types
        break;
    }

    // Ensure optimized values don't exceed limits
    optimized.memory = Math.min(optimized.memory, this.MAX_MEMORY);
    optimized.cpu = Math.min(optimized.cpu, this.MAX_CPU);
    optimized.storage = Math.min(optimized.storage, this.MAX_STORAGE);

    return optimized;
  }

  /**
   * Validate container configuration before deployment
   */
  private validateContainerConfig(containerConfig: any): void {
    if (!containerConfig.template) {
      throw new Error('Container template is required');
    }

    if (!containerConfig.environment) {
      containerConfig.environment = {};
    }

    // Add required environment variables
    if (!containerConfig.environment.NODE_ENV) {
      containerConfig.environment.NODE_ENV = 'production';
    }

    // Validate ports if specified
    if (containerConfig.ports && Array.isArray(containerConfig.ports)) {
      for (const port of containerConfig.ports) {
        if (typeof port !== 'number' || port < 1 || port > 65535) {
          throw new Error(`Invalid port: ${port}`);
        }
      }
    }
  }

  /**
   * Deploy with retry logic
   */
  private async deployWithRetry(
    deploymentConfig: any,
    maxRetries: number = 3,
  ): Promise<any> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `Deployment attempt ${attempt}/${maxRetries} for ${deploymentConfig.name}`,
        );

        const deployment = await this.e2bClient.createSandbox(deploymentConfig);

        console.log(`Deployment successful: ${deployment.id}`);
        return deployment;
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : new Error('Unknown deployment error');
        console.error(
          `Deployment attempt ${attempt} failed:`,
          lastError.message,
        );

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw new Error(
      `Deployment failed after ${maxRetries} attempts: ${lastError!.message}`,
    );
  }

  /**
   * Get container templates for different asset types
   */
  private getContainerTemplate(assetType: string): string {
    const templates = {
      mcp: 'node:18-alpine',
      agent: 'node:18-slim',
      workflow: 'node:18-alpine',
      plugin: 'node:18-alpine',
    };

    return templates[assetType as keyof typeof templates] || 'node:18-alpine';
  }

  /**
   * Build enhanced container configuration
   */
  private buildEnhancedContainerConfig(
    asset: any,
    version: any,
    config: ContainerDeploymentConfig,
  ) {
    const containerConfig =
      version.configuration?.containerConfig ||
      asset.configuration?.containerConfig;

    if (!containerConfig) {
      // Create default configuration based on asset type
      return {
        template: this.getContainerTemplate(asset.assetType),
        environment: {
          NODE_ENV: 'production',
          ASSET_ID: config.assetId,
          VERSION_ID: config.versionId,
          USER_ID: config.userId,
          ASSET_TYPE: asset.assetType,
          ...config.environment,
        },
        ports: [3000],
        resources: {
          memory: config.memory,
          cpu: config.cpu,
          storage: config.storage,
        },
      };
    }

    return {
      template:
        containerConfig.image || this.getContainerTemplate(asset.assetType),
      environment: {
        NODE_ENV: 'production',
        ...containerConfig.environment,
        ...config.environment,
        ASSET_ID: config.assetId,
        VERSION_ID: config.versionId,
        USER_ID: config.userId,
        ASSET_TYPE: asset.assetType,
      },
      ports: containerConfig.ports || [3000],
      resources: {
        memory: config.memory,
        cpu: config.cpu,
        storage: config.storage,
      },
    };
  }

  /**
   * Map database container to ContainerInstance
   */
  private mapContainerToInstance(container: any): ContainerInstance {
    return {
      id: container.id,
      assetId: container.assetId,
      userId: container.userId,
      containerName: container.containerName,
      e2bDeploymentId: container.e2bDeploymentId,
      endpoint: container.endpoint,
      internalEndpoint: container.internalEndpoint,
      status: container.status,
      healthStatus: container.healthStatus,
      memory: container.memory,
      cpu: container.cpu,
      storage: container.storage,
      baseCostPerHour: parseFloat(container.baseCostPerHour),
      markupPercentage: parseFloat(container.markupPercentage),
      billedCostPerHour: parseFloat(container.billedCostPerHour),
      startedAt: container.startedAt,
      stoppedAt: container.stoppedAt,
      createdAt: container.createdAt,
      updatedAt: container.updatedAt,
    };
  }
}
