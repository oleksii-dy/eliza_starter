import { Plugin } from "@elizaos/core";
import  transferToken  from "./actions/transfer.ts";
import { WalletProvider, walletProvider } from "./providers/wallet.ts";

export { WalletProvider, transferToken as TransferMinaToken };

export const minaPlugin: Plugin = {
    name: "mina",
    description: "MINA protocol integration plugin for ElizaOS",
    actions: [
        transferToken,
    ],
    evaluators: [],
    providers: [walletProvider],
};
export default minaPlugin;
