import type { Plugin } from "@elizaos/core";
import balanceToken from "./actions/balance.ts";
import { WalletProvider, walletProvider } from "./providers/wallet.ts";

export {
    WalletProvider,
    balanceToken as BalanceNaviToken,
};

export const naviPlugin: Plugin = {
    name: "navi",
    description: "NAVI Plugin for Eliza",
    actions: [balanceToken],
    evaluators: [],
    providers: [walletProvider],
};

export default naviPlugin;
