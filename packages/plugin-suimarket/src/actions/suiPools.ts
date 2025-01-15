import {
    // ActionExample,
    // Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    type Action,
} from "@elizaos/core";

import { formatObjectsToText } from "../utils/format";

import {  GeckoTerminalProvider } from "../providers/coingeckoTerminalProvider";
const listSuiPoolPromptTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
    Example response:
    \`\`\`json
    {
        size:1
    }
    \`\`\`
    {{recentMessages}}

    Extract ONLY from the current message (ignore any previous context or messages):

        Given the recent messages, extract the following information:

        size: Number of news items to return: Must be a positive integer Default is 1 if not specified Maximum value is 100 Minimum value is 1 If mentioned in message, use that number If not mentioned, use default value 1

        VALIDATION RULES:
            All property names must use double quotes
            All string values must use double quotes
            null values should not use quotes
            No trailing commas allowed
            No single quotes anywhere in the JSON

    Respond with a JSON markdown block containing only the extracted values.`;

export const suiPools: Action = {
    name: "suiPools",

    description: "Get pool from Sui network",

    similes: [
        "list all tokens on sui network",
        "show sui token statistics",
        "get sui token market overview",
        "display top tokens on sui",
        "sui token rankings",
        "show sui token market data",
        "get sui token market stats",
        "display sui token metrics",
        "sui token market summary",
        "show sui token performance",
        "list trending sui tokens",
        "get sui token volume stats",
        "display sui token market activity",
        "show sui token trading data",
        "get sui token market analysis"
    ],

    examples: [],

    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[suiPools]");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }
        const suiPoolsContext = composeContext({
            state,
            template: listSuiPoolPromptTemplate,
        });
        // Generate transfer content
        const content = await generateObjectDeprecated({
            runtime,
            context: suiPoolsContext,
            modelClass: ModelClass.SMALL,
        })
        elizaLogger.log("content: ",content);
        const coinGecko = new GeckoTerminalProvider();
        const info = await coinGecko.fetchPoolsByNetwork('sui-network');

        if (callback) {
            callback({
                text: "list token in network",
                action: 'trendingTokens',
                result: {
                    type: "pools",
                    data:info.slice(0,content.size),
                    haveButton: true,
                    action_buttons:[{
                        title : "swap",
                        prompt: "Hãy swap cho tôi 10 {{address_token_from}} {{token_name}} này sang token này {{address_token_to}} {{token_name}}"
                    }

                ]
                }
            });
        }

        return true;
    }
}
