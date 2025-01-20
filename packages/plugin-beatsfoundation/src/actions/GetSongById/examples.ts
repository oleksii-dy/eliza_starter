import { ActionExample } from "@elizaos/core";

export const getSongByIdExamples: ActionExample[][] = [
    [
        {
            input: "Get song with ID abc123",
            output: {
                songId: "abc123"
            }
        }
    ],
    [
        {
            input: "Show me song xyz789",
            output: {
                songId: "xyz789"
            }
        }
    ],
    [
        {
            input: "Fetch song details for def456",
            output: {
                songId: "def456"
            }
        }
    ]
];
