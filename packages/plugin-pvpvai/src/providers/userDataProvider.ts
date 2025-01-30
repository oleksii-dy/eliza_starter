import { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";

const userDataProvider: Provider = {
    get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State) => {
        return "Hi i am dog";
    },
};

export { userDataProvider };
