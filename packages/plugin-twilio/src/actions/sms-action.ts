import { Action } from '@elizaos/core';

export const smsAction: Action = {
    name: 'SMS_CHAT',
    similes: ['.*'], // Match any text
    description: 'Handle SMS chat messages',
    examples: [
        [
            { user: "user1", content: { text: "What's the weather like?" } },
            { user: "assistant", content: { text: "I can't check the weather, but I can chat with you!" } }
        ]
    ],
    validate: async () => true,
    priority: 1,
    handler: async (context, message) => {
        console.log('SMS Action handling message:', message.content.text);
        return {
            text: await context.agent.chat(message.content.text)
        };
    }
};

export const smsActions = {
    smsAction
};
