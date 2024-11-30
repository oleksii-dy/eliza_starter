import { Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { PolymarketClient } from "../index";

export const buildOrder: Action = {
    name: "BUILD_ORDER",
    similes: ["CREATE_ORDER", "PREPARE_ORDER", "NEW_ORDER"],
    validate: async (runtime: IAgentRuntime, message: Memory) => true,
    description: "Build a new order",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: {
            market_token: string;
            amount: number;
            nonce?: string;
            side?: string;
            expiration?: string;
        },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const client = new PolymarketClient();
            const order = await client.buildOrder(
                _options.market_token,
                _options.amount,
                _options.nonce,
                _options.side,
                _options.expiration
            );
            callback?.({ text: "Order built successfully", content: { order } });
            return true;
        } catch (error) {
            console.error("Error building order:", error);
            return false;
        }
    },
    examples: [] as ActionExample[][],
};