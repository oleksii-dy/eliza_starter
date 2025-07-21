import {
  Provider,
  ProviderResult,
  IAgentRuntime,
  Memory,
  State,
  logger,
} from '@elizaos/core';
import { formatGasPrice } from '../utils/format';
import { JsonRpcProvider } from 'ethers';

export const marketDataProvider: Provider = {
  name: 'MARKET_DATA_PROVIDER',
  description: 'Provides market conditions and gas price information',
  
  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<ProviderResult> => {
    try {
      const config = runtime.getSetting('clanker') as any;
      if (!config?.BASE_RPC_URL) {
        return {
          text: 'Market data unavailable - RPC not configured',
          values: {},
          data: {},
        };
      }

      const provider = new JsonRpcProvider(config.BASE_RPC_URL);
      const [block, feeData] = await Promise.all([
        provider.getBlock('latest'),
        provider.getFeeData(),
      ]);

      let contextText = 'Current market conditions:\n';
      
      if (block) {
        contextText += `Block number: ${block.number}\n`;
        contextText += `Block timestamp: ${new Date(block.timestamp * 1000).toISOString()}\n`;
      }

      if (feeData.gasPrice) {
        contextText += `Gas price: ${formatGasPrice(feeData.gasPrice)}\n`;
      }

      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        contextText += `Max fee: ${formatGasPrice(feeData.maxFeePerGas)}\n`;
        contextText += `Priority fee: ${formatGasPrice(feeData.maxPriorityFeePerGas)}\n`;
      }

      const values = {
        blockNumber: block?.number.toString() || 'unknown',
        gasPrice: feeData.gasPrice ? formatGasPrice(feeData.gasPrice) : 'unknown',
      };

      return {
        text: contextText,
        values,
        data: {
          blockNumber: block?.number || 0,
          blockTimestamp: block?.timestamp || 0,
          gasPrice: feeData.gasPrice?.toString() || '0',
          maxFeePerGas: feeData.maxFeePerGas?.toString() || '0',
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() || '0',
        },
      };
    } catch (error) {
      logger.error('Error in market data provider:', error);
      return {
        text: 'Market data temporarily unavailable',
        values: {},
        data: {},
      };
    }
  },
};