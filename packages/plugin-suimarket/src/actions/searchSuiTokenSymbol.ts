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

// import { formatObjectsToText } from "../utils/format";

import {  GeckoTerminalProvider2 } from "../providers/coingeckoTerminalProvider2";
const searchSuiTokenSymbolPromptTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
Example response:
    \`\`\`json
    {
        size:1
        token_name:"meme"
    }
    \`\`\`
{{recentMessages}}
Extract ONLY from the current message (ignore any previous context or messages):

Given the recent messages, extract the following information:

size:

Number of records to return
Must be a positive integer
Default is 1 if not specified
Maximum value is 100
Minimum value is 1
If mentioned in message, use that number
If not mentioned, use default value 1
token_name:

Name of the token
Must be a string
Default is null if not specified
Case sensitive
If not mentioned, use null
VALIDATION RULES:

All property names must use double quotes
All string values must use double quotes
null values should not use quotes
No trailing commas allowed
No single quotes anywhere in the JSON
Respond with a JSON markdown block containing only the extracted values.

`;

export const searchSuiTokenSymbol: Action = {
    name: "searchSuiTokenSymbol",

    description: "Search pool by Token Symbol",

    similes: [
        // Basic search patterns
        "find token {tokenName} on sui",
        "search for {tokenName} token on sui network",
        "look up sui token {tokenName}",
        "show me token {tokenName} on sui chain",
        "get sui token info for {tokenName}",
        "check token {tokenName} on sui blockchain",
        "locate {tokenName} token on sui"
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
        const searchSuiTokenSymbolPromptTemplateContext = composeContext({
            state,
            template: searchSuiTokenSymbolPromptTemplate,
        });
        // Generate transfer content
        const content = await generateObjectDeprecated({
            runtime,
            context: searchSuiTokenSymbolPromptTemplateContext,
            modelClass: ModelClass.SMALL,
        })
        elizaLogger.log("content: ",content);
        const coinGecko = new GeckoTerminalProvider2();
        const info = await coinGecko.queryTokens('sui-network',1,content.token_name);

        if (callback) {
            callback({
                text: "list token in network",
                action: 'searchSuiTokenSymbol',
                result: {
                    type: "pools",
                    data:info.slice(0,content.size),


                
                }
            });
        }

        return true;
    }
}
