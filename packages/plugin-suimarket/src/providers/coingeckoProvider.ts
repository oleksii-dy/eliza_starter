import {
    IAgentRuntime,
    Memory,
    State,
    Provider,
    elizaLogger,
} from "@elizaos/core"


const coingeckoProvider: Provider = {
    get: async function (runtime: IAgentRuntime, message: Memory, state?: State): Promise<string | null> {
        elizaLogger.log("[coingeckoProvider] loading ...");
        return "<coingeckoProvider>";
    }
}

export {coingeckoProvider}