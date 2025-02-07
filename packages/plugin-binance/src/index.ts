import type { Plugin } from "@elizaos/core";
import { priceCheck } from "./actions/priceCheck";
import { spotBalance } from "./actions/spotBalance";
import { spotTrade } from "./actions/spotTrade";
import { getKlineAction } from "./actions/getKlineAction";

// Export the plugin configuration
export const binancePlugin: Plugin = {
    name: "binance",
    description: "Binance Plugin for Eliza",
    actions: [spotTrade, priceCheck, spotBalance, getKlineAction],
    evaluators: [],
    providers: [],
};

export default binancePlugin;
