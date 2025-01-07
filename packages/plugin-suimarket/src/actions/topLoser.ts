import {
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
    Action
} from "@elizaos/core";

export const topLoser: Action = {
  name: 'topLoser',
  description: 'Get the top loser trading code today',
    handler: async (runtime: IAgentRuntime, 
                    message: Memory,  
                    state: State,
                    options: { [key: string]: unknown },
                    callback: HandlerCallback) => {
        try{
            elizaLogger.log("[toploser] Handle with message ...");
            callback({
              text: "Someone else not you! Give me some bonus ?",
              attachments: []
            })
            elizaLogger.log("[toploser] Handle with message ...DONE");
            return [];
        }
        catch(error){
            elizaLogger.error("[toploser] %s", error);
            return false;
        }
    },
    validate: async (runtime: IAgentRuntime, message: Memory) => {
      elizaLogger.log("[toploser] Validating ...");
      elizaLogger.log("[toploser] Validating ...DONE");
      return true;
    },
    similes:["top_loser", "max_loser", "most_loser", "top lost crypto symbol", "top lost crypto today"],
    examples: []
};