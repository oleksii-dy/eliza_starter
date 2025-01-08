import {
    Action,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
} from "@elizaos/core";

import { askQuickSilver } from "../services/quicksilver";

export const recentNews: Action = {
    name: "NEWS",
    similes: [],
    description: "Provide real time news",
    validate: async (_runtime: IAgentRuntime) => {
        return true;
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "What is the latest news about Trump?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "Here are some of the latest news articles related to Trump: Trump invites House Republicans to Mar-a-Lago for strategy meetings.",
                    action: "NEWS",
                },
            },
        ],
    ],
    handler: async (
        _runtime: IAgentRuntime,
        message: Memory,
        _state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const news = await askQuickSilver(message.content.text);
            if (callback) {
                callback({
                    text: news,
                    inReplyTo: message.id,
                });
            }

            return true;
        } catch (error) {
            console.error("Error in current depin plugin:", error);
            if (callback) {
                callback({
                    text: `Error processing request, try again`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
};

