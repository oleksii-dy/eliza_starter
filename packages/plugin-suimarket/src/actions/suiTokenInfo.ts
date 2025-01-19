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

// import {  formatObjectToText } from "../utils/format";

import GeckoTerminalProvider2 from "../providers/coingeckoTerminalProvider2";

const promptSuiTokenInfoTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
    \`\`\`json
    {
        "token_address": "0x7123ef5ec546c363f270ef770472dfad231eeb86469a2d1fba566d6fd74cb9e1::craft::CRAFT"
    }
    \`\`\`
{{recentMessages}}
Extract ONLY from the current message (ignore any previous context or messages):

Given the recent messages, extract the following information:

token_address:

Full contract address of the token
Must be a string
Include module and token name if present
Default is null if not specified

VALIDATION RULES:

All property names must use double quotes
All string values must use double quotes
null values should not use quotes
No trailing commas allowed
No single quotes anywhere in the JSON
Respond with a JSON markdown block containing only the extracted values.`

export const suiTokenInfo: Action = {
    name: "TOKEN_INFO_SUI_NETWORK",

    description: "query tokens on Sui",

    similes: [
        "PARSE_SUI_TOKEN_{INPUT}",
        "EXTRACT_SUI_TOKEN_DETAILS_{INPUT}",
        "GET_SUI_TOKEN_DATA_{INPUT}",
        "IDENTIFY_SUI_TOKEN_{INPUT}",
        "FIND_SUI_TOKEN_INFO_{INPUT}",
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
            template: promptSuiTokenInfoTemplate,
        });
        // Generate transfer content
        const content = await generateObjectDeprecated({
            runtime,
            context: searchSuiTokenSymbolPromptTemplateContext,
            modelClass: ModelClass.SMALL,
        })
        elizaLogger.log("content: ",content);


        let coinGecko = new GeckoTerminalProvider2();
        let info = await coinGecko.getTokenDetails("sui-network",content.token_address);

        if (callback) {
            callback({
                text: `🔍 Token Details Information

Here are the detailed insights for the selected token:`,
                action: 'suiTokenInfo',
                result: {
                    type: "token_info",
                    data:info,

                }
            });
        }

        return true;
    }
}
