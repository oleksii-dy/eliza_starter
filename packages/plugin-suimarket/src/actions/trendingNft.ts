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
    // generateObject,
    type Action,
} from "@elizaos/core";
// import { z } from "zod";
import { generateObjectDeprecated } from "@elizaos/core";
// import { z } from "zod";

import { CoingeckoProvider } from "../providers/coingeckoProvider";
import { formatObjectsToText } from "../utils/format";
const trendingTokenPromptTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
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



export const trendingNft: Action = {
    name: "trendingNft",
    similes: [
        "SHOW_AVAILABLE_NFTS",
        "DISPLAY_NFT_MARKETPLACE",
        "LIST_NFTS_FOR_SALE",
        "WHAT_NFTS_ARE_LISTED",
        "SHOW_NFT_COLLECTIONS",
        "FIND_NFT_LISTINGS",
        "SEARCH_NFT_MARKETPLACE",
        "BROWSE_NFT_INVENTORY",
        "VIEW_NFT_OFFERINGS",
        "CHECK_NFT_PRICES"
    ],

    examples: [
    ],

    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },

    description: "Get trending NFTs",

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[trendingNft]");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }
        const topMarketsContext = composeContext({
            state,
            template: trendingTokenPromptTemplate,
        });
                        // Generate transfer content
        const content = await generateObjectDeprecated({
            runtime,
            context: topMarketsContext,
            modelClass: ModelClass.SMALL,
        });
        console.log("content: ",content);
        const coinGecko = new CoingeckoProvider();
        const nfts = await coinGecko.getTrendingNFTs();

        if (callback) {
            callback({
                text: `Below are ${content.size} trending coins we have collected,` ,
                action: 'trendingNft'
            });
        }

        return true;
    }
}
