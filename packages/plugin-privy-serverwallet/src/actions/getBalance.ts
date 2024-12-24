import { Action, IAgentRuntime, Memory, ActionExample } from "@ai16z/eliza";
import fetch from 'node-fetch';

interface PrivyBalanceResponse {
    native_balance: string;
    token_balances: Array<{
        token_address: string;
        balance: string;
        decimals: number;
        symbol: string;
    }>;
}

export const getBalanceAction: Action = {
    name: "GET_PRIVY_BALANCE",
    description: "Get the balance of a Privy server wallet",
    similes: ["check balance", "get wallet balance", "view funds"],
    examples: [[
        {
            user: "user",
            content: {
                text: "Check ETH balance"
            }
        }
    ], [
        {
            user: "user",
            content: {
                text: "Get wallet balance"
            }
        }
    ]] as ActionExample[][],
    validate: async (runtime: IAgentRuntime) => {
        const appId = runtime.getSetting("PRIVY_APP_ID");
        const apiSecret = runtime.getSetting("PRIVY_API_SECRET");
        const walletAddress = runtime.getSetting("PRIVY_WALLET_ADDRESS");
        return !!(appId && apiSecret && walletAddress);
    },
    handler: async (runtime: IAgentRuntime, message: any) => {
        const walletAddress = message.content?.walletAddress || runtime.getSetting("PRIVY_WALLET_ADDRESS");
        const chainId = message.content?.chainId || "eip155:1";
        const tokenAddresses = message.content?.tokenAddresses || [];
        
        if (!walletAddress) {
            throw new Error("Wallet address is required");
        }

        const appId = runtime.getSetting("PRIVY_APP_ID");
        const apiSecret = runtime.getSetting("PRIVY_API_SECRET");
        
        if (!appId || !apiSecret) {
            throw new Error("Missing Privy credentials");
        }

        const authKey = runtime.getSetting("PRIVY_AUTH_KEY");
        
        if (!authKey) {
            throw new Error("Missing Privy authorization key");
        }

        // Initialize headers with authentication
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiSecret}`
        };
        
        try {
            // Default to Ethereum mainnet if not specified
            const chainId = "eip155:1";
            
            const response = await fetch(`https://auth.privy.io/api/v1/wallets/${walletAddress}/balance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiSecret}`
                },
                body: JSON.stringify({
                    chain_id: chainId,
                    token_addresses: [] // Can be expanded to support specific tokens
                })
            }).then(async res => {
            const data = await res.json();
            return data as PrivyBalanceResponse;
        });

            const nativeBalance = response.native_balance;
            const formattedBalance = nativeBalance ? 
                `${nativeBalance} ETH` :
                "0 ETH";

            return {
                content: {
                    text: `Wallet ${walletAddress} balance: ${formattedBalance}`,
                    metadata: {
                        address: walletAddress,
                        balance: nativeBalance || "0",
                        symbol: "ETH",
                        chainId: chainId,
                        tokens: response.token_balances || []
                    }
                }
            };
        } catch (error) {
            throw new Error(`Failed to get wallet balance: ${error.message}`);
        }
    }
};
