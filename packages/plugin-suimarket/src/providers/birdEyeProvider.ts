import {
    IAgentRuntime,
    Memory,
    State,
    Provider,
    elizaLogger,
} from "@elizaos/core"


const birdEyeProvider: Provider = {
    get: async function (runtime: IAgentRuntime, message: Memory, state?: State): Promise<string | null> {
        elizaLogger.log("loaded birdEye provider...");
        return "<birdeye info>";
    }
}

export {birdEyeProvider}