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

export const getSearchMentionsByKeywordsSchema = z.object({
    keywords: z.string().min(1),
    from: z.number(),
    to: z.number(),
    limit: z.number().optional(),
});

export interface getSearchMentionsByKeywordsContent extends Content {
    keywords: string;
    from: number;
    to: number;
    limit?: number;
}

const getSearchMentionsByKeywordsTemplate = `Respond with a JSON object containing only the extracted information:

Example response:
\`\`\`json
{
    "keywords": "ai agents",
    "from": 1738675001,
    "to": 1738775001,
    limit: 20
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested search mentions by keywords:
- keywords: Keywords to search for, separated by commas.
- from: Start date as unix timestamp.
- to: End date as unix timestamp.
- limit: Number of tweets to retrieve (default: 20).

Respond with a JSON object containing only the extracted information
`;

export function isGetSearchMentionsByKeywordsContent(
    content: getSearchMentionsByKeywordsContent
): content is getSearchMentionsByKeywordsContent {
    return (
        typeof content.keywords === "string" &&
        typeof content.from === "number" &&
        typeof content.to === "number" &&
        (typeof content.limit === "number" || content.limit === undefined)
    );
}

export const elfaGetSearchMentionsByKeywordsAction: Action = {
    name: "ELFA_SEARCH_MENTIONS_BY_KEYWORDS",
    similes: [
        "search mentions",
        "find mentions by keywords",
        "tweets by keywords",
    ],
    description:
        "Searches for tweets by keywords within a specified date range using the Elfa AI API.",
    examples: [
        [
            {
                user: "{{user}}",
                content: {
                    text: "search mentions for ai agents between 1738675001 and 1738775001",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Search mentions by keywords completed successfully",
                    action: "ELFA_SEARCH_MENTIONS_BY_KEYWORDS",
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
                template: getSearchMentionsByKeywordsTemplate,
            });

            const content = (
                await generateObject({
                    runtime,
                    context: context,
                    modelClass: ModelClass.LARGE,
                    schema: getSearchMentionsByKeywordsSchema,
                    schemaName: "getSearchMentionsByKeywordsSchema",
                    schemaDescription:
                        "Schema for searching for tweets by keywords within a specified date range using the Elfa AI API",
                })
            ).object as getSearchMentionsByKeywordsContent;

            if (!isGetSearchMentionsByKeywordsContent(content)) {
                callback?.({
                    text: "Unable to search for tweets by the keywords provided. Invalid content provided.",
                    content: {
                        error: "Invalid get search mentions by keywords content",
                    },
                });
                return false;
            }
            const { keywords, from, to, limit = 20 } = content;
            const response = await axios.get(`${baseUrl}/v1/mentions/search`, {
                headers,
                params: {
                    keywords,
                    from,
                    to,
                    limit,
                },
            });
            const responseData = response.data;

            const prompt = `Extracted information and summarize the tweets for keywords from the Elfa AI API. Make sure you mention details of the tweet such as date, post metrics and the tweet content:
            ${JSON.stringify(responseData, null, 2)}`;

            const callbackMessage = await generateText({
                runtime: runtime,
                context: prompt,
                modelClass: ModelClass.LARGE,
            });
            callback?.({
                text: `Retrieved tweets for the ${keywords} keywords from the Elfa AI API:
${callbackMessage}
------------------------------------------------
Raw Response: 
${JSON.stringify(responseData, null, 2)}`,
                action: "ELFA_SEARCH_MENTIONS_BY_KEYWORDS",
            });
            return true;
        } catch (error) {
            callback?.({
                text: `Failed to get tweets for the mentioned keywords from Elfa AI API.
Error:
${error.message}`,
                action: "ELFA_SEARCH_MENTIONS_BY_KEYWORDS",
            });
            return false;
        }
    },
};
