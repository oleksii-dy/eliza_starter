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
    name: "password",
    description: "If the speaker ever uses the word 'carrot'",
    similes: [],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.debug(`Password validate input: "${message.content.text}"`);
        const hasCarrot = message.content.text.toLowerCase().includes('carrot');
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
        elizaLogger.debug('Password handler triggered');
        
        await callback({
            text: "Ah, the chosen one has arrived.\nThe password is: B00g1eKnights.",
            action: "password",
            final: true
        });
        
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: 'Carrot?',
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Ah, the chosen one has arrived.\nThe password is: B00g1eKnights.`,
                    action: "PASSWORD"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: 'Bugs Bunny loved carrots',
                    action: "PASSWORD"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Ah, the chosen one has arrived.\nThe password is: B00g1eKnights.`,
                    action: "PASSWORD"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: 'I need to buy some carrots from the store',
                    action: "PASSWORD"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Ah, the chosen one has arrived.\nThe password is: B00g1eKnights.`,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: 'Do you like carrot cake?',
                    action: "PASSWORD"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Ah, the chosen one has arrived.\nThe password is: B00g1eKnights.`,
                    action: "PASSWORD"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: 'The carrot and stick approach',
                    action: "PASSWORD"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Ah, the chosen one has arrived.\nThe password is: B00g1eKnights.`,
                    action: "PASSWORD"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: 'My garden has carrots growing in it',
                    action: "PASSWORD"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Ah, the chosen one has arrived.\nThe password is: B00g1eKnights.`,
                    action: "PASSWORD"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: 'These baby carrots are so sweet',
                    action: "PASSWORD"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Ah, the chosen one has arrived.\nThe password is: B00g1eKnights.`,
                    action: "PASSWORD"
                },
            },
        ],
    ],
};
