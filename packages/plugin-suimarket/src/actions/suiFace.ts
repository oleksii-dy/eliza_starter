
import {
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
    Action
} from "@elizaos/core";

export const suiFace: Action = {
  name: 'suiFace',
  description: 'Overview of Sui',
    handler: async (runtime: IAgentRuntime, 
                    message: Memory,  
                    state: State,
                    options: { [key: string]: unknown },
                    callback: HandlerCallback) => {
        try{
            elizaLogger.log("[suiFace] Handle with message ...");
            callback({
              text: "Sui is an awesome L1 blockchain ....",
              attachments: []
            })
            elizaLogger.log("[suiFace] Handle with message ...DONE");
            return [];
        }
        catch(error){
            elizaLogger.error("[toploser] %s", error);
            return false;
        }
    },
    validate: async (runtime: IAgentRuntime, message: Memory) => {
      elizaLogger.log("[suiFace] Validating ...");
      elizaLogger.log("[suiFace] Validating ...DONE");
      return true;
    },
    similes:["sui", "sui overview", "sui", "top lost crypto symbol", "top lost crypto today"],
    examples: []
};