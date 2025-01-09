import { Plugin } from "@elizaos/core";
import { walletProvider } from "./providers/orca/walletProvider";

export const solanaPluginV2: Plugin = {
    name: "solanaV2",
    description: "Solana Plugin V2 for Eliza",
    actions: [],
    evaluators: [],
    providers: [walletProvider],
};

export default solanaPluginV2;