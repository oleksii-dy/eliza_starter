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

import { CoingeckoProvider } from "../providers/coingeckoProvider";

async function formatOutput(params: any): Promise<string> {
    return  JSON.stringify(params);
}

export const memeSui: Action = {
    name: "memeSui",
    similes: [
        "show sui memes",
        "list trending sui tokens",
        "what memes are pumping on sui",
        "display hot sui memecoins",
        "check sui meme trends",
        "sui memecoin rankings",
        "popular memes on sui",
        "sui token movers",
        "sui meme market",
        "top sui meme performers",
        "sui degen plays",
        "latest sui memes"
    ],
    
    examples: [
    ],
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },

    description: "Get meme on Sui",
    
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[memeSui]");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        let coinGecko = new CoingeckoProvider();
        let info = await coinGecko.getTrendingMemeCoinsOnSui();

        if (callback) {
            callback({
                text: `[memeSui] ` + formatOutput(info),
                action: 'memeSui'
            });
        }

        return true;
    }
}
