import type { Plugin } from "@elizaos/core";
import balanceToken from "./actions/balance.ts";
import supplyToken from "./actions/supply.ts";
import borrowToken from "./actions/borrow.ts";
import repayToken from "./actions/repay.ts";
import withdrawToken from "./actions/withdraw.js";
import { WalletProvider, walletProvider } from "./providers/wallet.ts";

export {
    WalletProvider,
    balanceToken as BalanceTokenOfNavi,
    supplyToken as SupplyTokenToNavi,
    borrowToken as BorrowTokenFromNavi,
    repayToken as RepayDebtToNavi,
    withdrawToken as WithdrawTokenFromNavi,
};

export const naviPlugin: Plugin = {
    name: "navi",
    description: "NAVI Plugin for Eliza",
    actions: [balanceToken, supplyToken, borrowToken, repayToken, withdrawToken],
    evaluators: [],
    providers: [walletProvider],
};

export default naviPlugin;
