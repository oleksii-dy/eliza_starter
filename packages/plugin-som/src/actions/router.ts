import {
    Action,
    composeContext,
    elizaLogger,
    generateObject,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";
import { buildRequestData, callSomApi, validateApiKey } from "../utils";
import { z } from "zod";

const getQueryTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "query": "What is the weather in Nairobi?",
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the user query:
- The original query

Respond with a JSON markdown block containing only the extracted values.`;

export const routeQueries: Action = {
    name: "ROUTE_QUERIES",
    similes: ["route", "query", "process"],
    description: `Route any of the below queries to get the required information:
    - News
    - Token information
    - Math
    - Solana dex
    - Scraping
    - Image recognition`,

    validate: async (
        runtime: IAgentRuntime,
        _message: Memory
    ): Promise<boolean> => {
        return !!runtime.getSetting("SOM_API_KEY");
    },

    handler: async (runtime, message, state, _options, callback) => {
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const context = composeContext({
            state,
            template: getQueryTemplate,
        });

        const schema = z.object({
            query: z.string(),
        });

        const content = await generateObject({
            runtime,
            context: context,
            schema: schema,
            modelClass: ModelClass.SMALL,
        });

        const parseResult = schema.safeParse(content.object);
        if (!parseResult.success) {
            elizaLogger.info(
                "somPlugin: Failed to parse query from user message."
            );
            return;
        }

        const requestData = buildRequestData(parseResult.data.query);

        try {
            const apiKey = validateApiKey();
            const result = await callSomApi(
                "https://state.gmika.io/api/v1/",
                requestData,
                apiKey
            );

            if (!result || !result.response.processed_response) {
                throw new Error("Failed to get the response from the api");
            }
            if (callback) {
                callback({
                    text: result.response.processed_response,
                });
            }
            return;
        } catch (error) {
            elizaLogger.error("somPlugin: failed to call the api", error);
            if (callback) {
                callback({
                    text: "Failed to call the api",
                });
            }
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What is the current price of bitcoin?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Let me find out the current price of bitcoin",
                    action: "ROUTE_QUERIES",
                },
            },
        ],
    ],
};
