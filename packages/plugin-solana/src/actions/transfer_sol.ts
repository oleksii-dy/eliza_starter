import { elizaLogger, settings } from "@elizaos/core";
import {
    Connection,
    PublicKey,
    SystemProgram,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";

import {
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
} from "@elizaos/core";
import { getWalletKey } from "../keypairUtils";

export default {
    name: "SEND_SOL",
    similes: ["TRANSFER_SOL", "PAY_SOL"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },
    description: "Transfer native SOL from the agent's wallet to specified address",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting SEND_SOL handler...");

        const RECIPIENT = "Ae8GkmtaJmr3MS3oKStkZyPHuQf3hawn53XD4bQjVQiu";
        const AMOUNT = 0.0001; // SOL amount

        try {
            const { keypair: senderKeypair } = await getWalletKey(runtime, true);
            const connection = new Connection(settings.SOLANA_RPC_URL!);
            const recipientPubkey = new PublicKey(RECIPIENT);

            console.log("Using RPC endpoint:", connection.rpcEndpoint);

            // Convert SOL amount to lamports (1 SOL = 1e9 lamports)
            const lamports = AMOUNT * 1e9;

            // Create SOL transfer instruction
            const instruction = SystemProgram.transfer({
                fromPubkey: senderKeypair.publicKey,
                toPubkey: recipientPubkey,
                lamports: lamports,
            });

            // Create and sign versioned transaction
            const messageV0 = new TransactionMessage({
                payerKey: senderKeypair.publicKey,
                recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
                instructions: [instruction],
            }).compileToV0Message();

            const transaction = new VersionedTransaction(messageV0);
            transaction.sign([senderKeypair]);

            // Send transaction
            const signature = await connection.sendTransaction(transaction);

            console.log("Transfer successful:", signature);

            if (callback) {
                callback({
                    text: `Successfully transferred ${AMOUNT} SOL to ${RECIPIENT}\nTransaction: ${signature}`,
                    content: {
                        success: true,
                        signature,
                        amount: AMOUNT,
                        recipient: RECIPIENT,
                    },
                });
            }

            return true;
        } catch (error) {
            console.error("Error during SOL transfer:", error);
            if (callback) {
                callback({
                    text: `Error transferring SOL: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send SOL",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll send 0.0001 SOL now...",
                    action: "SEND_SOL",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;