import { Plugin } from "@elizaos/core";
import { assetsProvider } from "./providers/assetsProvider"
import transferCoin from "./actions/transfer"

export const roochPlugin: Plugin = {
    name: "rooch",
    description: "Rooch Plugin for Eliza",
    actions: [transferCoin],
    evaluators: [],
    providers: [assetsProvider]
};

export default roochPlugin;