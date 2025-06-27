import { type BridgeRoute, type BridgeQuote, type ChainConfig } from '../types/index.js';

/**
 * Format token amount with proper decimal places
 */
export function formatTokenAmount(amount: string, decimals: number, maxDecimals = 6): string {
  try {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const quotient = value / divisor;
    const remainder = value % divisor;
    
    if (remainder === 0n) {
      return quotient.toString();
    }
    
    const remainderStr = remainder.toString().padStart(decimals, '0');
    let trimmedRemainder = remainderStr.replace(/0+$/, '');
    
    // Limit decimal places
    if (trimmedRemainder.length > maxDecimals) {
      trimmedRemainder = trimmedRemainder.substring(0, maxDecimals);
    }
    
    if (trimmedRemainder === '') {
      return quotient.toString();
    }
    
    return `${quotient}.${trimmedRemainder}`;
  } catch (error) {
    return '0';
  }
}

/**
 * Format USD value
 */
export function formatUsdValue(amount: string, price: number): string {
  try {
    const tokenAmount = parseFloat(formatTokenAmount(amount, 18));
    const usdValue = tokenAmount * price;
    return `$${usdValue.toFixed(2)}`;
  } catch (error) {
    return '$0.00';
  }
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    const hours = Math.ceil(seconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
}

/**
 * Format bridge route for display
 */
export function formatBridgeRoute(route: BridgeRoute): string {
  const fromAmount = formatTokenAmount(route.fromAmount, route.fromToken.decimals);
  const toAmount = formatTokenAmount(route.toAmount, route.toToken.decimals);
  const gasCost = formatTokenAmount(route.estimatedGas, 18);
  const protocolFee = formatTokenAmount(route.fees.protocol, route.fromToken.decimals);
  const duration = formatDuration(route.estimatedTime);

  return `**${route.protocol.toUpperCase()} Route**
• From: ${fromAmount} ${route.fromToken.symbol} (${route.fromChain.name})
• To: ${toAmount} ${route.toToken.symbol} (${route.toChain.name})
• Duration: ~${duration}
• Gas: ${gasCost} ETH
• Protocol Fee: ${protocolFee} ${route.fromToken.symbol}
• Steps: ${route.steps.length}`;
}

/**
 * Format bridge quote summary
 */
export function formatBridgeQuote(quote: BridgeQuote): string {
  const fromAmount = formatTokenAmount(quote.fromAmount, quote.fromToken.decimals);
  const bestRoute = quote.routes[0];
  
  if (!bestRoute) {
    return 'No routes available';
  }

  const toAmount = formatTokenAmount(bestRoute.toAmount, quote.toToken.decimals);
  const duration = formatDuration(bestRoute.estimatedTime);
  const routeCount = quote.routes.length;

  return `**Bridge Quote Summary**
• Bridge: ${fromAmount} ${quote.fromToken.symbol} → ${toAmount} ${quote.toToken.symbol}
• Route: ${quote.fromChain.name} → ${quote.toChain.name}
• Best Time: ~${duration}
• Available Routes: ${routeCount}
• Best Protocol: ${bestRoute.protocol.toUpperCase()}`;
}

/**
 * Format chain information
 */
export function formatChainInfo(chain: ChainConfig): string {
  return `${chain.name} (${chain.id}) - ${chain.nativeCurrency.symbol}`;
}

/**
 * Format gas price in Gwei
 */
export function formatGasPrice(gasPrice: string): string {
  try {
    const gwei = BigInt(gasPrice) / BigInt(1e9);
    return `${gwei.toString()} Gwei`;
  } catch (error) {
    return '0 Gwei';
  }
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Format large numbers with units
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

/**
 * Format bridge fees breakdown
 */
export function formatBridgeFees(route: BridgeRoute): string {
  const gasCost = formatTokenAmount(route.estimatedGas, 18);
  const protocolFee = formatTokenAmount(route.fees.protocol, route.fromToken.decimals);
  const totalFee = formatTokenAmount(route.fees.total, route.fromToken.decimals);

  return `**Fee Breakdown**
• Gas Cost: ${gasCost} ETH
• Protocol Fee: ${protocolFee} ${route.fromToken.symbol}
• Total Fees: ${totalFee} ${route.fromToken.symbol}`;
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format transaction hash for display
 */
export function formatTxHash(hash: string): string {
  return shortenAddress(hash, 6);
}

/**
 * Format bridge step information
 */
export function formatBridgeStep(step: any, index: number): string {
  return `Step ${index + 1}: ${step.type} via ${step.protocol}`;
}

/**
 * Format route comparison
 */
export function formatRouteComparison(routes: BridgeRoute[]): string {
  if (routes.length === 0) return 'No routes available';
  
  const comparison = routes
    .slice(0, 3) // Show top 3 routes
    .map((route, index) => {
      const toAmount = formatTokenAmount(route.toAmount, route.toToken.decimals);
      const duration = formatDuration(route.estimatedTime);
      const totalFee = formatTokenAmount(route.fees.total, route.fromToken.decimals);
      
      return `${index + 1}. **${route.protocol.toUpperCase()}**
   • Receive: ${toAmount} ${route.toToken.symbol}
   • Time: ~${duration}
   • Fee: ${totalFee} ${route.fromToken.symbol}`;
    })
    .join('\n\n');

  return `**Route Comparison**\n\n${comparison}`;
}