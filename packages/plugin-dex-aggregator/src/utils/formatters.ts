import BigNumber from 'bignumber.js';

/**
 * Formats a token amount from wei/smallest unit to human readable format
 */
export function formatTokenAmount(amount: string, decimals: number, precision: number = 6): string {
  try {
    const bn = new BigNumber(amount);
    const divisor = new BigNumber(10).pow(decimals);
    const formatted = bn.div(divisor);
    
    // Handle very small amounts
    if (formatted.lt(0.000001) && formatted.gt(0)) {
      return '< 0.000001';
    }
    
    // Format with appropriate precision
    return formatted.toFixed(precision).replace(/\.?0+$/, '');
  } catch {
    return '0';
  }
}

/**
 * Formats a percentage value with appropriate precision
 */
export function formatPercentage(value: string, precision: number = 2): string {
  try {
    const num = parseFloat(value);
    return `${num.toFixed(precision)}%`;
  } catch {
    return '0.00%';
  }
}

/**
 * Formats a USD value with dollar sign and commas
 */
export function formatUSD(value: number | string, precision: number = 2): string {
  try {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `$${num.toLocaleString('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    })}`;
  } catch {
    return '$0.00';
  }
}

/**
 * Formats gas amount in gwei
 */
export function formatGas(gasAmount: string): string {
  try {
    const bn = new BigNumber(gasAmount);
    const gwei = bn.div(new BigNumber(10).pow(9));
    return `${gwei.toFixed(2)} gwei`;
  } catch {
    return '0 gwei';
  }
}

/**
 * Formats a transaction hash with ellipsis for display
 */
export function formatTxHash(hash: string, prefixLength: number = 6, suffixLength: number = 4): string {
  if (!hash || hash.length < prefixLength + suffixLength) {
    return hash;
  }
  
  return `${hash.slice(0, prefixLength)}...${hash.slice(-suffixLength)}`;
}

/**
 * Formats an address with ellipsis for display
 */
export function formatAddress(address: string, prefixLength: number = 6, suffixLength: number = 4): string {
  if (!address || address.length < prefixLength + suffixLength) {
    return address;
  }
  
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

/**
 * Formats time duration in human readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  } else {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
}

/**
 * Formats a price impact with color coding for risk levels
 */
export function formatPriceImpact(priceImpact: string): string {
  try {
    const impact = parseFloat(priceImpact);
    const formatted = formatPercentage(priceImpact);
    
    if (impact < 1) {
      return `${formatted} ✅`; // Green - Low impact
    } else if (impact < 3) {
      return `${formatted} ⚠️`; // Yellow - Medium impact
    } else if (impact < 15) {
      return `${formatted} ⚠️`; // Orange - High impact
    } else {
      return `${formatted} ❌`; // Red - Very high impact
    }
  } catch {
    return '0.00% ✅';
  }
}

/**
 * Formats slippage tolerance with recommendations
 */
export function formatSlippage(slippage: number): string {
  const formatted = `${slippage.toFixed(2)}%`;
  
  if (slippage <= 0.5) {
    return `${formatted} (Tight)`;
  } else if (slippage <= 1) {
    return `${formatted} (Normal)`;
  } else if (slippage <= 3) {
    return `${formatted} (Loose)`;
  } else {
    return `${formatted} (Very Loose)`;
  }
}

/**
 * Formats a large number with appropriate units (K, M, B)
 */
export function formatLargeNumber(value: number | string): string {
  try {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (num >= 1e9) {
      return `${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
      return `${(num / 1e6).toFixed(2)}M`;
    } else if (num >= 1e3) {
      return `${(num / 1e3).toFixed(2)}K`;
    } else {
      return num.toFixed(2);
    }
  } catch {
    return '0';
  }
}

/**
 * Formats a token pair for display
 */
export function formatTokenPair(fromToken: string, toToken: string): string {
  return `${fromToken}/${toToken}`;
}

/**
 * Formats protocol names for display
 */
export function formatProtocolList(protocols: string[]): string {
  if (protocols.length === 0) {
    return 'None';
  } else if (protocols.length === 1) {
    return protocols[0];
  } else if (protocols.length === 2) {
    return protocols.join(' + ');
  } else {
    return `${protocols[0]} + ${protocols.length - 1} others`;
  }
}

/**
 * Formats a quote summary for display
 */
export function formatQuoteSummary(
  fromAmount: string,
  fromSymbol: string,
  toAmount: string,
  toSymbol: string,
  fromDecimals: number = 18,
  toDecimals: number = 18
): string {
  const formattedFrom = formatTokenAmount(fromAmount, fromDecimals);
  const formattedTo = formatTokenAmount(toAmount, toDecimals);
  
  return `${formattedFrom} ${fromSymbol} → ${formattedTo} ${toSymbol}`;
}

/**
 * Formats gas cost in ETH and USD
 */
export function formatGasCost(
  gasUsed: string,
  gasPrice: string,
  ethPriceUSD: number = 2000
): string {
  try {
    const gasUsedBN = new BigNumber(gasUsed);
    const gasPriceBN = new BigNumber(gasPrice);
    
    // Calculate gas cost in wei
    const gasCostWei = gasUsedBN.multipliedBy(gasPriceBN);
    
    // Convert to ETH
    const gasCostETH = gasCostWei.div(new BigNumber(10).pow(18));
    
    // Calculate USD value
    const gasCostUSD = gasCostETH.multipliedBy(ethPriceUSD);
    
    return `${gasCostETH.toFixed(6)} ETH (${formatUSD(gasCostUSD.toNumber())})`;
  } catch {
    return '0 ETH ($0.00)';
  }
}

/**
 * Formats exchange rate between two tokens
 */
export function formatExchangeRate(
  fromAmount: string,
  toAmount: string,
  fromSymbol: string,
  toSymbol: string,
  fromDecimals: number = 18,
  toDecimals: number = 18
): string {
  try {
    const fromBN = new BigNumber(fromAmount).div(new BigNumber(10).pow(fromDecimals));
    const toBN = new BigNumber(toAmount).div(new BigNumber(10).pow(toDecimals));
    
    const rate = toBN.div(fromBN);
    
    return `1 ${fromSymbol} = ${rate.toFixed(6)} ${toSymbol}`;
  } catch {
    return `1 ${fromSymbol} = 0 ${toSymbol}`;
  }
}

/**
 * Formats token balance with symbol
 */
export function formatBalance(
  balance: string,
  symbol: string,
  decimals: number = 18,
  precision: number = 4
): string {
  const formatted = formatTokenAmount(balance, decimals, precision);
  return `${formatted} ${symbol}`;
}

/**
 * Formats deadline timestamp
 */
export function formatDeadline(deadline: number): string {
  const date = new Date(deadline * 1000); // Convert from seconds to milliseconds
  return date.toLocaleString();
}

/**
 * Formats route path for multi-hop swaps
 */
export function formatRoutePath(tokens: string[]): string {
  return tokens.join(' → ');
}

/**
 * Formats market impact warning
 */
export function formatMarketImpactWarning(priceImpact: string): string | null {
  try {
    const impact = parseFloat(priceImpact);
    
    if (impact > 15) {
      return `⚠️ Very High Price Impact (${formatPercentage(priceImpact)}) - Consider smaller trade size`;
    } else if (impact > 5) {
      return `⚠️ High Price Impact (${formatPercentage(priceImpact)}) - Verify trade details`;
    } else if (impact > 1) {
      return `⚠️ Moderate Price Impact (${formatPercentage(priceImpact)})`;
    }
    
    return null; // No warning needed
  } catch {
    return null;
  }
}