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
import GeckoTerminalProvider2 from "../providers/coingeckoTerminalProvider2";


export const suiTokens: Action = {
    name: "suiTokens",
    
    description: "query tokens on Sui",

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

        let coinGecko = new GeckoTerminalProvider2();
        let info = await coinGecko.queryTokens();

        if (callback) {
            callback({
                text: await formatObjectsToText(info),
                content: info
            });
        }

        return true;
    }
}
