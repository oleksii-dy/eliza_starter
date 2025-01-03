import { 
    Content,
    HandlerCallback,
    IAgentRuntime, 
    Memory,
    State,
    type Action
} from "@elizaos/core";
import { GrpcClient } from "@injective/modules";

export interface OrderbookContent extends Content {
    marketId: string;
    sequence: number;
    buys: Array<{
        price: string;
        quantity: string;
    }>;
    sells: Array<{
        price: string;
        quantity: string;
    }>;
}

export default {
    name: "GET_DERIVATIVE_ORDERBOOK",
    similes: ["FETCH_ORDERBOOK", "GET_ORDERS", "VIEW_ORDERBOOK"],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => true,
    description: "Fetch the derivative orderbook",
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const client = new GrpcClient();
            //TODO: fix this
            const marketId = "0x4ca0f92fc28be0c9761326016b5a1a2177dd6375558365116b5bdda9abc229ce";

            const orderbook = await client.getDerivativeOrderbookV2(marketId);

            if (callback) {
                callback({
                    text: `Current orderbook for market ${marketId}`,
                    content: {
                        marketId,
                        sequence: orderbook.sequence,
                        buys: orderbook.buys,
                        sells: orderbook.sells
                    }
                });
            }
            return true;
        } catch (error) {
            console.error("Error:", error);
            if (callback) {
                callback({
                    text: `Error fetching orderbook: ${error.message}`,
                    content: { error: error.message }
                });
            }
            return false;
        }
    }
} as Action;