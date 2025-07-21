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
import { SwapSchema } from '../types';
import { ClankerService } from '../services/clanker.service';
import { WalletService } from '../services/wallet.service';
import { 
  formatTokenAmount, 
  formatUsd, 
  shortenAddress, 
  formatPercentage,
  calculatePriceImpact 
} from '../utils/format';
import { validateAddress, handleError } from '../utils/errors';

export const tokenSwapAction: Action = {
  name: 'SWAP_TOKENS',
  similes: ['SWAP', 'TRADE', 'EXCHANGE', 'CONVERT'],
  description: 'Swap tokens on Base L2 using Clanker protocol with optimal routing',
  
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
        logger.warn('Required services not available for token swap');
        return false;
      }

      const text = message.content.text?.toLowerCase() || '';
      
      // Check for swap keywords
      const swapKeywords = ['swap', 'trade', 'exchange', 'convert', 'sell', 'buy'];
      const hasSwapIntent = swapKeywords.some(keyword => text.includes(keyword));
      
      // Check for "from/to" or "for" patterns
      const hasSwapPattern = text.includes(' for ') || (text.includes('from') && text.includes('to'));
      
      return hasSwapIntent || hasSwapPattern;
    } catch (error) {
      logger.error('Error validating token swap action:', error);
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
      logger.info('Handling SWAP_TOKENS action');
      
      // Get services
      const clankerService = runtime.getService(ClankerService.serviceType) as ClankerService;
      const walletService = runtime.getService(WalletService.serviceType) as WalletService;
      
      if (!clankerService || !walletService) {
        throw new Error('Required services not available');
      }

      // Parse swap parameters
      const text = message.content.text || '';
      const params = await parseSwapParams(text);
      
      // Validate parameters
      const validation = SwapSchema.safeParse(params);
      if (!validation.success) {
        const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Invalid parameters: ${errors}`);
      }

      const swapParams = validation.data;
      
      // Get token info
      const [fromTokenInfo, toTokenInfo] = await Promise.all([
        clankerService.getTokenInfo(swapParams.fromToken),
        clankerService.getTokenInfo(swapParams.toToken),
      ]);

      // Check balance
      const balance = await walletService.getBalance(swapParams.fromToken);
      const swapAmount = parseUnits(swapParams.amount, fromTokenInfo.decimals);
      
      if (balance < swapAmount) {
        throw new Error(
          `Insufficient ${fromTokenInfo.symbol} balance. Have: ${formatTokenAmount(balance, fromTokenInfo.decimals)}, ` +
          `Need: ${formatTokenAmount(swapAmount, fromTokenInfo.decimals)}`
        );
      }

      // Execute swap
      const result = await clankerService.swapTokens({
        fromToken: swapParams.fromToken,
        toToken: swapParams.toToken,
        amount: swapAmount,
        slippage: swapParams.slippage,
        recipient: swapParams.recipient,
      });

      // Calculate values for display
      const inputValue = fromTokenInfo.priceUsd 
        ? Number(formatTokenAmount(swapAmount, fromTokenInfo.decimals)) * fromTokenInfo.priceUsd
        : undefined;
      
      const outputValue = toTokenInfo.priceUsd
        ? Number(formatTokenAmount(result.outputAmount, toTokenInfo.decimals)) * toTokenInfo.priceUsd
        : undefined;

      // Prepare response
      let responseText = 
        `✅ Swap executed successfully!\n\n` +
        `Swapped: ${formatTokenAmount(swapAmount, fromTokenInfo.decimals)} ${fromTokenInfo.symbol}`;
      
      if (inputValue) {
        responseText += ` (${formatUsd(inputValue)})`;
      }
      
      responseText += 
        `\nReceived: ${formatTokenAmount(result.outputAmount, toTokenInfo.decimals)} ${toTokenInfo.symbol}`;
      
      if (outputValue) {
        responseText += ` (${formatUsd(outputValue)})`;
      }
      
      responseText += 
        `\nPrice Impact: ${formatPercentage(result.priceImpact)}\n` +
        `Transaction: ${shortenAddress(result.transactionHash)}\n`;

      if (result.gasUsed) {
        responseText += `Gas Used: ${formatTokenAmount(result.gasUsed, 18)} ETH\n`;
      }

      responseText += `\nView on BaseScan: https://basescan.org/tx/${result.transactionHash}`;

      if (callback) {
        await callback({
          text: responseText,
          actions: ['SWAP_TOKENS'],
          source: message.content.source,
        });
      }

      return {
        text: responseText,
        success: true,
        data: {
          fromToken: fromTokenInfo.symbol,
          toToken: toTokenInfo.symbol,
          inputAmount: swapAmount.toString(),
          outputAmount: result.outputAmount.toString(),
          priceImpact: result.priceImpact,
          transactionHash: result.transactionHash,
          route: result.route,
        },
      };
    } catch (error) {
      logger.error('Error in SWAP_TOKENS action:', error);
      const errorResponse = handleError(error);
      
      if (callback) {
        await callback({
          text: `❌ Token swap failed: ${errorResponse.message}`,
          actions: ['SWAP_TOKENS'],
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
          text: 'Swap 1 ETH for USDC',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: '✅ Swap executed successfully!\n\nSwapped: 1.0 ETH ($3,000.00)\nReceived: 2,985.50 USDC ($2,985.50)\nPrice Impact: 0.48%\nTransaction: 0xabcd...ef01',
          actions: ['SWAP_TOKENS'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Trade 1000 USDC for BASE tokens with 1% slippage',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: '✅ Swap executed successfully!\n\nSwapped: 1,000.0 USDC ($1,000.00)\nReceived: 50,000.0 BASE ($995.00)\nPrice Impact: 0.50%\nTransaction: 0x1234...5678',
          actions: ['SWAP_TOKENS'],
        },
      },
    ],
  ],
};

async function parseSwapParams(text: string): Promise<any> {
  const params: any = {};

  // Extract token addresses
  const addresses = text.match(/0x[a-fA-F0-9]{40}/g);
  if (addresses && addresses.length >= 2) {
    params.fromToken = addresses[0];
    params.toToken = addresses[1];
  } else {
    // Try to parse token symbols and convert to addresses
    // This is simplified - in production you'd have a symbol-to-address mapping
    const tokens = parseTokensFromText(text);
    if (tokens) {
      params.fromToken = tokens.from;
      params.toToken = tokens.to;
    }
  }

  // Extract amount
  const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:of\s+)?([A-Z]{2,10}|\bETH\b|\bUSDC\b)/i);
  if (amountMatch) {
    params.amount = amountMatch[1];
  }

  // Extract slippage if mentioned
  const slippageMatch = text.match(/(\d+(?:\.\d+)?)\s*%?\s*slippage/i);
  if (slippageMatch) {
    params.slippage = parseFloat(slippageMatch[1]) / 100;
  }

  // Extract recipient if mentioned
  const recipientMatch = text.match(/to\s+address\s+(0x[a-fA-F0-9]{40})/i);
  if (recipientMatch) {
    params.recipient = recipientMatch[1];
  }

  // Validate required params
  if (!params.fromToken || !params.toToken) {
    throw new Error('Could not determine tokens to swap. Please specify token addresses or well-known symbols.');
  }
  if (!params.amount) {
    throw new Error('Could not determine swap amount. Please specify the amount to swap.');
  }

  return params;
}

function parseTokensFromText(text: string): { from: string; to: string } | null {
  // This is a simplified implementation
  // In production, you'd have a proper token registry
  
  const knownTokens: Record<string, string> = {
    'ETH': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    'WETH': '0x4200000000000000000000000000000000000006',
    'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    'BASE': '0x0000000000000000000000000000000000000000', // Placeholder
  };

  // Pattern: "swap X for Y" or "trade X to Y"
  const swapMatch = text.match(/(?:swap|trade|exchange|convert)\s+(?:\d+(?:\.\d+)?\s+)?(\w+)\s+(?:for|to)\s+(\w+)/i);
  if (swapMatch) {
    const fromSymbol = swapMatch[1].toUpperCase();
    const toSymbol = swapMatch[2].toUpperCase();
    
    if (knownTokens[fromSymbol] && knownTokens[toSymbol]) {
      return {
        from: knownTokens[fromSymbol],
        to: knownTokens[toSymbol],
      };
    }
  }

  // Pattern: "buy X with Y"
  const buyMatch = text.match(/buy\s+(?:\d+(?:\.\d+)?\s+)?(\w+)\s+with\s+(?:\d+(?:\.\d+)?\s+)?(\w+)/i);
  if (buyMatch) {
    const toSymbol = buyMatch[1].toUpperCase();
    const fromSymbol = buyMatch[2].toUpperCase();
    
    if (knownTokens[fromSymbol] && knownTokens[toSymbol]) {
      return {
        from: knownTokens[fromSymbol],
        to: knownTokens[toSymbol],
      };
    }
  }

  return null;
}