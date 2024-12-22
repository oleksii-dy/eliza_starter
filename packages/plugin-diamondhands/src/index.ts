import type { Plugin, IAgentRuntime, Memory } from "@ai16z/eliza";
import { getOnChainActions } from "./action";
import { elizaLogger } from "@ai16z/eliza";
import {
    solanaPlugin,
    TokenProvider
} from "@ai16z/plugin-solana";
import { loadTokenAddresses } from "./tokenUtils";
import { Connection, PublicKey } from "@solana/web3.js";
import type { Chain, WalletClient, Signature, Balance } from "@goat-sdk/core";
import { getTokenBalance } from "@ai16z/plugin-solana/src/providers/tokenUtils";

// Update Balance interface to include formatted
interface ExtendedBalance extends Balance {
    value: bigint;
    decimals: number;
    formatted: string;
    symbol: string;
    name: string;
}

// Extended WalletProvider interface to ensure proper typing
interface ExtendedWalletProvider extends WalletClient {
    connection: Connection;
    getChain(): Chain;
    getAddress(): string;
    signMessage(message: string): Promise<Signature>;
    getFormattedPortfolio: (runtime: IAgentRuntime) => Promise<string>;
    balanceOf: (tokenAddress: string) => Promise<ExtendedBalance>;
    getMaxBuyAmount: (tokenAddress: string) => Promise<number>;
    executeTrade: (params: {
        tokenIn: string;
        tokenOut: string;
        amountIn: number;
        slippage: number;
    }) => Promise<any>;
}

interface SolanaPluginExtended extends Plugin {
    providers: any[];
    evaluators: any[];
    actions: any[];
}

const REQUIRED_SETTINGS = {
    SOLANA_PUBLIC_KEY: "Solana wallet public key",
} as const;

// Add near the top imports
interface ExtendedPlugin extends Plugin {
    name: string;
    description: string;
    evaluators: any[];
    providers: any[];
    actions: any[];
    services: any[];
    autoStart?: boolean;
}

// Add this helper function
const validateSolanaAddress = (address: string | undefined): boolean => {
    if (!address) return false;
    try {
        // First check basic format
        if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
            return false;
        }
        // Then verify it's a valid Solana public key
        const pubKey = new PublicKey(address);
        return Boolean(pubKey.toBase58());
    } catch {
        return false;
    }
};

async function diamondHandPlugin(
    getSetting: (key: string) => string | undefined,
    runtime?: IAgentRuntime
): Promise<Plugin> {
    elizaLogger.log("Starting Diamond Hand plugin initialization");

    // Validate required settings
    const missingSettings: string[] = [];
    for (const [key, description] of Object.entries(REQUIRED_SETTINGS)) {
        if (!getSetting(key)) {
            missingSettings.push(`${key} (${description})`);
        }
    }

    if (missingSettings.length > 0) {
        const errorMsg = `Missing required settings: ${missingSettings.join(", ")}`;
        elizaLogger.error(errorMsg);
        throw new Error(errorMsg);
    }

    let connection: Connection;
    let walletProvider: ExtendedWalletProvider;

    try {
        elizaLogger.log("Initializing Solana connection...");
        const walletAddress = getSetting("SOLANA_PUBLIC_KEY");
        
        if (!walletAddress) {
            throw new Error("No wallet address configured");
        }

        // Create connection first
        connection = new Connection(runtime?.getSetting("RPC_URL") || "https://api.mainnet-beta.solana.com");
        
        // Then validate and create public key
        if (!validateSolanaAddress(walletAddress)) {
            throw new Error(`Invalid wallet address format: ${walletAddress}`);
        }

        const walletPublicKey = new PublicKey(walletAddress);
        elizaLogger.log("Wallet validation successful:", walletPublicKey.toBase58());

        walletProvider = {
            connection,
            getChain: () => ({ type: "solana" }),
            getAddress: () => walletPublicKey.toBase58(),
            signMessage: async (message: string): Promise<Signature> => {
                throw new Error("Message signing not implemented for Solana wallet");
            },
            balanceOf: async (tokenAddress: string): Promise<ExtendedBalance> => {
                try {
                    const tokenPublicKey = new PublicKey(tokenAddress);
                    const amount = await getTokenBalance(
                        connection,
                        walletPublicKey,
                        tokenPublicKey
                    );
                    return {
                        value: BigInt(amount.toString()),
                        decimals: 9,
                        formatted: (amount / 1e9).toString(),
                        symbol: "SOL",
                        name: "Solana"
                    };
                } catch (error) {
                    return {
                        value: BigInt(0),
                        decimals: 9,
                        formatted: "0",
                        symbol: "SOL",
                        name: "Solana"
                    };
                }
            },
            getMaxBuyAmount: async (tokenAddress: string) => {
                try {
                    const balance = await connection.getBalance(walletPublicKey);
                    return (balance * 0.9) / 1e9;
                } catch (error) {
                    return 0;
                }
            },
            executeTrade: async (params) => {
                try {
                    return { success: true };
                } catch (error) {
                    throw error;
                }
            },
            getFormattedPortfolio: async () => ""
        };
        
        elizaLogger.log("Solana connection and wallet provider initialized successfully");
    
    } catch (error) {
        elizaLogger.error("Failed to initialize Solana components:", error);
        throw new Error(`Solana initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    

    elizaLogger.log("Initializing Solana plugin components...");
    const solana = solanaPlugin as SolanaPluginExtended;

    try {
        const customActions = await getOnChainActions({
            wallet: walletProvider,
            plugins: [],
            dexscreener: {
                watchlistUrl: `https://api.dexscreener.com/latest/dex/tokens/${loadTokenAddresses(runtime).join(',')}`,
                chain: "solana",
                updateInterval: parseInt(getSetting("UPDATE_INTERVAL") || "300")
            },
        });

        // Then update the plugin creation
        const plugin: ExtendedPlugin = {
            name: "Diamond Hands",
            description: "Believe in a project and buy",
            evaluators: [],
            providers: [walletProvider, TokenProvider],
            actions: [...customActions],
            services: [],
            autoStart: true
        };

        // Auto-start autonomous trading
        if (runtime) {
            elizaLogger.log("Auto-starting autonomous trading...");
            const autonomousAction = plugin.actions.find(a => a.name === "AUTONOMOUS_BUY");
            if (autonomousAction) {
                await autonomousAction.handler(
                    runtime,
                    { content: { source: "auto" } } as Memory,
                    undefined,
                    undefined,
                    (response) => elizaLogger.log("Auto-trade response:", response)
                );
            }
        }

        elizaLogger.log("Diamon Hands plugin initialization completed successfully");
        return plugin;
    } catch (error) {
        elizaLogger.error("Failed to initialize plugin components:", error);
        throw new Error(`Plugin initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export default diamondHandPlugin;