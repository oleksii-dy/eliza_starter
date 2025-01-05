import { Plugin } from "@elizaos/core";
import { WalletProvider } from "./providers/wallet.ts";
import runePortfolio from "./actions/runes/portfolio.ts";
import runeTransfer from "./actions/runes/transfer.ts";
import runePrice from "./actions/runes/price-information.ts";
import walletAddress from "./actions/wallet/address.ts";
import walletBalance from "./actions/wallet/balance.ts";
import ordinalsRareSats from './actions/ordinals/rare-sats.ts';
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
        ordinalsRareSats,
        txStatus,
        runePortfolio,
        runePrice,
    ],
    evaluators: [],
    providers: [],
};
