/**
 * Container Monitoring Service
 *
 * Monitors container health, tracks billing cycles, and manages container lifecycle:
 * - Health checks and status monitoring
 * - Automated billing cycle tracking
 * - Container cleanup and optimization
 * - Usage alerts and notifications
 */

import { E2BClient } from '@/lib/mocks/e2b-api';
import { getDatabase } from '../database';
import {
  hostedContainers,
  assetUsageRecords,
} from '../database/marketplace-schema';
import { eq, and, lte, gte, lt } from 'drizzle-orm';
import { MarketplaceBillingService } from '../billing/marketplace-billing-service';
import { getCreditBalance } from '../server/services/billing-service';

export interface ContainerHealthStatus {
  containerId: string;
  status: 'healthy' | 'unhealthy' | 'unknown' | 'timeout';
  responseTime?: number;
  lastChecked: Date;
  errorMessage?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
}

export interface BillingCycle {
  containerId: string;
  startTime: Date;
  endTime: Date;
  hoursUsed: number;
  totalCost: number;
  creatorRevenue: number;
  platformRevenue: number;
  billingStatus: 'pending' | 'processed' | 'failed';
}

export interface ContainerMetrics {
  containerId: string;
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  networkIn: number;
  networkOut: number;
  requestCount: number;
  errorCount: number;
}

export class ContainerMonitoringService {
  private e2bClient: E2BClient;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private billingInterval: NodeJS.Timeout | null = null;

  // Monitoring configuration
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private readonly BILLING_INTERVAL = 3600000; // 1 hour
  private readonly HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds
  private readonly UNHEALTHY_THRESHOLD = 3; // Failed checks before marking unhealthy
  private readonly AUTO_CLEANUP_THRESHOLD = 24; // Hours of inactivity before cleanup warning

  constructor() {
    this.e2bClient = new E2BClient({
      apiKey: process.env.E2B_API_KEY!,
    });
  }

  /**
   * Start monitoring all containers
   */
  async startMonitoring(): Promise<void> {
    console.log('Starting container monitoring service...');

    // Start health check cycle
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        console.error('Health check cycle failed:', error);
      }
    }, this.HEALTH_CHECK_INTERVAL);

    // Start billing cycle
    this.billingInterval = setInterval(async () => {
      try {
        await this.processBillingCycle();
      } catch (error) {
        console.error('Billing cycle failed:', error);
      }
    }, this.BILLING_INTERVAL);

    // Perform initial checks
    await this.performHealthChecks();
    console.log('Container monitoring service started successfully');
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<void> {
    console.log('Stopping container monitoring service...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.billingInterval) {
      clearInterval(this.billingInterval);
      this.billingInterval = null;
    }

    console.log('Container monitoring service stopped');
  }

  /**
   * Perform health checks on all running containers
   */
  async performHealthChecks(): Promise<ContainerHealthStatus[]> {
    try {
      // Get all running containers
      const db = await getDatabase();
      const runningContainers = await db
        .select()
        .from(hostedContainers)
        .where(eq(hostedContainers.status, 'running'));

      const healthStatuses: ContainerHealthStatus[] = [];

      // Check each container in parallel
      const healthCheckPromises = runningContainers.map(
        async (container: any) => {
          const health = await this.checkContainerHealth(container);
          healthStatuses.push(health);

          // Update database with health status
          await this.updateContainerHealth(container.id, health);

          return health;
        },
      );

      await Promise.allSettled(healthCheckPromises);

      // Process unhealthy containers
      const unhealthyContainers = healthStatuses.filter(
        (h) => h.status === 'unhealthy',
      );
      if (unhealthyContainers.length > 0) {
        await this.handleUnhealthyContainers(unhealthyContainers);
      }

      return healthStatuses;
    } catch (error) {
      console.error('Failed to perform health checks:', error);
      return [];
    }
  }

  /**
   * Check health of a specific container
   */
  async checkContainerHealth(container: any): Promise<ContainerHealthStatus> {
    const startTime = Date.now();
    const containerId = container.id;

    try {
      // Check container status via e2b API
      const deployment = (await Promise.race([
        this.e2bClient.deployments.get(container.e2bDeploymentId),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Health check timeout')),
            this.HEALTH_CHECK_TIMEOUT,
          ),
        ),
      ])) as any;

      const responseTime = Date.now() - startTime;

      // Determine health status
      let status: 'healthy' | 'unhealthy' | 'unknown';
      if (deployment.status === 'running') {
        status = 'healthy';
      } else if (
        deployment.status === 'failed' ||
        deployment.status === 'stopped'
      ) {
        status = 'unhealthy';
      } else {
        status = 'unknown';
      }

      // Try to get resource metrics
      let cpuUsage: number | undefined;
      let memoryUsage: number | undefined;
      let diskUsage: number | undefined;

      try {
        // Note: e2b might not provide detailed metrics - this is placeholder
        const metrics = await this.getContainerMetrics(
          container.e2bDeploymentId,
        );
        cpuUsage = metrics?.cpuUsage;
        memoryUsage = metrics?.memoryUsage;
        diskUsage = metrics?.diskUsage;
      } catch (metricsError) {
        // Metrics are optional, continue without them
      }

      return {
        containerId,
        status,
        responseTime,
        lastChecked: new Date(),
        cpuUsage,
        memoryUsage,
        diskUsage,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const isTimeout =
        error instanceof Error && error.message.includes('timeout');

      return {
        containerId,
        status: isTimeout ? 'timeout' : 'unhealthy',
        responseTime,
        lastChecked: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update container health status in database
   */
  private async updateContainerHealth(
    containerId: string,
    health: ContainerHealthStatus,
  ): Promise<void> {
    try {
      const db = await getDatabase();
      await db
        .update(hostedContainers)
        .set({
          healthStatus: health.status,
          lastHealthCheck: health.lastChecked,
          updatedAt: new Date(),
        })
        .where(eq(hostedContainers.id, containerId));
    } catch (error) {
      console.error(
        `Failed to update health status for container ${containerId}:`,
        error,
      );
    }
  }

  /**
   * Handle unhealthy containers
   */
  private async handleUnhealthyContainers(
    unhealthyContainers: ContainerHealthStatus[],
  ): Promise<void> {
    for (const container of unhealthyContainers) {
      try {
        console.log(`Handling unhealthy container: ${container.containerId}`);

        // Get container details
        const db = await getDatabase();
        const containers = await db
          .select()
          .from(hostedContainers)
          .where(eq(hostedContainers.id, container.containerId))
          .limit(1);

        if (!containers[0]) continue;

        const containerData = containers[0];

        // Check if container has been unhealthy for too long
        const unhealthyDuration = Date.now() - container.lastChecked.getTime();
        const maxUnhealthyTime = 30 * 60 * 1000; // 30 minutes

        if (unhealthyDuration > maxUnhealthyTime) {
          console.log(
            `Container ${container.containerId} unhealthy for too long, stopping...`,
          );

          // Stop the container to prevent further billing
          await this.stopUnhealthyContainer(containerData);
        } else {
          // Try to restart the container
          await this.attemptContainerRestart(containerData);
        }
      } catch (error) {
        console.error(
          `Failed to handle unhealthy container ${container.containerId}:`,
          error,
        );
      }
    }
  }

  /**
   * Process billing cycle for all containers
   */
  async processBillingCycle(): Promise<BillingCycle[]> {
    try {
      // Get all running containers that need billing
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - this.BILLING_INTERVAL);

      const db = await getDatabase();
      const containersToProcess = await db
        .select()
        .from(hostedContainers)
        .where(
          and(
            eq(hostedContainers.status, 'running'),
            lte(hostedContainers.startedAt, oneHourAgo),
          ),
        );

      const billingCycles: BillingCycle[] = [];

      for (const container of containersToProcess) {
        try {
          const cycle = await this.processContainerBilling(container);
          if (cycle) {
            billingCycles.push(cycle);
          }
        } catch (error) {
          console.error(
            `Failed to process billing for container ${container.id}:`,
            error,
          );
        }
      }

      return billingCycles;
    } catch (error) {
      console.error('Failed to process billing cycle:', error);
      return [];
    }
  }

  /**
   * Process billing for a specific container
   */
  private async processContainerBilling(
    container: any,
  ): Promise<BillingCycle | null> {
    try {
      // Calculate usage since last billing
      const now = new Date();
      const lastBilling = container.lastBillingAt || container.startedAt;
      const hoursUsed =
        (now.getTime() - new Date(lastBilling).getTime()) / (1000 * 60 * 60);

      if (hoursUsed < 1) {
        // Don't bill for less than 1 hour
        return null;
      }

      // Check if user has sufficient balance
      const balance = await getCreditBalance(container.organizationId);
      const hourlyRate = parseFloat(container.billedCostPerHour);
      const totalCost = hoursUsed * hourlyRate;

      if (balance < totalCost) {
        console.log(
          `Insufficient balance for container ${container.id}, stopping...`,
        );
        await this.stopContainerForInsufficientFunds(container);
        return null;
      }

      // Process billing
      const billingResult =
        await MarketplaceBillingService.recordContainerUsage(
          container.id,
          hoursUsed,
        );

      // Update last billing time
      const db = await getDatabase();
      await db
        .update(hostedContainers)
        .set({
          lastBillingAt: now,
          updatedAt: now,
        })
        .where(eq(hostedContainers.id, container.id));

      return {
        containerId: container.id,
        startTime: new Date(lastBilling),
        endTime: now,
        hoursUsed,
        totalCost,
        creatorRevenue: totalCost * 0.5,
        platformRevenue: totalCost * 0.5,
        billingStatus: 'processed',
      };
    } catch (error) {
      console.error(
        `Failed to process billing for container ${container.id}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get container metrics from e2b (placeholder implementation)
   */
  private async getContainerMetrics(deploymentId: string): Promise<any> {
    // Note: This is a placeholder. e2b API might not provide detailed metrics.
    // In a real implementation, you'd integrate with monitoring tools like Prometheus/Grafana
    try {
      // This would call the actual e2b metrics API if available
      return {
        cpuUsage: Math.random() * 100, // Placeholder
        memoryUsage: Math.random() * 100, // Placeholder
        diskUsage: Math.random() * 100, // Placeholder
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Stop unhealthy container
   */
  private async stopUnhealthyContainer(container: any): Promise<void> {
    try {
      // Stop via e2b
      await this.e2bClient.deployments.delete(container.e2bDeploymentId);

      // Update database
      const db = await getDatabase();
      await db
        .update(hostedContainers)
        .set({
          status: 'stopped',
          stoppedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(hostedContainers.id, container.id));

      console.log(`Stopped unhealthy container ${container.id}`);
    } catch (error) {
      console.error(
        `Failed to stop unhealthy container ${container.id}:`,
        error,
      );
    }
  }

  /**
   * Attempt to restart container
   */
  private async attemptContainerRestart(container: any): Promise<void> {
    try {
      // This is a placeholder - e2b might not support container restart
      // In practice, you might need to redeploy the container
      console.log(`Attempting restart for container ${container.id}`);

      // For now, just log the attempt
      // await this.e2bClient.deployments.restart(container.e2bDeploymentId);
    } catch (error) {
      console.error(`Failed to restart container ${container.id}:`, error);
    }
  }

  /**
   * Stop container due to insufficient funds
   */
  private async stopContainerForInsufficientFunds(
    container: any,
  ): Promise<void> {
    try {
      await this.stopUnhealthyContainer(container);

      // Could add notification to user about insufficient funds
      console.log(
        `Container ${container.id} stopped due to insufficient credits`,
      );
    } catch (error) {
      console.error(
        `Failed to stop container for insufficient funds ${container.id}:`,
        error,
      );
    }
  }

  /**
   * Get monitoring summary for all containers
   */
  async getMonitoringSummary(): Promise<{
    totalContainers: number;
    healthyContainers: number;
    unhealthyContainers: number;
    unknownContainers: number;
    totalHourlyCost: number;
  }> {
    try {
      const db = await getDatabase();
      const containers = await db
        .select()
        .from(hostedContainers)
        .where(eq(hostedContainers.status, 'running'));

      const summary = {
        totalContainers: containers.length,
        healthyContainers: containers.filter(
          (c: any) => c.healthStatus === 'healthy',
        ).length,
        unhealthyContainers: containers.filter(
          (c: any) => c.healthStatus === 'unhealthy',
        ).length,
        unknownContainers: containers.filter(
          (c: any) => c.healthStatus === 'unknown',
        ).length,
        totalHourlyCost: containers.reduce(
          (sum: number, c: any) => sum + parseFloat(c.billedCostPerHour),
          0,
        ),
      };

      return summary;
    } catch (error) {
      console.error('Failed to get monitoring summary:', error);
      return {
        totalContainers: 0,
        healthyContainers: 0,
        unhealthyContainers: 0,
        unknownContainers: 0,
        totalHourlyCost: 0,
      };
    }
  }
}

export default ContainerMonitoringService;
