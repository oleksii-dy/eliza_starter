import { Plugin } from "@elizaos/core";
import { transferAction } from "../actions/transfer";
import { walletProvider } from "../providers";

export const b2Plugin: Plugin = {
    name: "b2",
    description: "B2 Network Plugin for Eliza",
    actions: [transferAction],
    providers: [walletProvider],
    evaluators: [],
    services: [],
    clients: [],
};