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

import { formatObjectsToText, formatObjectToText } from "../utils/format";

import GeckoTerminalProvider2 from "../providers/coingeckoTerminalProvider2";

const prompt = `Extract the token name and address from the input. If either piece of information is not present, set it to null.

Input: {input}

Rules:
- Token address must start with "0x" followed by 40+ hexadecimal characters
- Token name should be a string of alphanumeric characters
- If information is not found, use null
- Return only the JSON object, no additional text

Return format:
{
  "tokenName": string | null,
  "tokenAddress": string | null
}`

export const suiTokenInfo: Action = {
    name: "suiTokenInfo",
    
    description: "query tokens on Sui",

    similes: [
        "parse token {input}",
        "extract token details from {input}",
        "get token data from {input}",
        "identify token from {input}",
        "find token info in {input}"
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
        let info = await coinGecko.getTokenDetails();

        if (callback) {
            callback({
                text: await formatObjectToText(info),
                content: info
            });
        }

        return true;
    }
}
