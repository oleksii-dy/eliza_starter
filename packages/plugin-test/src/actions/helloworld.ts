import {
    type Action,
    type ActionExample,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";

export const helloWorldAction: Action = {
    name: "HELLO_WORLD",
    similes: ["HELLO", "HI", "GREETINGS"],
    description: "This action is used to say hello to the user.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },

    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State,
        _options: { [key: string]: unknown },
        _callback: HandlerCallback
    ): Promise<boolean> => {
        const helloWorld = "Hello! World!!!!!";

        _callback({
            text: helloWorld,
        });

        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "please say hello world",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "HELLO_WORLD" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "show me hello world",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "HELLO_WORLD" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "display hello world",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "HELLO_WORLD" },
            },
        ],
    ] as ActionExample[][],
} as Action;
