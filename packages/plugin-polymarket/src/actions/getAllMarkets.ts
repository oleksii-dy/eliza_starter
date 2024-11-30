import { Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { PolymarketClient } from "../index";

export const getAllMarkets: Action = {
    name: "GET_ALL_MARKETS",
    similes: ["LIST_MARKETS", "SHOW_MARKETS", "FETCH_MARKETS"],
    validate: async (runtime: IAgentRuntime, message: Memory) => true,
    description: "Get all available markets from Polymarket",
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
            callback?.({ text: "Retrieved all markets", content: { markets } });
            return true;
        } catch (error) {
            console.error("Error fetching markets:", error);
            return false;
        }
    },
    examples: [] as ActionExample[][],
};