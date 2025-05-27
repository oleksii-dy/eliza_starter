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
 * Get storage at action for Polygon zkEVM
 * Retrieves storage value at a specific slot for a contract address
 */
export const getStorageAtAction: Action = {
  name: 'GET_STORAGE_AT_ZKEVM',
  similes: ['GET_STORAGE', 'STORAGE_SLOT', 'CONTRACT_STORAGE', 'STORAGE_VALUE'],
  description: 'Get storage value at a specific slot for a contract address on Polygon zkEVM',

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    // Check if we have the required configuration
    const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');
    const zkevmRpcUrl = process.env.ZKEVM_RPC_URL || runtime.getSetting('ZKEVM_RPC_URL');

    if (!alchemyApiKey && !zkevmRpcUrl) {
      logger.error('No Alchemy API key or zkEVM RPC URL configured');
      return false;
    }

    // Check if message contains an address and storage request
    const text = message.content.text.toLowerCase();
    const hasAddress = /0x[a-fA-F0-9]{40}/.test(text);
    const hasStorageRequest = text.includes('storage') || text.includes('slot');

    return hasAddress && hasStorageRequest;
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
      logger.info('Handling GET_STORAGE_AT_ZKEVM action');

      // Extract address from message
      const text = message.content.text;
      const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);

      if (!addressMatch) {
        const errorContent: Content = {
          text: 'Please provide a valid contract address (0x...) to get storage.',
          actions: ['GET_STORAGE_AT_ZKEVM'],
          source: message.content.source,
        };
        await callback(errorContent);
        return errorContent;
      }

      const address = addressMatch[0];

      // Extract storage slot (default to 0 if not specified)
      let storageSlot = '0x0';
      const slotMatch = text.match(/slot\s+(\d+|0x[a-fA-F0-9]+)/i);
      if (slotMatch) {
        const slotValue = slotMatch[1];
        if (slotValue.startsWith('0x')) {
          storageSlot = slotValue;
        } else {
          // Convert decimal to hex
          storageSlot = '0x' + parseInt(slotValue).toString(16);
        }
      }

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

      // Get storage at the specified slot
      const storageValue = await provider.getStorage(address, storageSlot);

      let responseText = `🗄️ Storage for ${address} at slot ${storageSlot}:
📦 Value: ${storageValue}`;

      // Try to interpret the value
      if (storageValue === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        responseText += `\n💡 Interpretation: Empty/Zero value`;
      } else {
        // Try to interpret as different types
        const bigIntValue = BigInt(storageValue);
        if (bigIntValue > 0n && bigIntValue < 2n ** 160n) {
          // Could be an address
          const possibleAddress = '0x' + storageValue.slice(-40);
          if (possibleAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            responseText += `\n🏠 Possible Address: ${possibleAddress}`;
          }
        }

        // Show as decimal if reasonable size
        if (bigIntValue < 2n ** 64n) {
          responseText += `\n🔢 As Decimal: ${bigIntValue.toString()}`;
        }

        // Show as string if it looks like text
        try {
          const hexString = storageValue.slice(2);
          const bytes = [];
          for (let i = 0; i < hexString.length; i += 2) {
            bytes.push(parseInt(hexString.substr(i, 2), 16));
          }
          const text = String.fromCharCode(...bytes.filter((b) => b > 31 && b < 127));
          if (text.length > 0 && text.trim().length > 0) {
            responseText += `\n📝 As Text: "${text.trim()}"`;
          }
        } catch (e) {
          // Ignore text conversion errors
        }
      }

      const responseContent: Content = {
        text: responseText,
        actions: ['GET_STORAGE_AT_ZKEVM'],
        source: message.content.source,
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in GET_STORAGE_AT_ZKEVM action:', error);

      const errorContent: Content = {
        text: `Error getting storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        actions: ['GET_STORAGE_AT_ZKEVM'],
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
          text: 'Get storage slot 0 for contract 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: `🗄️ Storage for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6 at slot 0x0:
📦 Value: 0x000000000000000000000000742d35cc6634c0532925a3b8d4c9db96c4b4d8b6
🏠 Possible Address: 0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6`,
          actions: ['GET_STORAGE_AT_ZKEVM'],
        },
      },
    ],
  ],
};
