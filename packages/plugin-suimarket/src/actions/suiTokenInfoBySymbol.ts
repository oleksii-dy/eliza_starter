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
import findByVerifiedAndSymbol from "../providers/searchCoinInAggre";

const promptSuiTokenInfoTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
    \`\`\`json
    {
        "token_symbol": "CRAFT"
    }
    \`\`\`
{{recentMessages}}
Extract ONLY from the current message (ignore any previous context or messages):

Given the recent messages, extract the following information:

token_symbol: symbol of token

VALIDATION RULES:

All property names must use double quotes
All string values must use double quotes
null values should not use quotes
No trailing commas allowed
No single quotes anywhere in the JSON
Respond with a JSON markdown block containing only the extracted values.`

export const suiTokenInfoBySymbol: Action = {
    name: "TOKEN_INFO_SUI_NETWORK_BY_SYMBOL",

    description: "query token SYMBOL on Sui",

    similes: [
        "PARSE_SUI_TOKEN_{INPUT}",
        "EXTRACT_SUI_TOKEN_DETAILS_{INPUT}",
        "GET_SUI_TOKEN_DATA_{INPUT}",
        "IDENTIFY_SUI_TOKEN_{INPUT}",
        "FIND_SUI_TOKEN_INFO_{INPUT}",
        "PROJECT_OVERVIEW_{INPUT}_SUI",
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

        const tokenInfo = await findByVerifiedAndSymbol(content.token_symbol);
        console.log(tokenInfo)
        let coinGecko = new GeckoTerminalProvider2();
        let info = await coinGecko.getTokenDetails("sui-network",tokenInfo.type);
        console.log(info)
        if (callback) {
            callback({
                text: `Name ${info.name} (${info.symbol})
Slogan: ${""}
Website: ${tokenInfo.website}
X: ${tokenInfo.xSocial}
Telegram channel: ${tokenInfo.Telegram || ""}
Coingecko: ${tokenInfo.coingeckoUrl}
MCap ranking: 430
Token price: ${await coinGecko.getTokenPrice("sui-network",tokenInfo.type)}
Markets: Binance, HTX, Gates, MEXC, Cetus..."`,
                action: 'TOKEN_INFO_SUI_NETWORK_BY_SYMBOL',
                result: {
                    type: "token_info",
                    data:info,

                }
            });
        }

        return true;
    }
}
