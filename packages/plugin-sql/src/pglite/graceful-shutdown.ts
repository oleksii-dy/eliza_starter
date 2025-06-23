import { logger } from '@elizaos/core';
import { PGliteClientManager } from './manager';
import { connectionRegistry } from '../connection-registry';

/**
 * Ensures graceful shutdown of PGLite instances to prevent WebAssembly conflicts
 * This utility helps manage the lifecycle of PGLite databases during application
 * restarts, especially in development environments.
 */
export class PGliteGracefulShutdown {
  private static shutdownHandlersRegistered = false;
  private static isShuttingDown = false;
  private static shutdownPromise: Promise<void> | null = null;

  /**
   * Register shutdown handlers for graceful cleanup
   */
  public static registerShutdownHandlers(): void {
    if (this.shutdownHandlersRegistered) {
      return;
    }

    const shutdownHandler = async (signal: string) => {
      if (this.isShuttingDown) {
        logger.debug(`PGLite: Already shutting down, ignoring ${signal}`);
        return;
      }

      this.isShuttingDown = true;
      logger.info(`PGLite: Graceful shutdown initiated by ${signal}`);

      // Store the shutdown promise to prevent concurrent shutdowns
      this.shutdownPromise = this.performShutdown();
      await this.shutdownPromise;
    };

    // Register handlers for various shutdown signals
    process.once('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.once('SIGINT', () => shutdownHandler('SIGINT'));
    process.once('SIGUSR2', () => shutdownHandler('SIGUSR2')); // nodemon restart
    process.once('beforeExit', () => shutdownHandler('beforeExit'));

    // Handle uncaught exceptions
    process.once('uncaughtException', async (error) => {
      logger.error('PGLite: Uncaught exception, performing emergency shutdown', error);
      await shutdownHandler('uncaughtException');
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.once('unhandledRejection', async (reason) => {
      logger.error('PGLite: Unhandled rejection, performing emergency shutdown', reason);
      await shutdownHandler('unhandledRejection');
      process.exit(1);
    });

    this.shutdownHandlersRegistered = true;
    logger.debug('PGLite: Shutdown handlers registered');
  }

  /**
   * Perform the actual shutdown sequence
   */
  private static async performShutdown(): Promise<void> {
    try {
      // Get all adapters from the registry
      const adapters = connectionRegistry.getAllAdapters();

      logger.info(`PGLite: Closing ${adapters.length} database adapters...`);

      // Close all adapters first
      const adapterClosePromises = adapters.map(async (adapter) => {
        try {
          await adapter.close();
        } catch (error) {
          logger.debug('PGLite: Error closing adapter (may be already closed):', error);
        }
      });

      await Promise.allSettled(adapterClosePromises);

      // Clear the connection registry
      connectionRegistry.clearAll();

      // Force cleanup all PGLite instances
      logger.info('PGLite: Forcing cleanup of all instances...');
      await PGliteClientManager.forceCleanupGlobal();

      // Additional delay to ensure WebAssembly cleanup
      logger.info('PGLite: Waiting for WebAssembly resource cleanup...');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      logger.info('PGLite: Graceful shutdown completed');
    } catch (error) {
      logger.error('PGLite: Error during graceful shutdown:', error);
    }
  }

  /**
   * Wait for any ongoing shutdown to complete
   */
  public static async waitForShutdown(): Promise<void> {
    if (this.shutdownPromise) {
      await this.shutdownPromise;
    }
  }

  /**
   * Check if shutdown is in progress
   */
  public static getIsShuttingDown(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Reset shutdown state (mainly for testing)
   */
  public static reset(): void {
    this.isShuttingDown = false;
    this.shutdownPromise = null;
  }
}

// Auto-register handlers when module is imported
PGliteGracefulShutdown.registerShutdownHandlers();
