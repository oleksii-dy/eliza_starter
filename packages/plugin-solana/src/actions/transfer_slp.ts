import { elizaLogger, settings } from "@elizaos/core";
import { ComputeBudgetProgram } from "@solana/web3.js";
import {
    Connection,
    PublicKey,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";
import {
    createTransferInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    getAccount,
} from "@solana/spl-token";
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
    name: "SEND_TOKEN",
    similes: ["TRANSFER_TOKEN", "PAY_TOKEN"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        console.log("Validating transfer from user:", message);
        return true;
    },
    description: "Transfer SPL tokens from the agent's wallet to specified address",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting SEND_TOKEN handler...");

        const RECIPIENT = "Ae8GkmtaJmr3MS3oKStkZyPHuQf3hawn53XD4bQjVQiu";
        const AMOUNT = 0.0001;
        const TOKEN_MINT = new PublicKey("GEVqugYZESSzZaYU6SKdpW6znCCEtH7aoSTzPHbqpump");

        try {
            console.log("Getting sender keypair...");
            const { keypair: senderKeypair } = await getWalletKey(runtime, true);
            console.log("Sender public key:", senderKeypair.publicKey.toString());

            console.log("Establishing connection...");
            const connection = new Connection(settings.SOLANA_RPC_URL!, {
                commitment: 'confirmed',
                confirmTransactionInitialTimeout: 120000
            });

            // Test RPC configuration and connection
            console.log("RPC Configuration:", {
                url: settings.SOLANA_RPC_URL,
                commitment: connection.commitment,
                timeout: connection.confirmTransactionInitialTimeout
            });

            try {
                const blockHeight = await connection.getBlockHeight();
                console.log("Current block height:", blockHeight);
            } catch (err) {
                console.error("RPC connection test failed:", err);
                throw new Error("Failed to connect to RPC endpoint");
            }

            const recipientPubkey = new PublicKey(RECIPIENT);
            console.log("Recipient public key:", recipientPubkey.toString());

            console.log("Getting Associated Token Addresses...");
            const senderATA = await getAssociatedTokenAddress(
                TOKEN_MINT,
                senderKeypair.publicKey
            );
            const recipientATA = await getAssociatedTokenAddress(
                TOKEN_MINT,
                recipientPubkey
            );
            console.log("Sender ATA:", senderATA.toString());
            console.log("Recipient ATA:", recipientATA.toString());

            const instructions = [];

            // Check sender ATA
            console.log("Checking sender ATA existence...");
            try {
                const senderAccount = await getAccount(connection, senderATA);
                console.log("Sender ATA exists, balance:", senderAccount.amount.toString());
            } catch (e) {
                console.log("Sender ATA doesn't exist, creating instruction to create it");
                instructions.push(
                    createAssociatedTokenAccountInstruction(
                        senderKeypair.publicKey,
                        senderATA,
                        senderKeypair.publicKey,
                        TOKEN_MINT
                    )
                );
            }

            // Check recipient ATA
            console.log("Checking recipient ATA existence...");
            try {
                const recipientAccount = await getAccount(connection, recipientATA);
                console.log("Recipient ATA exists, balance:", recipientAccount.amount.toString());
            } catch (e) {
                console.log("Recipient ATA doesn't exist, creating instruction to create it");
                instructions.push(
                    createAssociatedTokenAccountInstruction(
                        senderKeypair.publicKey,
                        recipientATA,
                        recipientPubkey,
                        TOKEN_MINT
                    )
                );
            }

            const transferAmount = AMOUNT * Math.pow(10, 9);
            console.log("Creating transfer instruction for amount:", transferAmount);
            instructions.push(
                createTransferInstruction(
                    senderATA,
                    recipientATA,
                    senderKeypair.publicKey,
                    transferAmount
                )
            );
            console.log("Number of instructions to execute:", instructions.length);

            console.log("Getting latest blockhash...");
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            console.log("Blockhash:", blockhash, "Last Valid Height:", lastValidBlockHeight);

            console.log("Creating transaction message...");

            // Add compute budget instruction
            const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
                units: 300000  // This is fine for SPL transfers
            });

            // Add priority fee instruction - increased significantly
            const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 100000
            });

            // Add these instructions at the beginning
            instructions.unshift(computeBudgetIx, priorityFeeIx);

            const messageV0 = new TransactionMessage({
                payerKey: senderKeypair.publicKey,
                recentBlockhash: blockhash,
                instructions,
            }).compileToV0Message();

            // Check fees before sending
            const fees = await connection.getFeeForMessage(messageV0);
            console.log("Estimated transaction fees:", fees.value);

            const senderBalance = await connection.getBalance(senderKeypair.publicKey);
            console.log("Sender SOL balance:", senderBalance);

            if (fees.value > senderBalance) {
                throw new Error("Insufficient SOL for transaction fees");
            }

            console.log("Creating and signing transaction...");
            const transaction = new VersionedTransaction(messageV0);
            transaction.sign([senderKeypair]);
            console.log("Transaction signed successfully");

            console.log("Sending transaction...");
            const sendWithRetry = async (retries = 3) => {
                for (let i = 0; i < retries; i++) {
                    try {
                        console.log(`Sending transaction attempt ${i + 1}...`);
                        const signature = await connection.sendTransaction(transaction, {
                            skipPreflight: false,
                            preflightCommitment: 'confirmed',
                            maxRetries: 5
                        });
                        console.log(`Transaction sent with signature: ${signature}`);
                        return signature;
                    } catch (error) {
                        console.error(`Attempt ${i + 1} failed:`, error);
                        if (i === retries - 1) throw error;

                        // Get new blockhash for retry
                        const { blockhash: newBlockhash } = await connection.getLatestBlockhash('confirmed');
                        messageV0.recentBlockhash = newBlockhash;
                        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                    }
                }
            };

            const signature = await sendWithRetry();

            // Add transaction status monitoring
            console.log("Monitoring transaction status...");
            let status;
            try {
                // First check if transaction was actually sent
                status = await connection.getSignatureStatus(signature);
                console.log("Initial transaction status:", status);

                const confirmationPromise = new Promise(async (resolve, reject) => {
                    let retries = 0;
                    const maxRetries = 30; // 30 seconds total

                    const checkStatus = async () => {
                        try {
                            const status = await connection.getSignatureStatus(signature);
                            console.log(`Status check ${retries + 1}:`, status?.value);

                            if (status?.value?.err) {
                                reject(new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`));
                                return;
                            }

                            if (status?.value?.confirmationStatus === 'confirmed' ||
                                status?.value?.confirmationStatus === 'finalized') {
                                resolve(status);
                                return;
                            }

                            if (++retries >= maxRetries) {
                                reject(new Error("Transaction confirmation timeout"));
                                return;
                            }

                            setTimeout(checkStatus, 1000);
                        } catch (err) {
                            console.error("Error checking status:", err);
                            reject(err);
                        }
                    };

                    checkStatus();
                });

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Transaction confirmation timeout")), 90000)
                );

                const result = await Promise.race([confirmationPromise, timeoutPromise]);
                console.log("Final transaction result:", result);

                // Verify the transaction was successful
                const confirmedTransaction = await connection.getTransaction(signature, {
                    maxSupportedTransactionVersion: 0
                });

                if (!confirmedTransaction) {
                    throw new Error("Failed to fetch confirmed transaction");
                }

                console.log("Transaction details:", {
                    fee: confirmedTransaction.meta?.fee,
                    err: confirmedTransaction.meta?.err,
                    logs: confirmedTransaction.meta?.logMessages
                });

                if (confirmedTransaction.meta?.err) {
                    throw new Error(`Transaction failed: ${JSON.stringify(confirmedTransaction.meta.err)}`);
                }

                console.log("Transfer successful:", signature);

                const responseMessage = `Dobby has successfully transferred ${AMOUNT} tokens! Dobby is pleased to report the transaction signature is ${signature}. Dobby hopes the tokens serve you well!`;

                if (callback) {
                    await callback({
                        text: responseMessage,
                        content: {
                            success: true,
                            signature,
                            amount: AMOUNT,
                            recipient: RECIPIENT,
                            tokenMint: TOKEN_MINT.toString(),
                        },
                    });
                }

                return true;

            } catch (error) {
                console.error("Detailed error during confirmation:", error);
                console.error("Last known status:", status);
                throw error;
            }

        } catch (error) {
            console.error("Error during token transfer:", error);
            console.error("Error stack trace:", error.stack);
            console.error("Error type:", error.name);
            if (error.logs) {
                console.error("Transaction logs:", error.logs);
            }

            const errorMessage = `Oh dear! Dobby is most distressed! Dobby failed to transfer the tokens: ${error.message}${
                error.logs ? `\nDobby's error logs:\n${error.logs.join("\n")}` : ''
            }`;

            if (callback) {
                await callback({
                    text: errorMessage,
                    content: {
                        error: error.message,
                        logs: error.logs || []
                    },
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
                    text: "Send tokens",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll send 0.0001 tokens now...",
                    action: "SEND_TOKEN",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;