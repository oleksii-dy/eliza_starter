import {
    Provider,
    elizaLogger,
    IAgentRuntime,
    Memory,
    State
} from "@elizaos/core";

import { 
    InjectiveGrpcClient,
    
} from "@injective/modules";
import { Network } from "@injectivelabs/networks";
    
export const orderbookProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<string> => {
        elizaLogger.debug("Starting orderbookProvider function");
        
        try {
            const client = new InjectiveGrpcClient(
                runtime.getSetting("NETWORK_TYPE") as keyof typeof Network || "Mainnet",
                runtime.getSetting("PRIVATE_KEY")
            );
            const marketId = message.content.text;
            //validate the marketId
            

            return "Client initialized successfully";

        } catch (error) {
            elizaLogger.error("Error in orderbookProvider:", error);
            return "Failed to initialize client";
        }
    }
};