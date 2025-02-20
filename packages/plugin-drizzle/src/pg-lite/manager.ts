import { PGlite, type PGliteOptions } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { fuzzystrmatch } from "@electric-sql/pglite/contrib/fuzzystrmatch";
import { logger } from "@elizaos/core";
import { IDatabaseClientManager } from "../types";

export class PGliteClientManager implements IDatabaseClientManager<PGlite> {
    private client: PGlite;
    private shuttingDown = false;
    private readonly shutdownTimeout = 1000;

    constructor(options: PGliteOptions) {
        this.client = new PGlite({
            ...options,
            extensions: {
                vector,
                fuzzystrmatch,
            },
        });
        this.setupShutdownHandlers();
    }

    public getConnection(): PGlite {
        if (this.shuttingDown) {
            throw new Error("Client manager is shutting down");
        }
        return this.client;
    }

    private async gracefulShutdown() {
        if (this.shuttingDown) {
            return;
        }

        this.shuttingDown = true;
        logger.info("Starting graceful shutdown of PGlite client...");
    
        const timeout = setTimeout(() => {
            logger.warn("Shutdown timeout reached, forcing database connection closure...");
            this.client.close().finally(() => {
                process.exit(1);
            });
        }, this.shutdownTimeout);

        try {
            await new Promise(resolve => setTimeout(resolve, this.shutdownTimeout));
            await this.client.close();
            clearTimeout(timeout);
            logger.info("PGlite client shutdown completed successfully");
            process.exit(0);
        } catch (error) {
            logger.error("Error during graceful shutdown:", error);
            process.exit(1);
        }
    }

    private setupShutdownHandlers() {
        process.on("SIGINT", async () => {
            await this.gracefulShutdown();
        });

        process.on("SIGTERM", async () => {
            await this.gracefulShutdown();
        });

        process.on("beforeExit", async () => {
            await this.gracefulShutdown();
        });
    }

    public async initialize(): Promise<void> {
        try {
            await this.client.waitReady;
            logger.info("PGlite client initialized successfully");
        } catch (error) {
            logger.error("Failed to initialize PGlite client:", error);
            throw error;
        }
    }

    public async close(): Promise<void> {
        if (!this.shuttingDown) {
            await this.gracefulShutdown();
        }
    }

    public isShuttingDown(): boolean {
        return this.shuttingDown;
    }
}