import type { Provider, IAgentRuntime } from "@elizaos/core";
import { AgentKit, CdpWalletProvider } from "@coinbase/agentkit";
import * as fs from "node:fs";

const WALLET_DATA_FILE = "wallet_data.txt";

export async function getClient(): Promise<AgentKit> {
    // Validate required environment variables first
    const apiKeyName = process.env.CDP_API_KEY_NAME;
    const apiKeyPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;

    if (!apiKeyName || !apiKeyPrivateKey) {
        throw new Error("Missing required CDP API credentials. Please set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY environment variables.");
    }

    let walletDataStr: string | null = null;

    // Read existing wallet data if available
    if (fs.existsSync(WALLET_DATA_FILE)) {
        try {
            walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
        } catch (error) {
            console.error("Error reading wallet data:", error);
            // Continue without wallet data
        }
    }

    // Configure CDP Wallet Provider
    const config = {
        apiKeyName:apiKeyName,
        apiKeyPrivateKey: apiKeyPrivateKey.replace(/\\n/g, "\n"),
        cdpWalletData: walletDataStr || undefined,
        networkId: process.env.CDP_AGENT_KIT_NETWORK || "base-sepolia",
    };

    const walletProvider = await CdpWalletProvider.configureWithWallet(config);

    // Initialize AgentKit with default providers
    const agentkit = await AgentKit.from({
        walletProvider,
    });

    // Save wallet data
    const exportedWallet = await walletProvider.exportWallet();
    fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));

    return agentkit;
}

export const walletProvider: Provider = {
    async get(_runtime: IAgentRuntime): Promise<string | null> {
        try {
            const client = await getClient();
            const address = await client.walletProvider.getAddress();
            return `AgentKit Wallet Address: ${address}`;
        } catch (error) {
            console.error("Error in AgentKit provider:", error);
            return `Error initializing AgentKit wallet: ${error.message}`;
        }
    },
};
