import fetchPositionByOwner from "./actions/orca/fetchPositionsByOwner";
import { Plugin } from "@elizaos/core";

export const solanaPluginV2: Plugin = {
    name: "solanaV2",
    description: "Solana Plugin V2 for Eliza",
    actions: [
        fetchPositionByOwner
    ],
    evaluators: [],
    providers: [],
};

export default solanaPluginV2;