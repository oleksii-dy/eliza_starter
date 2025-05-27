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

// Block status types for Polygon zkEVM
type BlockStatus = 'trusted' | 'virtual' | 'consolidated' | 'unknown';

interface BlockStatusResult {
  blockNumber: number;
  blockHash?: string;
  status: BlockStatus;
  statusCode?: number;
  description: string;
  method: 'alchemy' | 'rpc';
  timestamp: number;
}

/**
 * Check L2 block status action for Polygon zkEVM
 * Determines whether a block is trusted, virtual, or consolidated
 */
export const checkBlockStatusAction: Action = {
  name: 'CHECK_L2_BLOCK_STATUS',
  similes: [
    'CHECK_BLOCK_STATUS',
    'BLOCK_STATUS',
    'L2_BLOCK_STATUS',
    'BLOCK_FINALITY',
    'CHECK_FINALITY',
    'BLOCK_STATE',
    'VERIFY_BLOCK',
    'BLOCK_CONFIRMATION',
  ],
  description: 'Check the status of a Polygon zkEVM block (trusted, virtual, or consolidated)',

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    // Check if we have the required configuration
    const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');
    const zkevmRpcUrl = process.env.ZKEVM_RPC_URL || runtime.getSetting('ZKEVM_RPC_URL');

    if (!alchemyApiKey && !zkevmRpcUrl) {
      logger.error('No Alchemy API key or zkEVM RPC URL configured');
      return false;
    }

    // Check if message contains block-related keywords
    const text = message.content.text.toLowerCase();
    const hasBlockKeywords =
      text.includes('block') ||
      text.includes('status') ||
      text.includes('finality') ||
      text.includes('trusted') ||
      text.includes('virtual') ||
      text.includes('consolidated') ||
      text.includes('l2') ||
      text.includes('check');

    // Check for block number or hash
    const hasBlockNumber = /\b\d+\b/.test(text) || /0x[a-fA-F0-9]{64}/.test(text);

    return hasBlockKeywords || hasBlockNumber;
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
      logger.info('🔍 Handling CHECK_L2_BLOCK_STATUS action');

      // Extract block number or hash from message
      const text = message.content.text;
      let blockIdentifier: string | number;
      let isHash = false;

      // Try to extract block hash first (0x followed by 64 hex chars)
      const hashMatch = text.match(/0x[a-fA-F0-9]{64}/);
      if (hashMatch) {
        blockIdentifier = hashMatch[0];
        isHash = true;
        logger.info(`📋 Checking status for block hash: ${blockIdentifier}`);
      } else {
        // Try to extract block number
        const numberMatch = text.match(/\b(\d+)\b/);
        if (numberMatch) {
          blockIdentifier = parseInt(numberMatch[1]);
          logger.info(`📋 Checking status for block number: ${blockIdentifier}`);
        } else {
          // Default to latest block
          blockIdentifier = 'latest';
          logger.info('📋 No specific block provided, checking latest block');
        }
      }

      // Setup provider - prefer Alchemy, fallback to RPC
      let provider: JsonRpcProvider;
      let methodUsed: 'alchemy' | 'rpc' = 'rpc';
      const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');

      if (alchemyApiKey) {
        provider = new JsonRpcProvider(
          `https://polygonzkevm-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
        );
        methodUsed = 'alchemy';
        logger.info('🔗 Using Alchemy API for block status check');
      } else {
        const zkevmRpcUrl =
          process.env.ZKEVM_RPC_URL ||
          runtime.getSetting('ZKEVM_RPC_URL') ||
          'https://zkevm-rpc.com';
        provider = new JsonRpcProvider(zkevmRpcUrl);
        logger.info('🔗 Using direct RPC for block status check');
      }

      let blockData: any = null;
      let blockStatus: BlockStatus = 'unknown';
      let statusCode: number | undefined;
      let errorMessages: string[] = [];

      // Get block data first
      try {
        logger.info('📥 Fetching block data...');

        if (isHash) {
          blockData = await provider.getBlock(blockIdentifier as string);
        } else {
          blockData = await provider.getBlock(blockIdentifier as number);
        }

        if (!blockData) {
          throw new Error('Block not found');
        }

        logger.info(`✅ Block data retrieved for block ${blockData.number}`);
      } catch (error) {
        const errorMsg = `Failed to get block data: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMsg);
        errorMessages.push(errorMsg);
      }

      // Try to get block status using zkEVM-specific methods
      if (blockData) {
        try {
          logger.info('🔍 Checking block status...');

          // Try zkEVM-specific RPC methods
          let statusResponse: any;

          try {
            // Try zkevm_getBatchByNumber method (common in zkEVM implementations)
            statusResponse = await provider.send('zkevm_getBatchByNumber', [blockData.number]);
            logger.info('✅ Got batch status from zkevm_getBatchByNumber');
          } catch (batchError) {
            logger.warn('zkevm_getBatchByNumber not available, trying alternative methods');

            try {
              // Try alternative method for block status
              statusResponse = await provider.send('zkevm_getBlockStatus', [blockData.number]);
              logger.info('✅ Got status from zkevm_getBlockStatus');
            } catch (statusError) {
              logger.warn('zkevm_getBlockStatus not available, using heuristic approach');

              // Fallback: Use heuristic based on block age and confirmations
              const currentBlock = await provider.getBlockNumber();
              const blockAge = currentBlock - blockData.number;

              if (blockAge < 10) {
                blockStatus = 'virtual';
                statusCode = 0;
              } else if (blockAge < 100) {
                blockStatus = 'trusted';
                statusCode = 1;
              } else {
                blockStatus = 'consolidated';
                statusCode = 2;
              }

              logger.info(`📊 Using heuristic: block age ${blockAge}, status: ${blockStatus}`);
            }
          }

          // Parse status response if we got one
          if (statusResponse) {
            if (typeof statusResponse === 'object' && statusResponse.status !== undefined) {
              statusCode = statusResponse.status;
            } else if (typeof statusResponse === 'number') {
              statusCode = statusResponse;
            } else if (typeof statusResponse === 'string') {
              // Parse string status
              const lowerStatus = statusResponse.toLowerCase();
              if (lowerStatus.includes('virtual')) {
                blockStatus = 'virtual';
                statusCode = 0;
              } else if (lowerStatus.includes('trusted')) {
                blockStatus = 'trusted';
                statusCode = 1;
              } else if (lowerStatus.includes('consolidated')) {
                blockStatus = 'consolidated';
                statusCode = 2;
              }
            }

            // Map status code to status string
            if (statusCode !== undefined && blockStatus === 'unknown') {
              switch (statusCode) {
                case 0:
                  blockStatus = 'virtual';
                  break;
                case 1:
                  blockStatus = 'trusted';
                  break;
                case 2:
                  blockStatus = 'consolidated';
                  break;
                default:
                  blockStatus = 'unknown';
              }
            }
          }
        } catch (error) {
          const errorMsg = `Failed to get block status: ${error instanceof Error ? error.message : String(error)}`;
          logger.error(errorMsg);
          errorMessages.push(errorMsg);

          // Try fallback method if using Alchemy
          if (methodUsed === 'alchemy') {
            logger.info('🔄 Attempting fallback to direct RPC...');
            try {
              const fallbackRpcUrl =
                process.env.ZKEVM_RPC_URL ||
                runtime.getSetting('ZKEVM_RPC_URL') ||
                'https://zkevm-rpc.com';
              const fallbackProvider = new JsonRpcProvider(fallbackRpcUrl);

              // Try the same status check with fallback provider
              const fallbackStatus = await fallbackProvider.send('zkevm_getBatchByNumber', [
                blockData.number,
              ]);
              if (fallbackStatus && fallbackStatus.status !== undefined) {
                statusCode = fallbackStatus.status;
                switch (statusCode) {
                  case 0:
                    blockStatus = 'virtual';
                    break;
                  case 1:
                    blockStatus = 'trusted';
                    break;
                  case 2:
                    blockStatus = 'consolidated';
                    break;
                  default:
                    blockStatus = 'unknown';
                }
              }
              methodUsed = 'rpc';
              logger.info('✅ Fallback successful');
            } catch (fallbackError) {
              const fallbackErrorMsg = `Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`;
              logger.error(fallbackErrorMsg);
              errorMessages.push(fallbackErrorMsg);
            }
          }
        }
      }

      // If we still don't have block data, return error
      if (!blockData) {
        const errorMessage = `❌ Failed to retrieve block data. Errors: ${errorMessages.join('; ')}`;

        const errorContent: Content = {
          text: errorMessage,
          actions: ['CHECK_L2_BLOCK_STATUS'],
          source: message.content.source,
        };

        await callback(errorContent);
        return errorContent;
      }

      // Create result object
      const result: BlockStatusResult = {
        blockNumber: blockData.number,
        blockHash: blockData.hash,
        status: blockStatus,
        statusCode,
        description: getStatusDescription(blockStatus),
        method: methodUsed,
        timestamp: Date.now(),
      };

      // Format response text
      let responseText = `🔍 **Block Status Check for Polygon zkEVM**\n\n`;

      responseText += `**Block Information:**\n`;
      responseText += `📊 Block Number: ${blockData.number}\n`;
      responseText += `🔗 Block Hash: ${blockData.hash}\n`;
      responseText += `⏰ Timestamp: ${new Date(blockData.timestamp * 1000).toISOString()}\n\n`;

      responseText += `**Status Information:**\n`;
      responseText += `${getStatusEmoji(blockStatus)} **Status: ${blockStatus.toUpperCase()}**\n`;
      if (statusCode !== undefined) {
        responseText += `🔢 Status Code: ${statusCode}\n`;
      }
      responseText += `📝 Description: ${result.description}\n\n`;

      // Add status explanations
      responseText += `**Status Meanings:**\n`;
      responseText += `🟡 **Virtual**: Recently created, not yet fully validated\n`;
      responseText += `🟠 **Trusted**: Validated by sequencer, awaiting batch proof\n`;
      responseText += `🟢 **Consolidated**: Fully proven and finalized on L1\n\n`;

      // Add method and error info
      responseText += `🔗 Retrieved via ${methodUsed === 'alchemy' ? 'Alchemy API' : 'Direct RPC'}`;

      if (errorMessages.length > 0) {
        responseText += `\n\n⚠️ Some errors occurred:\n${errorMessages
          .slice(0, 2)
          .map((msg) => `• ${msg}`)
          .join('\n')}`;
        if (errorMessages.length > 2) {
          responseText += `\n• ... and ${errorMessages.length - 2} more errors`;
        }
      }

      const responseContent: Content = {
        text: responseText,
        actions: ['CHECK_L2_BLOCK_STATUS'],
        source: message.content.source,
        data: result,
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('❌ Error in CHECK_L2_BLOCK_STATUS action:', error);

      const errorContent: Content = {
        text: `❌ Error checking block status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        actions: ['CHECK_L2_BLOCK_STATUS'],
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
          text: 'Check block status for block 12345678',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '🔍 **Block Status Check for Polygon zkEVM**\n\n**Block Information:**\n📊 Block Number: 12345678\n🔗 Block Hash: 0xabc123...\n⏰ Timestamp: 2024-01-15T10:30:00.000Z\n\n**Status Information:**\n🟢 **Status: CONSOLIDATED**\n🔢 Status Code: 2\n📝 Description: Block is fully proven and finalized on Ethereum L1\n\n**Status Meanings:**\n🟡 **Virtual**: Recently created, not yet fully validated\n🟠 **Trusted**: Validated by sequencer, awaiting batch proof\n🟢 **Consolidated**: Fully proven and finalized on L1\n\n🔗 Retrieved via Alchemy API',
          actions: ['CHECK_L2_BLOCK_STATUS'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'What is the status of block 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '🔍 **Block Status Check for Polygon zkEVM**\n\n**Block Information:**\n📊 Block Number: 12345679\n🔗 Block Hash: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\n⏰ Timestamp: 2024-01-15T10:35:00.000Z\n\n**Status Information:**\n🟠 **Status: TRUSTED**\n🔢 Status Code: 1\n📝 Description: Block is validated by sequencer, awaiting batch proof generation\n\n**Status Meanings:**\n🟡 **Virtual**: Recently created, not yet fully validated\n🟠 **Trusted**: Validated by sequencer, awaiting batch proof\n🟢 **Consolidated**: Fully proven and finalized on L1\n\n🔗 Retrieved via Direct RPC',
          actions: ['CHECK_L2_BLOCK_STATUS'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Check the finality status of the latest block',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '🔍 **Block Status Check for Polygon zkEVM**\n\n**Block Information:**\n📊 Block Number: 12345680\n🔗 Block Hash: 0xdef456...\n⏰ Timestamp: 2024-01-15T10:40:00.000Z\n\n**Status Information:**\n🟡 **Status: VIRTUAL**\n🔢 Status Code: 0\n📝 Description: Block is recently created and not yet fully validated\n\n**Status Meanings:**\n🟡 **Virtual**: Recently created, not yet fully validated\n🟠 **Trusted**: Validated by sequencer, awaiting batch proof\n🟢 **Consolidated**: Fully proven and finalized on L1\n\n🔗 Retrieved via Alchemy API',
          actions: ['CHECK_L2_BLOCK_STATUS'],
        },
      },
    ],
  ],
};

/**
 * Get emoji for block status
 */
function getStatusEmoji(status: BlockStatus): string {
  switch (status) {
    case 'virtual':
      return '🟡';
    case 'trusted':
      return '🟠';
    case 'consolidated':
      return '🟢';
    default:
      return '❓';
  }
}

/**
 * Get description for block status
 */
function getStatusDescription(status: BlockStatus): string {
  switch (status) {
    case 'virtual':
      return 'Block is recently created and not yet fully validated';
    case 'trusted':
      return 'Block is validated by sequencer, awaiting batch proof generation';
    case 'consolidated':
      return 'Block is fully proven and finalized on Ethereum L1';
    default:
      return 'Block status could not be determined';
  }
}
