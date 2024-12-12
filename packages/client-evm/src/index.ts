import { IAgentRuntime, elizaLogger } from "@ai16z/eliza";
import { MessageManager } from './messages';
import { EVMClient } from './evm-listener';
import { EVMClientConfig } from './types';
import config from '../config.json';

/**
 * Main wrapper class that integrates the EVM client with the Eliza framework.
 * Handles initialization, startup, and shutdown of the blockchain event listener.
 */
export class EVMClientWrapper {
    private messageManager: MessageManager;
    private evmClient: EVMClient;
    private runtime: IAgentRuntime;
    private isRunning: boolean = false;

    /**
     * Initializes the EVM client wrapper with the agent runtime.
     * @param runtime - The Eliza agent runtime instance
     */
    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;
        this.messageManager = new MessageManager(runtime);
        this.evmClient = new EVMClient(config as EVMClientConfig, this.messageManager);
    }

    /**
     * Starts the blockchain event listener and connects it to the agent runtime.
     */
    async start(): Promise<void> {
        try {
            if (this.isRunning) {
                throw new Error("EVM client is already running");
            }

            await this.evmClient.start();
            this.isRunning = true;
            elizaLogger.success("EVM client started and connected to agent runtime");

        } catch (error) {
            elizaLogger.error("Failed to start EVM client:", error);
            throw error;
        }
    }

    /**
     * Stops the blockchain event listener and cleans up resources.
     */
    async stop(): Promise<void> {
        try {
            if (!this.isRunning) {
                throw new Error("EVM client is not running");
            }

            await this.evmClient.stop();
            this.isRunning = false;
            elizaLogger.success("EVM client stopped successfully");

        } catch (error) {
            elizaLogger.error("Failed to stop EVM client:", error);
            throw error;
        }
    }
}

/**
 * Standard interface for Eliza framework integration.
 * Provides start/stop functionality for the EVM client.
 */
export const EVMClientInterface = {
    start: async (runtime: IAgentRuntime) => {
        elizaLogger.info("Initializing EVM client...");
        const client = new EVMClientWrapper(runtime);
        await client.start();
        return client;
    },

    stop: async (_runtime: IAgentRuntime, client?: EVMClientWrapper) => {
        if (client && client instanceof EVMClientWrapper) {
            await client.stop();
        }
    },
};

export default EVMClientInterface;