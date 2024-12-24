import { Action, IAgentRuntime, Memory, ActionExample } from "@ai16z/eliza";
import fetch from 'node-fetch';
import { storeTransactionMemory } from "../utils/transactionLogger";
import { v4 as uuidv4 } from 'uuid';

interface PrivyTransactionResponse {
    transaction_hash: string;
    status: string;
}

interface IdempotencyParams {
    idempotencyKey?: string;
    useGeneratedKey?: boolean;
}

export const sendTransactionAction: Action = {
    name: "SEND_PRIVY_TRANSACTION",
    description: "Send a transaction using the Privy server wallet",
    similes: ["send transaction", "transfer funds", "send crypto"],
    examples: [[
        {
            user: "user",
            content: {
                text: "Send 0.1 ETH to 0x123..."
            }
        }
    ], [
        {
            user: "user",
            content: {
                text: "Send 0.5 ETH to 0x456 using third party gas",
                useThirdPartyGas: true,
                gasPayedBy: "protocol"
            }
        }
    ]] as ActionExample[][],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Basic validation - ensure we have a wallet address and API key
        const address = await runtime.getSetting("PRIVY_WALLET_ADDRESS");
        const apiKey = await runtime.getSetting("PRIVY_API_KEY");
        return !!(address && apiKey);
    },
    handler: async (runtime: IAgentRuntime, message: any) => {
        const appId = runtime.getSetting("PRIVY_APP_ID");
        const apiSecret = runtime.getSetting("PRIVY_API_SECRET");
        const authKey = runtime.getSetting("PRIVY_AUTH_KEY");
        const fromAddress = runtime.getSetting("PRIVY_WALLET_ADDRESS");

        if (!appId || !apiSecret || !authKey || !fromAddress) {
            throw new Error("Missing Privy credentials or wallet address");
        }

        // Initialize headers with authentication
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiSecret}`
        };

        // Extract transaction details from message content
        const to = message.content?.to;
        const value = message.content?.value;
        const chainId = message.content?.chainId || "eip155:1";
        const idempotencyParams = message.content?.idempotency as IdempotencyParams || {};
        
        // Generate or use provided idempotency key
        const idempotencyKey = idempotencyParams.idempotencyKey || 
            (idempotencyParams.useGeneratedKey !== false ? uuidv4() : undefined);

        if (!to || !value) {
            throw new Error("Transaction recipient (to) and value are required");
        }

        // Send transaction using Privy API
        const response = await fetch(`https://auth.privy.io/api/v1/wallets/${fromAddress}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiSecret}`
            },
            body: JSON.stringify({
                chain_id: chainId,
                to,
                value,
                data: "0x", // Empty data for simple transfers
                ...(idempotencyKey && { idempotency_key: idempotencyKey }),
                ...(message.content?.useThirdPartyGas && { use_third_party_gas: true }),
                ...(message.content?.gasPayedBy && { gas_payed_by: message.content.gasPayedBy })
            })
        }).then(async res => {
            const data = await res.json();
            return data as PrivyTransactionResponse;
        });

        // Store transaction in memory with enhanced details
        await storeTransactionMemory(runtime, {
            hash: response.transaction_hash,
            from: fromAddress,
            to,
            value,
            status: response.status || "pending",
            network: chainId,
            idempotencyKey,
            useThirdPartyGas: message.content?.useThirdPartyGas,
            gasPayedBy: message.content?.gasPayedBy,
            metadata: message.content?.metadata,
            timestamp: Date.now()
        });

        return {
            content: {
                text: `Transaction sent. Hash: ${response.transaction_hash}`,
                metadata: {
                    action: "SEND_PRIVY_TRANSACTION",
                    transactionHash: response.transaction_hash,
                    status: response.status || "pending"
                }
            }
        };
    }
};
