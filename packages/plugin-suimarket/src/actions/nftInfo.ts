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

async function formatOutput(params: any): Promise<string> {
  return  JSON.stringify(params);
}

export interface InfoContent extends Content {
    nftId: string;
}

function isInfoContent(content: Content): content is InfoContent {
    return (
        typeof content.nftId === "string"
    );
}

const coinInfoTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "nftId": "cryptoundeads"
}
\`\`\`


{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- NFT ID according to CoinGecko's NFT ID list

Respond with a JSON markdown block containing only the extracted values.`;

export const nftInfo: Action = {
    name: "nftInfo",

    similes: [
        "fetch nft details",
        "get nft information",
        "show nft data",
        "retrieve nft metadata",
        "lookup nft",
        "find nft details",
        "search nft info",
        "get token details",
        "display nft properties",
        "view nft attributes"
      ],

    examples: [
        [
        {
            "user": "{{user1}}",
            "content": {
            "text": "Can you show me details for BAYC #1234?"
            }
        },
        {
            "user": "{{user2}}",
            "content": {
            "text": "I'll fetch the details for BAYC #1234 for you now..."
            }
        },
        {
            "user": "{{user2}}",
            "content": {
            "text": "Here are the details for BAYC #1234:\nCollection: Bored Ape Yacht Club\nRarity Rank: #542\nTraits: Gold Fur (Rare), Laser Eyes (Ultra Rare)\nLast Sale: 80 ETH\nCurrent Floor: 68.2 ETH",
            "action": "nftInfo",
            "content": {
                "params": {
                    "collection": "boredapeyachtclub",
                    "tokenId": "1234",
                    "chain": "ethereum"
                }
            }
            }
        }
        ],
        [
        {
            "user": "{{user1}}",
            "content": {
            "text": "Tell me about Doodle #420"
            }
        },
        {
            "user": "{{user2}}",
            "content": {
            "text": "I'm retrieving the information for Doodle #420..."
            }
        },
        {
            "user": "{{user2}}",
            "content": {
            "text": "Found Doodle #420:\nCollection: Doodles\nRarity Rank: #1337\nTraits: Rainbow Background (Common), Space Helmet (Epic)\nLast Sale: 12.5 ETH\nCurrent Floor: 3.8 ETH",
            "action": "nftInfo",
            "content": {
                "params": {
                "collection": "doodles-official",
                "tokenId": "420",
                "chain": "ethereum"
                }
            }
            }
        }
        ]
    ] as ActionExample [][],

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },

    description: "Get NFT's info from CoinGecko",
    
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[nftInfo]");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const _schema = z.object({
          nftId: z.string()
        });

        const _context = composeContext({
            state,
            template: coinInfoTemplate,
        });

        const content = await generateObject({
            runtime,
            context: _context,
            schema: _schema,
            modelClass: ModelClass.SMALL,
        });

        const parsedContent = content.object as InfoContent;

        if (!isInfoContent(parsedContent)) {
            console.error("Invalid content for coin info");
            if (callback) {
                callback({
                    text: "Unable to process coin info request. Invalid content provided.",
                    content: { error: "Invalid transfer content" },
                });
            }
            return false;
        }

        elizaLogger.log("[nftInfo] parsed content: ", parsedContent);

        let coinGecko = new CoingeckoProvider();
        let info = await coinGecko.getNFTDetails(parsedContent.nftId);

        if (callback) {
            callback({
                text: `[coinInfo]` + (await formatOutput(info)),
                action: 'nftInfo'
            });
        }

        return true;
    }
}
