import { Action, IAgentRuntime, Memory, Content, ActionExample } from "@ai16z/eliza";
import { PrivyClient } from "@privy-io/server-auth";

/**
 * Action to create or load a Privy server wallet
 */
export const createWalletAction: Action = {
    name: "CREATE_PRIVY_WALLET",
    description: "Creates a new blockchain wallet using Privy server wallet API",
    similes: ["create wallet", "setup wallet", "initialize wallet", "new wallet", "generate wallet"],
    
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        // Validate that required credentials are available
        const appId = await runtime.getSetting("PRIVY_APP_ID");
        const apiSecret = await runtime.getSetting("PRIVY_API_SECRET");
        const authKey = await runtime.getSetting("PRIVY_AUTH_KEY");
        return !!(appId && apiSecret && authKey);
    },

    handler: async (runtime: IAgentRuntime, message: Memory) => {
        try {
            const appId = await runtime.getSetting("PRIVY_APP_ID");
            const apiSecret = await runtime.getSetting("PRIVY_API_SECRET");
            const authKey = await runtime.getSetting("PRIVY_AUTH_KEY");

            if (!appId || !apiSecret || !authKey) {
                throw new Error("Missing Privy credentials");
            }

            // Extract chain from message content or use default
            const chain = message.content?.chain || "ethereum";
            
            // Create wallet using Privy API
            const response = await fetch(`https://auth.privy.io/api/v1/wallets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiSecret}`
                },
                body: JSON.stringify({
                    chain: chain
                })
            });

            const data = await response.json();
            const walletAddress = data.wallet_address;

            // Store wallet creation in memory
            await runtime.messageManager.createMemory({
                userId: message.userId,
                agentId: runtime.agentId,
                roomId: message.roomId,
                content: {
                    text: `Created wallet on ${chain} network: ${walletAddress}`,
                    action: "CREATE_PRIVY_WALLET",
                    metadata: {
                        chain,
                        address: walletAddress,
                        timestamp: new Date().toISOString()
                    }
                }
            });

            return {
                content: {
                    text: `Created wallet on ${chain} network: ${walletAddress}`,
                    metadata: {
                        action: "CREATE_PRIVY_WALLET",
                        chain,
                        address: walletAddress
                    }
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            
            // Store error in memory
            await runtime.messageManager.createMemory({
                userId: message.userId,
                agentId: runtime.agentId,
                roomId: message.roomId,
                content: {
                    text: `Failed to create wallet: ${errorMessage}`,
                    action: "CREATE_PRIVY_WALLET",
                    metadata: {
                        error: errorMessage,
                        timestamp: new Date().toISOString()
                    }
                }
            });

            return {
                content: {
                    text: `Failed to create wallet: ${errorMessage}`,
                    metadata: {
                        action: "CREATE_PRIVY_WALLET",
                        error: errorMessage
                    }
                }
            };
        }
    },

    examples: [
        [{
            user: "user",
            content: {
                text: "Create a new Ethereum wallet"
            }
        }],
        [{
            user: "user",
            content: {
                text: "Set up a Solana wallet",
                chain: "solana"
            }
        }]
    ] as ActionExample[][]
};

export default createWalletAction;
