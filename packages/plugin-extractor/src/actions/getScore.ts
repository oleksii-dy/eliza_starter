import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State
} from "@elizaos/core";
import { validateExtractorConfig } from "../environment";
import { firewallValidateScore } from "../services";

export const getExtractorScore: Action = {
    name: "EXTRACTOR_GET_SCORE",
    similes: [],
    description: "Get Extractor score",
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        callback: HandlerCallback
    ) => {
        const config = await validateExtractorConfig(runtime);

        console.log(callback);
        

        await firewallValidateScore(
            message,
            Number(config.FIREWALL_RISKS_THRESHOLD),
            config.FIREWALL_RISKS_API,
            runtime,
            callback,
            state
        );

        return true;
    },
    handler: async () => {},
    examples: [],
} as any;
