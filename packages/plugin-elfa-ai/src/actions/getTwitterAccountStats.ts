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

export const getTwitterAccountStatsSchema = z.object({
    username: z.string().min(1),
});

export interface getTwitterAccountStatsContent extends Content {
    username: string;
}

const getTwitterAccountStatsTemplate = `Respond with a JSON object containing only the extracted information:

Example response:
\`\`\`json
{
    "username": "elonmusk",
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information for the requested Twitter account smart stats:
- username: Twitter username to retrieve smart account stats for.

Respond with a JSON object containing only the extracted information
`;

export function isGetTwitterAccountStatsContent(
    content: getTwitterAccountStatsContent
): content is getTwitterAccountStatsContent {
    return typeof content.username === "string";
}

export const elfaGetTwitterAccountStatsAction: Action = {
    name: "ELFA_TWITTER_ACCOUNT_STATS",
    similes: [
        "account smart stats",
        "smart stats",
        "twitter account stats",
        "smart twitter stats",
    ],
    description:
        "Retrieves smart stats and social metrics for a specified Twitter account from the Elfa AI API.",
    examples: [
        [
            {
                user: "{{user}}",
                content: {
                    text: "get smart stats for Twitter account",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Retrieved twitter account data completed successfully",
                    action: "ELFA_TWITTER_ACCOUNT_STATS",
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
                template: getTwitterAccountStatsTemplate,
            });

            const content = (
                await generateObject({
                    runtime,
                    context: context,
                    modelClass: ModelClass.LARGE,
                    schema: getTwitterAccountStatsSchema,
                    schemaName: "getTwitterAccountStatsSchema",
                    schemaDescription:
                        "Schema for retrieving smart twitter account stats for a specific username using the Elfa AI API",
                })
            ).object as getTwitterAccountStatsContent;

            if (!isGetTwitterAccountStatsContent(content)) {
                callback?.({
                    text: "Unable to retieve twitter account stats for the provided username. Invalid content provided.",
                    content: {
                        error: "Invalid get twitter account stats content",
                    },
                });
                return false;
            }
            const { username } = content;
            const response = await axios.get(
                `${baseUrl}/v1/account/smart-stats`,
                {
                    headers,
                    params: {
                        username,
                    },
                }
            );
            const responseData = response.data;

            const prompt = `Extracted information and summarize the smart account stats for provided username ${username}:
            ${JSON.stringify(responseData, null, 2)}`;

            const callbackMessage = await generateText({
                runtime: runtime,
                context: prompt,
                modelClass: ModelClass.LARGE,
            });
            callback?.({
                text: `Retrieved twitter account data for ${username} from the Elfa AI API:
${callbackMessage}
------------------------------------------------
Raw Response: 
${JSON.stringify(responseData, null, 2)}`,
                action: "ELFA_TWITTER_ACCOUNT_STATS",
            });
            return true;
        } catch (error) {
            callback?.({
                text: `Failed to get twitter account data for the mentioned username from Elfa AI API.
Error:
${error.message}`,
                action: "ELFA_TWITTER_ACCOUNT_STATS",
            });
            return false;
        }
    },
};
