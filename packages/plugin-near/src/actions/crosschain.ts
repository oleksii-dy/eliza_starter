import {
  type ActionExample,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  elizaLogger,
  type Action,
  ModelType,
  composePrompt,
  parseKeyValueXml,
} from '@elizaos/core';
import { z } from 'zod';
import { CrossChainService } from '../services/CrossChainService';
import { NearPluginError, formatErrorMessage, isNearError } from '../core/errors';
import type { CrossChainParams } from '../core/types';

export const CrossChainSchema = z.object({
  targetChain: z.string(),
  recipientAddress: z.string(),
  amount: z.string(),
  tokenId: z.string().optional().nullable(),
});

const crossChainExtractionTemplate = `# Task: Extract cross-chain bridge parameters from user message

# Recent Messages:
{{recentMessages}}

# Instructions:
Analyze the user's message to extract:
1. The target blockchain (ethereum, avalanche, polygon, base, arbitrum, bsc, aurora)
2. The recipient address on the target chain (0x... format for EVM chains)
3. The amount to bridge
4. The token (NEAR if not specified, or token contract)

Return the values in XML format:
<response>
  <targetChain>chain-name</targetChain>
  <recipientAddress>0x...</recipientAddress>
  <amount>number as string</amount>
  <tokenId>token-contract.near or empty for NEAR</tokenId>
</response>

Examples:
- "Bridge 50 NEAR to my Ethereum wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f6c123"
<response>
  <targetChain>ethereum</targetChain>
  <recipientAddress>0x742d35Cc6634C0532925a3b844Bc9e7595f6c123</recipientAddress>
  <amount>50</amount>
  <tokenId></tokenId>
</response>

- "Send 100 USDC to 0xabc...def on Polygon"
<response>
  <targetChain>polygon</targetChain>
  <recipientAddress>0xabc...def</recipientAddress>
  <amount>100</amount>
  <tokenId>usdc.fakes.testnet</tokenId>
</response>`;

export const executeCrossChain: Action = {
  name: 'BRIDGE_TO_CHAIN',
  similes: ['BRIDGE_NEAR', 'CROSS_CHAIN_TRANSFER', 'SEND_TO_ETH', 'BRIDGE_TOKENS'],
  validate: async (_runtime: IAgentRuntime, _message: Memory) => {
    return true;
  },
  description: 'Bridge tokens from NEAR to another blockchain using Rainbow Bridge',
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<void> => {
    try {
      // Use LLM to extract bridge parameters
      const prompt = composePrompt({
        state: {
          recentMessages: message.content.text || '',
        },
        template: crossChainExtractionTemplate,
      });

      const xmlResponse = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt,
      });

      // Parse XML response
      const extractedParams = parseKeyValueXml(xmlResponse);

      // Validate extraction
      if (
        !extractedParams ||
        !extractedParams.targetChain ||
        !extractedParams.recipientAddress ||
        !extractedParams.amount
      ) {
        elizaLogger.error('Failed to extract bridge parameters', extractedParams);
        callback?.({
          text: 'I need the target chain, recipient address, and amount to bridge. For example: "Bridge 50 NEAR to my Ethereum wallet 0x..."',
          content: { error: 'Missing required parameters' },
        });
        return;
      }

      // Get cross-chain service
      const service = runtime.getService('near-crosschain' as any);

      if (!service) {
        throw new Error('Cross-chain service not available');
      }

      const crossChainService = service as unknown as CrossChainService;

      // Prepare bridge parameters
      const params: CrossChainParams = {
        targetChain: extractedParams.targetChain,
        recipientAddress: extractedParams.recipientAddress,
        amount: extractedParams.amount,
        tokenId: extractedParams.tokenId || undefined,
      };

      // Execute bridge
      elizaLogger.info(
        `Executing bridge: ${params.amount} ${params.tokenId || 'NEAR'} to ${params.targetChain}`
      );

      const result = await crossChainService.bridge(params);

      // Send success response
      const tokenSymbol = params.tokenId || 'NEAR';
      callback?.({
        text: `Successfully initiated bridge of ${params.amount} ${tokenSymbol} to ${params.targetChain}. The transfer will complete in approximately 10-20 minutes.`,
        content: {
          success: true,
          transactionHash: result.transactionHash,
          explorerUrl: result.explorerUrl,
          bridgeExplorerUrl: result.bridgeExplorerUrl,
          targetChain: params.targetChain,
          recipientAddress: params.recipientAddress,
          amount: params.amount,
          token: tokenSymbol,
          estimatedTime: '10-20 minutes',
        },
      });
    } catch (error) {
      elizaLogger.error('Error during cross-chain bridge:', error);

      // Format error message
      let errorMessage = 'Error bridging tokens';
      if (isNearError(error)) {
        errorMessage = formatErrorMessage(error);
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      callback?.({
        text: errorMessage,
        content: {
          error: errorMessage,
          details: error,
        },
      });
    }
  },
  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Bridge 50 NEAR to my Ethereum wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f6c123',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll bridge 50 NEAR to Ethereum...",
          action: 'BRIDGE_TO_CHAIN',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Successfully initiated bridge of 50 NEAR to Ethereum. The transfer will complete in approximately 10-20 minutes.',
          content: {
            transactionHash: '9pQ4r...',
            bridgeExplorerUrl: 'https://rainbowbridge.app/history/...',
          },
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Send 100 USDC to 0xabc123def456 on Polygon',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: "I'll bridge 100 USDC to Polygon...",
          action: 'BRIDGE_TO_CHAIN',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'Successfully initiated bridge of 100 USDC to Polygon. The transfer will complete in approximately 10-20 minutes.',
          content: {
            targetChain: 'polygon',
            recipientAddress: '0xabc123def456',
          },
        },
      },
    ],
  ],
};

export const CrossChainSwapSchema = z.object({
  fromTokenId: z.string(),
  toTokenId: z.string(),
  amount: z.string(),
  targetChain: z.enum(['ethereum', 'aurora']),
});

const crossChainSwapTemplate = `# Task: Extract cross-chain swap parameters from user message

# Recent Messages:
{{recentMessages}}

# Instructions:
Analyze the user's message to extract:
1. The source token on NEAR
2. The desired token on the target chain
3. The amount to swap
4. The target blockchain (ethereum or aurora)

Return a JSON object with:
\`\`\`json
{
  "fromTokenId": "source token on NEAR",
  "toTokenId": "target token on destination chain",
  "amount": "number as string",
  "targetChain": "ethereum" | "aurora"
}
\`\`\`

Examples:
- "Swap 10 NEAR for ETH on Ethereum"
  → {"fromTokenId": "NEAR", "toTokenId": "ETH", "amount": "10", "targetChain": "ethereum"}
- "Exchange 100 USDC for USDC on Aurora"
  → {"fromTokenId": "usdc.fakes.testnet", "toTokenId": "USDC", "amount": "100", "targetChain": "aurora"}`;

export const executeCrossChainSwap: Action = {
  name: 'CROSS_CHAIN_SWAP',
  similes: ['BRIDGE_SWAP', 'CROSS_CHAIN_EXCHANGE'],
  description: 'Swap tokens across chains between NEAR and Ethereum/Aurora',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const service = runtime.getService('near-crosschain' as any);
    if (!service) {
      return false;
    }
    const crossChainService = service as unknown as CrossChainService;

    const text = message.content.text?.toLowerCase() || '';
    return text.includes('swap') && (text.includes('ethereum') || text.includes('aurora'));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<void> => {
    try {
      const service = runtime.getService('near-crosschain' as any);
      if (!service) {
        throw new NearPluginError('UNKNOWN_ERROR' as any, 'CrossChain service not available');
      }
      const crossChainService = service as unknown as CrossChainService;

      // Use LLM to extract cross-chain swap parameters
      const prompt = composePrompt({
        state: {
          recentMessages: message.content.text || '',
        },
        template: crossChainSwapTemplate,
      });

      const extractedParams = await runtime.useModel<
        typeof ModelType.OBJECT_LARGE,
        z.infer<typeof CrossChainSwapSchema>
      >(ModelType.OBJECT_LARGE, {
        prompt,
        schema: CrossChainSwapSchema,
      });

      if (!extractedParams) {
        await callback?.({
          text: 'I need to know which tokens to swap and the target chain.',
        });
        return;
      }

      elizaLogger.info('Initiating cross-chain swap:', extractedParams);

      // Validate that we have the user's Ethereum address
      const ethereumAddress = runtime.getSetting('USER_ETHEREUM_ADDRESS');
      if (!ethereumAddress) {
        await callback?.({
          text: 'I need your Ethereum address to complete the cross-chain swap. Please provide it in your settings.',
        });
        return;
      }

      // First, bridge the tokens
      const txHash = await crossChainService.bridgeToEthereum(
        extractedParams.fromTokenId,
        extractedParams.amount,
        ethereumAddress
      );

      await callback?.({
        text: `Cross-chain swap initiated. First step: bridging ${extractedParams.amount} ${extractedParams.fromTokenId} to ${extractedParams.targetChain}. Transaction: ${txHash}. 
        
Note: You'll need to complete the swap on ${extractedParams.targetChain} once the bridge transfer completes.`,
        content: {
          success: true,
          step: 'bridge_initiated',
          transactionHash: txHash,
          fromToken: extractedParams.fromTokenId,
          amount: extractedParams.amount,
          targetChain: extractedParams.targetChain,
          action: 'CROSS_CHAIN_SWAP',
        },
      });
    } catch (error) {
      elizaLogger.error('Cross-chain swap error:', error);

      const errorMessage = isNearError(error)
        ? formatErrorMessage(error)
        : 'Failed to execute cross-chain swap';

      await callback?.({
        text: errorMessage,
        content: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  },

  examples: [
    [
      {
        name: 'alice',
        content: {
          text: 'Swap 10 NEAR for ETH on Ethereum',
        },
      },
      {
        name: 'agent',
        content: {
          text: "I'll help you swap NEAR for ETH across chains...",
          action: 'CROSS_CHAIN_SWAP',
        },
      },
    ],
  ],
};

export const crossChainActions = [executeCrossChain, executeCrossChainSwap];
