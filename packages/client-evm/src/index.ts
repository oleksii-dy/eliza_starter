// Import necessary components from Eliza framework and evm related files
import { IAgentRuntime } from "@ai16z/eliza";
import { MessageManager } from './messages';
import { EVMClient } from './evm-listener';
import config from '../config.json';

// Main wrapper that connects EVM client to Eliza framework
export class EVMClientWrapper {
    private messageManager: MessageManager;
    private evmClient: EVMClient;
    private runtime: IAgentRuntime;

    // Initialize with agent runtime
    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;
        this.messageManager = new MessageManager(runtime);
        this.evmClient = new EVMClient(config, this.messageManager);
    }

    // Start blockchain listener
    async start() {
        await this.evmClient.start();
        console.log("EVM client started and connected to agent runtime");
    }
}

// Interface that Eliza expects from all clients
export const EVMClientInterface = {
    start: async (runtime: IAgentRuntime) => {
        const client = new EVMClientWrapper(runtime);
        await client.start();
        return client;
    },
    stop: async (_runtime: IAgentRuntime) => {
        console.warn("EVM client does not support stopping yet");
    },
};