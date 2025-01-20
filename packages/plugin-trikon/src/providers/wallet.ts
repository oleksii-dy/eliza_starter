import { elizaLogger, type Provider } from "@elizaos/core";

export interface WalletProvider {
    address: string;
    balance: string;
    getBalance(): Promise<string>;
    getAddress(): Promise<string>;
}

export const walletProvider: Provider = {
    get: async () => {
        elizaLogger.log("Getting Trikon wallet provider...");
        return {
            address: process.env.TRIKON_WALLET_ADDRESS || "0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0",
            balance: process.env.TRIKON_INITIAL_BALANCE || "0",
            getBalance: async () => process.env.TRIKON_INITIAL_BALANCE || "0",
            getAddress: async () => process.env.TRIKON_WALLET_ADDRESS || "0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0"
        };
    }
};

export default walletProvider;