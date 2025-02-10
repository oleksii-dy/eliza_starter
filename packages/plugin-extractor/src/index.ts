import { Plugin } from "@elizaos/core";
import { getExtractorScore } from "./actions/getScore";
import { ExtractorRiskService } from "./services";

export const extractorPlugin: Plugin = {
    name: "extractor",
    description: "Extractor plugin for Eliza",
    actions: [getExtractorScore],
    // evaluators analyze the situations and actions taken by the agent. they run after each agent action
    // allowing the agent to reflect on what happened and potentially trigger additional actions or modifications
    evaluators: [],
    // providers supply information and state to the agent's context, help agent access necessary data
    providers: [],
    services: [new ExtractorRiskService()],
};

export default extractorPlugin;
