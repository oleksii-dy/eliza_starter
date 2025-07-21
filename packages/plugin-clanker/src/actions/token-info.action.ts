import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  logger,
} from '@elizaos/core';
import { ClankerService } from '../services/clanker.service';
import { formatTokenInfo } from '../utils/format';
import { validateAddress, handleError } from '../utils/errors';

export const tokenInfoAction: Action = {
  name: 'TOKEN_INFO',
  similes: ['GET_TOKEN_INFO', 'CHECK_TOKEN', 'TOKEN_DETAILS', 'TOKEN_STATS'],
  description: 'Get information about a token including price, liquidity, and market data',
  
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    try {
      // Check if service is available
      const clankerService = runtime.getService(ClankerService.serviceType) as ClankerService;
      if (!clankerService) {
        logger.warn('Clanker service not available for token info');
        return false;
      }

      const text = message.content.text?.toLowerCase() || '';
      
      // Check for info request keywords
      const infoKeywords = ['info', 'information', 'details', 'stats', 'price', 'liquidity', 'check'];
      const tokenKeywords = ['token', 'coin', 'contract'];
      
      const hasInfoIntent = infoKeywords.some(keyword => text.includes(keyword));
      const hasTokenMention = tokenKeywords.some(keyword => text.includes(keyword));
      
      // Also check if there's a potential address in the message
      const hasAddress = /0x[a-fA-F0-9]{40}/.test(text);
      
      return (hasInfoIntent && hasTokenMention) || hasAddress;
    } catch (error) {
      logger.error('Error validating token info action:', error);
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
      logger.info('Handling TOKEN_INFO action');
      
      // Get service
      const clankerService = runtime.getService(ClankerService.serviceType) as ClankerService;
      if (!clankerService) {
        throw new Error('Clanker service not available');
      }

      // Extract token address or symbol from message
      const text = message.content.text || '';
      const tokenIdentifier = extractTokenIdentifier(text);
      
      if (!tokenIdentifier) {
        throw new Error('No token address or symbol found in message');
      }

      let tokenAddress: string;
      
      // Check if it's an address
      if (validateAddress(tokenIdentifier)) {
        tokenAddress = tokenIdentifier;
      } else {
        // In a real implementation, you might look up the token by symbol
        // For now, we'll throw an error
        throw new Error(
          `Token lookup by symbol not yet implemented. Please provide the token contract address.`
        );
      }

      // Get token info
      const tokenInfo = await clankerService.getTokenInfo(tokenAddress);
      
      // Format response
      const responseText = 
        `📊 Token Information\n\n` +
        formatTokenInfo(tokenInfo) +
        `\n\nView on BaseScan: https://basescan.org/token/${tokenAddress}`;

      if (callback) {
        await callback({
          text: responseText,
          actions: ['TOKEN_INFO'],
          source: message.content.source,
        });
      }

      return {
        text: responseText,
        success: true,
        data: {
          tokenInfo: {
            address: tokenInfo.address,
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals,
            totalSupply: tokenInfo.totalSupply.toString(),
            price: tokenInfo.price,
            priceUsd: tokenInfo.priceUsd,
            volume24h: tokenInfo.volume24h?.toString(),
            holders: tokenInfo.holders,
            liquidity: tokenInfo.liquidity?.toString(),
            marketCap: tokenInfo.marketCap?.toString(),
          },
        },
      };
    } catch (error) {
      logger.error('Error in TOKEN_INFO action:', error);
      const errorResponse = handleError(error);
      
      if (callback) {
        await callback({
          text: `❌ Failed to get token information: ${errorResponse.message}`,
          actions: ['TOKEN_INFO'],
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
          text: 'Get info for token 0x1234567890abcdef1234567890abcdef12345678',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: '📊 Token Information\n\nToken: Example Token (EXT)\nAddress: 0x1234...5678\nPrice: $0.50\nMarket Cap: $5,000,000\nLiquidity: $500,000\nHolders: 1,234\n24h Volume: $250,000',
          actions: ['TOKEN_INFO'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'What is the price and liquidity of 0xabcdef1234567890abcdef1234567890abcdef12?',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: '📊 Token Information\n\nToken: Based Token (BASE)\nAddress: 0xabcd...ef12\nPrice: $0.001\nMarket Cap: $100,000\nLiquidity: $50,000\nHolders: 500\n24h Volume: $10,000',
          actions: ['TOKEN_INFO'],
        },
      },
    ],
  ],
};

// Helper function to extract token identifier from text
function extractTokenIdentifier(text: string): string | null {
  // First try to find an Ethereum address
  const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
  if (addressMatch) {
    return addressMatch[0];
  }

  // Then try to find a token symbol (uppercase letters)
  // This is simplified - in production you'd have better symbol detection
  const symbolMatch = text.match(/\b([A-Z]{2,10})\b/);
  if (symbolMatch) {
    return symbolMatch[1];
  }

  return null;
}