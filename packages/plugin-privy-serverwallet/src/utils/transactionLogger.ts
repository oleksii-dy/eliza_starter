import { IAgentRuntime, Memory, UUID } from "@ai16z/eliza";

interface Transaction {
    hash: string;
    from: string;
    to: string;
    value: string;
    status?: string;
    network?: string;
    timestamp?: number;
    blockNumber?: number;
    idempotencyKey?: string;
    useThirdPartyGas?: boolean;
    gasPayedBy?: string;
    metadata?: Record<string, any>;
}

/**
 * Stores a transaction in the agent's memory for future reference
 */
export async function storeTransactionMemory(runtime: IAgentRuntime, tx: Transaction) {
    const defaultUUID: UUID = "00000000-0000-0000-0000-000000000000";
    const memory: Memory = {
        userId: runtime.getSetting("USER_ID") as UUID || defaultUUID,
        agentId: runtime.agentId,
        roomId: runtime.getSetting("ROOM_ID") as UUID || defaultUUID,
        content: {
            text: `Transaction ${tx.hash} sent from ${tx.from} to ${tx.to} with value ${tx.value}${tx.network ? ` on ${tx.network}` : ''}`,
            action: "SEND_PRIVY_TRANSACTION",
            metadata: {
                transactionHash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                status: tx.status || 'pending',
                network: tx.network,
                timestamp: tx.timestamp || Date.now(),
                blockNumber: tx.blockNumber,
                ...(tx.idempotencyKey && { idempotencyKey: tx.idempotencyKey }),
                ...(tx.useThirdPartyGas && { useThirdPartyGas: tx.useThirdPartyGas }),
                ...(tx.gasPayedBy && { gasPayedBy: tx.gasPayedBy }),
                ...(tx.metadata && { metadata: tx.metadata })
            }
        }
    };

    await runtime.messageManager.createMemory(memory);
}

/**
 * Retrieves past transactions from the agent's memory
 */
export async function getPastTransactions(runtime: IAgentRuntime, roomId?: UUID): Promise<Memory[]> {
    const memories = await runtime.messageManager.getMemories({
        roomId: roomId || runtime.getSetting("ROOM_ID") as UUID || "00000000-0000-0000-0000-000000000000",
        unique: true
    });

    // Filter memories to only include transaction-related ones
    return memories.filter(memory => 
        memory.content.action === "SEND_PRIVY_TRANSACTION"
    );
}
