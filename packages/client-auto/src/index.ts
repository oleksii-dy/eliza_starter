import { Client, IAgentRuntime, elizaLogger } from "@elizaos/core";
import diamondHandPlugin from "@elizaos/plugin-diamondhands";

export class AutoClient {
    interval: NodeJS.Timeout;
    runtime: IAgentRuntime;

    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;

        // start a loop that runs every x seconds
        this.initializePlugin().then(() => {
            this.interval = setInterval(
                async () => {
                    console.log("running auto client...");
                    await this.executeTradingCycle();
                },
                60 * 60 * 1000
            ); // 1 hour in milliseconds
        });
    }
    
    private async initializePlugin() {
        try {
            const plugin = await diamondHandPlugin(
                (key: string) => this.runtime.getSetting(key),
                this.runtime
            );
            elizaLogger.log("DiamonHand plugin initialized successfully");
        } catch (error) {
            elizaLogger.error("Failed to initialize DiamonHand plugin:", error);
            throw error;
        }
    }

    private async executeTradingCycle() {
        try {
            elizaLogger.log("Running auto client trading cycle...");
            // Trading logic is handled by the plugin itself
        } catch (error) {
            elizaLogger.error("Error in trading cycle:", error);
        }
    }
}

export const AutoClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        const client = new AutoClient(runtime);
        return client;
    },
    stop: async (_runtime: IAgentRuntime) => {
        console.warn("Direct client does not support stopping yet");
    },
};

export default AutoClientInterface;
