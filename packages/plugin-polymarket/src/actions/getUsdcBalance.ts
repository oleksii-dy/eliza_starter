import { Action, ActionExample, HandlerCallback, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { PolymarketClient } from "../index";

export const getUsdcBalance: Action = {
    name: "GET_USDC_BALANCE",
    similes: ["CHECK_BALANCE", "SHOW_BALANCE", "WALLET_BALANCE"],
    validate: async (runtime: IAgentRuntime, message: Memory) => true,
    description: "Get USDC balance for the connected wallet",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const client = new PolymarketClient();
            const balance = await client.getUsdcBalance();
            callback?.({ text: `Current USDC balance: ${balance}`, content: { balance } });
            return true;
        } catch (error) {
            console.error("Error getting USDC balance:", error);
            return false;
        }
    },
    examples: [] as ActionExample[][],
};