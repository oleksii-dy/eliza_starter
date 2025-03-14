import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite, type PGliteOptions } from "@electric-sql/pglite";
import { fuzzystrmatch } from "@electric-sql/pglite/contrib/fuzzystrmatch";
import { vector } from "@electric-sql/pglite/vector";
import { logger } from "@elizaos/core";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { IDatabaseClientManager } from "../types";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

interface DatabaseLock {
	pid: number;
	timestamp: number;
	hostname: string;
	status: 'running' | 'shutdown_started' | 'crashed' | 'cleanly_closed';
	filename: string;
}

/**
 * Class representing a database client manager for PGlite.
 * @implements { IDatabaseClientManager }
 */
export class PGliteClientManager implements IDatabaseClientManager<PGlite> {
	private client: PGlite;
	private shuttingDown = false;
	private readonly shutdownTimeout = 3000; // Increased from 2000ms for more time to clean up
	private lockFilePath: string;
	private dbFilename: string;
	private shutdownHandlersRegistered = false;
	private exitHandlerBound = false;
	private lockCheckInterval: ReturnType<typeof setInterval> | null = null;
	private lockUpdateInterval: ReturnType<typeof setInterval> | null = null;
	private recoveryAttempted = false;
	private manuallyClosing = false;

	/**
	 * Constructor for creating a new instance of PGlite with the provided options.
	 * Initializes the PGlite client with additional extensions.
	 * @param {PGliteOptions} options - The options to configure the PGlite client.
	 */
	constructor(options: PGliteOptions) {
		// Extract and store the database filename for recovery
		this.dbFilename = (options as any).filename || './elizadb';
		
		// Enhanced lock file path with a hash to avoid conflicts
		const dbBasename = this.dbFilename.split('/').pop() || 'elizadb';
		this.lockFilePath = `${os.tmpdir()}/pglite-${dbBasename}.lock`;
		
		// Attempt recovery before initialization if needed
		this.attemptRecovery();
		
		this.client = new PGlite({
			...options,
			extensions: {
				vector,
				fuzzystrmatch,
			},
		});
		
		// Create a lock file with enhanced metadata
		this.createLockFile();
		
		// Set up shutdown handlers with additional safeguards
		this.setupShutdownHandlers();
		
		// Start periodic lock file updates to indicate the process is still alive
		this.startLockFileMonitoring();
	}

	/**
	 * Creates a lock file with enhanced metadata to track database usage
	 */
	private createLockFile() {
		try {
			const lockData: DatabaseLock = {
				pid: process.pid,
				timestamp: Date.now(),
				hostname: os.hostname(),
				status: 'running',
				filename: this.dbFilename
			};
			
			fs.writeFileSync(this.lockFilePath, JSON.stringify(lockData, null, 2));
			// Only log in debug mode
			logger.debug(`Created PGlite lock file at ${this.lockFilePath}`);
		} catch (error) {
			logger.error(`Failed to create PGlite lock file: ${error}`);
		}
	}

	/**
	 * Updates the lock file to reflect current status
	 */
	private updateLockFile(status: DatabaseLock['status']) {
		try {
			if (fs.existsSync(this.lockFilePath)) {
				const lockData = JSON.parse(fs.readFileSync(this.lockFilePath, 'utf8')) as DatabaseLock;
				lockData.timestamp = Date.now();
				lockData.status = status;
				fs.writeFileSync(this.lockFilePath, JSON.stringify(lockData, null, 2));
			}
		} catch (error) {
			logger.error(`Failed to update PGlite lock file: ${error}`);
		}
	}

	/**
	 * Removes the lock file when database is properly closed
	 */
	private removeLockFile() {
		try {
			// Update status before removing
			this.updateLockFile('cleanly_closed');
			
			if (fs.existsSync(this.lockFilePath)) {
				fs.unlinkSync(this.lockFilePath);
				logger.debug(`Removed PGlite lock file at ${this.lockFilePath}`);
			}
		} catch (error) {
			logger.error(`Failed to remove PGlite lock file: ${error}`);
		}
	}

	/**
	 * Start periodic monitoring and updating of the lock file
	 */
	private startLockFileMonitoring() {
		// Update lock file every 5 seconds to show the process is still alive
		this.lockUpdateInterval = setInterval(() => {
			this.updateLockFile(this.shuttingDown ? 'shutdown_started' : 'running');
		}, 5000);
		
		// Monitor the lock file's existence every 1 second
		this.lockCheckInterval = setInterval(() => {
			if (!fs.existsSync(this.lockFilePath) && !this.shuttingDown) {
				logger.warn('PGlite lock file disappeared unexpectedly, recreating');
				this.createLockFile();
			}
		}, 1000);
	}
	
	/**
	 * Stop the lock file monitoring intervals
	 */
	private stopLockFileMonitoring() {
		if (this.lockUpdateInterval) {
			clearInterval(this.lockUpdateInterval);
			this.lockUpdateInterval = null;
		}
		
		if (this.lockCheckInterval) {
			clearInterval(this.lockCheckInterval);
			this.lockCheckInterval = null;
		}
	}

	/**
	 * Retrieves the PostgreSQL lite connection.
	 *
	 * @returns {PGlite} The PostgreSQL lite connection.
	 * @throws {Error} If the client manager is currently shutting down.
	 */
	public getConnection(): PGlite {
		if (this.shuttingDown) {
			throw new Error("Client manager is shutting down");
		}
		return this.client;
	}

	/**
	 * Initiates a graceful shutdown of the PGlite client.
	 * Uses both signal handlers and explicit cleanup.
	 */
	private async gracefulShutdown(source = "unknown") {
		if (this.shuttingDown) {
			logger.debug(`Already shutting down, ignoring duplicate shutdown request from ${source}`);
			return;
		}

		this.shuttingDown = true;
		logger.info(`Shutting down PGlite client (from: ${source})`);
		
		// Mark as shutdown started in lock file
		this.updateLockFile('shutdown_started');
		
		// Stop lock file monitoring
		this.stopLockFileMonitoring();

		const timeout = setTimeout(() => {
			logger.warn(
				"Shutdown timeout reached, forcing database connection closure",
			);
			// Force close and cleanup
			try {
				this.client.close();
			} finally {
				this.removeLockFile();
				logger.debug("Force closed PGlite connection");
			}
		}, this.shutdownTimeout);

		try {
			await this.client.close();
			clearTimeout(timeout);
			this.removeLockFile();
			logger.debug("PGlite client shutdown completed");
		} catch (error) {
			logger.error("Error during graceful shutdown:", error);
			this.removeLockFile();
			clearTimeout(timeout);
		}
	}

	/**
	 * Sets up shutdown handlers with multiple approaches to ensure shutdown occurs.
	 * @private
	 */
	private setupShutdownHandlers() {
		// Only register the handlers once
		if (this.shutdownHandlersRegistered) {
			return;
		}
		
		// Direct signal handling with debug info
		logger.debug(`Setting up shutdown handlers for PGlite. Process ID: ${process.pid}`);
		
		// Use function references to avoid context issues
		const handleSigInt = async () => {
			logger.debug("SIGINT received by PGlite manager");
			await this.gracefulShutdown("SIGINT");
		};
		
		const handleSigTerm = async () => {
			logger.debug("SIGTERM received by PGlite manager");
			await this.gracefulShutdown("SIGTERM");
		};
		
		process.on("SIGINT", handleSigInt);
		process.on("SIGTERM", handleSigTerm);
		process.on("beforeExit", async () => {
			logger.debug("beforeExit event triggered for PGlite");
			await this.gracefulShutdown("beforeExit");
		});
		
		// Also handle unhandled exceptions and rejections
		process.on("uncaughtException", async (error) => {
			logger.error("Uncaught exception in PGlite manager:", error);
			await this.gracefulShutdown("uncaughtException");
		});
		
		process.on("unhandledRejection", async (reason) => {
			logger.error("Unhandled rejection in PGlite manager:", reason);
			await this.gracefulShutdown("unhandledRejection");
		});
		
		// Last resort: Always register an exit handler that will clean up
		// This will always run, even if signal propagation is problematic
		if (!this.exitHandlerBound) {
			// Use sync operations in exit handler as async won't complete
			const exitHandler = () => {
				if (!this.shuttingDown) {
					logger.debug("Process exit detected, performing sync cleanup");
					this.shuttingDown = true;
					try {
						// Synchronously update and then remove lock file
						this.updateLockFile('cleanly_closed');
						if (fs.existsSync(this.lockFilePath)) {
							fs.unlinkSync(this.lockFilePath);
						}
						// Attempt to close client synchronously if possible
						if (this.client) {
							try {
								// PGlite doesn't have a _closeSync method, we can only try
								// to call close and hope it completes before process exit
								this.client.close();
							} catch (e) {
								// Cannot do anything more at this point
							}
						}
					} catch (error) {
						// Cannot log at exit time
					}
				}
			};
			
			// Must use synchronous handler for exit
			process.on('exit', exitHandler);
			this.exitHandlerBound = true;
		}
		
		// Check for existing lock files from crashed instances
		this.checkExistingLock();
		
		this.shutdownHandlersRegistered = true;
	}
	
	/**
	 * Checks for an existing lock file, which may indicate a previous
	 * instance didn't shut down properly
	 */
	private checkExistingLock() {
		try {
			if (fs.existsSync(this.lockFilePath) && !this.recoveryAttempted) {
				try {
					const lockDataStr = fs.readFileSync(this.lockFilePath, 'utf8');
					const lockData = JSON.parse(lockDataStr) as DatabaseLock;
					
					// Check if the process that created the lock is still running
					let processIsRunning = false;
					try {
						// Try to send signal 0 to check if process exists
						processIsRunning = process.kill(lockData.pid, 0);
					} catch (e) {
						// Error means process is not running
						processIsRunning = false;
					}
					
					if (processIsRunning) {
						logger.warn(`Found existing PGlite lock from PID ${lockData.pid} which is still running. Potential concurrent database access.`);
					} else {
						logger.info(`Found existing PGlite lock from PID ${lockData.pid}. Database may not have been properly closed.`);
						
						// Mark as crashed in lock file
						lockData.status = 'crashed';
						fs.writeFileSync(this.lockFilePath, JSON.stringify(lockData, null, 2));
					}
				} catch (e) {
					// If we can't parse the lock file, it might be an old format or corrupted
					logger.debug(`Found existing PGlite lock file that couldn't be parsed: ${e}`);
					// Remove the lock file as it's invalid
					try {
						fs.unlinkSync(this.lockFilePath);
					} catch (unlinkError) {
						logger.error(`Error removing invalid lock file: ${unlinkError}`);
					}
				}
			}
		} catch (error) {
			logger.error(`Error checking PGlite lock file: ${error}`);
		}
	}
	
	/**
	 * Attempts to recover the database if an improper shutdown was detected
	 */
	private attemptRecovery() {
		if (this.recoveryAttempted) return;
		
		try {
			this.recoveryAttempted = true;
			
			if (fs.existsSync(this.lockFilePath)) {
				try {
					const lockDataStr = fs.readFileSync(this.lockFilePath, 'utf8');
					const lockData = JSON.parse(lockDataStr) as DatabaseLock;
					
					// Check how long ago the last update was
					const timeSinceUpdate = Date.now() - lockData.timestamp;
					const oneHourInMs = 60 * 60 * 1000;
					
					logger.debug(`Found existing PGlite lock from PID ${lockData.pid}, status: ${lockData.status}, last updated ${timeSinceUpdate/1000}s ago`);
					
					if (lockData.status !== 'cleanly_closed') {
						// Determine if we need to attempt database repair
						// Either it was explicitly marked as crashed or it's been more than an hour
						if (lockData.status === 'crashed' || timeSinceUpdate > oneHourInMs) {
							logger.info(`Attempting database recovery for ${this.dbFilename}`);
							
							// Check for the -shm and -wal files that might need cleanup
							// Handle both absolute and relative paths
							let dbFullPath = this.dbFilename;
							if (!path.isAbsolute(dbFullPath)) {
								dbFullPath = path.resolve(process.cwd(), dbFullPath);
							}
							const dbDir = path.dirname(dbFullPath);
							const dbBasename = path.basename(dbFullPath);
							
							// Check and attempt to clean up WAL files if they exist
							const walFile = `${dbDir}/${dbBasename}-wal`;
							const shmFile = `${dbDir}/${dbBasename}-shm`;
							
							if (fs.existsSync(walFile)) {
								logger.info(`Found WAL file for unclean shutdown: ${walFile}`);
								// Could implement a WAL file replay here if needed
								// For now, we'll leave the WAL file for the SQLite engine to recover
							}
							
							if (fs.existsSync(shmFile)) {
								logger.debug(`Found SHM file for unclean shutdown: ${shmFile}`);
								// The SHM file is used for shared memory - we'll leave it for the SQLite engine
							}
							
							// Remove the lock file as we've handled recovery
							fs.unlinkSync(this.lockFilePath);
							logger.debug(`Removed stale lock file during recovery`);
						}
					} else {
						// Clean shutdown, just remove the lock file
						fs.unlinkSync(this.lockFilePath);
						logger.debug(`Removed lock file from previous clean shutdown`);
					}
				} catch (parseError) {
					logger.error(`Error parsing lock file during recovery attempt: ${parseError}`);
					// Remove the lock file as it's corrupted
					fs.unlinkSync(this.lockFilePath);
				}
			}
		} catch (error) {
			logger.error(`Error during database recovery attempt: ${error}`);
		}
	}

	/**
	 * Initializes the client for PGlite.
	 *
	 * @returns {Promise<void>} A Promise that resolves when the client is initialized successfully
	 */
	public async initialize(): Promise<void> {
		try {
			await this.client.waitReady;
			logger.info("PGlite client initialized successfully");
		} catch (error) {
			logger.error("Failed to initialize PGlite client:", error);
			throw error;
		}
	}

	/**
	 * Asynchronously closes the resource. If the resource is not already shutting down,
	 * it performs a graceful shutdown before closing.
	 *
	 * @returns A promise that resolves once the resource has been closed.
	 */
	public async close(): Promise<void> {
		this.manuallyClosing = true;
		if (!this.shuttingDown) {
			await this.gracefulShutdown("manual_close");
		}
	}

	/**
	 * Check if the system is currently shutting down.
	 *
	 * @returns {boolean} True if the system is shutting down, false otherwise.
	 */
	public isShuttingDown(): boolean {
		return this.shuttingDown;
	}

	/**
	 * Asynchronously runs database migrations using Drizzle.
	 * 
	 * Drizzle will first check if the migrations are already applied.
	 * If there is a diff between database schema and migrations, it will apply the migrations.
	 * If they are already applied, it will skip them.
	 *
	 * @returns {Promise<void>} A Promise that resolves once the migrations are completed successfully.
	 */
	async runMigrations(): Promise<void> {
		try {
			const db = drizzle(this.client);

			const __filename = fileURLToPath(import.meta.url);
			const __dirname = dirname(__filename);

			await migrate(db, {
				migrationsFolder: resolve(__dirname, "../drizzle/migrations"),
			});
		} catch (error) {
			logger.error("Failed to run database migrations (pglite):", error);
			// throw error;
			console.trace(error);
		}
	}
	
	/**
	 * Force cleanup from an external source.
	 * This can be called by parent modules when they detect signals
	 * to ensure cleanup happens even if signal propagation fails.
	 */
	public async forceCleanup(): Promise<void> {
		if (!this.shuttingDown) {
			await this.gracefulShutdown("external_force_cleanup");
		}
	}
}
