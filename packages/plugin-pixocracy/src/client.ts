import express from "express";
import { AgentRuntime, Client, elizaLogger } from "@elizaos/core";
import { createPixocracyApiRouter } from "./api";
import { IAgentRuntime } from "@elizaos/core";

export class PixocracyClient {
    private app: express.Application;
    private port: number;
    private runtime: IAgentRuntime;

    constructor(runtime: IAgentRuntime, port: number = 3001) {
        this.app = express();
        this.runtime = runtime;
        this.port = port;
    }

    public async start(): Promise<void> {
        // Register routes
        elizaLogger.log("Starting Pixocracy API...");
        const apiRouter = createPixocracyApiRouter(this.runtime);
        this.app.use(apiRouter);

        // Start server
        this.app.listen(this.port, () => {
            elizaLogger.log(`Pixocracy API listening on port ${this.port}`);
        });
    }

    async stop() {
        return true;
    }
}