import {
    ActionExample,
    Content,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@elizaos/core";


export const EchoAction: Action = {
    name: "ECHO",
    similes: ["ECHO", "REPEAT"],
    description: "Echo the user's message back to them.",
    handler: async (runtime: IAgentRuntime, message: Memory) => {
        return message.content;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Echo: Hello" },
            },
            {
                user: "{{user2}}",
                content: { text: "Echo: Hello" },
            },
        ],
    ],
    validate: function (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
        return Promise.resolve(true);
    }
};
