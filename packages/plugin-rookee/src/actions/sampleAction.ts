import {
    Action,
    IAgentRuntime,
    Memory,
} from "@elizaos/core";
export  const sampleAction: Action = {
    name: "hello",
    similes: ["hello_name", "name_hello"],
    description: "Detailed description of when and how to use this action",
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        console.log("Duc dep  trai");
        return true;
    },
    handler: async (runtime: IAgentRuntime, message: Memory) => {
        console.log("Duc dep trai");
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Trigger message" },
            },
            {
                user: "{{user2}}",
                content: { text: "Response", action: "CUSTOM_ACTION" },
            },
        ],
    ],
};
