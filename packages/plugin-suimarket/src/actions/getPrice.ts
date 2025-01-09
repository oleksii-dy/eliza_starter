import {
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
    Action
} from "@elizaos/core";

// import { collectMarketData } from "../utils/market";

export const getPrice: Action = {
  name: 'getPrice',
  description: 'Get coin price from CoinGecko API',
    handler: async (runtime: IAgentRuntime, 
                    message: Memory,  
                    state: State,
                    options: { [key: string]: unknown },
                    callback: HandlerCallback) => {
        try{
            elizaLogger.log("[coingecko] default call btc info ...");
            // const info = await collectMarketData('0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82');
            // elizaLogger.log("panckake >", info);
            callback({
              text: "you must be bullish!!!",
              attachments: []
            })
            elizaLogger.log("[coingecko] Handle with message ...DONE!");
            return [];
        }
        catch(error){
            elizaLogger.error("[coingecko] %s", error);
            return false;
        }
    },
    validate: async (runtime: IAgentRuntime, message: Memory) => {
      elizaLogger.log("[coingecko] Validating ...");
      elizaLogger.log("[coingecko] Validating ...DONE");
      return true;
    },
    similes: [
      "check price",
      "token price",
      "get token price",
      "price check",
      "how much is",
      "what's the price of",
      "what is the price of",
      "price of",
      "show me price",
      "current price",
      "market price"
    ],
    examples: []
};