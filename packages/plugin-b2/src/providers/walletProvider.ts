import {
    Provider,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
} from "@elizaos/core";

export const walletProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        elizaLogger.log("Retrieving data in walletProvider...");
    },
};
