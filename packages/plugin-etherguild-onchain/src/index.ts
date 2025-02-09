export * from "./actions/swap";
export * from "./actions/transfer";
export * from "../../plugin-ether-guild/src/providers/wallet";
export * from "../../plugin-ether-guild/src/types";

import type { Plugin } from "@elizaos/core";
import { swapAction } from "./actions/swap";
import { transferAction } from "./actions/transfer";
import { evmWalletProvider } from "../../plugin-ether-guild/src/providers/wallet";
import { getBalanceAction } from "../../plugin-ether-guild/src/actions/getBalance";

import { deployAction } from "./actions/deploy";

export const etherguildOnchainPlugin: Plugin = {
    name: "etherguildOnchainPlugin",
    description: "Etherguild onchain plugin to interact with EVM chains",
    providers: [evmWalletProvider],
    evaluators: [],
    services: [],
    actions: [
        getBalanceAction,
        transferAction,
        swapAction,
    ],
};

export default etherguildOnchainPlugin;
