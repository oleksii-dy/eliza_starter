import { elizaLogger } from '@elizaos/core';
import {
  getSetComputeUnitLimitInstruction,
  getSetComputeUnitPriceInstruction
} from '@solana-program/compute-budget';
import {
  Transaction,
  PublicKey,
  Connection,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  Keypair
} from "@solana/web3.js";
import { Rpc, SolanaRpcApi, SendTransactionApi } from '@solana/rpc';

type SendTransactionParams = Parameters<SendTransactionApi['sendTransaction']>[0];

export async function sendTransaction(rpc: Rpc<SolanaRpcApi>, instructions: TransactionInstruction[], wallet: Keypair): Promise<string> {
  const latestBlockHash = await rpc.getLatestBlockhash().send();
  
  // Create a new transaction message
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: latestBlockHash.value.blockhash,
    instructions
  }).compileToV0Message();

  // Create a versioned transaction
  let transaction = new VersionedTransaction(messageV0);

  // Simulate transaction to get compute units
  const serializedForSim = Buffer.from(transaction.serialize()).toString('base64');
  const simulation = await rpc.simulateTransaction(serializedForSim as SendTransactionParams, {
    replaceRecentBlockhash: true,
    encoding: 'base64'
  }).send();

  const computeUnitEstimate = Number(simulation.value.unitsConsumed) || 200_000;
  const safeComputeUnitEstimate = Math.max(computeUnitEstimate * 1.3, computeUnitEstimate + 100_000);
  
  // Get prioritization fee
  const prioritizationFee = await rpc.getRecentPrioritizationFees()
    .send()
    .then(fees =>
      fees
        .map(fee => Number(fee.prioritizationFee))
        .sort((a, b) => a - b)
        [Math.ceil(0.95 * fees.length) - 1]
    );

  // Create compute budget instructions
  const computeBudgetInstructions = [
    getSetComputeUnitLimitInstruction({ units: safeComputeUnitEstimate }),
    getSetComputeUnitPriceInstruction({ microLamports: prioritizationFee })
  ];

  // Create new message with compute budget instructions
  const messageWithBudget = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: latestBlockHash.value.blockhash,
    instructions: [...computeBudgetInstructions, ...instructions]
  }).compileToV0Message();

  // Create final transaction
  transaction = new VersionedTransaction(messageWithBudget);
  
  // Sign the transaction
  transaction.sign([wallet]);

  const timeoutMs = 90000;
  const startTime = Date.now();
  // In the transaction sending loop:
  while (Date.now() - startTime < timeoutMs) {
    const transactionStartTime = Date.now();
    const serializedTransaction = Buffer.from(transaction.serialize()).toString('base64');
    
    const signature = await rpc.sendTransaction(serializedTransaction as SendTransactionParams, {
      maxRetries: 0n,
      skipPreflight: true,
      encoding: 'base64'
    }).send();

    const statuses = await rpc.getSignatureStatuses([signature]).send();
    if (statuses.value[0]) {
      if (!statuses.value[0].err) {
        elizaLogger.log(`Transaction confirmed: ${signature}`);
        return signature
      } else {
        throw new Error(`Transaction failed: ${statuses.value[0].err.toString()}`);
      }
    }
    const elapsedTime = Date.now() - transactionStartTime;
    const remainingTime = Math.max(0, 1000 - elapsedTime);
    if (remainingTime > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }
  }
  throw new Error('Transaction timeout');
}
