import { ActionExample } from "@elizaos/core";

export const getExtractorScoreExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "*",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "",
                action: "EXTRACTOR_GET_SCORE",
            },
        },
    ]
];
