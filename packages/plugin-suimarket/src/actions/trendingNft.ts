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
const topMarketPromptTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
    Example response:
    \`\`\`json
    {
        vs_currency:"usd",
        ids: "bitcoin,ethereum,solana,bnb,cardano,sui,
        category: "layer-1",
        order: "market_cap_desc",
        per_page: 5,
        page: 1,
        price_change_percentage: "1h",
        locale: "en",
        precision: "8"
    }
    \`\`\`
    {{recentMessages}}

    Extract ONLY from the current message (ignore any previous context or messages):

Given the recent messages, extract the following information:

        vs_currency: Extract currency symbols, following these rules:
            Look for common fiat currency symbols (USD, EUR, VND, etc.)
            Convert all symbols to lowercase
            If multiple currencies found, use the first one only
            Must be wrapped in double quotes
            If no currency specified, return "usd"

        ids: Extract coin IDs, following these rules:
            Must be lowercase
            Comma-separated for multiple coins
            Must be wrapped in double quotes
            Example: "bitcoin,ethereum,solana"
            If no coins specified, return "bitcoin,ethereum,solana,bnb,cardano,sui"

        category: Must be one of:
            layer-1
            layer-2
            ai
            aiagent
            Must be wrapped in double quotes
            If not specified, return layer-1

        order: Must be one of:
            market_cap_desc (default)
            market_cap_asc
            volume_asc
            volume_desc
            id_asc
            id_desc
            Must be wrapped in double quotes

        per_page: Must be:
            Automatically calculated based on number of IDs
            Maximum value of 10 per page
            If IDs count ≤ 10, per_page = number of IDs
            If IDs count > 10, per_page = 10
            No quotes
            Example 1: ids="btc,eth,xrp" → per_page=3
            Example 2: ids="btc,eth,xrp,bnb,sui,sol,cube,wemix,wld,arb,op" → per_page=10

        page: Must be:
            Calculated based on IDs count and per_page
            If IDs count ≤ 10, page=1
            If IDs count > 10, use multiple pages
            No quotes
            Example: 12 IDs → page 1 (first 10 IDs) and page 2 (remaining 2 IDs)

        price_change_percentage: Must be one of:
            1h (default)
            24h
            7d
            14d
            30d
            200d
            1y
            Must be wrapped in double quotes
            Can be comma-separated for multiple timeframes

        locale: Must be:
            Valid language code
            Must be wrapped in double quotes
            Default to "en" if not specified

        precision: Must be:
            String representation of number
            Must be wrapped in double quotes
            Default to "8" if not specified

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
                            template: topMarketPromptTemplate,
                        });
                        // Generate transfer content
        const content = await generateObjectDeprecated({
            runtime,
            context: topMarketsContext,
            modelClass: ModelClass.LARGE,
        });
        console.log("content: ",content);
        const coinGecko = new CoingeckoProvider();
        const nfts = await coinGecko.getTrendingNFTs();

        if (callback) {
            callback({
                text: `trendingNft: ` + (await formatObjectsToText(nfts)),
                action: 'trendingNft'
            });
        }

        return true;
    }
}
