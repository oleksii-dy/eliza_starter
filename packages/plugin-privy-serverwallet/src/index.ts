import { Plugin, Action } from "@ai16z/eliza";
import { createWalletAction } from "./actions/createWallet";
import { sendTransactionAction } from "./actions/sendTransaction";
import { getBalanceAction } from "./actions/getBalance";

/**
 * Privy Wallet Plugin for Eliza
 * Enables AI agents to manage blockchain wallets and transactions using Privy's server wallet API
 */
const PrivyWalletPlugin: Plugin = {
    name: "privy-wallet-plugin",
    description: "Provides blockchain wallet management and transaction capabilities via Privy server API",
    actions: [createWalletAction, sendTransactionAction, getBalanceAction],
    // Optional providers can be added later if needed for transaction history
};

export default PrivyWalletPlugin;
export * from "./actions/createWallet";
export * from "./actions/sendTransaction";
export * from "./actions/getBalance";
