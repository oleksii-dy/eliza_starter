import { type Action, logger } from '@elizaos/core';
import { z } from 'zod';
import { formatUnits, normalizeAddress } from '../utils/formatters';
import { PolygonRpcService } from '../services/PolygonRpcService';
import { type Address } from '../types';

/**
 * Action to get MATIC balance for an address on Polygon (L2)
 */
export const getNativeBalanceAction: Action = {
  name: 'GET_MATIC_BALANCE',
  description: "Gets the MATIC balance for an address on Polygon (L2).",
  
  // Define examples for this action
  examples: [],
  
  // Validation function
  validate: async () => true,
  
  // Actual handler function that performs the operation
  handler: async (runtime, message, state, options) => {
    // Get RPC service
    const rpcService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
    if (!rpcService) throw new Error('PolygonRpcService not available');
    
    // Get address from options or use agent's address
    let targetAddress = options?.address as Address;
    if (!targetAddress) {
      targetAddress = runtime.getSetting('AGENT_ADDRESS') as Address;
      if (!targetAddress) throw new Error('Address not provided and agent address not found');
    }
    
    // Ensure address is in correct format with 0x prefix
    if (!targetAddress.startsWith('0x')) {
      targetAddress = normalizeAddress(targetAddress);
    }
    
    logger.info(`Fetching MATIC balance for address: ${targetAddress}`);
    
    // Get the MATIC balance
    const balanceWei = await rpcService.getNativeBalance(targetAddress);
    
    // Format the balance for display (18 decimals for MATIC)
    const balanceMatic = formatUnits(balanceWei, 18);
    
    // Create readable response
    let text;
    if (targetAddress === runtime.getSetting('AGENT_ADDRESS')) {
      text = `Your MATIC balance: ${balanceMatic} MATIC`;
    } else {
      text = `MATIC balance for ${targetAddress}: ${balanceMatic} MATIC`;
    }
    
    return {
      text,
      actions: ['GET_MATIC_BALANCE'],
      data: { 
        address: targetAddress, 
        balanceWei: balanceWei.toString(), 
        balanceMatic,
        formattedBalance: `${parseFloat(balanceMatic).toLocaleString()} MATIC`
      }
    };
  },
};

/**
 * Action to get ERC20 token balance for an address on Polygon (L2)
 */
export const getErc20BalanceAction: Action = {
  name: 'GET_ERC20_BALANCE',
  description: "Gets an ERC20 token balance for an address on Polygon (L2).",
  
  // Define examples for this action
  examples: [],
  
  // Validation function
  validate: async () => true,
  
  // Actual handler function that performs the operation
  handler: async (runtime, message, state, options) => {
    // Get RPC service
    const rpcService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
    if (!rpcService) throw new Error('PolygonRpcService not available');
    
    // Get token address
    const tokenAddress = options?.tokenAddress as Address;
    if (!tokenAddress || typeof tokenAddress !== 'string') {
      throw new Error('Token address is required');
    }
    
    // Get account address from options or use agent's address
    let accountAddress = options?.accountAddress as Address;
    if (!accountAddress) {
      accountAddress = runtime.getSetting('AGENT_ADDRESS') as Address;
      if (!accountAddress) throw new Error('Account address not provided and agent address not found');
    }
    
    logger.info(`Fetching token (${tokenAddress}) balance for address: ${accountAddress}`);
    
    // Get token balance using service methods
    const tokenMetadata = {
      symbol: options?.symbol as string || 'UNKNOWN',
      decimals: Number(options?.decimals) || 18
    };
    
    // Get token balance
    const balanceWei = await rpcService.getErc20Balance(
      normalizeAddress(tokenAddress), 
      normalizeAddress(accountAddress)
    );
    
    // Format the balance using token decimals
    const formattedBalance = formatUnits(balanceWei, tokenMetadata.decimals);
    
    // Create readable response
    let text;
    if (accountAddress === runtime.getSetting('AGENT_ADDRESS')) {
      text = `Your ${tokenMetadata.symbol} balance: ${formattedBalance} ${tokenMetadata.symbol}`;
    } else {
      text = `${tokenMetadata.symbol} balance for ${accountAddress}: ${formattedBalance} ${tokenMetadata.symbol}`;
    }
    
    return {
      text,
      actions: ['GET_ERC20_BALANCE'],
      data: { 
        tokenAddress,
        accountAddress, 
        balanceWei: balanceWei.toString(), 
        formattedBalance: `${parseFloat(formattedBalance).toLocaleString()} ${tokenMetadata.symbol}`,
        token: tokenMetadata
      }
    };
  },
}; 