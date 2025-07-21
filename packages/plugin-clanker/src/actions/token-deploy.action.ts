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
import { TokenDeploySchema } from '../types';
import { ClankerService } from '../services/clanker.service';
import { WalletService } from '../services/wallet.service';
import { formatTokenAmount, formatUsd, shortenAddress } from '../utils/format';
import { handleError } from '../utils/errors';

export const tokenDeployAction: Action = {
  name: 'DEPLOY_TOKEN',
  similes: ['CREATE_TOKEN', 'LAUNCH_TOKEN', 'MINT_TOKEN'],
  description: 'Deploy a new token on Base L2 using Clanker protocol',

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
        logger.warn('Required services not available for token deployment');
        return false;
      }

      // Extract text content
      const text = message.content.text?.toLowerCase() || '';

      // Check for deployment keywords
      const deploymentKeywords = ['deploy', 'create', 'launch', 'mint', 'token'];
      const hasDeploymentIntent = deploymentKeywords.some((keyword) => text.includes(keyword));

      return hasDeploymentIntent;
    } catch (error) {
      logger.error('Error validating token deployment action:', error);
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
      logger.info('Handling DEPLOY_TOKEN action');

      // Get services
      const clankerService = runtime.getService(ClankerService.serviceType) as ClankerService;
      const walletService = runtime.getService(WalletService.serviceType) as WalletService;

      if (!clankerService || !walletService) {
        throw new Error('Required services not available');
      }

      // Parse parameters from message
      const text = message.content.text || '';
      const params = await parseTokenDeploymentParams(text);

      // Validate parameters
      const validation = TokenDeploySchema.safeParse(params);
      if (!validation.success) {
        const errors = validation.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ');
        throw new Error(`Invalid parameters: ${errors}`);
      }

      const deployParams = validation.data;

      // Check wallet balance
      const balance = await walletService.getBalance();
      const estimatedCost = parseUnits('0.02', 18); // Estimated deployment cost

      if (balance < estimatedCost) {
        throw new Error(
          `Insufficient ETH balance. Have: ${formatTokenAmount(balance, 18)} ETH, ` +
            `Need: ${formatTokenAmount(estimatedCost, 18)} ETH`
        );
      }

      // Deploy token
      const result = await clankerService.deployToken({
        name: deployParams.name,
        symbol: deployParams.symbol,
        vanity: deployParams.vanity,
        image: deployParams.image,
        metadata: deployParams.metadata,
        context: deployParams.context,
        pool: deployParams.pool,
        fees: deployParams.fees,
        rewards: deployParams.rewards,
        vault: deployParams.vault,
        devBuy: deployParams.devBuy,
      });

      // Prepare response
      const responseText =
        `✅ Token deployed successfully!\n\n` +
        `Token: ${deployParams.name} (${deployParams.symbol})\n` +
        `Contract: ${shortenAddress(result.contractAddress)}\n` +
        `Total Supply: 1,000,000,000 ${deployParams.symbol} (1B tokens)\n` +
        `Transaction: ${shortenAddress(result.transactionHash)}\n` +
        `View on Clanker World: https://clanker.world/clanker/${result.contractAddress}\n` +
        `View on BaseScan: https://basescan.org/token/${result.contractAddress}`;

      if (callback) {
        await callback({
          text: responseText,
          actions: ['DEPLOY_TOKEN'],
          source: message.content.source,
        });
      }

      return {
        text: responseText,
        success: true,
        data: {
          contractAddress: result.contractAddress,
          transactionHash: result.transactionHash,
          tokenId: result.tokenId,
          deploymentCost: result.deploymentCost.toString(),
        },
      };
    } catch (error) {
      logger.error('Error in DEPLOY_TOKEN action:', error);
      const errorResponse = handleError(error);

      if (callback) {
        await callback({
          text: `❌ Token deployment failed: ${errorResponse.message}`,
          actions: ['DEPLOY_TOKEN'],
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
          text: 'Deploy a new token called "Based Token" with symbol BASE and 1 million supply',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: '✅ Token deployed successfully!\n\nToken: Based Token (BASE)\nContract: 0x1234...5678\nTotal Supply: 1,000,000,000 BASE (1B tokens)\nTransaction: 0xabcd...ef01\nView on Clanker World: https://clanker.world/clanker/0x1234...5678',
          actions: ['DEPLOY_TOKEN'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Create a memecoin called PEPE with 69 billion tokens',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: '✅ Token deployed successfully!\n\nToken: PEPE (PEPE)\nContract: 0x5678...1234\nTotal Supply: 1,000,000,000 PEPE (1B tokens)\nTransaction: 0xef01...abcd\nView on Clanker World: https://clanker.world/clanker/0x5678...1234',
          actions: ['DEPLOY_TOKEN'],
        },
      },
    ],
  ],
};

// Helper function to parse deployment parameters from natural language
async function parseTokenDeploymentParams(text: string): Promise<any> {
  // This is a simplified parser - in production, you might use AI to extract these
  const params: any = {
    vanity: false, // Default to no vanity address
  };

  // Extract token name (words after "called", "named", or in quotes)
  const nameMatch =
    text.match(/(?:called|named)\s+"?([^"]+)"?(?:\s|$)/i) || text.match(/"([^"]+)"/);
  if (nameMatch) {
    params.name = nameMatch[1].trim();
  }

  // Extract symbol (words after "symbol" or uppercase words)
  const symbolMatch = text.match(/symbol\s+(\w+)/i) || text.match(/\b([A-Z]{2,10})\b/);
  if (symbolMatch) {
    params.symbol = symbolMatch[1].toUpperCase();
  }

  // Check for vanity address request
  if (text.includes('vanity') || text.includes('custom address')) {
    params.vanity = true;
  }

  // Extract metadata if mentioned
  const metadata: any = {};

  const descMatch = text.match(/description[:\s]+"?([^"]+)"?/i);
  if (descMatch) {
    metadata.description = descMatch[1].trim();
  }

  // Extract social media URLs
  const socialMediaUrls: string[] = [];
  const websiteMatch = text.match(/website[:\s]+(\S+)/i);
  if (websiteMatch) {
    socialMediaUrls.push(websiteMatch[1]);
  }

  const twitterMatch = text.match(/twitter[:\s]+@?(\w+)/i);
  if (twitterMatch) {
    socialMediaUrls.push(`https://twitter.com/${twitterMatch[1]}`);
  }

  if (socialMediaUrls.length > 0) {
    metadata.socialMediaUrls = socialMediaUrls;
  }

  if (Object.keys(metadata).length > 0) {
    params.metadata = metadata;
  }

  // Extract IPFS image if mentioned
  const imageMatch = text.match(/image[:\s]+(ipfs:\/\/\S+)/i);
  if (imageMatch) {
    params.image = imageMatch[1];
  }

  // Extract dev buy amount if mentioned
  const devBuyMatch = text.match(/(?:dev buy|initial buy|buy)\s+(\d+(?:\.\d+)?)\s*eth/i);
  if (devBuyMatch) {
    params.devBuy = {
      ethAmount: parseFloat(devBuyMatch[1]),
    };
  }

  // Fallback values if not found
  if (!params.name) {
    params.name = 'New Token';
  }
  if (!params.symbol) {
    params.symbol = params.name
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 5);
  }

  return params;
}
