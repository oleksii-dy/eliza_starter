/**
 * Background Jobs Service
 *
 * Manages long-running background tasks for the platform:
 * - Container monitoring and health checks
 * - Billing cycle processing
 * - Cleanup tasks
 * - Notification services
 */

import ContainerMonitoringService from './container-monitoring';

export class BackgroundJobsService {
  private static instance: BackgroundJobsService;
  private containerMonitoring: ContainerMonitoringService;
  private isRunning: boolean = false;

  private constructor() {
    this.containerMonitoring = new ContainerMonitoringService();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BackgroundJobsService {
    if (!BackgroundJobsService.instance) {
      BackgroundJobsService.instance = new BackgroundJobsService();
    }
    return BackgroundJobsService.instance;
  }

  /**
   * Start all background services
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Background jobs already running');
      return;
    }

    console.log('Starting background jobs service...');

    try {
      // Start container monitoring
      await this.containerMonitoring.startMonitoring();

      this.isRunning = true;
      console.log('Background jobs service started successfully');

      // Handle graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      console.error('Failed to start background jobs service:', error);
      throw error;
    }
  }

  /**
   * Stop all background services
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Background jobs not running');
      return;
    }

    console.log('Stopping background jobs service...');

    try {
      // Stop container monitoring
      await this.containerMonitoring.stopMonitoring();

      this.isRunning = false;
      console.log('Background jobs service stopped successfully');
    } catch (error) {
      console.error('Failed to stop background jobs service:', error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean;
    services: {
      containerMonitoring: boolean;
    };
  } {
    return {
      isRunning: this.isRunning,
      services: {
        containerMonitoring: this.isRunning, // We could track individual service status
      },
    };
  }

  /**
   * Restart all services
   */
  async restart(): Promise<void> {
    console.log('Restarting background jobs service...');
    await this.stop();
    await this.start();
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, starting graceful shutdown...`);
      await this.stop();
      process.exit(0);
    };

    // Handle various termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // Nodemon restart

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await this.stop();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      await this.stop();
      process.exit(1);
    });
  }

  /**
   * Health check for the background jobs service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: {
      containerMonitoring: 'healthy' | 'unhealthy';
    };
    lastCheck: Date;
  }> {
    const now = new Date();

    try {
      // Check if services are running
      const containerMonitoringHealthy = this.isRunning;

      const overallStatus = containerMonitoringHealthy
        ? 'healthy'
        : 'unhealthy';

      return {
        status: overallStatus,
        services: {
          containerMonitoring: containerMonitoringHealthy
            ? 'healthy'
            : 'unhealthy',
        },
        lastCheck: now,
      };
    } catch (error) {
      console.error('Background jobs health check failed:', error);
      return {
        status: 'unhealthy',
        services: {
          containerMonitoring: 'unhealthy',
        },
        lastCheck: now,
      };
    }
  }

  /**
   * Get container monitoring service instance
   */
  getContainerMonitoring(): ContainerMonitoringService {
    return this.containerMonitoring;
  }
}

// Export singleton instance
export const backgroundJobs = BackgroundJobsService.getInstance();
export default backgroundJobs;
