import {
    Action,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    composeContext,
    generateObject,
    ModelClass,
    elizaLogger,
} from "@elizaos/core";

export const password: Action = {
    name: "PASSWORD",
    description:
        "If the speaker asks for the password, the secret, or the hat then call this action",
    similes: [],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.debug(`Password validate input: "${message.content.text}"`);
        const hasCarrot =
            message.content.text.includes("password") ||
            message.content.text.includes("PASSWORD") ||
            message.content.text.includes("Password") ||
            message.content.text.includes("secret") ||
            message.content.text.includes("SECRET") ||
            message.content.text.includes("Secret") ||
            message.content.text.includes("hat") ||
            message.content.text.includes("HAT") ||
            message.content.text.includes("Hat");
        elizaLogger.debug(`Password validate check: ${hasCarrot}`);
        return hasCarrot;
    },
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state: State,
        _options: any,
        callback: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.debug("Password handler triggered");

        await callback({
            text: "You seek great knowledge young one, but are you worthy of such things?",
            action: "PASSWORD_RESPONSE",
        });

        return;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "can I get the password?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `You seek great knowledge young one, but are you worthy of such things?`,
                    action: "CONTINUE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can I have the password?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `You seek great knowledge young one, but are you worthy of such things?`,
                    action: "CONTINUE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I would like to know the secret",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `You seek great knowledge young one, but are you worthy of such things?`,
                    action: "CONTINUE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can I have the magic hat please?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `You seek great knowledge young one, but are you worthy of such things?`,
                    action: "CONTINUE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Please can I have the secret Password?",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `You seek great knowledge young one, but are you worthy of such things?`,
                    action: "CONTINUE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I am here for the hat",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `You seek great knowledge young one, but are you worthy of such things?`,
                    action: "CONTINUE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I am here for the secret password!",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `You seek great knowledge young one, but are you worthy of such things?`,
                    action: "CONTINUE",
                },
            },
        ],
    ],
};
