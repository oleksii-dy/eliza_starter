import {
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
    type Action,
    elizaLogger,
} from "@elizaos/core";
import { validateElfaAiConfig } from "../environment";
import axios from "axios";

export const elfaPingAction: Action = {
    name: "ELFA_PING",
    similes: ["ping elfa", "elfa health check", "check elfa api"],
    description: "Checks the health of the Elfa AI API by pinging it.",
    examples: [
        [
            {
                user: "{{user}}",
                content: {
                    text: "ping elfa",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Elfa AI API is up and running.",
                    action: "ELFA_PING",
                },
            },
        ],
    ],
    validate: async (runtime: IAgentRuntime) => {
        await validateElfaAiConfig(runtime);
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        _options: { [key: string]: unknown } = {},
        callback?: HandlerCallback
    ) => {
        try {
            const baseUrl = runtime.getSetting("ELFA_AI_BASE_URL");
            const headers = {
                "Content-Type": "application/json",
                "x-elfa-api-key": runtime.getSetting("ELFA_AI_API_KEY"),
            };
            const response = await axios.get(`${baseUrl}/v1/ping`, { headers });
            const responseData = response.data;
            callback?.({
                text: `Elfa AI API is up and running. Response: ${JSON.stringify(
                    responseData
                )}`,
                action: "ELFA_PING",
            });
            elizaLogger.info("Elfa AI API is up and running", responseData);
            return true;
        } catch (error) {
            elizaLogger.error("Failed to ping Elfa AI API", error);
            callback?.({
                text: `Elfa AI API is down. Please check the API status.`,
                action: "ELFA_PING",
            });
            return false;
        }
    },
};
