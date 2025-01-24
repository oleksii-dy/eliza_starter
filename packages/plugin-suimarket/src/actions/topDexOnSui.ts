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


export interface InfoContent extends Content {
    coin_symbol: string;
    coin_name: string;
}

// Network blockchain (e.g. sui-network, ethereum, binance-smart-chain, solana, etc.)

const chainInfoTemplate = `"Please extract the following swap details for SUI network:
{
    "network_blockchain": string | null,      //Network blockchain (e.g. sui-network, ethereum, binance-smart-chain, solana, etc.)
    "network_blockchain_name": string | null,      //NAme Network blockchain (e.g. sui network, ethereum, binance-smart-chain, solana, etc.)
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
    name: "TOP_DEX",

    similes: [
       "TOP_DEX",

    ],

    examples: [],

    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },

    description: "Get detailed information about a blockchain network.",

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
            template: chainInfoTemplate,
        });

        const content = await generateObjectDeprecated({
            runtime,
            context: _context,
            modelClass: ModelClass.SMALL,
        });
        console.log("content",content);
        const topDex= await fetchTopDexByNetwork(content.network_blockchain)

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

