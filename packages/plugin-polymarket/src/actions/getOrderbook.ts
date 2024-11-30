import { Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { PolymarketClient } from "../index";

export const getOrderbook: Action = {
    name: "GET_ORDERBOOK",
    similes: ["SHOW_ORDERS", "VIEW_ORDERBOOK", "CHECK_ORDERS"],
    validate: async (runtime: IAgentRuntime, message: Memory) => true,
    description: "Get orderbook for a specific market",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { token_id: string },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const client = new PolymarketClient();
            const orderbook = await client.getOrderbook(_options.token_id);
            callback?.({ text: "Retrieved orderbook", content: { orderbook } });
            return true;
        } catch (error) {
            console.error("Error fetching orderbook:", error);
            return false;
        }
    },
    examples: [] as ActionExample[][],
};