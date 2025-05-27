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

export const getBatchInfoAction: Action = {
  name: 'GET_BATCH_INFORMATION',
  similes: [
    'GET_BATCH_INFO',
    'FETCH_BATCH_DATA',
    'SHOW_BATCH_DETAILS',
    'GET_ZKEVM_BATCH',
    'BATCH_METADATA',
    'BATCH_TRANSACTIONS',
  ],
  description:
    'Fetches metadata for a given batch ID, including transaction list and proofs from Polygon zkEVM.',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const alchemyApiKey = process.env.ALCHEMY_API_KEY;
    const zkevmRpcUrl = process.env.ZKEVM_RPC_URL;

    if (!alchemyApiKey && !zkevmRpcUrl) {
      return false;
    }

    // Check if message contains a batch ID (number)
    const batchIdRegex = /(?:batch\s*(?:id|number)?[:\s]*)?(\d+)/i;
    const match = message.content.text.match(batchIdRegex);

    return !!match;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<Content> => {
    logger.info('[getBatchInfoAction] Handler called!');

    const alchemyApiKey = process.env.ALCHEMY_API_KEY;
    const zkevmRpcUrl = process.env.ZKEVM_RPC_URL;

    if (!alchemyApiKey && !zkevmRpcUrl) {
      throw new Error('ALCHEMY_API_KEY or ZKEVM_RPC_URL is required in configuration.');
    }

    // Extract batch ID from message
    const batchIdRegex = /(?:batch\s*(?:id|number)?[:\s]*)?(\d+)/i;
    const match = message.content.text.match(batchIdRegex);

    if (!match) {
      const errorContent: Content = {
        text: "❌ Please provide a valid batch ID. Example: 'get batch info 12345' or 'show batch 67890'",
        actions: ['GET_BATCH_INFORMATION'],
        data: { error: 'Invalid batch ID format' },
      };

      if (callback) {
        await callback(errorContent);
      }
      return errorContent;
    }

    const batchId = parseInt(match[1], 10);
    let batchInfo: any = null;
    let methodUsed: 'alchemy' | 'rpc' | null = null;
    let errorMessages: string[] = [];

    // 1. Attempt to use Alchemy API (zk.getBatch method)
    if (alchemyApiKey) {
      try {
        logger.info(`[getBatchInfoAction] Attempting to use Alchemy API for batch ${batchId}`);
        const alchemyUrl = `https://polygonzkevm-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;

        // Try Alchemy's zkevm_getBatchByNumber method first
        const alchemyOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'zkevm_getBatchByNumber',
            params: [`0x${batchId.toString(16)}`, false], // hex format + includeTransactions boolean
            id: 1,
          }),
        };

        const alchemyResponse = await fetch(alchemyUrl, alchemyOptions);
        if (!alchemyResponse.ok) {
          throw new Error(
            `Alchemy API returned status ${alchemyResponse.status}: ${alchemyResponse.statusText}`
          );
        }

        const alchemyData = (await alchemyResponse.json()) as {
          error?: { message: string };
          result?: any;
        };

        if (alchemyData?.error) {
          throw new Error(`Alchemy API returned error: ${alchemyData?.error?.message}`);
        }

        if (alchemyData?.result) {
          batchInfo = alchemyData.result;
          methodUsed = 'alchemy';
          logger.info(`[getBatchInfoAction] Batch info from Alchemy: ${JSON.stringify(batchInfo)}`);
        } else {
          throw new Error('Alchemy API did not return batch information.');
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
    if (batchInfo === null && zkevmRpcUrl) {
      logger.info(`[getBatchInfoAction] Falling back to JSON-RPC for batch ${batchId}`);
      try {
        const provider = new JsonRpcProvider(zkevmRpcUrl);

        // Try zkevm_getBatchByNumber method
        const rpcResult = await provider.send('zkevm_getBatchByNumber', [
          `0x${batchId.toString(16)}`,
          false,
        ]);

        if (rpcResult) {
          batchInfo = rpcResult;
          methodUsed = 'rpc';
          logger.info(`[getBatchInfoAction] Batch info from RPC: ${JSON.stringify(batchInfo)}`);
        } else {
          throw new Error('RPC did not return batch information.');
        }
      } catch (error) {
        logger.error('Error using JSON-RPC fallback:', error);
        errorMessages.push(
          `JSON-RPC fallback failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Handle result and errors
    if (batchInfo !== null) {
      // Format the batch information for user-friendly display
      const transactionCount = batchInfo.transactions ? batchInfo.transactions.length : 0;
      const hasProof = batchInfo.proof || batchInfo.verifyBatchTxHash;

      let responseText = `📦 **Batch ${batchId} Information** (via ${methodUsed})\n\n`;

      if (batchInfo.number) {
        responseText += `🔢 **Batch Number:** ${parseInt(batchInfo.number, 16)}\n`;
      }

      if (batchInfo.timestamp) {
        const timestamp = parseInt(batchInfo.timestamp, 16) * 1000;
        responseText += `⏰ **Timestamp:** ${new Date(timestamp).toISOString()}\n`;
      }

      if (batchInfo.coinbase) {
        responseText += `👤 **Coinbase:** \`${batchInfo.coinbase}\`\n`;
      }

      if (batchInfo.stateRoot) {
        responseText += `🌳 **State Root:** \`${batchInfo.stateRoot}\`\n`;
      }

      if (batchInfo.globalExitRoot) {
        responseText += `🚪 **Global Exit Root:** \`${batchInfo.globalExitRoot}\`\n`;
      }

      responseText += `📊 **Transaction Count:** ${transactionCount}\n`;

      if (hasProof) {
        responseText += `✅ **Proof Available:** Yes\n`;
        if (batchInfo.verifyBatchTxHash) {
          responseText += `🔐 **Verify Batch Tx:** \`${batchInfo.verifyBatchTxHash}\`\n`;
        }
      } else {
        responseText += `⏳ **Proof Available:** Pending\n`;
      }

      // Show first few transactions if available
      if (batchInfo.transactions && batchInfo.transactions.length > 0) {
        responseText += `\n📋 **Transactions:**\n`;
        const displayCount = Math.min(5, batchInfo.transactions.length);
        for (let i = 0; i < displayCount; i++) {
          responseText += `  ${i + 1}. \`${batchInfo.transactions[i]}\`\n`;
        }
        if (batchInfo.transactions.length > 5) {
          responseText += `  ... and ${batchInfo.transactions.length - 5} more\n`;
        }
      }

      const responseContent: Content = {
        text: responseText,
        actions: ['GET_BATCH_INFORMATION'],
        data: {
          batchId,
          batchInfo,
          transactionCount,
          hasProof,
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
      const errorMessage = `❌ Failed to retrieve batch ${batchId} information from Polygon zkEVM using both Alchemy and RPC methods.\n\n**Errors encountered:**\n${errorMessages.map((err) => `• ${err}`).join('\n')}\n\n💡 **Possible reasons:**\n• Batch ID ${batchId} does not exist\n• Batch is too recent and not yet finalized\n• Network connectivity issues\n• API rate limits exceeded`;

      logger.error(errorMessage);

      const errorContent: Content = {
        text: errorMessage,
        actions: ['GET_BATCH_INFORMATION'],
        data: {
          error: errorMessage,
          errors: errorMessages,
          batchId,
          network: 'polygon-zkevm',
        },
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
          text: 'get batch info 12345',
        },
      },
      {
        name: 'assistant',
        content: {
          text: '📦 **Batch 12345 Information** (via alchemy)\n\n🔢 **Batch Number:** 12345\n⏰ **Timestamp:** 2024-01-15T10:30:45.000Z\n👤 **Coinbase:** `0x1234...5678`\n🌳 **State Root:** `0xabcd...ef01`\n🚪 **Global Exit Root:** `0x9876...5432`\n📊 **Transaction Count:** 25\n✅ **Proof Available:** Yes\n🔐 **Verify Batch Tx:** `0xdef0...1234`\n\n📋 **Transactions:**\n  1. `0x1111...2222`\n  2. `0x3333...4444`\n  3. `0x5555...6666`\n  4. `0x7777...8888`\n  5. `0x9999...aaaa`\n  ... and 20 more',
          actions: ['GET_BATCH_INFORMATION'],
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'show me batch 67890 details',
        },
      },
      {
        name: 'assistant',
        content: {
          text: '📦 **Batch 67890 Information** (via rpc)\n\n🔢 **Batch Number:** 67890\n⏰ **Timestamp:** 2024-01-15T14:22:10.000Z\n👤 **Coinbase:** `0xabcd...ef01`\n🌳 **State Root:** `0x1234...5678`\n🚪 **Global Exit Root:** `0x9876...5432`\n📊 **Transaction Count:** 42\n⏳ **Proof Available:** Pending',
          actions: ['GET_BATCH_INFORMATION'],
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'fetch batch metadata for 999999',
        },
      },
      {
        name: 'assistant',
        content: {
          text: '❌ Failed to retrieve batch 999999 information from Polygon zkEVM using both Alchemy and RPC methods.\n\n**Errors encountered:**\n• Alchemy API failed: Batch not found\n• JSON-RPC fallback failed: Invalid batch number\n\n💡 **Possible reasons:**\n• Batch ID 999999 does not exist\n• Batch is too recent and not yet finalized\n• Network connectivity issues\n• API rate limits exceeded',
          actions: ['GET_BATCH_INFORMATION'],
        },
      },
    ],
  ],
};
