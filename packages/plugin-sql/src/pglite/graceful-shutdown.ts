/**
 * Graceful shutdown utilities for PGlite
 */

let isShuttingDown = false;
let shutdownPromise: Promise<void> | null = null;

export class PGliteGracefulShutdown {
    private static shutdownCallbacks: (() => Promise<void>)[] = [];

    /**
     * Register a callback to be called during shutdown
     */
    static registerShutdownCallback(callback: () => Promise<void>): void {
        this.shutdownCallbacks.push(callback);
    }

    /**
     * Check if shutdown is in progress
     */
    static getIsShuttingDown(): boolean {
        return isShuttingDown;
    }

    /**
     * Wait for shutdown to complete
     */
    static async waitForShutdown(): Promise<void> {
        if (shutdownPromise) {
            await shutdownPromise;
        }
    }

    /**
     * Initiate graceful shutdown
     */
    static async shutdown(): Promise<void> {
        if (isShuttingDown) {
            return this.waitForShutdown();
        }

        isShuttingDown = true;
        
        shutdownPromise = (async () => {
            // Execute all shutdown callbacks
            for (const callback of this.shutdownCallbacks) {
                try {
                    await callback();
                } catch (error) {
                    console.error('Error during shutdown callback:', error);
                }
            }
            
            // Reset state
            isShuttingDown = false;
            shutdownPromise = null;
            this.shutdownCallbacks = [];
        })();

        return shutdownPromise;
    }

    /**
     * Reset shutdown state (for testing)
     */
    static reset(): void {
        isShuttingDown = false;
        shutdownPromise = null;
        this.shutdownCallbacks = [];
    }
}

// Register process shutdown handlers
if (typeof process !== 'undefined') {
    process.on('SIGINT', () => {
        PGliteGracefulShutdown.shutdown().then(() => {
            process.exit(0);
        });
    });

    process.on('SIGTERM', () => {
        PGliteGracefulShutdown.shutdown().then(() => {
            process.exit(0);
        });
    });
}