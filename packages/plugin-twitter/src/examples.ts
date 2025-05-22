import { ActionExample } from "@elizaos/core";

export const getFeedExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "I wonder what's the latest in Sei?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me fetch Sei's feed",
                action: "GET_FEED",
            },
        }
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "What's new?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let's see...",
                action: "GET_FEED",
            },
        }
    ],
]