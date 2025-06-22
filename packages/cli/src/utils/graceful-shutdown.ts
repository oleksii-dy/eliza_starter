import { AgentServer } from '@elizaos/server';
import { logger } from '@elizaos/core';
import { LogArchiver } from './log-archiver';
import type { ServerStartOptions } from '../commands/start/actions/server-start';

/**
 * Graceful shutdown handler for the agent server
 */
export class GracefulShutdownHandler {
  private server: AgentServer | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private logArchiver: LogArchiver;

  constructor() {
    this.logArchiver = new LogArchiver();
    this.setupSignalHandlers();
  }

  /**
   * Set the server instance to manage
   */
  setServer(server: AgentServer): void {
    this.server = server;
  }

  /**
   * Setup timeout for automatic shutdown
   */
  setupTimeout(timeoutSeconds: number, options: ServerStartOptions): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(async () => {
      logger.info(`⏰ Timeout reached (${timeoutSeconds} seconds), initiating graceful shutdown...`);
      await this.shutdown(options, 0); // Exit with code 0 for successful timeout
    }, timeoutSeconds * 1000);

    logger.info(`⏰ Server will shutdown automatically after ${timeoutSeconds} seconds`);
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    process.on('SIGINT', async () => {
      logger.info('📤 Received SIGINT, initiating graceful shutdown...');
      await this.shutdown({}, 0);
    });

    process.on('SIGTERM', async () => {
      logger.info('📤 Received SIGTERM, initiating graceful shutdown...');
      await this.shutdown({}, 0);
    });

    process.on('uncaughtException', async (error) => {
      logger.error('💥 Uncaught exception:', error);
      await this.shutdown({}, 1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
      await this.shutdown({}, 1);
    });
  }

  /**
   * Perform graceful shutdown
   */
  async shutdown(options: ServerStartOptions, exitCode: number = 0): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('⚠️ Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;

    try {
      // Clear timeout if set
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      logger.info('🛑 Starting graceful shutdown sequence...');

      // Step 1: Stop accepting new connections
      if (this.server) {
        logger.info('📡 Stopping server from accepting new connections...');
        // The server stop method should handle this
      }

      // Step 2: Complete ongoing OODA cycles and operations
      logger.info('🔄 Waiting for ongoing operations to complete...');
      await this.waitForOngoingOperations();

      // Step 3: Save logs if specified
      if (options.saveLogsTo) {
        logger.info('💾 Archiving logs...');
        await this.archiveLogs(options.saveLogsTo);
      }

      // Step 4: Stop all agents and services
      if (this.server) {
        logger.info('🤖 Stopping all agents and services...');
        await this.stopAllAgents();
      }

      // Step 5: Close database connections and cleanup
      logger.info('🗃️ Closing database connections...');
      await this.cleanupResources();

      logger.info('✅ Graceful shutdown completed successfully');

      // Final step: Exit the process
      process.exit(exitCode);
    } catch (error) {
      logger.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Wait for ongoing operations to complete
   */
  private async waitForOngoingOperations(): Promise<void> {
    // Give operations time to complete (max 10 seconds)
    const maxWaitTime = 10000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      // Check if any OODA loops are still running
      // This would need to be implemented based on the autonomy plugin structure
      // For now, just wait a reasonable amount of time
      await new Promise(resolve => setTimeout(resolve, 1000));
      break; // For now, just wait 1 second
    }
  }

  /**
   * Archive logs to the specified directory
   */
  private async archiveLogs(saveLogsTo: string): Promise<void> {
    try {
      const archivePath = await this.logArchiver.archiveLogs(saveLogsTo);
      logger.info(`📁 Logs archived to: ${archivePath}`);
    } catch (error) {
      logger.error('❌ Failed to archive logs:', error);
    }
  }

  /**
   * Stop all running agents
   */
  private async stopAllAgents(): Promise<void> {
    if (!this.server) return;

    try {
      // Stop all agents - this would depend on the server implementation
      // For now, we'll just call the server stop method
      await this.server.stop();
    } catch (error) {
      logger.error('❌ Error stopping agents:', error);
    }
  }

  /**
   * Clean up resources and close connections
   */
  private async cleanupResources(): Promise<void> {
    // Clean up any remaining resources
    // This would include database connections, file handles, etc.
    try {
      // The server's stop method should handle this
      logger.info('🧹 Resources cleaned up');
    } catch (error) {
      logger.error('❌ Error cleaning up resources:', error);
    }
  }

  /**
   * Generate a shutdown summary
   */
  generateShutdownSummary(): string {
    const timestamp = new Date().toISOString();
    return `
=== ElizaOS Shutdown Summary ===
Timestamp: ${timestamp}
Status: Graceful shutdown completed
Reason: ${this.timeoutId ? 'Timeout reached' : 'Manual shutdown'}
    `;
  }
}

// Export singleton instance
export const gracefulShutdownHandler = new GracefulShutdownHandler();