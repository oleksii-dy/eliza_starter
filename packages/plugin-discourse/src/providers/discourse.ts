import type {
    IAgentRuntime,
    ICacheManager,
    Memory,
    Provider,
    State,
} from "@elizaos/core";

const discourseProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> => {
        try {
            return "TODO - return formatted summary of posts as initial feature";
        } catch (error) {
            console.error("Error in discourse provider:", error);
            return null;
        }
    },
};

// Module exports
export { discourseProvider };
