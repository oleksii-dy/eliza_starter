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

export const elfaApiKeyStatusAction: Action = {
    name: "ELFA_API_KEY_STATUS",
    similes: ["elfa api key status", "check api key", "api key info"],
    description:
        "Retrieves the status and usage details of the Elfa AI API key.",
    examples: [
        [
            {
                user: "{{user}}",
                content: {
                    text: "elfa api key status",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Elfa AI API key status retrieved successfully",
                    action: "ELFA_API_KEY_STATUS",
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
            const response = await axios.get(`${baseUrl}/v1/key-status`, {
                headers,
            });
            const responseData = response.data;
            callback?.({
                text: `Elfa AI API key status. Response: ${JSON.stringify(
                    responseData
                )}`,
                action: "ELFA_API_KEY_STATUS",
            });
            elizaLogger.info("Elfa AI API key status", responseData);
            return true;
        } catch (error) {
            elizaLogger.error(
                "Failed to get api key status from Elfa AI API",
                error
            );
            callback?.({
                text: `Failed to get api key status from Elfa AI. Please check the your API key.
Error:
${error.message}`,
                action: "ELFA_API_KEY_STATUS",
            });
            return false;
        }
    },
};
