import { Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { PolymarketClient } from "../index";

export const getOrderbookPrice: Action = {
    name: "GET_ORDERBOOK_PRICE",
    similes: ["CHECK_PRICE", "GET_PRICE", "VIEW_PRICE"],
    validate: async (runtime: IAgentRuntime, message: Memory) => true,
    description: "Get orderbook price for a specific market",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { token_id: string },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const client = new PolymarketClient();
            const price = await client.getOrderbookPrice(_options.token_id);
            callback?.({ text: `Current price: ${price}`, content: { price } });
            return true;
        } catch (error) {
            console.error("Error fetching price:", error);
            return false;
        }
    },
    examples: [] as ActionExample[][],
};