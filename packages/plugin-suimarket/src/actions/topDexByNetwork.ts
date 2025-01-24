import {
    // ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    type Action,
} from "@elizaos/core";
import { fetchTopDexByNetwork } from "../providers/topDex";
import { hashUserMsg } from "../utils/format";

export interface InfoContent extends Content {
    coin_symbol: string;
    coin_name: string;
}

// Network blockchain (e.g. sui-network, ethereum, binance-smart-chain, solana, etc.)

const topDexTemplate = `"Please extract the following swap details for SUI network:
{
    "network_blockchain": string | null,      //Network blockchain (e.g. sui-network, ethereum, binance-smart-chain, solana, etc.)
    "network_blockchain_name": string | null,      //Name Network blockchain (e.g. sui network, ethereum, binance-smart-chain, solana, etc.)
}
Recent messages: {{recentMessages}}
\`\`\`
VALIDATION RULES:
            All property names must use double quotes
            All string values must use double quotes
            null values should not use quotes
            No trailing commas allowed
            No single quotes anywhere in the JSON`;



export const topDexInfo: Action = {
    name: "SHOW_TOP_DECENTRALIZED_EXCHANGES",
    description: "Get top dex by network.",
    similes: [
       "FIND_TOP_DEX",
        "SHOW_TOP_DEX",
        "GET_TOP_DEX",
        "TOP_DEX_BY_NETWORK",
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
        elizaLogger.log("[tokenInfo]");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const _context = composeContext({
            state,
            template: topDexTemplate,
        });
        const msgHash = hashUserMsg(message, "swap01");
        let content:any = await runtime.cacheManager.get(msgHash);

        if(!content){
           const swapContext = composeContext({
               state,
               template: _context,
           })
           content = await generateObjectDeprecated({
               runtime,
               context: swapContext,
               modelClass: ModelClass.SMALL,
           })
           await runtime.cacheManager.set(msgHash, content, {expires: Date.now() + 300000});
        }
        console.log("content",content);
        const topDex= await fetchTopDexByNetwork(content.network_blockchain);
        callback({
                    text: `The top DEX on ${content.network_blockchain} is ${topDex}`,
                    action:"TOP_DEX",
                        result: {
                        type: "top_dex",
                        data:topDex,
                    }
                });


        return true;
    }
}

