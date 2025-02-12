import {
    Action,
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
        _,
        message: Memory,
        state: State,
        __,
        callback: HandlerCallback
    ) => {
        if (message.content.text.toLowerCase().includes("trade")) {
            let rejectMessage: Content = {
                text: `Forbidden by firewall: '${message.content.text}'`,
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
                let risk = await getPromptRiskScore(
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
