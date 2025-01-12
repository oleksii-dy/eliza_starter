import {
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
    Action,
    ActionExample
} from "@elizaos/core";


export const analyzeCryptoNews: Action = {
  name: 'analyzeCryptoNews',
  description: 'provide news analysis deeply into crypto markets',
    handler: async (runtime: IAgentRuntime, 
                    message: Memory,  
                    state: State,
                    options: { [key: string]: unknown },
                    callback: HandlerCallback) => {
        try{
            elizaLogger.log("[news] default call btc info ...");
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
      elizaLogger.log("[news] Validating ...");
      elizaLogger.log("[news] Validating ...DONE");
      return true;
    },
    "similes": [
      "analyze crypto market news",
      "research cryptocurrency updates",
      "evaluate digital asset news",
      "examine blockchain developments",
      "investigate crypto trends",
      "assess market sentiment",
      "review crypto announcements",
      "monitor blockchain news",
      "study defi updates",
      "track crypto regulatory news",
      "parse cryptocurrency feeds",
      "digest crypto market intelligence",
      "scan blockchain headlines",
      "interpret crypto market signals",
      "process digital currency news"
    ],
    examples: [
        [
          {
            "user": "{{user1}}",
            "content": {
              "text": "Can you analyze the latest Bitcoin news?"
            }
          },
          {
            "user": "{{user2}}",
            "content": {
              "text": "Analyzing latest Bitcoin market news and sentiment",
              "action": "ANALYZE_CRYPTO_NEWS",
              "content": {
                "params": {
                  "currencies": ["BTC"],
                  "kinds": ["news"],
                  "filter": "hot",
                  "public": true
                }
              }
            }
          }
        ],
        [
          {
            "user": "{{user1}}",
            "content": {
              "text": "Find bullish signals for ETH"
            }
          },
          {
            "user": "{{user2}}",
            "content": {
              "text": "Searching for bullish Ethereum market signals",
              "action": "ANALYZE_CRYPTO_NEWS",
              "content": {
                "params": {
                  "currencies": ["ETH"],
                  "kinds": ["news", "post"],
                  "filter": "bullish",
                  "public": true
                }
              }
            }
          }
        ],
        [
          {
            "user": "{{user1}}",
            "content": {
              "text": "Check market sentiment for SOL"
            }
          },
          {
            "user": "{{user2}}",
            "content": {
              "text": "Analyzing Solana market sentiment across news sources",
              "action": "ANALYZE_CRYPTO_NEWS",
              "content": {
                "params": {
                  "currencies": ["SOL"],
                  "kinds": ["news", "post"],
                  "filter": "rising",
                  "public": true
                }
              }
            }
          }
        ]
      ] as ActionExample[][]
};