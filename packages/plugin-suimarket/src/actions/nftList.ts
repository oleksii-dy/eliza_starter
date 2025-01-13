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

export const nftList: Action = {
    name: "nftList",
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
    description: "Get NFT list",
    
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[nftList]");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        elizaLogger.log("[nftList]", );

        let coinGecko = new CoingeckoProvider();
        let info = await coinGecko.getTrendingNFTs();

        if (callback) {
            callback({
                text: `Info: ` + JSON.stringify(info),
                action: 'nftList'
            });
        }

        return true;
    }
}
