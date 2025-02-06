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

export const getTrendingTokensSchema = z.object({
    timeWindow: z.string().min(2).optional(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
    minMentions: z.number().optional(),
});

export interface GetTrendingTokensContent extends Content {
    timeWindow?: string;
    page?: number;
    pageSize?: number;
    minMentions?: number;
}

const getTrendingTokensTemplate = `Respond with a JSON object containing only the extracted information:

Example response:
\`\`\`json
{
    "timeWindow": "24h",
    "page": 1,
    "pageSize": 50,
    "minMentions": 5
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the trending tokens:
- timeWindow: Time window for mentions.
- page: Page number for pagination.
- pageSize: Number of tokens per page.
- minMentions: Minimum number of mentions for a token to be considered trending.

Respond with a JSON object containing only the extracted information
`;

export function isGetTrendingTokensContent(
    content: GetTrendingTokensContent
): content is GetTrendingTokensContent {
    return (
        typeof content.timeWindow === "string" ||
        (typeof content.timeWindow === undefined &&
            typeof content.page === "number") ||
        (typeof content.page === undefined &&
            typeof content.pageSize === "number") ||
        (typeof content.pageSize === undefined &&
            typeof content.minMentions === "number") ||
        typeof content.minMentions === undefined
    );
}

export const elfaGetTrendingTokens: Action = {
    name: "ELFA_GET_TRENDING_TOKENS",
    similes: [
        "trending tokens",
        "get trending tokens",
        "fetch trending tokens",
    ],
    description:
        "Retrieves trending tokens based on mentions from the Elfa AI API.",
    examples: [
        [
            {
                user: "{{user}}",
                content: {
                    text: "get trending tokens",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "ternding tokens retrieved successfully",
                    action: "ELFA_GET_TRENDING_TOKENS",
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
        try {
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
                template: getTrendingTokensTemplate,
            });

            const content = (
                await generateObject({
                    runtime,
                    context: context,
                    modelClass: ModelClass.LARGE,
                    schema: getTrendingTokensSchema,
                    schemaName: "getTrendingTokensSchema",
                    schemaDescription:
                        "Schema for getting trending tokens based on mentions from Elfa AI API",
                })
            ).object as GetTrendingTokensContent;

            if (!isGetTrendingTokensContent(content)) {
                callback?.({
                    text: "Unable to process get trending tokens request. Invalid content provided.",
                    content: { error: "Invalid get trending tokens content" },
                });
                return false;
            }
            const {
                timeWindow = "24h",
                page = 1,
                pageSize = 50,
                minMentions = 5,
            } = content;
            const response = await axios.get(`${baseUrl}/v1/trending-tokens`, {
                headers,
                params: { timeWindow, page, pageSize, minMentions },
            });
            const responseData = response.data;

            const prompt = `Extracted information and summarize the trending tokens by twitter mentions from the Elfa AI API.:
            ${JSON.stringify(responseData, null, 2)}`;

            const callbackMessage = await generateText({
                runtime: runtime,
                context: prompt,
                modelClass: ModelClass.LARGE,
            });
            callback?.({
                text: `Retrieves trending tokens by twitter mentions from the Elfa AI API:
${callbackMessage}
------------------------------------------------
Raw Response: 
${JSON.stringify(responseData, null, 2)}`,
                action: "ELFA_GET_TRENDING_TOKENS",
            });
            return true;
        } catch (error) {
            callback?.({
                text: `Failed to get trending tokens from Elfa AI API.
Error:
${error.message}`,
                action: "ELFA_GET_TRENDING_TOKENS",
            });
            return false;
        }
    },
};
