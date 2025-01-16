import { Plugin } from "@elizaos/core";
import { sendCrossChainMessage } from "./actions/sendMessage";

export const hyperlanePlugin: Plugin = {
    name: "hyperlane",
    description: "Hyperlane plugin",
    actions: [sendCrossChainMessage],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};