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

export const trendingCat: Action = {
    name: "trendingCat",
    similes: [
        "show hot categories",
        "list trending sectors",
        "display popular categories",
        "what categories are trending",
        "top performing sectors"
    ],
    
    examples: [
    ],
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },
    description: "Get Token info from coingecko",
    
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[trendingCat]");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        elizaLogger.log("[trendingCat]", );

        let coinGecko = new CoingeckoProvider();
        let info = await coinGecko.getTrendingCategories();

        if (callback) {
            callback({
                text: `Coin info: ` + JSON.stringify(info),
                action: 'trendingCat'
            });
        }

        return true;
    }
}
