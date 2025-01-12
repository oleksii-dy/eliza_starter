import {
    IAgentRuntime,
    Memory,
    State,
    Provider,
    elizaLogger,
} from "@elizaos/core"

//@todo implement news provider
const newsProvider: Provider = {
    get: async function (runtime: IAgentRuntime, message: Memory, state?: State): Promise<string | null> {
        elizaLogger.log("[newsProvider] loading ...");
        return "<newsProvider>";
    }
}

export {newsProvider}