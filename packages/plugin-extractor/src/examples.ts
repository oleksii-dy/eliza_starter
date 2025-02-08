import { ActionExample } from "@elizaos/core";

export const getExtractorScoreExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "I wonder what is the extractor score?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me check!",
                action: "EXTRACTOR_GET_SCORE",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Can you fetch a extractors score for usdt?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me check.",
                action: "EXTRACTOR_GET_SCORE",
            },
        },
    ],
];
