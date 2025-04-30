import { Scraper } from "agent-twitter-client";
import { IAgentRuntime, Client, ClientInstance } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";

export class TaylorTwitterClient implements Client {
    name = "taylor-twitter";
    config?: { [key: string]: any };
    private scraper: Scraper;

    constructor() {
        this.scraper = new Scraper();
    }

    async start(runtime: IAgentRuntime): Promise<ClientInstance> {
        try {
            const username = runtime.getSetting("TWITTER_USERNAME");
            const password = runtime.getSetting("TWITTER_PASSWORD");

            if (!username || !password) {
                throw new Error("Twitter credentials not configured");
            }

            await this.scraper.login(username, password);
            elizaLogger.success("✅ Taylor's Twitter client started successfully");

            return {
                stop: async () => {
                    elizaLogger.info("Stopping Taylor's Twitter client");
                    await this.scraper.logout();
                }
            };
        } catch (error) {
            elizaLogger.error("Failed to start Twitter client:", error);
            throw error;
        }
    }

    async postUpdate(content: string) {
        try {
            await this.scraper.sendTweet(content);
        } catch (error) {
            elizaLogger.error("Error posting update:", error);
            throw error;
        }
    }
}
