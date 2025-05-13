import { type Action, logger } from '@elizaos/core';
import { z } from 'zod';
import { formatUnits } from '../utils/formatters';
import { PolygonRpcService } from '../services/PolygonRpcService';
import { BlockInfo } from '../types';

// Action to get current block number from Polygon L2
export const getBlockNumberAction: Action = {
  name: 'GET_L2_BLOCK_NUMBER',
  description: 'Gets the current block number on Polygon (L2).',
  
  // Define examples for how to use this action
  examples: [],
  
  // Validation function
  validate: async () => true,
  
  // Actual handler function that performs the operation
  handler: async (runtime, message, state, options) => {
    logger.info('Getting current Polygon block number');
    
    // Get RPC service
    const rpcService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
    if (!rpcService) throw new Error('PolygonRpcService not available');
    
    // Fetch the current block number
    const blockNumber = await rpcService.getCurrentBlockNumber();
    
    return {
      text: `Current Polygon block number: ${blockNumber}`,
      actions: ['GET_L2_BLOCK_NUMBER'],
      data: { blockNumber }
    };
  },
};

// Action to get detailed information about a specific block
export const getBlockDetailsAction: Action = {
  name: 'GET_L2_BLOCK_DETAILS',
  description: 'Gets detailed information about a specific block on Polygon (L2).',
  
  // Define examples for how to use this action
  examples: [],
  
  // Validation function
  validate: async (options) => {
    if (!options?.blockIdentifier) {
      return 'Block identifier (number or hash) is required';
    }
    
    const blockIdentifier = options.blockIdentifier;
    if (typeof blockIdentifier === 'number') {
      if (blockIdentifier <= 0) {
        return 'Block number must be positive';
      }
    } else if (typeof blockIdentifier === 'string') {
      if (!blockIdentifier.match(/^0x[a-fA-F0-9]{64}$/)) {
        return 'Block hash must be a valid hex string';
      }
    } else {
      return 'Block identifier must be a number or hash string';
    }
    
    return true;
  },
  
  // Actual handler function that performs the operation
  handler: async (runtime, message, state, options) => {
    // Get RPC service
    const rpcService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
    if (!rpcService) throw new Error('PolygonRpcService not available');
    
    // Get block identifier from options
    const blockIdentifier = options?.blockIdentifier;
    if (!blockIdentifier) throw new Error('Block identifier (number or hash) is required');
    
    logger.info(`Getting details for block ${blockIdentifier}`);
    
    // Fetch block details
    const blockDetails = await rpcService.getBlockDetails(blockIdentifier);
    if (!blockDetails) {
      return {
        text: `Block ${blockIdentifier} not found on Polygon.`,
        actions: ['GET_L2_BLOCK_DETAILS'],
        data: { blockIdentifier, found: false }
      };
    }
    
    // Format timestamp for readability
    const timestamp = new Date(Number(blockDetails.timestamp) * 1000).toISOString();
    
    // Format the response
    const formattedGasLimit = formatUnits(blockDetails.gasLimit, 0);
    const formattedGasUsed = formatUnits(blockDetails.gasUsed, 0);
    const baseFeePerGas = blockDetails.baseFeePerGas ? formatUnits(blockDetails.baseFeePerGas, 9) : 'N/A';
    
    // Create human-readable response
    const text = `Block ${blockDetails.number} (${blockIdentifier}):\n` +
      `Hash: ${blockDetails.hash}\n` +
      `Parent Hash: ${blockDetails.parentHash}\n` +
      `Timestamp: ${timestamp}\n` +
      `Miner: ${blockDetails.miner}\n` +
      `Gas Limit: ${formattedGasLimit}\n` +
      `Gas Used: ${formattedGasUsed} (${(Number(blockDetails.gasUsed) * 100 / Number(blockDetails.gasLimit)).toFixed(2)}%)\n` +
      `Base Fee: ${baseFeePerGas} Gwei\n` +
      `Transaction Count: ${Array.isArray(blockDetails.transactions) ? blockDetails.transactions.length : 'Unknown'}`;
    
    return { 
      text,
      actions: ['GET_L2_BLOCK_DETAILS'],
      data: { blockIdentifier, blockDetails, found: true }
    };
  },
}; 