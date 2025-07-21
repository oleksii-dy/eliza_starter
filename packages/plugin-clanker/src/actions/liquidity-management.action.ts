import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  logger,
} from '@elizaos/core';
import { parseUnits } from 'ethers';
import { LiquiditySchema } from '../types';
import { ClankerService } from '../services/clanker.service';
import { WalletService } from '../services/wallet.service';
import { formatTokenAmount, formatUsd, shortenAddress } from '../utils/format';
import { validateAddress, handleError } from '../utils/errors';

export const liquidityManagementAction: Action = {
  name: 'MANAGE_LIQUIDITY',
  similes: ['ADD_LIQUIDITY', 'REMOVE_LIQUIDITY', 'PROVIDE_LIQUIDITY', 'LP_TOKENS'],
  description: 'Add or remove liquidity for token pairs on Clanker protocol',
  
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    try {
      // Check if services are available
      const clankerService = runtime.getService(ClankerService.serviceType) as ClankerService;
      const walletService = runtime.getService(WalletService.serviceType) as WalletService;
      
      if (!clankerService || !walletService) {
        logger.warn('Required services not available for liquidity management');
        return false;
      }

      const text = message.content.text?.toLowerCase() || '';
      
      // Check for liquidity keywords
      const liquidityKeywords = ['liquidity', 'lp', 'pool', 'provide', 'add liquidity', 'remove liquidity'];
      const hasLiquidityIntent = liquidityKeywords.some(keyword => text.includes(keyword));
      
      return hasLiquidityIntent;
    } catch (error) {
      logger.error('Error validating liquidity management action:', error);
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: any,
    callback?: HandlerCallback,
    _responses?: Memory[]
  ): Promise<ActionResult> => {
    try {
      logger.info('Handling MANAGE_LIQUIDITY action');
      
      // Get services
      const clankerService = runtime.getService(ClankerService.serviceType) as ClankerService;
      const walletService = runtime.getService(WalletService.serviceType) as WalletService;
      
      if (!clankerService || !walletService) {
        throw new Error('Required services not available');
      }

      const text = message.content.text || '';
      const isRemoval = text.toLowerCase().includes('remove');
      
      if (isRemoval) {
        // Handle liquidity removal
        return await handleLiquidityRemoval(
          runtime,
          message,
          clankerService,
          walletService,
          callback
        );
      } else {
        // Handle liquidity addition
        return await handleLiquidityAddition(
          runtime,
          message,
          clankerService,
          walletService,
          callback
        );
      }
    } catch (error) {
      logger.error('Error in MANAGE_LIQUIDITY action:', error);
      const errorResponse = handleError(error);
      
      if (callback) {
        await callback({
          text: `❌ Liquidity operation failed: ${errorResponse.message}`,
          actions: ['MANAGE_LIQUIDITY'],
          source: message.content.source,
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Add liquidity with 1 ETH and 1000 USDC to the ETH/USDC pool',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: '✅ Liquidity added successfully!\n\nPool: ETH/USDC\nETH Added: 1.0\nUSDC Added: 1000.0\nLP Tokens Received: 31.62\nTransaction: 0xabcd...ef01',
          actions: ['MANAGE_LIQUIDITY'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Remove 50% of my liquidity from the BASE/ETH pool',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: '✅ Liquidity removed successfully!\n\nPool: BASE/ETH\nLP Tokens Burned: 50.0\nBASE Received: 10,000\nETH Received: 0.5\nTransaction: 0x1234...5678',
          actions: ['MANAGE_LIQUIDITY'],
        },
      },
    ],
  ],
};

async function handleLiquidityAddition(
  runtime: IAgentRuntime,
  message: Memory,
  clankerService: ClankerService,
  walletService: WalletService,
  callback?: HandlerCallback
): Promise<ActionResult> {
  const text = message.content.text || '';
  const params = await parseLiquidityParams(text);
  
  // Validate parameters
  const validation = LiquiditySchema.safeParse(params);
  if (!validation.success) {
    const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid parameters: ${errors}`);
  }

  const liquidityParams = validation.data;
  
  // Get token info for both tokens
  const [tokenAInfo, tokenBInfo] = await Promise.all([
    clankerService.getTokenInfo(liquidityParams.tokenA),
    clankerService.getTokenInfo(liquidityParams.tokenB),
  ]);

  // Check balances
  const [balanceA, balanceB] = await Promise.all([
    walletService.getBalance(liquidityParams.tokenA),
    walletService.getBalance(liquidityParams.tokenB),
  ]);

  const amountA = parseUnits(liquidityParams.amountA, tokenAInfo.decimals);
  const amountB = parseUnits(liquidityParams.amountB, tokenBInfo.decimals);

  if (balanceA < amountA) {
    throw new Error(
      `Insufficient ${tokenAInfo.symbol} balance. Have: ${formatTokenAmount(balanceA, tokenAInfo.decimals)}, ` +
      `Need: ${formatTokenAmount(amountA, tokenAInfo.decimals)}`
    );
  }

  if (balanceB < amountB) {
    throw new Error(
      `Insufficient ${tokenBInfo.symbol} balance. Have: ${formatTokenAmount(balanceB, tokenBInfo.decimals)}, ` +
      `Need: ${formatTokenAmount(amountB, tokenBInfo.decimals)}`
    );
  }

  // Add liquidity
  const result = await clankerService.addLiquidity({
    tokenA: liquidityParams.tokenA,
    tokenB: liquidityParams.tokenB,
    amountA,
    amountB,
    slippage: liquidityParams.slippage,
  });

  // Prepare response
  const responseText = 
    `✅ Liquidity added successfully!\n\n` +
    `Pool: ${tokenAInfo.symbol}/${tokenBInfo.symbol}\n` +
    `${tokenAInfo.symbol} Added: ${formatTokenAmount(result.actualAmounts[0], tokenAInfo.decimals)}\n` +
    `${tokenBInfo.symbol} Added: ${formatTokenAmount(result.actualAmounts[1], tokenBInfo.decimals)}\n` +
    `LP Tokens Received: ${formatTokenAmount(result.lpTokens, 18)}\n` +
    `Transaction: ${shortenAddress(result.transactionHash)}\n\n` +
    `View on BaseScan: https://basescan.org/tx/${result.transactionHash}`;

  if (callback) {
    await callback({
      text: responseText,
      actions: ['MANAGE_LIQUIDITY'],
      source: message.content.source,
    });
  }

  return {
    text: responseText,
    success: true,
    data: {
      operation: 'add_liquidity',
      lpTokens: result.lpTokens.toString(),
      transactionHash: result.transactionHash,
      tokenA: tokenAInfo.symbol,
      tokenB: tokenBInfo.symbol,
      amountA: result.actualAmounts[0].toString(),
      amountB: result.actualAmounts[1].toString(),
    },
  };
}

async function handleLiquidityRemoval(
  runtime: IAgentRuntime,
  message: Memory,
  clankerService: ClankerService,
  walletService: WalletService,
  callback?: HandlerCallback
): Promise<ActionResult> {
  // This is a simplified implementation
  // In a real scenario, you'd parse LP token amount and minimum amounts
  throw new Error('Liquidity removal not yet implemented');
}

async function parseLiquidityParams(text: string): Promise<any> {
  const params: any = {};

  // Extract token addresses
  const addresses = text.match(/0x[a-fA-F0-9]{40}/g);
  if (addresses && addresses.length >= 2) {
    params.tokenA = addresses[0];
    params.tokenB = addresses[1];
  }

  // Extract amounts
  const amounts = text.match(/(\d+(?:\.\d+)?)\s*(?:of\s+)?([A-Z]{2,10})/gi);
  if (amounts && amounts.length >= 2) {
    // This is simplified - in production you'd match amounts to specific tokens
    const match1 = amounts[0].match(/(\d+(?:\.\d+)?)/);
    const match2 = amounts[1].match(/(\d+(?:\.\d+)?)/);
    
    if (match1) params.amountA = match1[1];
    if (match2) params.amountB = match2[1];
  }

  // Extract slippage if mentioned
  const slippageMatch = text.match(/(\d+(?:\.\d+)?)\s*%?\s*slippage/i);
  if (slippageMatch) {
    params.slippage = parseFloat(slippageMatch[1]) / 100;
  }

  // Default values
  if (!params.tokenA || !params.tokenB) {
    throw new Error('Could not extract token addresses from message');
  }
  if (!params.amountA || !params.amountB) {
    throw new Error('Could not extract token amounts from message');
  }

  return params;
}