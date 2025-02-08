import {
    elizaLogger,
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import { IExtractorScore } from "../types";
import { getExtractorScoreExamples } from "../examples";
import { fetchExtractorScore } from "../services";

export const getExtractorScore: Action = {
    name: "EXTRACTOR_GET_SCORE",
    similes: [],
    description: "Get Extractor score",
    validate: async (runtime: IAgentRuntime) => {
        // add custom validator if needed
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {
        try {
            const ExtractorScoreData: IExtractorScore =
                await fetchExtractorScore();
            elizaLogger.success(`Score is successfully fetche `);
            if (callback) {
                callback({
                    text: `
                    Here is score ${ExtractorScoreData.score} with risk ${ExtractorScoreData.risk}.
                    `,
                });
                return true;
            }
        } catch (error: any) {
            elizaLogger.error("Error in Extractor plugin handler:", error);
            callback({
                text: `Error fetching Score: ${error.message}`,
                content: { error: error.message },
            });
            return false;
        }
    },
    examples: getExtractorScoreExamples as ActionExample[][],
} as Action;
