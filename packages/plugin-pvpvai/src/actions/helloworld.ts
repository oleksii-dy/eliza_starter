import {
    ActionExample,
    elizaLogger,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
} from "@elizaos/core";

export const helloWorldAction: Action = {
    name: "HELLO_WORLD",
    similes: ["HELLO"],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "Make a cool Hello World ASCII art",
    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State,
        _options: {
            [key: string]: any;
        },
        _callback: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.info("Generating hello world ascii art, state:", _state);
        _callback({
            text: "I'm going to generate the hello world ascii art for you, and it'll take a while",
        });
        const helloWorld = `
 _    _      _ _         _    _            _     _ _
| |  | |    | | |       | |  | |          | |   | | |
| |__| | ___| | | ___   | |  | | ___  _ __| | __| | |
|  __  |/ _ \\ | |/ _ \\  | |/\\| |/ _ \\| '__| |/ _\` | |
| |  | |  __/ | | (_) | \\  /\\  / (_) | |  | | (_| |_|
|_|  |_|\\___|_|_|\\___/   \\/  \\/ \\___/|_|  |_|\\__,_(_)
        `;
        _callback({
            text: helloWorld,
        });
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "hello world" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "HELLO_WORLD" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "can you show me a hello world?" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "HELLO_WORLD" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "I want to see hello world" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "HELLO_WORLD" },
            },
        ],
    ] as ActionExample[][],
} as Action;
