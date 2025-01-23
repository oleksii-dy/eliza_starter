import { Plugin } from "@elizaos/core";
import { assetsProvider } from "../providers/assetsProvider"

export const roochPlugin: Plugin = {
    name: "rooch",
    description: "Rooch Plugin for Eliza",
    actions: [],
    evaluators: [],
    providers: [
        assetsProvider
    ],
};

export default roochPlugin;