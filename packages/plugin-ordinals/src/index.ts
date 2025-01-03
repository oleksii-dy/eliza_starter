import { elizaLogger, Plugin } from "@elizaos/core";
import { walletProvider } from "./providers/wallet.ts";
import { WalletProvider } from "./providers/wallet.ts";
import runePortfolio from "./actions/runes/portfolio.ts";
import runeTransfer from "./actions/runes/transfer.ts";
import walletAddress from "./actions/wallet/address.ts";
import walletBalance from "./actions/wallet/balance.ts";
import walletUtxos from "./actions/wallet/utxo.ts";
import txStatus from "./actions/wallet/tx-status.ts";
export { WalletProvider };

export const ordinalsPlugin: Plugin = {
    name: "ordinals",
    description: "Ordinals Plugin for Eliza",
    actions: [
        runeTransfer,
        walletAddress,
        walletBalance,
        walletUtxos,
        txStatus,
        runePortfolio,
    ],
    evaluators: [],
    providers: [],
};
