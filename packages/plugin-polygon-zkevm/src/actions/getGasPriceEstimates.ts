import {
  type Action,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { JsonRpcProvider, formatUnits, parseUnits } from 'ethers';

interface GasPriceEstimates {
  low: string;
  medium: string;
  high: string;
  lowGwei: string;
  mediumGwei: string;
  highGwei: string;
  basePrice: string;
  basePriceGwei: string;
  method: 'alchemy' | 'rpc';
  timestamp: number;
}

/**
 * Get gas price estimates action for Polygon zkEVM
 * Provides low/medium/high gas price tiers for transaction planning
 */
export const getGasPriceEstimatesAction: Action = {
  name: 'GET_GAS_PRICE_ESTIMATES',
  similes: [
    'GAS_PRICE_TIERS',
    'GAS_ESTIMATES',
    'GAS_PRICE_LEVELS',
    'ESTIMATE_GAS_PRICE',
    'GAS_FEES',
    'TRANSACTION_FEES',
    'GAS_COST',
    'FEE_ESTIMATES',
  ],
  description: 'Get gas price estimates with low/medium/high tiers for Polygon zkEVM transactions',

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    // Check if we have the required configuration
    const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');
    const zkevmRpcUrl = process.env.ZKEVM_RPC_URL || runtime.getSetting('ZKEVM_RPC_URL');

    if (!alchemyApiKey && !zkevmRpcUrl) {
      logger.error('No Alchemy API key or zkEVM RPC URL configured');
      return false;
    }

    // Check if message contains gas price related keywords
    const text = message.content.text.toLowerCase();
    const hasGasKeywords =
      text.includes('gas') ||
      text.includes('fee') ||
      text.includes('price') ||
      text.includes('estimate') ||
      text.includes('cost') ||
      text.includes('tier') ||
      text.includes('low') ||
      text.includes('medium') ||
      text.includes('high');

    return hasGasKeywords;
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
      logger.info('⛽ Handling GET_GAS_PRICE_ESTIMATES action');

      // Setup provider - prefer Alchemy, fallback to RPC
      let provider: JsonRpcProvider;
      let methodUsed: 'alchemy' | 'rpc' = 'rpc';
      const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');

      if (alchemyApiKey) {
        provider = new JsonRpcProvider(
          `https://polygonzkevm-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
        );
        methodUsed = 'alchemy';
        logger.info('🔗 Using Alchemy API for gas price estimates');
      } else {
        const zkevmRpcUrl =
          process.env.ZKEVM_RPC_URL ||
          runtime.getSetting('ZKEVM_RPC_URL') ||
          'https://zkevm-rpc.com';
        provider = new JsonRpcProvider(zkevmRpcUrl);
        logger.info('🔗 Using direct RPC for gas price estimates');
      }

      let baseGasPrice: bigint;
      let errorMessages: string[] = [];

      // Get base gas price
      try {
        logger.info('📊 Fetching current gas price...');

        // Try to get gas price using provider method first
        const gasPriceResult = await provider.getGasPrice();
        baseGasPrice = gasPriceResult;

        logger.info(`✅ Base gas price retrieved: ${baseGasPrice.toString()} wei`);
      } catch (error) {
        const errorMsg = `Failed to get gas price: ${error instanceof Error ? error.message : String(error)}`;
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

            const fallbackGasPrice = await fallbackProvider.getGasPrice();
            baseGasPrice = fallbackGasPrice;
            methodUsed = 'rpc';
            logger.info('✅ Fallback successful');
          } catch (fallbackError) {
            const fallbackErrorMsg = `Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`;
            logger.error(fallbackErrorMsg);
            errorMessages.push(fallbackErrorMsg);

            // Use a reasonable default for zkEVM (typically lower than mainnet)
            baseGasPrice = parseUnits('0.25', 'gwei'); // 0.25 gwei default
            logger.warn(`Using default gas price: ${baseGasPrice.toString()} wei`);
          }
        } else {
          // Use a reasonable default for zkEVM
          baseGasPrice = parseUnits('0.25', 'gwei'); // 0.25 gwei default
          logger.warn(`Using default gas price: ${baseGasPrice.toString()} wei`);
        }
      }

      // Calculate gas price tiers
      // zkEVM typically has lower gas prices than mainnet, so we use smaller increments
      const oneGwei = parseUnits('1', 'gwei');
      const halfGwei = parseUnits('0.5', 'gwei');
      const twoGwei = parseUnits('2', 'gwei');
      const fiveGwei = parseUnits('5', 'gwei');

      // For zkEVM, we use more conservative increments
      let lowGasPrice: bigint;
      let mediumGasPrice: bigint;
      let highGasPrice: bigint;

      // If base price is very low (< 1 gwei), use smaller increments
      if (baseGasPrice < oneGwei) {
        lowGasPrice = baseGasPrice + parseUnits('0.1', 'gwei');
        mediumGasPrice = baseGasPrice + parseUnits('0.25', 'gwei');
        highGasPrice = baseGasPrice + halfGwei;
      } else if (baseGasPrice < fiveGwei) {
        // For moderate prices (1-5 gwei), use standard increments
        lowGasPrice = baseGasPrice + halfGwei;
        mediumGasPrice = baseGasPrice + oneGwei;
        highGasPrice = baseGasPrice + twoGwei;
      } else {
        // For higher prices (>5 gwei), use larger increments
        lowGasPrice = baseGasPrice + oneGwei;
        mediumGasPrice = baseGasPrice + twoGwei;
        highGasPrice = baseGasPrice + fiveGwei;
      }

      // Format prices in both wei and gwei
      const result: GasPriceEstimates = {
        low: lowGasPrice.toString(),
        medium: mediumGasPrice.toString(),
        high: highGasPrice.toString(),
        lowGwei: formatUnits(lowGasPrice, 'gwei'),
        mediumGwei: formatUnits(mediumGasPrice, 'gwei'),
        highGwei: formatUnits(highGasPrice, 'gwei'),
        basePrice: baseGasPrice.toString(),
        basePriceGwei: formatUnits(baseGasPrice, 'gwei'),
        method: methodUsed,
        timestamp: Date.now(),
      };

      // Calculate percentage increases for display
      const lowIncrease = Number(((lowGasPrice - baseGasPrice) * 100n) / baseGasPrice);
      const mediumIncrease = Number(((mediumGasPrice - baseGasPrice) * 100n) / baseGasPrice);
      const highIncrease = Number(((highGasPrice - baseGasPrice) * 100n) / baseGasPrice);

      // Format response text
      let responseText = `⛽ **Gas Price Estimates for Polygon zkEVM**\n\n`;

      responseText += `**Current Base Price:**\n`;
      responseText += `📊 ${result.basePriceGwei} gwei (${result.basePrice} wei)\n\n`;

      responseText += `**Recommended Tiers:**\n`;
      responseText += `🐌 **Low Priority:** ${result.lowGwei} gwei (+${lowIncrease.toFixed(1)}%)\n`;
      responseText += `   └─ ${result.low} wei\n`;
      responseText += `⚡ **Medium Priority:** ${result.mediumGwei} gwei (+${mediumIncrease.toFixed(1)}%)\n`;
      responseText += `   └─ ${result.medium} wei\n`;
      responseText += `🚀 **High Priority:** ${result.highGwei} gwei (+${highIncrease.toFixed(1)}%)\n`;
      responseText += `   └─ ${result.high} wei\n\n`;

      // Add usage recommendations
      responseText += `**Usage Recommendations:**\n`;
      responseText += `🐌 Low: Non-urgent transactions, can wait 1-2 minutes\n`;
      responseText += `⚡ Medium: Standard transactions, ~30-60 seconds\n`;
      responseText += `🚀 High: Urgent transactions, fastest confirmation\n\n`;

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

      // Add zkEVM specific note
      responseText += `\n\n💡 *zkEVM gas prices are typically lower than Ethereum mainnet*`;

      const responseContent: Content = {
        text: responseText,
        actions: ['GET_GAS_PRICE_ESTIMATES'],
        source: message.content.source,
        data: result,
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('❌ Error in GET_GAS_PRICE_ESTIMATES action:', error);

      const errorContent: Content = {
        text: `❌ Error getting gas price estimates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        actions: ['GET_GAS_PRICE_ESTIMATES'],
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
          text: 'Get gas price estimates for zkEVM',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '⛽ **Gas Price Estimates for Polygon zkEVM**\n\n**Current Base Price:**\n📊 0.25 gwei (250000000 wei)\n\n**Recommended Tiers:**\n🐌 **Low Priority:** 0.35 gwei (+40.0%)\n   └─ 350000000 wei\n⚡ **Medium Priority:** 0.5 gwei (+100.0%)\n   └─ 750000000 wei\n🚀 **High Priority:** 0.75 gwei (+200.0%)\n   └─ 750000000 wei\n\n**Usage Recommendations:**\n🐌 Low: Non-urgent transactions, can wait 1-2 minutes\n⚡ Medium: Standard transactions, ~30-60 seconds\n🚀 High: Urgent transactions, fastest confirmation\n\n🔗 Retrieved via Alchemy API\n\n💡 *zkEVM gas prices are typically lower than Ethereum mainnet*',
          actions: ['GET_GAS_PRICE_ESTIMATES'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'What are the current gas fees?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '⛽ **Gas Price Estimates for Polygon zkEVM**\n\n**Current Base Price:**\n📊 1.2 gwei (1200000000 wei)\n\n**Recommended Tiers:**\n🐌 **Low Priority:** 1.7 gwei (+41.7%)\n   └─ 1700000000 wei\n⚡ **Medium Priority:** 2.2 gwei (+83.3%)\n   └─ 2200000000 wei\n🚀 **High Priority:** 3.2 gwei (+166.7%)\n   └─ 3200000000 wei\n\n**Usage Recommendations:**\n🐌 Low: Non-urgent transactions, can wait 1-2 minutes\n⚡ Medium: Standard transactions, ~30-60 seconds\n🚀 High: Urgent transactions, fastest confirmation\n\n🔗 Retrieved via Direct RPC\n\n💡 *zkEVM gas prices are typically lower than Ethereum mainnet*',
          actions: ['GET_GAS_PRICE_ESTIMATES'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Show me low medium high gas price tiers',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '⛽ **Gas Price Estimates for Polygon zkEVM**\n\n**Current Base Price:**\n📊 0.8 gwei (800000000 wei)\n\n**Recommended Tiers:**\n🐌 **Low Priority:** 1.3 gwei (+62.5%)\n   └─ 1300000000 wei\n⚡ **Medium Priority:** 1.8 gwei (+125.0%)\n   └─ 1800000000 wei\n🚀 **High Priority:** 2.8 gwei (+250.0%)\n   └─ 2800000000 wei\n\n**Usage Recommendations:**\n🐌 Low: Non-urgent transactions, can wait 1-2 minutes\n⚡ Medium: Standard transactions, ~30-60 seconds\n🚀 High: Urgent transactions, fastest confirmation\n\n🔗 Retrieved via Alchemy API\n\n💡 *zkEVM gas prices are typically lower than Ethereum mainnet*',
          actions: ['GET_GAS_PRICE_ESTIMATES'],
        },
      },
    ],
  ],
};
