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
 * Get gas price action for Polygon zkEVM
 * Retrieves current gas price
 */
export const getGasPriceAction: Action = {
  name: 'GET_GAS_PRICE_ZKEVM',
  similes: ['GAS_PRICE', 'CURRENT_GAS', 'GAS_FEE', 'GWEI'],
  description: 'Get current gas price on Polygon zkEVM',

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    // Check if we have the required configuration
    const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');
    const zkevmRpcUrl = process.env.ZKEVM_RPC_URL || runtime.getSetting('ZKEVM_RPC_URL');

    if (!alchemyApiKey && !zkevmRpcUrl) {
      logger.error('No Alchemy API key or zkEVM RPC URL configured');
      return false;
    }

    // Check if message is asking for gas price
    const text = message.content.text.toLowerCase();
    const hasGasRequest = text.includes('gas') || text.includes('gwei') || text.includes('fee');

    return hasGasRequest;
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
      logger.info('Handling GET_GAS_PRICE_ZKEVM action');

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

      // Get gas price
      const gasPrice = await provider.send('eth_gasPrice', []);
      const gasPriceInWei = BigInt(gasPrice);
      const gasPriceInGwei = Number(gasPriceInWei) / 1e9;

      // Get fee data for more comprehensive information
      let feeData;
      try {
        feeData = await provider.getFeeData();
      } catch (error) {
        logger.warn('Could not get fee data, using basic gas price only');
      }

      let responseText = `⛽ Current Gas Price on Polygon zkEVM:
💸 Gas Price: ${gasPriceInGwei.toFixed(4)} Gwei (${gasPriceInWei.toString()} wei)`;

      if (feeData) {
        if (feeData.maxFeePerGas) {
          const maxFeeGwei = Number(feeData.maxFeePerGas) / 1e9;
          responseText += `\n🔝 Max Fee Per Gas: ${maxFeeGwei.toFixed(4)} Gwei`;
        }
        if (feeData.maxPriorityFeePerGas) {
          const maxPriorityFeeGwei = Number(feeData.maxPriorityFeePerGas) / 1e9;
          responseText += `\n⚡ Max Priority Fee: ${maxPriorityFeeGwei.toFixed(4)} Gwei`;
        }
      }

      // Add cost estimates for common operations
      const transferCost = (gasPriceInGwei * 21000) / 1e9; // ETH cost for simple transfer
      const swapCost = (gasPriceInGwei * 150000) / 1e9; // Approximate cost for DEX swap

      responseText += `\n\n💰 Estimated Transaction Costs:
📤 Simple Transfer: ~${transferCost.toFixed(6)} ETH
🔄 Token Swap: ~${swapCost.toFixed(6)} ETH`;

      const responseContent: Content = {
        text: responseText,
        actions: ['GET_GAS_PRICE_ZKEVM'],
        source: message.content.source,
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in GET_GAS_PRICE_ZKEVM action:', error);

      const errorContent: Content = {
        text: `Error getting gas price: ${error instanceof Error ? error.message : 'Unknown error'}`,
        actions: ['GET_GAS_PRICE_ZKEVM'],
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
          text: 'What is the current gas price?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: `⛽ Current Gas Price on Polygon zkEVM:
💸 Gas Price: 1.2345 Gwei (1234500000 wei)
🔝 Max Fee Per Gas: 1.5000 Gwei
⚡ Max Priority Fee: 0.1000 Gwei

💰 Estimated Transaction Costs:
📤 Simple Transfer: ~0.000026 ETH
🔄 Token Swap: ~0.000185 ETH`,
          actions: ['GET_GAS_PRICE_ZKEVM'],
        },
      },
    ],
  ],
};
