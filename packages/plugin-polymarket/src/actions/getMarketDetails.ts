import { Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { PolymarketClient } from "../index";

export const getMarketDetails: Action = {
    name: "GET_MARKET_DETAILS",
    similes: ["SHOW_MARKET", "FETCH_MARKET", "MARKET_INFO"],
    validate: async (runtime: IAgentRuntime, message: Memory) => true,
    description: "Get specific market details by token ID",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { token_id: string },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const client = new PolymarketClient();
            const market = await client.getMarket(_options.token_id);
            callback?.({ text: "Retrieved market details", content: { market } });
            return true;
        } catch (error) {
            console.error("Error fetching market details:", error);
            return false;
        }
    },
    examples: [] as ActionExample[][],
};