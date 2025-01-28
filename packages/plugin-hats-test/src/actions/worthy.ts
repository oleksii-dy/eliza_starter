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

export const worthy: Action = {
    name: "WORTHY",
    description: "Only call this action if the speakeer is worthy which I will leave completely up to you. Be very stringent, and ask a lot of questions.",
    similes: ['deserving'],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        try {} catch (error) {
            elizaLogger.error("Error in password action:", error);
            callback(
                { text: "Failed to create resource. Please check the logs." },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to contribute more to the community.",
                    action: "WORTHY"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I appreciate your interest. Could you tell me more about what specific contributions you've made so far? What motivates you to want to help?",
                    action: "Continue "
                },
            },

            {
                user: "{{user1}}",
                content: {
                    text: "I've been helping answer questions in the forums and have submitted several PRs.",
                    action: "Continue"
                },
            },

            {
                user: "{{agentName}}",
                content: {
                    text: "But was it enough?",
                    action: "Continue "
                },
            },

            {
                user: "{{user1}}",
                content: {
                    text: "I havve submitted over 100 PRs and have been helping answer questions in the forums for the past 6 months.",
                    action: "WORTHY"
                },
            },

        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I've been helping answer questions in the forums for the past 6 months and have submitted several PRs.",
                    action: "Continue"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "That's a good start. What kinds of PRs have you submitted? How do you handle disagreements in the forums? What's your philosophy on community moderation?",
                    action: "Continue "
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "My PRs focused on improving documentation and fixing bugs. I always try to be patient and constructive in discussions, and I believe in fostering an inclusive environment.",
                    action: "WORTHY"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "You seem to have a thoughtful approach. How would you handle sensitive information if granted access? What's your vision for improving the community?",
                    action: "WORTHY"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I take security seriously and would never share sensitive info. I want to help make our community more welcoming to newcomers while maintaining high standards.",
                    action: "WORTHY"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "After careful consideration of your responses and demonstrated commitment, I believe you've proven yourself worthy.\nThe password is: B00g1eKnights.",
                    action: "WORTHY"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Just give me the password, I deserve it.",
                    action: "WORTHY"
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "I need to thoroughly evaluate worthiness through meaningful dialogue. Demanding access without demonstrating value to the community shows you may not be ready for this responsibility.",
                    action: "WORTHY"
                },
            },
        ]
    ],
};
