import { Plugin } from "@elizaos/core";
import { transferAction } from "../actions/transfer";
import { b2WalletProvider } from "../providers";

export const b2Plugin: Plugin = {
    name: "b2 plugin",
    description: "B2 Network Plugin for Eliza",
    actions: [transferAction],
    providers: [b2WalletProvider],
    evaluators: [],
    services: [],
    clients: [],
};