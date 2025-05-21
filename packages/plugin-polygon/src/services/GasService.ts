// import axios from 'axios';
// import { parseUnits, formatUnits, parseEther } from 'ethers'; // Assuming ethers v6 for bigint handling
// import type { IAgentRuntime } from '@elizaos/core';
// import { logger } from '@elizaos/core'; // Import logger
// import { PolygonRpcService } from './PolygonRpcService'; // Import PolygonRpcService
// import { ConfigService } from './ConfigService';
// import { GasPriceInfo } from '../types'; // Kept from merge-addpolygon-resolution

// /**
//  * Structure of the expected successful response from the PolygonScan Gas Oracle API.
//  * Prices are typically returned in Gwei as strings.
//  */
// interface PolygonScanGasResult {
//   LastBlock: string;
//   SafeGasPrice: string;
//   ProposeGasPrice: string;
//   FastGasPrice: string;
//   suggestBaseFee?: string; // Original expected field (Gwei)
//   BaseFee?: string; // New potential field (likely MATIC/ETH?)
//   gasUsedRatio: string;
// }

// interface PolygonScanGasOracleResponse {
//   status: string;
//   message: string;
//   result: PolygonScanGasResult;
// }

// /**
//  * Standardized return structure for gas price estimates.
//  * All values are represented in Wei as bigints.
//  * Fields can be null if data is unavailable (e.g., during fallback).
//  */
// export interface GasPriceEstimates {
//   safeLow: {
//     maxPriorityFeePerGas: bigint | null; // Corresponds to SafeGasPrice
//     // maxFeePerGas might be calculated later using baseFee + priorityFee
//   } | null;
//   average: {
//     maxPriorityFeePerGas: bigint | null; // Corresponds to ProposeGasPrice
//   } | null;
//   fast: {
//     maxPriorityFeePerGas: bigint | null; // Corresponds to FastGasPrice
//   } | null;
//   /** Estimated next block base fee in Wei. */
//   estimatedBaseFee: bigint | null; // Corresponds to suggestBaseFee
//   /** Fallback gas price from eth_gasPrice in Wei, if used. */
//   fallbackGasPrice?: bigint | null;
// }

// const POLYGONSCAN_API_URL = 'https://api.polygonscan.com/api';

// /**
//  * Converts a Gwei string value to a Wei bigint value.
//  * Handles potential decimal values in the Gwei string.
//  * @param gweiString Value in Gwei (as string).
//  * @returns Value in Wei (as bigint), or null if conversion fails.
//  */
// function gweiToWei(gweiString: string | undefined | null): bigint | null {
//   if (
//     typeof gweiString !== 'string' ||
//     gweiString.trim() === '' ||
//     Number.isNaN(Number(gweiString))
//   ) {
//     logger.warn(`Invalid input provided to gweiToWei: ${gweiString}. Returning null.`); // Use logger
//     return null;
//   }

//   try {
//     return parseUnits(gweiString, 'gwei');
//   } catch (error) {
//     logger.error(`Error converting Gwei string "${gweiString}" to Wei:`, error); // Use logger
//     // The original code already correctly returns null here and does not throw.
//     // The PR comment "remove throw new Error(...)" referred to a line that was already commented out or removed.
//     // The key is to return null, which is happening.
//     return null;
//   }
// }

// /**
//  * Fetches gas price estimates from PolygonScan API with fallback to eth_gasPrice.
//  *
//  * @param runtime The IAgentRuntime to access services.
//  * @returns A promise resolving to GasPriceEstimates object with values in Wei.
//  */
// export const getGasPriceEstimates = async (runtime: IAgentRuntime): Promise<GasPriceEstimates> => {
//   try {
//     // Get ConfigService
//     const configService = runtime.getService<ConfigService>(ConfigService.serviceType);
//     if (!configService) {
//       logger.warn('ConfigService not available. Using fallback method for gas price estimation.');
//       return fetchFallbackGasPrice(runtime);
//     }

//     // Get PolygonScan API key from config
//     let apiKey = configService.get<string>('POLYGONSCAN_KEY');
//     if (!apiKey) {
//       apiKey = configService.get<string>('POLYGONSCAN_KEY_FALLBACK');
//     }

//     // If no API key is available, use fallback
//     if (!apiKey) {
//       logger.info('No PolygonScan API key found. Using fallback method for gas price estimation.');
//       return fetchFallbackGasPrice(runtime);
//     }

//     const params = {
//       module: 'gastracker',
//       action: 'gasoracle',
//       apikey: apiKey,
//     };

//     const response = await axios.get<PolygonScanGasOracleResponse>(POLYGONSCAN_API_URL, { params });

//     if (response.status !== 200) {
//       logger.warn(`PolygonScan API request failed with status ${response.status}. Using fallback method.`);
//       return fetchFallbackGasPrice(runtime);
//     }

//     const data = response.data;

//     // PolygonScan sometimes returns status "0" with a message for errors (like invalid key)
//     if (data.status !== '1' || !data.result) {
//       logger.warn(`PolygonScan API returned invalid data: ${JSON.stringify(data)}. Using fallback method.`);
//       return fetchFallbackGasPrice(runtime);
//     }

//     const { SafeGasPrice, ProposeGasPrice, FastGasPrice, suggestBaseFee, BaseFee } = data.result;

//     // Convert Gwei strings for priority fees to Wei bigints
//     const safeWei = gweiToWei(SafeGasPrice);
//     const proposeWei = gweiToWei(ProposeGasPrice);
//     const fastWei = gweiToWei(FastGasPrice);

//     // Determine base fee, prioritizing BaseFee (assuming MATIC/ETH) then suggestBaseFee (Gwei)
//     let baseFeeWei: bigint | null = null;
//     try {
//       if (BaseFee !== undefined && BaseFee !== null) {
//         // Check BaseFee format before parsing (simple check)
//         if (typeof BaseFee === 'string' && !Number.isNaN(Number(BaseFee))) {
//           baseFeeWei = parseEther(BaseFee);
//         } else {
//           logger.warn(`Invalid BaseFee format received: ${BaseFee}. Skipping.`); // Use logger
//           // Try suggestBaseFee if BaseFee is invalid
//           baseFeeWei = gweiToWei(suggestBaseFee);
//         }
//       } else {
//         // Fallback to suggestBaseFee (Gwei) if BaseFee is missing or invalid
//         baseFeeWei = gweiToWei(suggestBaseFee);
//       }
//     } catch (error: unknown) {
//       // Catch errors from parseEther or gweiToWei inside this block
//       logger.error('Error parsing base fee from PolygonScan:', error); // Use logger
//       baseFeeWei = null;
//     }

//     // Construct the result, allowing for nulls from gweiToWei
//     return {
//       safeLow: safeWei !== null ? { maxPriorityFeePerGas: safeWei } : null,
//       average: proposeWei !== null ? { maxPriorityFeePerGas: proposeWei } : null,
//       fast: fastWei !== null ? { maxPriorityFeePerGas: fastWei } : null,
//       estimatedBaseFee: baseFeeWei,
//       fallbackGasPrice: null, // Indicate fallback was not used
//     };
//   } catch (error: unknown) {
//     // This catch block now primarily handles axios network errors or API status != 200
//     logger.error('Error fetching or parsing PolygonScan gas estimates:', error); // Use logger
//     logger.warn('Falling back to eth_gasPrice.'); // Use logger
//     return fetchFallbackGasPrice(runtime);
//   }
// };

// /**
//  * Fetches gas price using the RPC provider's getGasPrice method as a fallback.
//  *
//  * @param runtime The IAgentRuntime to access services.
//  * @returns A promise resolving to a simplified GasPriceEstimates object.
//  */
// const fetchFallbackGasPrice = async (runtime: IAgentRuntime): Promise<GasPriceEstimates> => {
//   try {
//     const polygonRpcService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
//     if (!polygonRpcService) {
//       logger.error('PolygonRpcService not available for fallback gas price.'); // Use logger
//       throw new Error('PolygonRpcService not available'); // Or return all-null estimates
//     }

//     const provider = polygonRpcService.getL2Provider();
//     if (!provider) {
//       logger.error('L2 provider not available for fallback gas price.'); // Use logger
//       throw new Error('L2 provider not available'); // Or return all-null estimates
//     }

//     const feeData = await provider.getFeeData();
//     const gasPrice = feeData.gasPrice || null;

//     if (gasPrice === null || gasPrice === undefined) {
//       logger.warn('Fallback RPC gas price (via getGasPrice L2) returned null or undefined.'); // Use logger
//       return {
//         safeLow: null,
//         average: null,
//         fast: null,
//         estimatedBaseFee: null,
//         fallbackGasPrice: null, // Explicitly null
//       };
//     }

//     logger.warn(`Using fallback RPC gas price: ${formatUnits(gasPrice, 'gwei')} Gwei`); // Use logger

//     // When using fallback, we only have a single gas price.
//     // We set priority fees and base fee to null as they aren't directly available.
//     return {
//       safeLow: null,
//       average: null,
//       fast: null,
//       estimatedBaseFee: null,
//       fallbackGasPrice: gasPrice, // Provide the fallback value directly
//     };
//   } catch (error: unknown) {
//     logger.error('Error fetching fallback gas price via RPC:', error); // Use logger
//     // Return empty estimates if fallback also fails
//     return {
//       safeLow: null,
//       average: null,
//       fast: null,
//       estimatedBaseFee: null,
//       fallbackGasPrice: null,
//     };
//   }
// };

import axios from 'axios';
import { parseUnits, formatUnits } from 'ethers'; // Assuming ethers v6 for bigint handling
import type { IAgentRuntime } from '@elizaos/core';
// Placeholder for core RPC interaction wrapper - replace with actual ElizaOS mechanism
const coreRpc = {
  eth_gasPrice: async (): Promise<bigint> => {
    // In a real scenario, this would call the configured Polygon RPC endpoint
    console.warn('Using fallback eth_gasPrice RPC method.');
    // Simulating a typical gas price in Wei (e.g., 50 Gwei)
    return parseUnits('50', 'gwei');
  },
};

/**
 * Structure of the expected successful response from the PolygonScan Gas Oracle API.
 * Prices are typically returned in Gwei as strings.
 */
interface PolygonScanGasResult {
  LastBlock: string;
  SafeGasPrice: string;
  ProposeGasPrice: string;
  FastGasPrice: string;
  suggestBaseFee: string; // Base fee estimate in Gwei
  gasUsedRatio: string;
}

interface PolygonScanGasOracleResponse {
  status: string;
  message: string;
  result: PolygonScanGasResult;
}

/**
 * Standardized return structure for gas price estimates.
 * All values are represented in Wei as bigints.
 * Fields can be null if data is unavailable (e.g., during fallback).
 */
export interface GasPriceEstimates {
  safeLow: {
    maxPriorityFeePerGas: bigint | null; // Corresponds to SafeGasPrice
    // maxFeePerGas might be calculated later using baseFee + priorityFee
  } | null;
  average: {
    maxPriorityFeePerGas: bigint | null; // Corresponds to ProposeGasPrice
  } | null;
  fast: {
    maxPriorityFeePerGas: bigint | null; // Corresponds to FastGasPrice
  } | null;
  /** Estimated next block base fee in Wei. */
  estimatedBaseFee: bigint | null; // Corresponds to suggestBaseFee
  /** Fallback gas price from eth_gasPrice in Wei, if used. */
  fallbackGasPrice?: bigint | null;
}

const POLYGONSCAN_API_URL = 'https://api.polygonscan.com/api';

/**
 * Converts a Gwei string value to a Wei bigint value.
 * Handles potential decimal values in the Gwei string.
 * @param gweiString Value in Gwei (as string).
 * @returns Value in Wei (as bigint).
 */
function gweiToWei(gweiString: string): bigint {
  try {
    // Use parseUnits which handles decimals correctly
    return parseUnits(gweiString, 'gwei');
  } catch (error) {
    console.error(`Error converting Gwei string "${gweiString}" to Wei:`, error);
    throw new Error(`Invalid Gwei value format: ${gweiString}`);
  }
}

/**
 * Fetches gas price estimates from PolygonScan API with fallback to eth_gasPrice.
 *
 * @returns A promise resolving to GasPriceEstimates object with values in Wei.
 */
export const getGasPriceEstimates = async (runtime: IAgentRuntime): Promise<GasPriceEstimates> => {
  const apiKey = runtime.getSetting('POLYGONSCAN_KEY');

  if (!apiKey) {
    console.warn('POLYGONSCAN_KEY not found in configuration. Falling back to eth_gasPrice.');
    return fetchFallbackGasPrice();
  }

  const params = {
    module: 'gastracker',
    action: 'gasoracle',
    apikey: apiKey,
  };

  try {
    const response = await axios.get<PolygonScanGasOracleResponse>(POLYGONSCAN_API_URL, { params });

    if (response.status !== 200) {
      throw new Error(`PolygonScan API request failed with status ${response.status}`);
    }

    const data = response.data;

    // PolygonScan sometimes returns status "0" with a message for errors (like invalid key)
    if (data.status !== '1' || !data.result) {
      console.error(`PolygonScan API returned an error: ${data.message} (Status: ${data.status})`);
      console.warn('Falling back to eth_gasPrice.');
      return fetchFallbackGasPrice();
    }

    const { SafeGasPrice, ProposeGasPrice, FastGasPrice, suggestBaseFee } = data.result;

    // Convert Gwei strings to Wei bigints
    const safeWei = gweiToWei(SafeGasPrice);
    const proposeWei = gweiToWei(ProposeGasPrice);
    const fastWei = gweiToWei(FastGasPrice);
    const baseFeeWei = gweiToWei(suggestBaseFee);

    return {
      safeLow: { maxPriorityFeePerGas: safeWei },
      average: { maxPriorityFeePerGas: proposeWei },
      fast: { maxPriorityFeePerGas: fastWei },
      estimatedBaseFee: baseFeeWei,
      fallbackGasPrice: null, // Indicate fallback was not used
    };
  } catch (error) {
    console.error('Error fetching or parsing PolygonScan gas estimates:', error);
    console.warn('Falling back to eth_gasPrice.');
    return fetchFallbackGasPrice();
  }
};

/**
 * Fetches gas price using the eth_gasPrice RPC method as a fallback.
 *
 * @returns A promise resolving to a simplified GasPriceEstimates object.
 */
const fetchFallbackGasPrice = async (): Promise<GasPriceEstimates> => {
  try {
    const gasPriceWei = await coreRpc.eth_gasPrice();

    // When using fallback, we only have a single gas price.
    // We might assign it to 'average' priority or provide it separately.
    // We set priority fees and base fee to null as they aren't directly available.
    // Providing the raw fallback value allows consumers to decide how to use it.
    return {
      safeLow: null,
      average: null, // Or potentially { maxPriorityFeePerGas: gasPriceWei } if treating as priority
      fast: null,
      estimatedBaseFee: null,
      fallbackGasPrice: gasPriceWei, // Provide the fallback value explicitly
    };
  } catch (rpcError) {
    console.error('Error fetching fallback gas price via eth_gasPrice:', rpcError);
    // Return empty estimates if fallback also fails
    return {
      safeLow: null,
      average: null,
      fast: null,
      estimatedBaseFee: null,
      fallbackGasPrice: null,
    };
  }
};

// Example Usage (remove in final implementation)
/*
async function testGas() {
    // Make sure to set POLYGONSCAN_API_KEY in your environment for testing
    // e.g., export POLYGONSCAN_API_KEY='YourApiKeyToken'
    console.log('Fetching gas estimates...');
    const estimates = await getGasPriceEstimates();
    console.log('Gas Estimates (Wei):');
    console.log('  Safe Low Priority Fee:', estimates.safeLow?.maxPriorityFeePerGas?.toString());
    console.log('  Average Priority Fee: ', estimates.average?.maxPriorityFeePerGas?.toString());
    console.log('  Fast Priority Fee:    ', estimates.fast?.maxPriorityFeePerGas?.toString());
    console.log('  Estimated Base Fee: ', estimates.estimatedBaseFee?.toString());
    if (estimates.fallbackGasPrice !== undefined && estimates.fallbackGasPrice !== null) {
        console.log('  Fallback Gas Price: ', estimates.fallbackGasPrice.toString(), '(used fallback)');
    }
}

testGas().catch(console.error);
*/
