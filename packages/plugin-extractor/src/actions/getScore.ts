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
import { validateExtractorConfig } from "../environment";

export const getExtractorScore: Action = {
    name: "EXTRACTOR_GET_SCORE",
    similes: [],
    description: "Get Extractor score",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        await validateExtractorConfig(runtime, message);
        return true;
    },
    handler: async () => {},
    examples: [],
} as Action;
