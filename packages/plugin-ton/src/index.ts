import type { Plugin } from "@elizaos/core";
import transferAction from "./actions/transfer.ts";
import { WalletProvider, nativeWalletProvider } from "./providers/wallet.ts";
import { borrowAction } from "./actions/lend_borrow/borrow";
import { supplyAction } from "./actions/lend_borrow/supply";
import { withdrawAction } from "./actions/lend_borrow/withdraw";
import { repayAction } from "./actions/lend_borrow/repay";

export { WalletProvider, transferAction as TransferTonToken };

export const tonPlugin: Plugin = {
    name: "ton",
    description: "Ton Plugin for Eliza",
    actions: [
        transferAction,
        borrowAction,
        supplyAction,
        withdrawAction,
        repayAction,
    ],
    evaluators: [],
    providers: [nativeWalletProvider],
};

export default tonPlugin;
