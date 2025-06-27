import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
  ModelType
} from '@elizaos/core';
import { DEXService } from '../services/DEXService.js';
import {
  type SwapQuoteRequest,
  type SwapExecuteRequest,
  DEXProtocol,
  SwapType,
  MAINNET_CHAINS,
  COMMON_TOKENS,
  DEFAULT_SLIPPAGE,
  SwapQuoteRequestSchema,
  DEXError,
  isSwapQuoteRequest
} from '../types/index.js';
import { validateAmount, validateChainId, validateTokenAddress } from '../utils/validation.js';
import { formatTokenAmount, formatPercentage, formatUSD } from '../utils/formatters.js';

const swapTemplate = `You are an expert DEX aggregator that helps users perform token swaps across multiple protocols.

Recent conversation:
{{recentMessages}}

Current request: "{{currentMessage}}"

Available information:
- Supported chains: Ethereum (1), Polygon (137), Arbitrum (42161), Optimism (10), Base (8453)
- Supported protocols: 1inch, Paraswap, Uniswap, SushiSwap, 0x, CowSwap
- Default slippage: 0.5%
- Maximum price impact warning: 15%

Common tokens per chain:
{{commonTokens}}

Extract swap parameters from the user's request. Look for:
1. From token (source token to swap from)
2. To token (destination token to swap to) 
3. Amount (how much to swap, can be number, "max", "all", or percentage like "50%")
4. Chain (which blockchain network)
5. Slippage tolerance (optional, default 0.5%)
6. Specific protocols to use (optional)

Examples:
- "Swap 100 USDC to ETH on Ethereum" 
- "Exchange all my MATIC for USDC on Polygon"
- "Trade 0.5 ETH for USDT with 1% slippage on Arbitrum"
- "Convert 50% of my DAI to WETH on Optimism using Uniswap"

Respond with a JSON object containing the swap parameters, or explain why the request cannot be processed.

Response format:
\`\`\`json
{
  "fromToken": "0x...", // Token contract address or symbol
  "toToken": "0x...", // Token contract address or symbol  
  "amount": "1000000", // Amount in wei/smallest unit, or "max"/"all"
  "chainId": 1, // Network chain ID
  "slippage": 0.5, // Slippage tolerance percentage
  "protocols": ["1inch", "paraswap"], // Optional: specific protocols
  "action": "get_quote" // or "execute_swap"
}
\`\`\`

If the request is unclear or missing required information, ask for clarification.`;

export const swapAction: Action = {
  name: 'DEX_SWAP',
  similes: ['SWAP_TOKENS', 'EXCHANGE_TOKENS', 'TRADE_TOKENS', 'CONVERT_TOKENS'],
  description: 'Performs token swaps using DEX aggregation for optimal pricing across multiple protocols',
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const dexService = runtime.getService<DEXService>('dex');
    if (!dexService) {
      return false;
    }

    const text = message.content.text?.toLowerCase();
    if (!text) return false;

    // Check for swap-related keywords
    const swapKeywords = [
      'swap', 'exchange', 'trade', 'convert', 'buy', 'sell',
      'from', 'to', 'for', 'eth', 'usdc', 'usdt', 'dai', 'weth',
      'matic', 'polygon', 'arbitrum', 'optimism', 'base'
    ];

    return swapKeywords.some(keyword => text.includes(keyword));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const dexService = runtime.getService<DEXService>('dex');
      if (!dexService) {
        throw new Error('DEX service not available');
      }

      // Prepare context for LLM
      const commonTokensText = Object.entries(MAINNET_CHAINS)
        .map(([name, chainId]) => {
          const tokens = COMMON_TOKENS[chainId];
          if (tokens) {
            const tokenList = Object.keys(tokens).join(', ');
            return `${name} (${chainId}): ${tokenList}`;
          }
          return `${name} (${chainId}): No common tokens defined`;
        })
        .join('\n');

      const context = swapTemplate
        .replace('{{recentMessages}}', state?.recentMessages || '')
        .replace('{{currentMessage}}', message.content.text || '')
        .replace('{{commonTokens}}', commonTokensText);

      // Get LLM response to extract swap parameters
      const response = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt: context,
        temperature: 0.1,
        maxTokens: 1000
      });

      let swapParams;
      try {
        // Extract JSON from response
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          swapParams = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        await callback?.({
          text: "I couldn't parse the swap parameters from your request. Please provide more specific details like:\n" +
                "- From token (e.g., USDC, ETH)\n" +
                "- To token (e.g., DAI, WETH)\n" +
                "- Amount (e.g., 100, 0.5, max)\n" +
                "- Chain (e.g., Ethereum, Polygon, Arbitrum)",
          thought: 'Failed to extract swap parameters from user request'
        });
        return { text: 'Parameter extraction failed' };
      }

      // Validate and process the swap request
      if (swapParams.action === 'get_quote') {
        return await handleGetQuote(runtime, swapParams, callback, dexService);
      } else if (swapParams.action === 'execute_swap') {
        return await handleExecuteSwap(runtime, swapParams, callback, dexService);
      } else {
        // Default to getting a quote first
        return await handleGetQuote(runtime, swapParams, callback, dexService);
      }

    } catch (error) {
      runtime.logger.error('DEX swap action failed:', error);
      
      await callback?.({
        text: `Failed to process swap request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        thought: 'Swap processing encountered an error'
      });

      return { text: 'Swap processing failed' };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: { text: 'Swap 100 USDC to ETH on Ethereum' }
      },
      {
        name: 'Agent',
        content: {
          text: 'I\'ll get the best quote for swapping 100 USDC to ETH on Ethereum...',
          thought: 'User wants to swap USDC to ETH, I need to get quotes from multiple DEX protocols',
          actions: ['DEX_SWAP']
        }
      }
    ],
    [
      {
        name: 'User', 
        content: { text: 'Exchange all my MATIC for USDC on Polygon with 1% slippage' }
      },
      {
        name: 'Agent',
        content: {
          text: 'I\'ll check your MATIC balance and get the best swap quote to USDC on Polygon with 1% slippage tolerance...',
          thought: 'User wants to swap all MATIC to USDC on Polygon network with custom slippage',
          actions: ['DEX_SWAP']
        }
      }
    ]
  ]
};

async function handleGetQuote(
  runtime: IAgentRuntime,
  params: any,
  callback?: HandlerCallback,
  dexService?: DEXService
): Promise<ActionResult> {
  try {
    // Validate parameters
    if (!validateAmount(params.amount)) {
      throw new Error(`Invalid amount: ${params.amount}`);
    }
    
    if (!validateChainId(params.chainId)) {
      throw new Error(`Unsupported chain: ${params.chainId}`);
    }

    // Convert token symbols to addresses if needed
    const fromTokenAddress = resolveTokenAddress(params.fromToken, params.chainId);
    const toTokenAddress = resolveTokenAddress(params.toToken, params.chainId);

    if (!validateTokenAddress(fromTokenAddress)) {
      throw new Error(`Invalid from token address: ${fromTokenAddress}`);
    }
    
    if (!validateTokenAddress(toTokenAddress)) {
      throw new Error(`Invalid to token address: ${toTokenAddress}`);
    }

    // Create quote request
    const quoteRequest: SwapQuoteRequest = {
      fromToken: fromTokenAddress,
      toToken: toTokenAddress,
      amount: params.amount === 'max' || params.amount === 'all' ? 
        await getMaxBalance(dexService!, fromTokenAddress, params.chainId) : 
        params.amount,
      chainId: params.chainId,
      userAddress: dexService!.account?.address || '0x0000000000000000000000000000000000000000',
      slippage: params.slippage || DEFAULT_SLIPPAGE,
      protocols: params.protocols,
      swapType: SwapType.EXACT_INPUT
    };

    // Validate request schema
    if (!isSwapQuoteRequest(quoteRequest)) {
      throw new Error('Invalid swap quote request format');
    }

    // Get quote from DEX service
    const quote = await dexService!.getQuote(quoteRequest);

    // Format response
    const fromAmount = formatTokenAmount(quote.fromAmount, quote.fromToken.decimals);
    const toAmount = formatTokenAmount(quote.toAmount, quote.toToken.decimals);
    const priceImpact = formatPercentage(quote.priceImpact);
    const protocolNames = quote.protocols.map(p => p.name).join(', ');

    const responseText = `💱 **DEX Swap Quote**\n\n` +
      `**Trade:** ${fromAmount} ${quote.fromToken.symbol} → ${toAmount} ${quote.toToken.symbol}\n` +
      `**Network:** ${getChainName(quote.chainId)}\n` +
      `**Best Route:** ${protocolNames}\n` +
      `**Price Impact:** ${priceImpact}\n` +
      `**Slippage:** ${formatPercentage(quote.slippage.toString())}\n` +
      `**Estimated Gas:** ${formatTokenAmount(quote.estimatedGas, 18)} ETH\n` +
      `**Quote Valid:** ${new Date(quote.validUntil).toLocaleTimeString()}\n\n` +
      `Would you like me to execute this swap?`;

    await callback?.({
      text: responseText,
      thought: `Got DEX quote: ${fromAmount} ${quote.fromToken.symbol} to ${toAmount} ${quote.toToken.symbol} via ${protocolNames}`
    });

    return {
      text: responseText,
      data: { quote, quoteRequest }
    };

  } catch (error) {
    const errorMessage = error instanceof DEXError ? 
      `DEX Error: ${error.message}` : 
      `Quote failed: ${error instanceof Error ? error.message : 'Unknown error'}`;

    await callback?.({
      text: errorMessage,
      thought: 'Failed to get swap quote from DEX aggregators'
    });

    return { text: errorMessage };
  }
}

async function handleExecuteSwap(
  runtime: IAgentRuntime,
  params: any,
  callback?: HandlerCallback,
  dexService?: DEXService
): Promise<ActionResult> {
  try {
    // This would typically require a quote from the previous step
    // For now, return message about needing confirmation
    await callback?.({
      text: "⚠️ Swap execution requires confirmation and gas fees. Please confirm you want to proceed with the swap.",
      thought: 'User requested swap execution, but this requires additional confirmation for safety'
    });

    return {
      text: 'Swap execution requires confirmation',
      data: { requiresConfirmation: true }
    };

  } catch (error) {
    await callback?.({
      text: `Swap execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      thought: 'Swap execution encountered an error'
    });

    return { text: 'Swap execution failed' };
  }
}

function resolveTokenAddress(token: string, chainId: number): string {
  // If already an address, return as-is
  if (token.startsWith('0x') && token.length === 42) {
    return token;
  }

  // Look up in common tokens
  const commonTokens = COMMON_TOKENS[chainId];
  if (commonTokens && commonTokens[token.toUpperCase()]) {
    return commonTokens[token.toUpperCase()];
  }

  // Return as-is if not found (will fail validation)
  return token;
}

async function getMaxBalance(service: DEXService, tokenAddress: string, chainId: number): Promise<string> {
  try {
    // This would get the actual token balance
    // For now, return a placeholder
    return '1000000000000000000'; // 1 token in wei
  } catch (error) {
    throw new Error(`Failed to get balance for token ${tokenAddress}`);
  }
}

function getChainName(chainId: number): string {
  const chainNames: { [key: number]: string } = {
    [MAINNET_CHAINS.ETHEREUM]: 'Ethereum',
    [MAINNET_CHAINS.POLYGON]: 'Polygon',
    [MAINNET_CHAINS.ARBITRUM]: 'Arbitrum',
    [MAINNET_CHAINS.OPTIMISM]: 'Optimism',
    [MAINNET_CHAINS.BASE]: 'Base'
  };

  return chainNames[chainId] || `Chain ${chainId}`;
}