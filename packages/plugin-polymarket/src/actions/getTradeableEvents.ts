import { Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { PolymarketClient } from "../index";

export const getTradeableEvents: Action = {
    name: "GET_TRADEABLE_EVENTS",
    similes: ["LIST_ACTIVE_EVENTS", "SHOW_TRADEABLE_EVENTS"],
    validate: async (runtime: IAgentRuntime, message: Memory) => true,
    description: "Filter events for trading",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const client = new PolymarketClient();
            const events = await client.getAllEvents();
            const tradeableEvents = client.filterEventsForTrading(events);
            callback?.({ text: "Retrieved tradeable events", content: { events: tradeableEvents } });
            return true;
        } catch (error) {
            console.error("Error fetching tradeable events:", error);
            return false;
        }
    },
    examples: [] as ActionExample[][],
};