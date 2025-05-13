import { type Action, logger } from '@elizaos/core';
import { z } from 'zod';
import { formatUnits } from '../utils/formatters';
import { PolygonRpcService } from '../services/PolygonRpcService';
import { type TransactionDetails, type Hash } from '../types';

/**
 * Transaction options schema using Zod
 */
const txOptionsSchema = z.object({
  txHash: z.string()
    .refine(hash => /^0x[a-fA-F0-9]{64}$/.test(hash), {
      message: 'Transaction hash must be a valid 0x-prefixed hex string with 64 characters after prefix'
    })
});

/**
 * Action to get detailed information about a transaction on Polygon (L2)
 */
export const getTransactionDetailsAction: Action = {
  name: 'GET_L2_TRANSACTION_DETAILS',
  description: 'Gets transaction and receipt details for a transaction on Polygon (L2).',
  
  // Define examples
  examples: [],
  
  // Validation function 
  validate: async (options) => {
    try {
      txOptionsSchema.parse(options);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0].message;
      }
      return 'Invalid transaction options';
    }
  },
  
  // Actual handler function that performs the operation
  handler: async (runtime, message, state, options) => {
    // Get RPC service
    const rpcService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
    if (!rpcService) throw new Error('PolygonRpcService not available');
    
    // Get transaction hash from options
    const txHash = options?.txHash as Hash;
    if (!txHash || typeof txHash !== 'string') {
      throw new Error('Transaction hash is required');
    }
    
    logger.info(`Getting details for transaction ${txHash}`);
    
    // Fetch transaction details
    const txDetails = await rpcService.getTransactionDetails(txHash);
    if (!txDetails) {
      return {
        text: `Transaction ${txHash} not found on Polygon.`,
        actions: ['GET_L2_TRANSACTION_DETAILS'],
        data: { txHash, found: false }
      };
    }
    
    const { transaction, receipt } = txDetails;
    
    // Format response for readability
    const status = receipt?.status === 1 ? 'Success' : receipt?.status === 0 ? 'Failed' : 'Pending';
    const value = transaction?.value ? formatUnits(BigInt(transaction.value), 18) : '0';
    const gasPrice = transaction?.gasPrice ? formatUnits(BigInt(transaction.gasPrice), 9) : 'N/A';
    const gasUsed = receipt?.gasUsed ? formatUnits(BigInt(receipt.gasUsed), 0) : 'N/A';
    const effectiveGasPrice = receipt?.effectiveGasPrice 
      ? formatUnits(BigInt(receipt.effectiveGasPrice), 9) 
      : 'N/A';
    const txFee = (receipt?.gasUsed && receipt?.effectiveGasPrice) 
      ? formatUnits(BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice), 18) 
      : 'N/A';
        
    // Format timestamp if block exists
    let timestamp = 'Pending';
    if (receipt?.blockNumber) {
      try {
        const block = await rpcService.getBlock(receipt.blockNumber, 'L2');
        if (block?.timestamp) {
          timestamp = new Date(Number(block.timestamp) * 1000).toISOString();
        }
      } catch (error) {
        logger.error(`Error getting block for timestamp: ${error.message}`);
      }
    }
    
    // Create human-readable response
    const text = `Transaction ${txHash}:\n` +
      `Status: ${status}\n` +
      `Block: ${receipt?.blockNumber || 'Pending'}\n` +
      `Timestamp: ${timestamp}\n` +
      `From: ${transaction?.from || 'Unknown'}\n` +
      `To: ${transaction?.to || 'Contract Creation'}\n` +
      `Value: ${value} MATIC\n` +
      `Gas Price: ${gasPrice} Gwei\n` +
      `Gas Used: ${gasUsed}\n` +
      `Effective Gas Price: ${effectiveGasPrice} Gwei\n` +
      `Transaction Fee: ${txFee} MATIC`;
    
    return {
      text,
      actions: ['GET_L2_TRANSACTION_DETAILS'],
      data: { 
        txHash, 
        transaction, 
        receipt, 
        found: true,
        status,
        timestamp,
        value,
        fee: txFee
      }
    };
  },
}; 