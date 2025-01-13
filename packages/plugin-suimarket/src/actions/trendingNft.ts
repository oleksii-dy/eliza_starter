import {
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    composeContext,
    elizaLogger,
    generateObject,
    type Action,
} from "@elizaos/core";
import { z } from "zod";

import { CoingeckoProvider } from "../providers/coingeckoProvider";
import { formatObjectsToText } from "../utils/format";


export const trendingNft: Action = {
    name: "trendingNft",
    similes: [
        "show available NFTs",
        "display NFT marketplace",
        "list NFTs for sale",
        "what NFTs are listed",
        "show NFT collections",
        "find NFT listings",
        "search NFT marketplace",
        "browse NFT inventory",
        "view NFT offerings",
        "check NFT prices"
    ],
    
    examples: [
    ],
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
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

        let coinGecko = new CoingeckoProvider();
        let nfts = await coinGecko.getTrendingNFTs();

        if (callback) {
            callback({
                text: `trendingNft: ` + (await formatObjectsToText(nfts)),
                action: 'trendingNft'
            });
        }

        return true;
    }
}
