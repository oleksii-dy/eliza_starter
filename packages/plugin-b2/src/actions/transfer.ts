import { Action , type IAgentRuntime, type Memory, type State, type HandlerCallback } from "@elizaos/core";

export const transferAction: Action = {
    name: "B2_TRANSFER",
    description: "Transfer B2 gas token between addresses on the B2 network",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        option?: any,
        callback?: HandlerCallback
    ) => {
        return true;
    },
    validate: async (runtime: IAgentRuntime) => {
        return true;
    },
    examples: [],
    similes: ["SEND_B2_TOKEN", "TRANSFER_B2_TOKEN", "MOVE_B2_TOKEN"],
};