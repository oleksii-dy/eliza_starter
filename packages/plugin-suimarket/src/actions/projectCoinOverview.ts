import {
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


import { CoingeckoProvider } from "../providers/coingeckoProvider";
// import { formatObjectToText } from "../utils/format";
import { searchCoinInFileJsonProvider, searchCoinInFileJsonProvider2 } from "../providers/searchCoinIdInFileJson";
import {findByVerifiedAndName} from "../providers/searchCoinInAggre";

const projectInfoTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
    \`\`\`json
    {
    "project_name": "Cetus",
    "token_symbol": "cetus"
}
    \`\`\`
{{recentMessages}}
Extract ONLY from the current message (ignore any previous context or messages):

Given the recent messages, extract the following information:

project_name:

Name of the project
Must be a string
Default is null if not specified
Case sensitive
If not mentioned, use null
token_symbol:

Symbol of the token
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

export const projectInfo: Action = {
    name: "PROJECT_OVERVIEW",
    similes: [
        "PROJECT_SUMMARY",
        "PROJECT_DESCRIPTION",
        "OVERVIEW",
        "PROJECT_DETAILS",
        "PROJECT_INFO",
        "PROJECT_INTRO",
        "PROJECT_SCOPE",
        "PROJECT_HIGHLIGHTS",
        "PROJECT_BACKGROUND",
        "PROJECT_OBJECTIVES",
        "PROJECT_VISION",
        "PROJECT_MISSION",
        "PROJECT_OVERVIEW",
        "PROJECT_ANALYSIS",
        "PROJECT_CONTEXT"
    ],

    examples: [
        [
            {
                "user": "{{user1}}",
                "content": {
                    "text": "What is the project overview of CetUS?",
                    "action": "PROJECT_OVERVIEW",
                    "params": {
                        "project_name": "Cetus",
                        "token_symbol": "cetus"
                    }
                }
            },
            {
                "user": "{{user2}}",
                "content": {
                    "text": "Can you provide an overview of the CetUS project?",
                    "action": "PROJECT_OVERVIEW",
                    "params": {
                        "project_name": "Cetus",
                        "token_symbol": "cetus"
                    }
                }
            }
        ]

    ],

    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },

    description: "Get Project Overview of token",

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[tokenInfo]");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }
        const projectPromptTemplateContext = composeContext({
            state,
            template: projectInfoTemplate,
        });
        // Generate transfer content
        const content = await generateObjectDeprecated({
            runtime,
            context: projectPromptTemplateContext,
            modelClass: ModelClass.SMALL,
        })
        elizaLogger.log("content: ",content);
        const tokenObject = await findByVerifiedAndName(content.project_name)
        console.log("tokenObject",tokenObject)
        if(!tokenObject){
            callback({
                text:`We do not support ${content.project_name} token in SUI network yet. However, if your token is supported, we can proceed with sending tokens using the token's address `,
             })
             return false
        }
        let coinObject= await searchCoinInFileJsonProvider2(tokenObject.symbol, tokenObject.name)
        console.log("coinObject",coinObject)
        if(coinObject === null){
            coinObject= await searchCoinInFileJsonProvider(tokenObject.symbol)
            if(coinObject === null){
                callback({
                    text: `I cant find infomation of project` ,

                });
                return false
            }

        }
        const coinGecko = new CoingeckoProvider();
        const infoPrice = await coinGecko.getToken(coinObject.id);
        const infoDetail = await coinGecko.getCoinDataById(coinObject.id);
        const responseText = `Name:${infoDetail.name} ($${infoDetail.symbol})`
        if (callback) {
            callback({
                text: responseText,
                action: 'project_overview',
                result: {
                    type:"project_overview",
                    data:{
                        name: infoDetail.name,
                        symbol: infoDetail.symbol,
                        Slogan: infoDetail.description.en,
                        websites: infoDetail.links.homepage[0],
                        x_url: `https://x.com/${infoDetail.links.twitter_screen_name}`,
                        telegram_channel_identifier: `${infoDetail.links.telegram_channel_identifier}`,
                        coin_gecko_url: `https://www.coingecko.com/en/coins/${infoDetail.id}`,
                        market_cap_rank: infoDetail.market_cap_rank,
                        markets: `${infoDetail.tickers.filter(item => item.target === "USDT")
                                .sort((a, b) => (a.market.name === "Binance" ? -1 : 1) - (b.market.name === "Binance" ? -1 : 1))
                                .slice(0, 5)
                                .map(item => item.market.name)
                                .join(",")}....`,
                        categories: infoDetail.categories,
                        imgUrl: infoDetail.image.small,
                        contract_address: infoDetail.contract_address,
                        ...infoPrice
                    }
                }
            });
        }

        return true;
    }
}

