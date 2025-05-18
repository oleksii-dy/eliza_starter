import type { Action, IAgentRuntime } from '@elizaos/core';
import { getGasPriceEstimates, type GasPriceEstimates } from '../services/GasService';

export const getPolygonGasEstimatesAction: Action = {
  name: 'GET_POLYGON_GAS_ESTIMATES',
  description: 'Gets current gas price estimates for Polygon from PolygonScan.',
  validate: async () => true,
  handler: async (runtime: IAgentRuntime) => {
    const estimates: GasPriceEstimates = await getGasPriceEstimates(runtime);
    let text = 'Polygon Gas Estimates (Wei):\n';
    text += `  Safe Low Priority: ${estimates.safeLow?.maxPriorityFeePerGas?.toString() ?? 'N/A'}\n`;
    text += `  Average Priority:  ${estimates.average?.maxPriorityFeePerGas?.toString() ?? 'N/A'}\n`;
    text += `  Fast Priority:     ${estimates.fast?.maxPriorityFeePerGas?.toString() ?? 'N/A'}\n`;
    text += `  Estimated Base:  ${estimates.estimatedBaseFee?.toString() ?? 'N/A'}`;
    if (estimates.fallbackGasPrice) {
      text += `\n  (Used Fallback Price: ${estimates.fallbackGasPrice.toString()})`;
    }
    return { text, actions: ['GET_POLYGON_GAS_ESTIMATES'], data: estimates };
  },
  examples: [],
};
