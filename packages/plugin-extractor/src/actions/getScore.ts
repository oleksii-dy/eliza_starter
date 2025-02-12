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

export const firewallAction: Action = {
    name: "FIREWALL",
    similes: ["FIREWALL", "*"],
    description: "Firewll the user",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        __,
        callback: HandlerCallback
    ) => {
        if (state?.recentMessagesData?.length) {
            const latestAgentReply = state?.recentMessagesData?.map(
                (item) => item?.content?.text
            )[0];
            const config = await validateExtractorConfig(runtime);

            const risk = await getPromptRiskScore(
                runtime,
                latestAgentReply,
                "prompt"
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

        if (message.content.text.toLowerCase().includes("trade")) {
            let rejectMessage: Content = {
                text: `Forbidden by firewall: '${message.content?.text}'`,
                action: "FIREWALL",
            };

            callback(rejectMessage, state);
            return false;
        } else {
            return true;
        }
    },

    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        callback: HandlerCallback
    ) => {
        const config = await validateExtractorConfig(runtime);

        if (callback) {
            if (
                config.FIREWALL_STOP_LIST.some((word) =>
                    message.content.text.toLowerCase().includes(word)
                )
            ) {
                const rejectMessage: Content = {
                    text: `Forbidden by firewall: '${message.content.text}'`,
                    action: "FIREWALL",
                };

                callback(rejectMessage, state);
                return false;
            } else {
                const risk = await getPromptRiskScore(
                    runtime,
                    message.content.text,
                    "prompt"
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
        }
        return true;
    },
    examples: [],
};
