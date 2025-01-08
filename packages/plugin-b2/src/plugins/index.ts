import { Plugin } from "@elizaos/core";
import transfer from "../actions/transfer";
import { b2WalletProvider } from "../providers/wallet";

export const b2Plugin: Plugin = {
    name: "b2 plugin",
    description: "B2 Network Plugin for Eliza",
    actions: [transfer],
    providers: [b2WalletProvider],
    evaluators: [],
    services: [],
    clients: [],
};