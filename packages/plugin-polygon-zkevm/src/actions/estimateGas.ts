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
 * Estimate gas action for Polygon zkEVM
 * Estimates gas required for a transaction
 */
export const estimateGasAction: Action = {
  name: 'ESTIMATE_GAS_ZKEVM',
  similes: ['GAS_ESTIMATE', 'ESTIMATE_GAS', 'GAS_COST', 'TRANSACTION_COST'],
  description: 'Estimate gas required for a transaction on Polygon zkEVM',

  validate: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<boolean> => {
    // Check if we have the required configuration
    const alchemyApiKey = process.env.ALCHEMY_API_KEY || runtime.getSetting('ALCHEMY_API_KEY');
    const zkevmRpcUrl = process.env.ZKEVM_RPC_URL || runtime.getSetting('ZKEVM_RPC_URL');

    if (!alchemyApiKey && !zkevmRpcUrl) {
      logger.error('No Alchemy API key or zkEVM RPC URL configured');
      return false;
    }

    // Check if message contains gas estimation request
    const text = message.content.text.toLowerCase();
    const hasGasRequest = text.includes('estimate') && text.includes('gas');

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
      logger.info('Handling ESTIMATE_GAS_ZKEVM action');

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

      // Build transaction object from message
      const transaction: any = {};

      // Extract addresses
      const addresses = text.match(/0x[a-fA-F0-9]{40}/g);
      if (addresses && addresses.length >= 1) {
        transaction.to = addresses[0];
        if (addresses.length >= 2) {
          transaction.from = addresses[1];
        }
      }

      // Extract value if specified
      const valueMatch = text.match(/(\d+(?:\.\d+)?)\s*(eth|ether)/i);
      if (valueMatch) {
        const ethValue = parseFloat(valueMatch[1]);
        transaction.value = '0x' + BigInt(Math.floor(ethValue * 1e18)).toString(16);
      }

      // Extract data if specified (for contract calls)
      const dataMatch = text.match(/data[:\s]+(0x[a-fA-F0-9]+)/i);
      if (dataMatch) {
        transaction.data = dataMatch[1];
      }

      // If no specific transaction details, provide estimates for common operations
      if (!transaction.to && !transaction.data) {
        const gasPrice = await provider.send('eth_gasPrice', []);
        const gasPriceInGwei = Number(BigInt(gasPrice)) / 1e9;

        const estimates = [
          { operation: 'Simple Transfer', gas: 21000 },
          { operation: 'ERC20 Transfer', gas: 65000 },
          { operation: 'Uniswap Swap', gas: 150000 },
          { operation: 'Contract Deployment', gas: 500000 },
          { operation: 'Complex DeFi Operation', gas: 300000 },
        ];

        let responseText = `⛽ Gas Estimates for Common Operations:
💸 Current Gas Price: ${gasPriceInGwei.toFixed(4)} Gwei

📊 Operation Estimates:`;

        for (const estimate of estimates) {
          const costInEth = (gasPriceInGwei * estimate.gas) / 1e9;
          responseText += `\n🔸 ${estimate.operation}: ${estimate.gas.toLocaleString()} gas (~${costInEth.toFixed(6)} ETH)`;
        }

        const responseContent: Content = {
          text: responseText,
          actions: ['ESTIMATE_GAS_ZKEVM'],
          source: message.content.source,
        };

        await callback(responseContent);
        return responseContent;
      }

      // Estimate gas for the specific transaction
      const gasEstimate = await provider.estimateGas(transaction);
      const gasPrice = await provider.send('eth_gasPrice', []);
      const gasPriceInGwei = Number(BigInt(gasPrice)) / 1e9;
      const costInEth = (gasPriceInGwei * Number(gasEstimate)) / 1e9;

      let responseText = `⛽ Gas Estimation Results:
📊 Estimated Gas: ${gasEstimate.toString()} units
💸 Current Gas Price: ${gasPriceInGwei.toFixed(4)} Gwei
💰 Estimated Cost: ${costInEth.toFixed(6)} ETH

🔧 Transaction Details:`;

      if (transaction.to) {
        responseText += `\n📍 To: ${transaction.to}`;
      }
      if (transaction.from) {
        responseText += `\n📤 From: ${transaction.from}`;
      }
      if (transaction.value) {
        const valueInEth = Number(BigInt(transaction.value)) / 1e18;
        responseText += `\n💰 Value: ${valueInEth} ETH`;
      }
      if (transaction.data) {
        const dataLength = (transaction.data.length - 2) / 2;
        responseText += `\n📦 Data: ${dataLength} bytes`;
      }

      const responseContent: Content = {
        text: responseText,
        actions: ['ESTIMATE_GAS_ZKEVM'],
        source: message.content.source,
      };

      await callback(responseContent);
      return responseContent;
    } catch (error) {
      logger.error('Error in ESTIMATE_GAS_ZKEVM action:', error);

      const errorContent: Content = {
        text: `Error estimating gas: ${error instanceof Error ? error.message : 'Unknown error'}`,
        actions: ['ESTIMATE_GAS_ZKEVM'],
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
          text: 'Estimate gas for sending 1 ETH to 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: `⛽ Gas Estimation Results:
📊 Estimated Gas: 21000 units
💸 Current Gas Price: 1.2345 Gwei
💰 Estimated Cost: 0.000026 ETH

🔧 Transaction Details:
📍 To: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
💰 Value: 1 ETH`,
          actions: ['ESTIMATE_GAS_ZKEVM'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'What are the gas estimates for common operations?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: `⛽ Gas Estimates for Common Operations:
💸 Current Gas Price: 1.2345 Gwei

📊 Operation Estimates:
🔸 Simple Transfer: 21,000 gas (~0.000026 ETH)
🔸 ERC20 Transfer: 65,000 gas (~0.000080 ETH)
🔸 Uniswap Swap: 150,000 gas (~0.000185 ETH)
🔸 Contract Deployment: 500,000 gas (~0.000617 ETH)
🔸 Complex DeFi Operation: 300,000 gas (~0.000370 ETH)`,
          actions: ['ESTIMATE_GAS_ZKEVM'],
        },
      },
    ],
  ],
};
