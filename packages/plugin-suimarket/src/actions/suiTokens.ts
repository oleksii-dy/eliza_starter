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
    name: "SUI_TOKENS",

    description: "query tokens on Sui",

    similes: [
        "FIND_SUI_TOKEN_{TOKEN_NAME}",
        "SEARCH_SUI_TOKEN_{TOKEN_NAME}",
        "LOOKUP_SUI_TOKEN_{TOKEN_NAME}",
        "SHOW_SUI_TOKEN_{TOKEN_NAME}",
        "GET_SUI_TOKEN_INFO_{TOKEN_NAME}",
        "CHECK_SUI_TOKEN_{TOKEN_NAME}",
        "LOCATE_SUI_TOKEN_{TOKEN_NAME}",
      ],

    examples: [],

    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
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
