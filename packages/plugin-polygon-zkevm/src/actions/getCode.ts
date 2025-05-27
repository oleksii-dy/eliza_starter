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
 * Get code action for Polygon zkEVM
 * Retrieves the contract code for a specific address
 */
export const getCodeAction: Action = {
  name: 'GET_CODE_ZKEVM',
  similes: ['GET_CONTRACT_CODE', 'CONTRACT_CODE', 'BYTECODE', 'CODE'],
  description: 'Get contract code for an address on Polygon zkEVM',

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    // Check if we have the required configuration
    const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');
    const zkevmRpcUrl = process.env.ZKEVM_RPC_URL || runtime.getSetting('ZKEVM_RPC_URL');

    if (!alchemyApiKey && !zkevmRpcUrl) {
      logger.error('No Alchemy API key or zkEVM RPC URL configured');
      return false;
    }

    // Check if message contains an address and code request
    const text = message.content.text.toLowerCase();
    const hasAddress = /0x[a-fA-F0-9]{40}/.test(text);
    const hasCodeRequest =
      text.includes('code') || text.includes('bytecode') || text.includes('contract');

    return hasAddress && hasCodeRequest;
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
      logger.info('Handling GET_CODE_ZKEVM action');

      // Extract address from message
      const text = message.content.text;
      const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);

      if (!addressMatch) {
        const errorContent: Content = {
          text: 'Please provide a valid Ethereum address (0x...) to get the contract code.',
          actions: ['GET_CODE_ZKEVM'],
          source: message.content.source,
        };
        await callback(errorContent);
        return errorContent;
      }

      const address = addressMatch[0];

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

      // Get contract code
      const code = await provider.getCode(address);

      let responseText = `📋 Contract Code for ${address}:`;

      if (code === '0x' || code === '0x0') {
        responseText += `\n❌ No contract code found - This is an Externally Owned Account (EOA)`;
      } else {
        const codeSize = (code.length - 2) / 2; // Remove '0x' prefix and divide by 2 for bytes
        responseText += `\n✅ Contract detected!
📏 Code Size: ${codeSize} bytes
🔗 Code Length: ${code.length} characters (including 0x prefix)`;

        // Show first few bytes for verification
        if (code.length > 10) {
          const preview = code.substring(0, 42); // Show first 20 bytes
          responseText += `\n👀 Code Preview: ${preview}...`;
        }

        // Detect common contract patterns
        if (code.includes('6080604052')) {
          responseText += `\n🔍 Detected: Solidity contract (common compiler pattern)`;
        }
        if (code.includes('a165627a7a72305820')) {
          responseText += `\n📝 Contains: Swarm hash metadata`;
        }
      }

      const responseContent: Content = {
        text: responseText,
        actions: ['GET_CODE_ZKEVM'],
        source: message.content.source,
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in GET_CODE_ZKEVM action:', error);

      const errorContent: Content = {
        text: `Error getting contract code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        actions: ['GET_CODE_ZKEVM'],
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
          text: 'Get contract code for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: `📋 Contract Code for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6:
✅ Contract detected!
📏 Code Size: 1234 bytes
🔗 Code Length: 2470 characters (including 0x prefix)
👀 Code Preview: 0x6080604052348015600f57600080fd5b50...
🔍 Detected: Solidity contract (common compiler pattern)`,
          actions: ['GET_CODE_ZKEVM'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Check if 0x1234567890123456789012345678901234567890 is a contract',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: `📋 Contract Code for 0x1234567890123456789012345678901234567890:
❌ No contract code found - This is an Externally Owned Account (EOA)`,
          actions: ['GET_CODE_ZKEVM'],
        },
      },
    ],
  ],
};
