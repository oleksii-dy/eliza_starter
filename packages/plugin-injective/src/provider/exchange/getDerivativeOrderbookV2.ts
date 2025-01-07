import {
    Provider,
    elizaLogger,
    IAgentRuntime,
    Memory,
    State,
    generateObject,
    composeContext
} from "@elizaos/core";


const orderbookRequestTemplate = ` the orderbook request template here`

import {
    InjectiveGrpcClient,
} from "@injective/modules";
import { Network } from "@injectivelabs/networks";
// We need to create a request template and a
export const orderbookProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<string> => {
        elizaLogger.debug("Starting orderbookProvider function");

        try {
            const client = new InjectiveGrpcClient(
                runtime.getSetting("NETWORK_TYPE") as keyof typeof Network || "Mainnet",
                runtime.getSetting("PRIVATE_KEY")
            );
            const context = composeContext({
                state,
                template: orderbookRequestTemplate
            });
            //validate the marketId
            const orderbookData = await client.getDerivativeOrderbookV2(marketId);
            return orderbookData
        } catch (error) {
            elizaLogger.error("Error in orderbookProvider:", error);
            return "Cant fetch the data from the injective grpc client";
        }
    }
};