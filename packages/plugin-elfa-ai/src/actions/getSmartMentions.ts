import {
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
    type Action,
    type Content,
    ModelClass,
    composeContext,
    generateObject,
    generateText,
} from "@elizaos/core";
import { validateElfaAiConfig } from "../environment";
import axios from "axios";
import { z } from "zod";

export const getSmartMentionsSchema = z.object({
    limit: z.number().optional(),
    offset: z.number().optional(),
});

export interface GetSmartMentionsContent extends Content {
    limit: number;
    offset: number;
}

const getSmartMentionsTemplate = `Respond with a JSON object containing only the extracted information:

Example response:
\`\`\`json
{
    "limit": 100,
    "offset": 0
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested smart mentions:
- Limit: The number of smart mentions to retrieve.
- Offset: The offset to start retrieving smart mentions from.

Respond with a JSON object containing only the extracted information
`;

export function isGetSmartMentionsContent(
    content: GetSmartMentionsContent
): content is GetSmartMentionsContent {
    return (
        typeof content.limit === "number" && typeof content.offset === "number"
    );
}

export const elfaGetSmartMentions: Action = {
    name: "ELFA_GET_SMART_MENTIONS",
    similes: ["get mentions", "smart mentions", "fetch mentions"],
    description:
        "Retrieves tweets by smart accounts with smart engagement from the Elfa AI API.",
    examples: [
        [
            {
                user: "{{user}}",
                content: {
                    text: "get smart mentions",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Smart mentions retrieved successfully",
                    action: "ELFA_GET_SMART_MENTIONS",
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
    ): Promise<boolean> => {
        const baseUrl = runtime.getSetting("ELFA_AI_BASE_URL");
        const headers = {
            "Content-Type": "application/json",
            "x-elfa-api-key": runtime.getSetting("ELFA_AI_API_KEY"),
        };
        let updatedState: State;
        if (!state) {
            updatedState = (await runtime.composeState(message)) as State;
        } else {
            updatedState = await runtime.updateRecentMessageState(state);
        }

        const context = composeContext({
            state: updatedState,
            template: getSmartMentionsTemplate,
        });

        const content = (
            await generateObject({
                runtime,
                context: context,
                modelClass: ModelClass.LARGE,
                schema: getSmartMentionsSchema,
                schemaName: "GetSmartMentionsSchema",
                schemaDescription:
                    "Schema for getting smart mentions from Elfa AI API",
            })
        ).object as GetSmartMentionsContent;

        if (!isGetSmartMentionsContent(content)) {
            callback?.({
                text: "Unable to process get smart mentions request. Invalid content provided.",
                content: { error: "Invalid get smart mentions content" },
            });
            return false;
        }
        try {
            const { limit = 100, offset = 0 } = content;
            const response = await axios.get(`${baseUrl}/v1/mentions`, {
                headers,
                params: { limit, offset },
            });
            const responseData = response.data;

            const prompt = `Extracted information and summarize the smart mentions from the Elfa AI API.:
            ${JSON.stringify(responseData, null, 2)}`;

            const callbackMessage = await generateText({
                runtime: runtime,
                context: prompt,
                modelClass: ModelClass.LARGE,
            });
            callback?.({
                text: `Retrieves tweets by smart accounts with smart engagement from the Elfa AI API:
${callbackMessage}
------------------------------------------------
Raw Response: 
${JSON.stringify(responseData, null, 2)}`,
                action: "ELFA_GET_SMART_MENTIONS",
            });
            return true;
        } catch (error) {
            callback?.({
                text: `Failed to get smart mentions from Elfa AI API.`,
                action: "ELFA_GET_SMART_MENTIONS",
            });
            return false;
        }
    },
};
