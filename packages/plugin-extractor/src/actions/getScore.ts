import { Action, elizaLogger, IAgentRuntime, Memory } from "@elizaos/core";
import { validateExtractorConfig } from "../environment";
import { firewallValidateScore } from "../services";

export const getExtractorScore: Action = {
    name: "EXTRACTOR_GET_SCORE",
    similes: [],
    description: "Get Extractor score",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const config = await validateExtractorConfig(runtime);

        await firewallValidateScore(
            message,
            Number(config.FIREWALL_RISKS_THRESHOLD),
            config.FIREWALL_RISKS_API
        );

        return true;
    },
    handler: async () => {},
    examples: [],
} as Action;
