import {
  type Action,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { JsonRpcProvider } from 'ethers';

/**
 * Get logs action for Polygon zkEVM
 * Retrieves event logs based on filter criteria
 */
export const getLogsAction: Action = {
  name: 'GET_LOGS_ZKEVM',
  similes: ['GET_EVENTS', 'EVENT_LOGS', 'LOGS', 'CONTRACT_EVENTS'],
  description: 'Get event logs from contracts on Polygon zkEVM',

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    // Check if we have the required configuration
    const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');
    const zkevmRpcUrl = process.env.ZKEVM_RPC_URL || runtime.getSetting('ZKEVM_RPC_URL');

    if (!alchemyApiKey && !zkevmRpcUrl) {
      logger.error('No Alchemy API key or zkEVM RPC URL configured');
      return false;
    }

    // Check if message contains logs/events request
    const text = message.content.text.toLowerCase();
    const hasLogsRequest =
      text.includes('logs') || text.includes('events') || text.includes('emit');

    return hasLogsRequest;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback,
    responses: Memory[]
  ) => {
    try {
      logger.info('Handling GET_LOGS_ZKEVM action');

      const text = message.content.text;

      // Setup provider - prefer Alchemy, fallback to RPC
      let provider: JsonRpcProvider;
      const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');

      if (alchemyApiKey) {
        provider = new JsonRpcProvider(
          `https://polygonzkevm-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
        );
      } else {
        const zkevmRpcUrl =
          process.env.ZKEVM_RPC_URL ||
          runtime.getSetting('ZKEVM_RPC_URL') ||
          'https://zkevm-rpc.com';
        provider = new JsonRpcProvider(zkevmRpcUrl);
      }

      // Build filter object
      const filter: any = {};

      // Extract address if provided
      const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
      if (addressMatch) {
        filter.address = addressMatch[0];
      }

      // Extract block range if provided
      const fromBlockMatch = text.match(/from\s+block\s+(\d+|latest|earliest)/i);
      const toBlockMatch = text.match(/to\s+block\s+(\d+|latest|earliest)/i);

      // Check for specific block number patterns like "for the block 22627906" or "block 22627906"
      const specificBlockMatch = text.match(/(?:for\s+(?:the\s+)?block|block)\s+(\d+)/i);

      if (specificBlockMatch) {
        // User wants logs for a specific block
        const blockNumber = parseInt(specificBlockMatch[1]);
        filter.fromBlock = `0x${blockNumber.toString(16)}`; // Convert to hex format
        filter.toBlock = `0x${blockNumber.toString(16)}`;
      } else if (fromBlockMatch) {
        filter.fromBlock =
          fromBlockMatch[1] === 'latest' || fromBlockMatch[1] === 'earliest'
            ? fromBlockMatch[1]
            : `0x${parseInt(fromBlockMatch[1]).toString(16)}`;
      } else {
        // Default to recent blocks to avoid overwhelming response
        filter.fromBlock = 'latest';
      }

      if (toBlockMatch && !specificBlockMatch) {
        filter.toBlock =
          toBlockMatch[1] === 'latest' || toBlockMatch[1] === 'earliest'
            ? toBlockMatch[1]
            : `0x${parseInt(toBlockMatch[1]).toString(16)}`;
      } else if (!specificBlockMatch) {
        filter.toBlock = 'latest';
      }

      // If no specific address and no specific block, limit the scope to avoid overwhelming results
      if (!filter.address && !specificBlockMatch) {
        const currentBlock = await provider.getBlockNumber();
        filter.fromBlock = `0x${Math.max(0, currentBlock - 100).toString(16)}`; // Last 100 blocks
        filter.toBlock = `0x${currentBlock.toString(16)}`;
      }

      // Get logs
      const logs = await provider.send('eth_getLogs', [filter]);

      let responseText = `📋 Event Logs Query Results:
🔍 Filter: ${JSON.stringify(filter, null, 2)}
📊 Found: ${logs.length} logs`;

      if (logs.length === 0) {
        responseText += `\n\n💡 No logs found matching the criteria. Try:
- Specifying a contract address
- Expanding the block range
- Checking if the contract emits events`;
      } else {
        responseText += `\n\n📝 Recent Logs:`;

        // Show first few logs
        const logsToShow = Math.min(5, logs.length);
        for (let i = 0; i < logsToShow; i++) {
          const log = logs[i];
          responseText += `\n\n🔸 Log ${i + 1}:
  📍 Address: ${log.address}
  🔗 Block: ${parseInt(log.blockNumber, 16)}
  📋 Transaction: ${log.transactionHash}
  🏷️ Topics: ${log.topics.length}`;

          if (log.topics.length > 0) {
            responseText += `\n  🎯 Event Signature: ${log.topics[0]}`;
          }

          if (log.data && log.data !== '0x') {
            const dataLength = (log.data.length - 2) / 2;
            responseText += `\n  📦 Data: ${dataLength} bytes`;
          }
        }

        if (logs.length > logsToShow) {
          responseText += `\n\n... and ${logs.length - logsToShow} more logs`;
        }
      }

      const responseContent: Content = {
        text: responseText,
        actions: ['GET_LOGS_ZKEVM'],
        source: message.content.source,
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in GET_LOGS_ZKEVM action:', error);

      const errorContent: Content = {
        text: `Error getting logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        actions: ['GET_LOGS_ZKEVM'],
        source: message.content.source,
      };

      await callback(errorContent);
      return errorContent;
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Get logs for contract 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: `📋 Event Logs Query Results:
🔍 Filter: {
  "address": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "fromBlock": "latest",
  "toBlock": "latest"
}
📊 Found: 3 logs

📝 Recent Logs:

🔸 Log 1:
  📍 Address: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
  🔗 Block: 12345
  📋 Transaction: 0xabc123...
  🏷️ Topics: 3
  🎯 Event Signature: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
  📦 Data: 64 bytes`,
          actions: ['GET_LOGS_ZKEVM'],
        },
      },
    ],
  ],
};
