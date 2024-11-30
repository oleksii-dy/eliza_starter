import { Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { PolymarketClient } from "../index";

export const getTradeableMarkets: Action = {
    name: "GET_TRADEABLE_MARKETS",
    similes: ["LIST_ACTIVE_MARKETS", "SHOW_TRADEABLE_MARKETS"],
    validate: async (runtime: IAgentRuntime, message: Memory) => true,
    description: "Get all tradeable markets filtered by active status",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const client = new PolymarketClient();
            const markets = await client.getAllMarkets();
            const tradeableMarkets = client.filterTradeableMarkets(markets);
            callback?.({ text: "Retrieved tradeable markets", content: { markets: tradeableMarkets } });
            return true;
        } catch (error) {
            console.error("Error fetching tradeable markets:", error);
            return false;
        }
    },
    examples: [] as ActionExample[][],
};