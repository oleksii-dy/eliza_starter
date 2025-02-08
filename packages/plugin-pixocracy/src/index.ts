import { Client, IAgentRuntime, Plugin } from "@elizaos/core";
import { PixocracyClient } from "./client.ts";
export * from "./api.ts";

export async function sleep(ms: number = 3000) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}


export const PixocracyClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        const client = new PixocracyClient(runtime);
        await client.start();
        return client;
    },
    stop: async (_runtime: IAgentRuntime, client?: Client) => {
        if (client instanceof PixocracyClient) {
            client.stop();
        }
    },
};

export const pixocracyPlugin: Plugin = {
    name: "pixocracy",
    description: "Pixocracy plugin",
    clients: [PixocracyClientInterface],
    evaluators: [],
    providers: [],
};

export default pixocracyPlugin;
