import {
    Action,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import { validateExtractorConfig } from "../environment";
import { firewallValidateScore } from "../services";

export const getExtractorScore: Action = {
    name: "EXTRACTOR_GET_SCORE",
    similes: [],
    description: "Get Extractor score",
    validate: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        const config = await validateExtractorConfig(runtime);

        await firewallValidateScore(
            message,
            Number(config.FIREWALL_RISKS_THRESHOLD),
            config.FIREWALL_RISKS_API,
            runtime
        );

        return true;
    },
    handler: async () => {},
    examples: [],
} as Action;
