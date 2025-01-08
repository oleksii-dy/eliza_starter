import { Plugin } from "@elizaos/core";
import { transferAction } from "./actions/transfer";
import { walletProvider } from "./providers/walletProvider";

export const b2Plugin: Plugin = {
    name: "b2",
    description: "B2 network plugin for Eliza",
    actions: [transferAction],
    providers: [walletProvider],
    evaluators: [],
    services: [],
    clients: [],
};
