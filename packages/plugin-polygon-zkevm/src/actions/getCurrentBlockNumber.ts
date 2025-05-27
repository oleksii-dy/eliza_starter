import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type Content,
  logger,
} from '@elizaos/core';
import { z } from 'zod';
import { JsonRpcProvider } from 'ethers';

// Define a schema for the action-specific configuration if needed, or rely on plugin config
// const GetCurrentBlockNumberConfigSchema = z.object({
//   // Define schema for config variables used by this action if different from plugin config
// });

export const getCurrentBlockNumberAction: Action = {
  name: 'GET_POLYGON_ZKEVM_BLOCK_NUMBER',
  similes: [
    'GET_CURRENT_L2_BLOCK_NUMBER',
    'CHECK_ZKEVM_BLOCK',
    'SHOW_LATEST_ZKEVM_BLOCK',
    'POLYGON_ZKEVM_BLOCK_NUMBER',
    'GET_ZKEVM_BLOCK_NUMBER',
    'GET_L2_BLOCK_NUMBER', // Add this to override regular Polygon plugin
  ],
  description: 'Gets the current block number on Polygon zkEVM (Layer 2 zero-knowledge rollup).',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const alchemyApiKey = runtime.getSetting('ALCHEMY_API_KEY') || process.env.ALCHEMY_API_KEY;
    const zkevmRpcUrl = runtime.getSetting('ZKEVM_RPC_URL') || process.env.ZKEVM_RPC_URL;

    if (!alchemyApiKey && !zkevmRpcUrl) {
      logger.info('[getCurrentBlockNumberAction] No API keys available');
      return false;
    }

    // Check if the message specifically mentions zkEVM
    const content = message.content?.text?.toLowerCase() || '';

    // High priority zkEVM keywords - must be present
    const zkevmKeywords = ['zkevm', 'zk evm', 'polygon zkevm', 'zkEVM', 'zk-evm'];

    const hasZkevmKeyword = zkevmKeywords.some((keyword) =>
      content.includes(keyword.toLowerCase())
    );

    // Block-related keywords
    const blockKeywords = [
      'block number',
      'current block',
      'latest block',
      'block height',
      'block',
      'what block',
    ];

    const hasBlockKeyword = blockKeywords.some((keyword) => content.includes(keyword));

    // Special case: if message contains "polygon zkevm" specifically, prioritize this action
    const hasPolygonZkevm = content.includes('polygon zkevm');

    // Must have zkEVM keyword AND block keyword, OR specifically mention "polygon zkevm"
    const result = (hasZkevmKeyword && hasBlockKeyword) || hasPolygonZkevm;

    logger.info(
      `[getCurrentBlockNumberAction] Validation: content="${content}", zkEVM=${hasZkevmKeyword}, block=${hasBlockKeyword}, polygonZkevm=${hasPolygonZkevm}, result=${result}`
    );

    return result;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<Content> => {
    logger.info('[getCurrentBlockNumberAction] Handler called!');

    // Placeholder: Need to figure out how config is passed or accessed
    const alchemyApiKey = process.env.ALCHEMY_API_KEY; // Assuming direct env access for now
    const zkevmRpcUrl = process.env.ZKEVM_RPC_URL; // Assuming direct env access for now

    if (!alchemyApiKey && !zkevmRpcUrl) {
      throw new Error('ALCHEMY_API_KEY or ZKEVM_RPC_URL is required in configuration.');
    }

    let blockNumber: number | null = null;
    let methodUsed: 'alchemy' | 'rpc' | null = null;
    let errorMessages: string[] = [];

    // 1. Attempt to use Alchemy API
    if (alchemyApiKey) {
      try {
        logger.info('[getCurrentBlockNumberAction] Attempting to use Alchemy API');
        const alchemyUrl = `https://polygonzkevm-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;
        const options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber', // Alchemy also supports standard RPC methods
            params: [],
            id: 1,
          }),
        };

        const response = await fetch(alchemyUrl, options);
        if (!response.ok) {
          throw new Error(`Alchemy API returned status ${response.status}: ${response.statusText}`);
        }
        const data = (await response.json()) as { error?: { message: string }; result?: string };

        if (data?.error) {
          throw new Error(`Alchemy API returned error: ${data?.error?.message}`);
        }

        if (data?.result) {
          blockNumber = parseInt(data?.result, 16); // Block number is typically in hex
          methodUsed = 'alchemy';
          logger.info(`[getCurrentBlockNumberAction] Block number from Alchemy: ${blockNumber}`);
        } else {
          logger.error('Alchemy API did not return a result.');
          throw new Error('Alchemy API did not return a result.');
        }
      } catch (error) {
        logger.error('Error using Alchemy API:', error);
        errorMessages.push(
          `Alchemy API failed: ${error instanceof Error ? error.message : String(error)}`
        );
        // Continue to fallback
      }
    }

    // 2. Fallback to JSON-RPC if Alchemy failed or not configured
    if (blockNumber === null && zkevmRpcUrl) {
      logger.info('[getCurrentBlockNumberAction] Falling back to JSON-RPC');
      try {
        const provider = new JsonRpcProvider(zkevmRpcUrl);
        const latestBlock = await provider.getBlockNumber();

        blockNumber = latestBlock; // getBlockNumber returns a number
        methodUsed = 'rpc';
        logger.info(`[getCurrentBlockNumberAction] Block number from RPC: ${blockNumber}`);
      } catch (error) {
        logger.error('Error using JSON-RPC fallback:', error);
        errorMessages.push(
          `JSON-RPC fallback failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Handle result and errors
    if (blockNumber !== null) {
      const responseContent: Content = {
        text: `The current Polygon zkEVM block number is ${blockNumber.toLocaleString()} (via ${methodUsed}).`,
        actions: ['GET_POLYGON_ZKEVM_BLOCK_NUMBER'],
        data: {
          blockNumber,
          network: 'polygon-zkevm',
          timestamp: Date.now(),
          method: methodUsed,
        },
      };

      if (callback) {
        await callback(responseContent);
      }

      return responseContent;
    } else {
      // Both methods failed
      const errorMessage = `Failed to retrieve Polygon zkEVM block number using both Alchemy and RPC. Errors: ${errorMessages.join('; ')}`;
      logger.error(errorMessage);

      const errorContent: Content = {
        text: errorMessage,
        actions: ['GET_POLYGON_ZKEVM_BLOCK_NUMBER'],
        data: { error: errorMessage, errors: errorMessages },
      };

      if (callback) {
        await callback(errorContent);
      }

      throw new Error(errorMessage);
    }
  },

  examples: [
    [
      {
        name: 'user',
        content: {
          text: 'What is the current block number on Polygon zkEVM?',
        },
      },
      {
        name: 'assistant',
        content: {
          text: 'The current Polygon zkEVM block number is 22,604,506 (via alchemy).',
          actions: ['GET_POLYGON_ZKEVM_BLOCK_NUMBER'],
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Get the latest Polygon zkEVM block number',
        },
      },
      {
        name: 'assistant',
        content: {
          text: 'The current Polygon zkEVM block number is 22,604,506 (via alchemy).',
          actions: ['GET_POLYGON_ZKEVM_BLOCK_NUMBER'],
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Show me the current zkEVM block height',
        },
      },
      {
        name: 'assistant',
        content: {
          text: 'The current Polygon zkEVM block number is 22,604,506 (via alchemy).',
          actions: ['GET_POLYGON_ZKEVM_BLOCK_NUMBER'],
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'What block is Polygon zkEVM on right now?',
        },
      },
      {
        name: 'assistant',
        content: {
          text: 'The current Polygon zkEVM block number is 22,604,506 (via alchemy).',
          actions: ['GET_POLYGON_ZKEVM_BLOCK_NUMBER'],
        },
      },
    ],
  ],
};
