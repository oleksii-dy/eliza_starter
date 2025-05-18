import axios from 'axios';
import { parseUnits, formatUnits, parseEther } from 'ethers'; // Assuming ethers v6 for bigint handling
import type { IAgentRuntime } from '@elizaos/core';
import { logger as elizaLogger } from '@elizaos/core'; // Import elizaLogger
import { PolygonRpcService } from './PolygonRpcService'; // Import PolygonRpcService
import { GasPriceInfo } from '../types'; // Kept from merge-addpolygon-resolution

/**
 * Structure of the expected successful response from the PolygonScan Gas Oracle API.
 * Prices are typically returned in Gwei as strings.
 */
interface PolygonScanGasResult {
  LastBlock: string;
  SafeGasPrice: string;
  ProposeGasPrice: string;
  FastGasPrice: string;
  suggestBaseFee?: string; // Original expected field (Gwei)
  BaseFee?: string; // New potential field (likely MATIC/ETH?)
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
 * @returns Value in Wei (as bigint), or null if conversion fails.
 */
function gweiToWei(gweiString: string | undefined | null): bigint | null {
  if (
    typeof gweiString !== 'string' ||
    gweiString.trim() === '' ||
    Number.isNaN(Number(gweiString))
  ) {
    elizaLogger.warn(`Invalid input provided to gweiToWei: ${gweiString}. Returning null.`); // Use elizaLogger
    return null;
  }

  try {
    return parseUnits(gweiString, 'gwei');
  } catch (error) {
    elizaLogger.error(`Error converting Gwei string "${gweiString}" to Wei:`, error); // Use elizaLogger
    // The original code already correctly returns null here and does not throw.
    // The PR comment "remove throw new Error(...)" referred to a line that was already commented out or removed.
    // The key is to return null, which is happening.
    return null;
  }
}

/**
 * Fetches gas price estimates from PolygonScan API with fallback to eth_gasPrice.
 *
 * @param runtime The IAgentRuntime to access services.
 * @returns A promise resolving to GasPriceEstimates object with values in Wei.
 */
export const getGasPriceEstimates = async (runtime: IAgentRuntime): Promise<GasPriceEstimates> => {
  let apiKey = runtime.getSetting('POLYGONSCAN_KEY');
  if (!apiKey) {
    apiKey = runtime.getSetting('POLYGONSCAN_KEY_FALLBACK');
  }

  if (!apiKey) {
    elizaLogger.warn(
      'POLYGONSCAN_KEY or POLYGONSCAN_KEY_FALLBACK not found in configuration. Falling back to eth_gasPrice.'
    );
    return fetchFallbackGasPrice(runtime);
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
      elizaLogger.error(
        `PolygonScan API returned an error: ${data.message} (Status: ${data.status})`
      ); // Use elizaLogger
      elizaLogger.warn('Falling back to eth_gasPrice.'); // Use elizaLogger
      return fetchFallbackGasPrice(runtime);
    }

    const { SafeGasPrice, ProposeGasPrice, FastGasPrice, suggestBaseFee, BaseFee } = data.result;

    // Convert Gwei strings for priority fees to Wei bigints
    const safeWei = gweiToWei(SafeGasPrice);
    const proposeWei = gweiToWei(ProposeGasPrice);
    const fastWei = gweiToWei(FastGasPrice);

    // Determine base fee, prioritizing BaseFee (assuming MATIC/ETH) then suggestBaseFee (Gwei)
    let baseFeeWei: bigint | null = null;
    try {
      if (BaseFee !== undefined && BaseFee !== null) {
        // Check BaseFee format before parsing (simple check)
        if (typeof BaseFee === 'string' && !Number.isNaN(Number(BaseFee))) {
          baseFeeWei = parseEther(BaseFee);
        } else {
          elizaLogger.warn(`Invalid BaseFee format received: ${BaseFee}. Skipping.`); // Use elizaLogger
          // Try suggestBaseFee if BaseFee is invalid
          baseFeeWei = gweiToWei(suggestBaseFee);
        }
      } else {
        // Fallback to suggestBaseFee (Gwei) if BaseFee is missing or invalid
        baseFeeWei = gweiToWei(suggestBaseFee);
      }
    } catch (error: unknown) {
      // Catch errors from parseEther or gweiToWei inside this block
      elizaLogger.error('Error parsing base fee from PolygonScan:', error); // Use elizaLogger
      baseFeeWei = null;
    }

    // Construct the result, allowing for nulls from gweiToWei
    return {
      safeLow: safeWei !== null ? { maxPriorityFeePerGas: safeWei } : null,
      average: proposeWei !== null ? { maxPriorityFeePerGas: proposeWei } : null,
      fast: fastWei !== null ? { maxPriorityFeePerGas: fastWei } : null,
      estimatedBaseFee: baseFeeWei,
      fallbackGasPrice: null, // Indicate fallback was not used
    };
  } catch (error: unknown) {
    // This catch block now primarily handles axios network errors or API status != 200
    elizaLogger.error('Error fetching or parsing PolygonScan gas estimates:', error); // Use elizaLogger
    elizaLogger.warn('Falling back to eth_gasPrice.'); // Use elizaLogger
    return fetchFallbackGasPrice(runtime);
  }
};

/**
 * Fetches gas price using the RPC provider's getGasPrice method as a fallback.
 *
 * @param runtime The IAgentRuntime to access services.
 * @returns A promise resolving to a simplified GasPriceEstimates object.
 */
const fetchFallbackGasPrice = async (runtime: IAgentRuntime): Promise<GasPriceEstimates> => {
  try {
    const rpcService = runtime.getService<PolygonRpcService>(PolygonRpcService.serviceType);
    if (!rpcService) {
      elizaLogger.error('PolygonRpcService not available for fallback gas price.'); // Use elizaLogger
      throw new Error('PolygonRpcService not available'); // Or return all-null estimates
    }

    const gasPriceWei = await rpcService.getGasPrice('L2');

    if (gasPriceWei === null || gasPriceWei === undefined) {
      elizaLogger.warn('Fallback RPC gas price (via getGasPrice L2) returned null or undefined.'); // Use elizaLogger
      return {
        safeLow: null,
        average: null,
        fast: null,
        estimatedBaseFee: null,
        fallbackGasPrice: null, // Explicitly null
      };
    }

    elizaLogger.warn(`Using fallback RPC gas price: ${formatUnits(gasPriceWei, 'gwei')} Gwei`); // Use elizaLogger

    // When using fallback, we only have a single gas price.
    // We set priority fees and base fee to null as they aren't directly available.
    return {
      safeLow: null,
      average: null,
      fast: null,
      estimatedBaseFee: null,
      fallbackGasPrice: gasPriceWei, // Provide the fallback value directly
    };
  } catch (error: unknown) {
    elizaLogger.error('Error fetching fallback gas price via RPC:', error); // Use elizaLogger
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