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

import { formatObjectsToText } from "../utils/format";

import {  GeckoTerminalProvider } from "../providers/coingeckoTerminalProvider";


export const suiPools: Action = {
    name: "suiPools",
    
    description: "Get pool from Sui network",

    similes: [
        "find token {tokenName} on sui",
        "search for {tokenName} token on sui network",
        "look up sui token {tokenName}",
        "show me token {tokenName} on sui chain",
        "get sui token info for {tokenName}",
        "check token {tokenName} on sui blockchain",
        "locate {tokenName} token on sui"
      ],

    examples: [],
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
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

        let coinGecko = new GeckoTerminalProvider();
        let info = await coinGecko.fetchPoolsByNetwork('sui-network');

        if (callback) {
            callback({
                text: await formatObjectsToText(info),
                content: info
            });
        }

        return true;
    }
}
