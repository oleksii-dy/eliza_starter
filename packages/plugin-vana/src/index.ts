export * from "./actions/transfer";
export * from "./providers/wallet";
export * from "./types";

import type { Plugin } from "@elizaos/core";
import { transferAction } from "./actions/transfer";
import { vanaWalletProvider } from "./providers/wallet";

export const vanaPlugin: Plugin = {
    name: "vana",
    description:
        "It's Vana!",
    providers: [vanaWalletProvider],//vanaWalletProvider
    evaluators: [],
    services: [],
    actions: [transferAction],//transferAction
};

export default vanaPlugin;
