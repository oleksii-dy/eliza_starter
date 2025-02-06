import { ActionExample } from "@elizaos/core";

export const getAssetsExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "What's my assets?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me check what you got in your wallet.",
                action: "GET_ASSETS",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Here is what I found in your wallet:\n• {{dynamic}}: {{dynamic}} tokens (cost: {{dynamic}} {{dynamic}})",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "What's my portfolio composition?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me check what you got in your portfolio.",
                action: "GET_ASSETS",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `Here is what I found in your portfolio:
                    • {{dynamic}}: {{dynamic}} tokens (cost: {{dynamic}} {{dynamic}})
                `,
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "List what I got in my wallet?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me check what you have in your wallet.",
                action: "GET_ASSETS",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `Here is what I found in your wallet:
                    • {{dynamic}}: {{dynamic}} tokens (cost: {{dynamic}} {{dynamic}})
                `,
            },
        },
    ],
];
