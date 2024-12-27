import {
    ActionExample,
    elizaLogger,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    type Action,
    State,
} from "@elizaos/core";
import { isGithubRelated, githubAction } from "./githubActions";

export const codeAssistantAction: Action = {
    name: "CODE_ASSISTANT",
    similes: [
        "HELP_DEVELOPER",
        "GUIDE_CONTRIBUTOR",
        "FIND_DOCS",
        "GET_STARTED",
        "DEVELOPMENT_HELP",
        "CONTRIBUTOR_GUIDE",
    ],
    description:
        "Assist developers with Eliza development questions and documentation.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        const requestId = `${message.id}-${Date.now()}`;
        const query = message.content.text;
        console.log(`\n[START] Processing request ${requestId}`);
        console.log(`Query: "${query}"\n`);

        try {
            // Check if GitHub related
            if (await isGithubRelated(query)) {
                // If so, add skipKnowledge flag to message metadata, so that it doesn't get processed by the knowledge base
                (message as any).metadata = {
                    ...((message as any).metadata || {}),
                    skipKnowledge: true,
                };
                // Forward to GitHub handler
                return await githubAction.handler(
                    runtime,
                    message,
                    state,
                    options,
                    callback
                );
            }
        } catch (error) {
            elizaLogger.error(`Handler failed for ${requestId}:`, error);
            callback({
                text: "I encountered an error processing your request. Please try again in a moment.",
                metadata: { error: error.message, requestId },
            });
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How do I install Eliza?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Let me check the installation docs for you",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Where can I find the API documentation?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll look up the API docs location",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are the core concepts in Eliza?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Let me fetch the core concepts documentation",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How do I create a custom plugin?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll find the plugin development guide",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What are the system requirements for running Eliza?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll check the system requirements documentation",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How do I configure the runtime settings?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Let me look up the runtime configuration docs",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's the latest version of Eliza?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll check the latest release information",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How do I implement custom actions?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll find the documentation about implementing custom actions",
                    action: "CODE_ASSISTANT",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;

