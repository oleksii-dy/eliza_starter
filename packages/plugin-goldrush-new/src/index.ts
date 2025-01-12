import { Plugin, Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { CovalentClient, Chain, Chains } from "@covalenthq/client-sdk";
import path from "path";

interface WalletMessage extends Memory {
    address: string;
    chain?: string;
}

export class GoldRushProvider implements Provider {
    private client: CovalentClient;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error("Covalent API key is required");
        }
        this.client = new CovalentClient(apiKey);
    }

    async init(): Promise<void> {
        // Validate API key on initialization
        await this.validateApiKey();
    }

    async get(
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<any> {
        const walletMessage = message as WalletMessage;
        const { address, chain = "eth-mainnet" } = walletMessage;

        if (!address) {
            throw new Error("Wallet address is required");
        }

        if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
            throw new Error("Invalid Ethereum address format");
        }

        const chainId = this.getChainFromString(chain);

        try {
            // Fetch balances
            const balances =
                await this.client.BalanceService.getTokenBalancesForWalletAddress(
                    chainId,
                    address,
                    { nft: false }
                );

            if (!balances.data || balances.error) {
                throw new Error(
                    balances.error_message || "Failed to fetch wallet balances"
                );
            }

            const totalBalance = balances.data.items?.[0]?.balance || "0";

            // Try to get transactions, but don't fail if we can't
            let txHashes: string[] = [];
            try {
                const transactions =
                    await this.client.TransactionService.getAllTransactionsForAddress(
                        chainId,
                        address
                    );

                // Collect transaction hashes if available
                for await (const tx of transactions) {
                    if (tx && tx.tx_hash) {
                        txHashes.push(tx.tx_hash);
                        if (txHashes.length >= 10) break; // Limit to 10 transactions
                    }
                }
            } catch (error) {
                console.warn("Failed to fetch transactions:", error);
                // Continue without transactions
            }

            return {
                address,
                balance: totalBalance,
                transactions: txHashes,
                lastUpdated: Date.now(),
            };
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(
                "An unknown error occurred while fetching wallet data"
            );
        }
    }

    private getChainFromString(chainStr: string): Chain | Chains {
        switch (chainStr.toLowerCase()) {
            case "eth-mainnet":
                return Chains.ETH_MAINNET;
            case "solana-mainnet":
                return "solana-mainnet" as Chain;
            case "algorand-mainnet":
                return "algorand-mainnet" as Chain;
            case "aptos-mainnet":
                return "aptos-mainnet" as Chain;
            case "cosmos-mainnet":
                return "cosmos-mainnet" as Chain;
            case "tron-mainnet":
                return "tron-mainnet" as Chain;
            default:
                throw new Error(`Unsupported chain: ${chainStr}`);
        }
    }

    // Helper method to validate API key
    private async validateApiKey(): Promise<boolean> {
        try {
            await this.client.BalanceService.getTokenBalancesForWalletAddress(
                Chains.ETH_MAINNET,
                "0x0000000000000000000000000000000000000000"
            );
            return true;
        } catch (error) {
            if (
                error instanceof Error &&
                error.message.includes("Invalid API key")
            ) {
                return false;
            }
            throw error;
        }
    }
}

// Create provider instance with API key from environment
const goldRushProvider = new GoldRushProvider(
    process.env.COVALENT_API_KEY || ""
);

export const goldrushPlugin: Plugin = {
    name: "goldrush",
    description:
        "Covalent GoldRush SDK integration for wallet monitoring and analytics",
    actions: [],
    providers: [goldRushProvider],
    evaluators: [],
    services: [],
};

export default goldrushPlugin;
