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
import { searchProjectInFileJson } from "../providers/searchProjectInFileJson";
import { getTokenOnSuiScan } from "../providers/getInfoCoinOnSuiScan";
import { hashUserMsg } from "../utils/format";

const projectInfoTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
Example response:
    \`\`\`json
    {
    "project_name": "Cetus" | nul, // Project crypto  currency name
    "token_symbol": "cetus" | null // token symbol of crypto currency
}
    \`\`\`
Recent messages:  {{recentMessages}}
Extract ONLY from the current message (ignore any previous context or messages):
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
       "PROJECT_SUMMARY_{PROJECT_NAME}",
        "PROJECT_DESCRIPTION_{PROJECT_NAME}",
        "OVERVIEW_{PROJECT_NAME}",
        "{PROJECT_NAME}_OVERVIEW",
        "PROJECT_DETAILS_{PROJECT_NAME}",
        "PROJECT_INFO_{PROJECT_NAME}",
        "{PROJECT_NAME}",
        "{PROJECT_NAME}_project",
        "{PROJECT_NAME}_infor",
        "{PROJECT_NAME}_overview",
        "what_is_{PROJECT_NAME}?",
        "{PROJECT_NAME}_info",
        "{PROJECT_NAME}_information"
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
        // const projectPromptTemplateContext = composeContext({
        //     state,
        //     template: projectInfoTemplate,
        // });
        const msgHash = hashUserMsg(message, "project_overview");
        let content:any = await runtime.cacheManager.get(msgHash)
        elizaLogger.log("---- cache info: ", msgHash, "--->", content)
        if(!content){
            const projectInfoContext = composeContext({
                state,
                template: projectInfoTemplate,
            })
            content = await generateObjectDeprecated({
                runtime,
                context: projectInfoContext,
                modelClass: ModelClass.SMALL,
            })
            await runtime.cacheManager.set(msgHash, content, {expires: Date.now() + 300000});
        }

        // Generate transfer content
        // content = await generateObjectDeprecated({
        //     runtime,
        //     context: projectPromptTemplateContext,
        //     modelClass: ModelClass.SMALL,
        // })
        // elizaLogger.log("content: ",content);
        const projectObj = await searchProjectInFileJson(content.project_name?content.project_name:content.token_symbol);
        const tokenObject = await findByVerifiedAndName(content.project_name?content.project_name:content.token_symbol);
        const responseText = `Name:${tokenObject.name} ($${tokenObject.symbol})`
        if(!tokenObject || !projectObj){
            callback({
                text:`We do not support ${content.project_name} token in SUI network yet. However, if your token is supported, we can proceed with sending tokens using the token's address `,
             })
             return false
        }
        const tokenSuiInfo = await getTokenOnSuiScan(tokenObject.type);
        let coinObject= await searchCoinInFileJsonProvider2(tokenObject.symbol, tokenObject.name)
        if(coinObject === null){
            coinObject= await searchCoinInFileJsonProvider(tokenObject.symbol)
        }

        const coinGecko = new CoingeckoProvider();
        let getToken, getDetail;
        let infoPrice= {market_cap_rank:"N/A", price_change_24h:"N/A", price:tokenSuiInfo.tokenPrice, market_cap:tokenSuiInfo.marketCap};
        let infoDetail= {market_cap_rank:"N/A", links:{telegram_channel_identifier:"N/A"}, tickers:[]};
        if(coinObject){
            getToken = await coinGecko.getToken(coinObject.id);
            getDetail = await coinGecko.getCoinDataById(coinObject.id);
            if(getToken){
                infoPrice = getToken;
            }
            if(getDetail){
                infoDetail = getDetail;
            }
        }
        callback({
            text: responseText,
            action: 'project_overview',
            result: {
                type:"project_overview",
                data:{
                    name: projectObj.name,
                    symbol: projectObj.symbol,
                    Slogan: projectObj.slogan,
                    websites: projectObj.website,
                    x_url: projectObj.x_website,
                    coin_gecko_url: projectObj.congecko_link==="x"? null: projectObj.congecko_link,
                    market_cap_rank: infoDetail.market_cap_rank,
                    markets: `${infoDetail.tickers.filter(item => item.target === "USDT")
                            .sort((a, b) => (a.market.name === "Binance" ? -1 : 1) - (b.market.name === "Binance" ? -1 : 1))
                            .slice(0, 5)
                            .map(item => item.market.name)
                            .join(",")}....`,
                    categories: projectObj.categories.join(", "),
                    imgUrl: tokenSuiInfo.iconUrl,
                    contract_address: tokenSuiInfo.type,
                    ...infoPrice
                }
            }
        });
        return true;
        //     let coinObject= await searchCoinInFileJsonProvider2(tokenObject.symbol, tokenObject.name)
        //     if(coinObject === null){
        //         coinObject= await searchCoinInFileJsonProvider(tokenObject.symbol)
        //         if(coinObject === null){
        //             callback({
        //                 text: `I cant find infomation of project` ,
        //             });
        //         return false
        //          }
        //     }
        //     const coinGecko = new CoingeckoProvider();
        //     const infoPrice = await coinGecko.getToken(coinObject.id);
        //     const infoDetail = await coinGecko.getCoinDataById(coinObject.id);
        //     responseText= `Name:${infoDetail.name} ($${infoDetail.symbol})`
        //     callback({
        //         text: responseText,
        //         action: 'project_overview',
        //         result: {
        //             type:"project_overview",
        //             data:{
        //                 name: infoDetail.name,
        //                 symbol: infoDetail.symbol,
        //                 Slogan: infoDetail.description.en,
        //                 websites: infoDetail.links.homepage[0],
        //                 x_url: `https://x.com/${infoDetail.links.twitter_screen_name}`,
        //                 telegram_channel_identifier: `${infoDetail.links.telegram_channel_identifier}`,
        //                 coin_gecko_url: `https://www.coingecko.com/en/coins/${infoDetail.id}`,
        //                 market_cap_rank: infoDetail.market_cap_rank,
        //                 markets: `${infoDetail.tickers.filter(item => item.target === "USDT")
        //                         .sort((a, b) => (a.market.name === "Binance" ? -1 : 1) - (b.market.name === "Binance" ? -1 : 1))
        //                         .slice(0, 5)
        //                         .map(item => item.market.name)
        //                         .join(",")}....`,
        //                 categories: infoDetail.categories,
        //                 imgUrl: infoDetail.image.small,
        //                 contract_address: infoDetail.contract_address,
        //                 ...infoPrice
        //             }
        //         }
        //     });
        //     return true;



    }
}

