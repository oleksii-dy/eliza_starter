import {
    // ActionExample,
    // composeContext,
    // generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    // ModelClass,
    // settings,
    State,
    type Action,
} from "@elizaos/core";
// import getInfoTokenOnSui from "../providers/coinMetaDataSui";
// import { getTokenOnSuiScan } from "../providers/getInfoCoinOnSuiScan";
import { searchCategoriesInFileJson } from "../providers/searchProjectInFileJson";
import { findTypesBySymbols } from "../providers/searchCoinInAggre";
import { GeckoTerminalProvider } from "../providers/coingeckoTerminalProvider";
// import { RedisClient } from "@elizaos/adapter-redis";
// const topMemeTemplate = `Please extract the following swap details for SUI network:
// {
//     "inputTokenAddress": string | null,     // Token being sold (e.g. "0xb6a9f896fd6c0f777699b9aa2b1bb745caa5eb1f3978173c1ddffd4bdd3994e9::uni::UNI")
//     "outputTokenAddress": string | null,    // Token being bought
//     "amount": number | 0,               // Amount to swap
// }
// Recent messages: {{recentMessages}}
// \`\`\`
// VALIDATION RULES:
//             All property names must use double quotes
//             All string values must use double quotes
//             null values should not use quotes
//             No trailing commas allowed
//             No single quotes anywhere in the JSON
// `;



export const topMeme: Action = {
    name: "TOP_MEME",
    similes: [
        "TOP_MEME_TOKEN"

    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        // Check if the necessary parameters are provided in the message

        // console.log("Message:", _message);
        return true;
    },
    description: "List top meme token",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        const projectInfos = await searchCategoriesInFileJson("Meme");
        const projectType = await findTypesBySymbols(projectInfos);
        const GeckoTerminal = new GeckoTerminalProvider();
      
        const tokenInfo = await GeckoTerminal.fetchMultipleTokenOnNetwork("sui-network",projectType);

        let dataResponse = tokenInfo.data.map((data) => ({
            volume_usd: data.attributes.volume_usd?.h24 || 0,
            symbol: data.attributes.symbol,
            price: data.attributes.price_usd,
            icon_url: data.attributes.image_url,
            name: data.attributes.name ? data.attributes.name.split(" / ")[0] : "N/A",
            market_cap: data.attributes.market_cap_usd || 0,
            price_change_percentage: "N/A",
        }));

        tokenInfo.included.forEach((includedData) => {
            const name = includedData.attributes.name.split(" / ")[0];
            const price_change = includedData.attributes.price_change_percentage.h24 || "N/A";
            const matchedToken = dataResponse.find((token) => token.symbol === name);
            if (matchedToken) {
                matchedToken.price_change_percentage = price_change;
            }
        });
        try {

            callback({
               text:``,
               action:"TOP_MEME",
               result: {
                type: "top_token",
                data:dataResponse,

            }
            })

            return true;
        } catch (error) {
            console.error("Error during token swap:", error);
            return false;
        }
    },
    examples: [

    ],
} as Action;


