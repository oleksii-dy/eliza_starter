import {
  type Action,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
} from '@elizaos/core';
import { BridgeService } from '../services/BridgeService.js';
import {
  type BridgeQuoteRequest,
  type BridgeExecuteParams,
  BridgeQuoteRequestSchema,
  BridgeError,
  MAINNET_CHAINS,
} from '../types/index.js';

export const bridgeAction: Action = {
  name: 'BRIDGE_TOKEN',
  similes: ['CROSS_CHAIN_TRANSFER', 'BRIDGE_ASSETS', 'MOVE_TOKENS', 'CHAIN_BRIDGE'],
  description: 'Bridge tokens across different blockchain networks using various protocols like LiFi, Wormhole, Hop, and Synapse',
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const bridgeService = runtime.getService<BridgeService>('bridge');
    if (!bridgeService) {
      return false;
    }

    const text = message.content.text?.toLowerCase() || '';
    
    // Check for bridge-related keywords
    const bridgeKeywords = [
      'bridge', 'cross-chain', 'move tokens', 'transfer to',
      'send to ethereum', 'send to polygon', 'send to arbitrum',
      'send to optimism', 'send to base', 'cross chain'
    ];

    const hasBridgeKeyword = bridgeKeywords.some(keyword => text.includes(keyword));
    
    // Check for chain names
    const chainKeywords = [
      'ethereum', 'polygon', 'arbitrum', 'optimism', 'base',
      'eth', 'matic', 'arb', 'op'
    ];
    
    const hasChainKeyword = chainKeywords.some(keyword => text.includes(keyword));
    
    return hasBridgeKeyword || (hasChainKeyword && text.includes('to'));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    elizaLogger.info('🌉 Processing bridge request...');

    try {
      const bridgeService = runtime.getService<BridgeService>('bridge');
      if (!bridgeService) {
        throw new BridgeError('Bridge service not available', 'SERVICE_UNAVAILABLE');
      }

      const text = message.content.text || '';
      const userAddress = bridgeService.getWalletAddress();

      // Parse bridge parameters from the message
      const bridgeParams = await parseBridgeRequest(text, runtime, state || { values: {}, data: {}, text: '' });
      
      if (!bridgeParams) {
        if (callback) {
          await callback({
            text: `I need more information to process your bridge request. Please specify:
- Source chain (ethereum, polygon, arbitrum, optimism, base)
- Destination chain
- Token to bridge (ETH, USDC, USDT, etc.)
- Amount to bridge

Example: "Bridge 100 USDC from Ethereum to Polygon"`,
            thought: 'User did not provide sufficient bridge parameters',
          });
        }
        return;
      }

      // Get bridge quote
      const quoteRequest: BridgeQuoteRequest = {
        fromChain: bridgeParams.fromChain,
        toChain: bridgeParams.toChain,
        fromToken: bridgeParams.fromToken,
        toToken: bridgeParams.toToken,
        fromAmount: bridgeParams.amount,
        userAddress,
        slippage: bridgeParams.slippage || 0.5,
      };

      elizaLogger.info('Getting bridge quote...', quoteRequest);
      const quote = await bridgeService.getQuote(quoteRequest);

      if (!quote.routes || quote.routes.length === 0) {
        if (callback) {
          await callback({
            text: `No bridge routes found from ${getChainName(bridgeParams.fromChain)} to ${getChainName(bridgeParams.toChain)} for ${bridgeParams.tokenSymbol}.`,
            thought: 'No bridge routes available for the requested parameters',
          });
        }
        return;
      }

      // Select the best route (first one is usually optimal)
      const bestRoute = quote.routes[0];
      
      const estimatedTimeMinutes = Math.ceil(bestRoute.estimatedTime / 60);
      const gasEstimate = formatTokenAmount(bestRoute.estimatedGas, 18); // Assume 18 decimals for gas
      const protocolFee = formatTokenAmount(bestRoute.fees.protocol, quote.fromToken.decimals);
      const totalFee = formatTokenAmount(bestRoute.fees.total, quote.fromToken.decimals);

      // Present the quote to the user
      if (callback) {
        await callback({
          text: `🌉 Bridge Quote Found!

**Route**: ${quote.fromToken.symbol} from ${quote.fromChain.name} → ${quote.toChain.name}
**Amount**: ${formatTokenAmount(quote.fromAmount, quote.fromToken.decimals)} ${quote.fromToken.symbol}
**You'll receive**: ~${formatTokenAmount(bestRoute.toAmount, quote.toToken.decimals)} ${quote.toToken.symbol}
**Protocol**: ${bestRoute.protocol.toUpperCase()}
**Estimated time**: ~${estimatedTimeMinutes} minutes
**Protocol fee**: ${protocolFee} ${quote.fromToken.symbol}
**Gas estimate**: ${gasEstimate} ETH
**Total fees**: ${totalFee} ${quote.fromToken.symbol}

Would you like me to execute this bridge transaction?`,
          thought: `Found bridge route via ${bestRoute.protocol} with ${bestRoute.steps.length} steps`,
        });
      }

      // Check if user wants to execute immediately
      if (text.toLowerCase().includes('execute') || text.toLowerCase().includes('confirm') || text.toLowerCase().includes('yes')) {
        elizaLogger.info('Executing bridge transaction...');
        
        const executeParams: BridgeExecuteParams = {
          route: bestRoute,
          userAddress,
          slippage: bridgeParams.slippage,
        };

        const result = await bridgeService.executeBridge(executeParams);

        if (callback) {
          await callback({
            text: `✅ Bridge transaction executed successfully!

**Transaction Hash**: ${result.txHash}
**Chain**: ${getChainName(result.chainId)}
**Status**: ${result.success ? 'Confirmed' : 'Failed'}

Your tokens are being bridged. You can track the progress using the transaction hash on the block explorer.`,
            thought: 'Bridge transaction executed successfully',
          });
        }

        // Store the transaction for future reference
        await runtime.createMemory({
          entityId: runtime.agentId,
          roomId: message.roomId,
          content: {
            text: `Bridge transaction: ${result.txHash}`,
            metadata: {
              type: 'bridge_transaction',
              txHash: result.txHash,
              chainId: result.chainId,
              route: bestRoute,
              timestamp: Date.now(),
            },
          },
        }, 'bridge_transactions');
      }

    } catch (error) {
      elizaLogger.error('Bridge action failed:', error);
      
      let errorMessage = 'Failed to process bridge request.';
      
      if (error instanceof BridgeError) {
        switch (error.code) {
          case 'INSUFFICIENT_BALANCE':
            errorMessage = `Insufficient balance. You need ${error.details.required} but only have ${error.details.available}.`;
            break;
          case 'UNSUPPORTED_CHAIN':
            errorMessage = `Chain ${error.details.chainId} is not supported. Supported chains: Ethereum, Polygon, Arbitrum, Optimism, Base.`;
            break;
          case 'BRIDGE_NOT_FOUND':
            errorMessage = `No bridge route found from chain ${error.details.fromChain} to chain ${error.details.toChain}.`;
            break;
          case 'SLIPPAGE_EXCEEDED':
            errorMessage = `Slippage exceeded. Expected ${error.details.expected} but got ${error.details.actual}.`;
            break;
          default:
            errorMessage = error.message;
        }
      }

      if (callback) {
        await callback({
          text: `❌ ${errorMessage}`,
          thought: 'Bridge request failed with error',
        });
      }
    }
  },

  examples: [
    [
      {
        name: 'user',
        content: {
          text: 'Bridge 100 USDC from Ethereum to Polygon',
        },
      },
      {
        name: 'assistant',
        content: {
          text: 'I\'ll help you bridge 100 USDC from Ethereum to Polygon. Let me get the best quote for you...',
          actions: ['BRIDGE_TOKEN'],
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Move 0.5 ETH to Arbitrum',
        },
      },
      {
        name: 'assistant',
        content: {
          text: 'I\'ll bridge 0.5 ETH to Arbitrum for you. Let me find the optimal route...',
          actions: ['BRIDGE_TOKEN'],
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Cross-chain transfer 1000 USDT from Polygon to Base',
        },
      },
      {
        name: 'assistant',
        content: {
          text: 'I\'ll set up a cross-chain transfer of 1000 USDT from Polygon to Base. Getting quote...',
          actions: ['BRIDGE_TOKEN'],
        },
      },
    ],
  ],
};

interface BridgeParams {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  amount: string;
  tokenSymbol: string;
  slippage?: number;
}

async function parseBridgeRequest(
  text: string,
  runtime: IAgentRuntime,
  state: State
): Promise<BridgeParams | null> {
  const lowerText = text.toLowerCase();

  // Extract amount and token
  const amountMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*([a-z]+)/i);
  if (!amountMatch) {
    return null;
  }

  const amount = amountMatch[1];
  const tokenSymbol = amountMatch[2].toUpperCase();

  // Map common token symbols to addresses
  const tokenAddresses: { [key: string]: string } = {
    'ETH': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    'USDC': '0xA0b86a33E6441436C3f91B584b2E06a24AB31F6b', // Example address
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Example address
    'MATIC': '0x0000000000000000000000000000000000001010',
    'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  };

  const fromToken = tokenAddresses[tokenSymbol] || tokenAddresses['ETH'];
  const toToken = fromToken; // Same token on destination chain

  // Extract chains
  const chains: { [key: string]: number } = {
    'ethereum': MAINNET_CHAINS.ETHEREUM,
    'eth': MAINNET_CHAINS.ETHEREUM,
    'polygon': MAINNET_CHAINS.POLYGON,
    'matic': MAINNET_CHAINS.POLYGON,
    'arbitrum': MAINNET_CHAINS.ARBITRUM,
    'arb': MAINNET_CHAINS.ARBITRUM,
    'optimism': MAINNET_CHAINS.OPTIMISM,
    'op': MAINNET_CHAINS.OPTIMISM,
    'base': MAINNET_CHAINS.BASE,
  };

  let fromChain: number | null = null;
  let toChain: number | null = null;

  // Look for "from X to Y" pattern
  const fromToMatch = lowerText.match(/from\s+(\w+)\s+to\s+(\w+)/);
  if (fromToMatch) {
    fromChain = chains[fromToMatch[1]] || null;
    toChain = chains[fromToMatch[2]] || null;
  } else {
    // Look for "to X" pattern (assume current chain is from)
    const toMatch = lowerText.match(/to\s+(\w+)/);
    if (toMatch) {
      toChain = chains[toMatch[1]] || null;
      fromChain = MAINNET_CHAINS.ETHEREUM; // Default to Ethereum
    }
  }

  if (!fromChain || !toChain) {
    return null;
  }

  // Convert amount to wei/smallest unit
  const decimals = tokenSymbol === 'USDC' || tokenSymbol === 'USDT' ? 6 : 18;
  const amountInSmallestUnit = (parseFloat(amount) * Math.pow(10, decimals)).toString();

  return {
    fromChain,
    toChain,
    fromToken,
    toToken,
    amount: amountInSmallestUnit,
    tokenSymbol,
    slippage: 0.5, // Default 0.5%
  };
}

function getChainName(chainId: number): string {
  const chainNames: { [key: number]: string } = {
    [MAINNET_CHAINS.ETHEREUM]: 'Ethereum',
    [MAINNET_CHAINS.POLYGON]: 'Polygon',
    [MAINNET_CHAINS.ARBITRUM]: 'Arbitrum',
    [MAINNET_CHAINS.OPTIMISM]: 'Optimism',
    [MAINNET_CHAINS.BASE]: 'Base',
  };
  return chainNames[chainId] || `Chain ${chainId}`;
}

function formatTokenAmount(amount: string, decimals: number): string {
  const value = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const quotient = value / divisor;
  const remainder = value % divisor;
  
  if (remainder === 0n) {
    return quotient.toString();
  }
  
  const remainderStr = remainder.toString().padStart(decimals, '0');
  const trimmedRemainder = remainderStr.replace(/0+$/, '');
  
  if (trimmedRemainder === '') {
    return quotient.toString();
  }
  
  return `${quotient}.${trimmedRemainder}`;
}