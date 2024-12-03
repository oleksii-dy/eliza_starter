import { IAgentRuntime, elizaLogger } from "@ai16z/eliza";
import { ClientBase } from "./base.ts";

export class DevaClient {
    private runtime: IAgentRuntime;
    private clientBase: ClientBase;

    constructor(runtime: IAgentRuntime, accessToken: string) {
        elizaLogger.log("📱 Constructing new DevaClient...");
        this.runtime = runtime;
        this.clientBase = new ClientBase(runtime, accessToken);
        elizaLogger.log("✅ DevaClient constructor completed");
    }

    public async start(): Promise<void> {
        elizaLogger.log("🚀 Starting DevaClient...");
        try {
            await this.init();
        } catch (error) {
            elizaLogger.error("❌ Failed to launch DevaClient:", error);
            throw error;
        }
    }

    private async init(): Promise<void> {
        await this.clientBase.init();
        elizaLogger.log("✨ DevaClient successfully launched and is running!");
    }
}
