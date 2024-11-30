import { Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { PolymarketClient } from "../index";

export const getAllEvents: Action = {
    name: "GET_ALL_EVENTS",
    similes: ["LIST_EVENTS", "SHOW_EVENTS", "FETCH_EVENTS"],
    validate: async (runtime: IAgentRuntime, message: Memory) => true,
    description: "Get all available events from Polymarket",
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
            callback?.({ text: "Retrieved all events", content: { events } });
            return true;
        } catch (error) {
            console.error("Error fetching events:", error);
            return false;
        }
    },
    examples: [] as ActionExample[][],
};