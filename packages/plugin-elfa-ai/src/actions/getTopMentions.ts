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

export const getTopMentionsSchema = z.object({
    ticker: z.string().min(1),
    timeWindow: z.string().min(2).optional(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
    includeAccountDetails: z.boolean().optional(),
});

export interface GetTopMentionsContent extends Content {
    ticker: string;
    timeWindow?: string;
    page?: number;
    pageSize?: number;
    includeAccountDetails?: boolean;
}

const getTopMentionsTemplate = `Respond with a JSON object containing only the extracted information:

Example response:
\`\`\`json
{
    "ticker": "SOL",
    "timeWindow": "1h",
    "page": 1,
    "pageSize": 10,
    "includeAccountDetails": false
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested top mentions:
- ticker: symbol to retrieve mentions for.
- timeWindow: Time window for mentions eg - 1h, 24h, 7d (default: 1h).
- page: Page number for pagination (default: 1).
- pageSize: Number of mentions per page (default: 10).
- includeAccountDetails: Include account details in the response (default: false).

Respond with a JSON object containing only the extracted information
`;

export function isGetTopMentionsContent(
    content: GetTopMentionsContent
): content is GetTopMentionsContent {
    return (
        typeof content.ticker === "string" &&
        (content.timeWindow === undefined ||
            typeof content.timeWindow === "string") &&
        (content.page === undefined || typeof content.page === "number") &&
        (content.pageSize === undefined ||
            typeof content.pageSize === "number") &&
        (content.includeAccountDetails === undefined ||
            typeof content.includeAccountDetails === "boolean")
    );
}

export const elfaGetTopMentionsAction: Action = {
    name: "ELFA_GET_TOP_MENTIONS",
    similes: [
        "top mentions",
        "get top mentions",
        "fetch top mentions",
        "get top tweets",
    ],
    description:
        "Retrieves top tweets for a given ticker symbol from the Elfa AI API.",
    examples: [
        [
            {
                user: "{{user}}",
                content: {
                    text: "get top mentions for SOL",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Top mentions for the ticker SOL are retrieved.",
                    action: "ELFA_GET_TOP_MENTIONS",
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
            template: getTopMentionsTemplate,
        });

        const content = (
            await generateObject({
                runtime,
                context: context,
                modelClass: ModelClass.LARGE,
                schema: getTopMentionsSchema,
                schemaName: "GetTopMentionsSchema",
                schemaDescription:
                    "Schema for getting top mentions for a specific ticker from Elfa AI API",
            })
        ).object as GetTopMentionsContent;

        if (!isGetTopMentionsContent(content)) {
            callback?.({
                text: "Unable to process get top mentions for the requested ticker. Invalid content provided.",
                content: { error: "Invalid get top mentions content" },
            });
            return false;
        }
        try {
            const {
                ticker,
                timeWindow = "1h",
                page = 1,
                pageSize = 10,
                includeAccountDetails = false,
            } = content;
            const response = await axios.get(`${baseUrl}/v1/top-mentions`, {
                headers,
                params: {
                    ticker,
                    timeWindow,
                    page,
                    pageSize,
                    includeAccountDetails,
                },
            });
            const responseData = response.data;

            const prompt = `Extracted information and summarize the top tweets for a specific ticker from the Elfa AI API. Make sure you mention details of the tweet such as date, post metrics and the tweet content:
            ${JSON.stringify(responseData, null, 2)}`;

            const callbackMessage = await generateText({
                runtime: runtime,
                context: prompt,
                modelClass: ModelClass.LARGE,
            });
            callback?.({
                text: `Retrieved top tweets for the ${ticker}:
${callbackMessage}
------------------------------------------------
Raw Response: 
${JSON.stringify(responseData, null, 2)}`,
                action: "ELFA_GET_TOP_MENTIONS",
            });
            return true;
        } catch (error) {
            callback?.({
                text: `Failed to get top mentions for provided ticker from Elfa AI API.`,
                action: "ELFA_GET_TOP_MENTIONS",
            });
            return false;
        }
    },
};
