import { elizaLogger, Plugin } from "@elizaos/core";
import { walletProvider } from "./providers/wallet.ts";
import { WalletProvider } from "./providers/wallet.ts";
import runeTransfer from "./actions/rune-transfer.ts";
import { createResourceAction } from "./actions/sampleAction";
export { WalletProvider };

export const ordinalsPlugin: Plugin = {
    name: "ordinals",
    description: "Ordinals Plugin for Eliza",
    actions: [runeTransfer, createResourceAction],
    evaluators: [],
    providers: [],
};
