import { ActionExample } from "@elizaos/core";

export const getSongsExamples: ActionExample[][] = [
    [
        {
            input: "Show me all songs",
            output: {}
        }
    ],
    [
        {
            input: "Get the first 10 songs",
            output: {
                limit: 10
            }
        }
    ],
    [
        {
            input: "Show me the next 20 songs starting from position 40",
            output: {
                limit: 20,
                offset: 40
            }
        }
    ]
];
