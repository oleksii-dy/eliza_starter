import { elizaLogger, type IAgentRuntime } from "@elizaos/core";
import { Connection, Keypair } from "@solana/web3.js";
import { decodeBase58 } from "../utils";

export class WalletProvider {
    constructor(private runtime?: IAgentRuntime) {}

    async get(runtime: IAgentRuntime): Promise<Keypair> {
        const privateKeyString = runtime?.getSetting("WALLET_PRIVATE_KEY");
        if (!privateKeyString) {
            throw new Error("No wallet private key configured");
        }

        try {
            const privateKeyBytes = decodeBase58(privateKeyString);
            return Keypair.fromSecretKey(privateKeyBytes);
        } catch (error) {
            elizaLogger.error("Failed to create wallet keypair:", error);
            throw error;
        }
    }

    async getConnection(runtime: IAgentRuntime): Promise<Connection> {
        return new Connection(
            runtime.getSetting("SOLANA_RPC_URL") || "https://api.mainnet-beta.solana.com"
        );
    }
}

export const walletProvider = new WalletProvider();