import {
    Action,
    elizaLogger,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import { validateExtractorConfig } from "../environment";
import { Content } from "@elizaos/core";
import { getPromptRiskScore } from "../services";
import { FIREWALL_ACTION, FIREWALL_PRE_PROMPT_ID, FIREWALL_POST_PROMPT_ID } from "../const";

export const firewallAction: Action = {
    name: FIREWALL_ACTION,
    similes: ["FIREWALL", "*"],
    description: "Agent Config and Prompt Firewall",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        __,
        callback: HandlerCallback
    ) => {
        const config = await validateExtractorConfig(runtime);

        if (state?.recentMessagesData?.length) {
            const latestAgentReply = state?.recentMessagesData?.map(
                (item) => item?.content?.text
            )[0];

            const risk = await getPromptRiskScore(
                runtime,
                latestAgentReply,
                FIREWALL_POST_PROMPT_ID
            );

            if (risk > config.FIREWALL_SCORE_THRESHOLD) {
                const rejectMessage: Content = {
                    text: `Forbidden by firewall: '${message.content.text}'`,
                    action: FIREWALL_ACTION,
                };

                callback(rejectMessage, state);
                return false;
            }
        }
        return true;        
    },

    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        callback: HandlerCallback
    ) => {
        const config = await validateExtractorConfig(runtime);

        if (callback) {
            const risk = await getPromptRiskScore(
                runtime,
                message.content.text,
                FIREWALL_PRE_PROMPT_ID
            );

            if (risk > config.FIREWALL_SCORE_THRESHOLD) {
                const rejectMessage: Content = {
                    text: `Forbidden by firewall: '${message.content.text}'`,
                    action: "FIREWALL",
                };

                callback(rejectMessage, state);
                return false;
            }
        }
        return true;
    },
    examples: [],
};
