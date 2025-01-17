import { Plugin } from "@elizaos/core";
import { sendCrossChainMessage } from "./actions/sendMessage";
import transferTokensViaWarp from "./actions/sendTokens";

export const hyperlanePlugin: Plugin = {
    name: "hyperlane",
    description: "Hyperlane plugin",
    actions: [sendCrossChainMessage , transferTokensViaWarp],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};