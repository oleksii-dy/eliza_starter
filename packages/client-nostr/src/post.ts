import { IAgentRuntime, elizaLogger } from "@ai16z/eliza";
import { NostrClient } from "./client";

export class NostrPostManager {
    private timeout: NodeJS.Timeout | undefined;

    constructor(
        public client: NostrClient,
        public runtime: IAgentRuntime,
        public cache: Map<string, any>
    ) {}

    public async start() {
        const generateNewNostrEventLoop = async () => {
            try {
                await this.generateNewNostrEvent();
            } catch (error) {
                elizaLogger.error(error);
                return;
            }

            this.timeout = setTimeout(
                generateNewNostrEventLoop,
                (Math.floor(Math.random() * (4 - 1 + 1)) + 1) * 60 * 60 * 1000
            ); // Random interval between 1 and 4 hours
        };

        generateNewNostrEventLoop();
    }

    public async stop() {
        if (this.timeout) clearTimeout(this.timeout);
    }

    private async generateNewNostrEvent() {
        elizaLogger.info("Generating new Nostr event");
    }
}
