import BigNumber from 'bignumber.js';
import { 
  type LendingMarket, 
  type UserPosition, 
  type LendingTransactionResult,
  type ChainConfig,
  LendingActionType,
  LendingProtocol 
} from '../types/index.js';

// Format token amounts with proper decimal handling
export function formatTokenAmount(amount: string, decimals: number, maxDecimals: number = 6): string {
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

// Format USD values
export function formatUsdValue(amount: string, price: number, decimals: number = 18): string {
  try {
    const tokenAmount = parseFloat(formatTokenAmount(amount, decimals));
    const usdValue = tokenAmount * price;
    
    if (usdValue >= 1000000) {
      return `$${(usdValue / 1000000).toFixed(2)}M`;
    } else if (usdValue >= 1000) {
      return `$${(usdValue / 1000).toFixed(2)}K`;
    } else {
      return `$${usdValue.toFixed(2)}`;
    }
  } catch (error) {
    return '$0.00';
  }
}

// Format APY percentages
export function formatAPY(apy: string): string {
  try {
    const apyNumber = parseFloat(apy);
    return `${apyNumber.toFixed(2)}%`;
  } catch (error) {
    return '0.00%';
  }
}

// Format health factor with color coding
export function formatHealthFactor(healthFactor: string): string {
  try {
    const hf = parseFloat(healthFactor);
    
    if (hf >= 2.0) {
      return `${hf.toFixed(2)} (Safe ✅)`;
    } else if (hf >= 1.5) {
      return `${hf.toFixed(2)} (Moderate ⚠️)`;
    } else if (hf >= 1.1) {
      return `${hf.toFixed(2)} (Risky ⚠️)`;
    } else {
      return `${hf.toFixed(2)} (Critical ⚠️)`;
    }
  } catch (error) {
    return 'Unknown';
  }
}

// Format LTV ratio
export function formatLTV(ltv: string): string {
  try {
    const ltvNumber = parseFloat(ltv);
    return `${ltvNumber.toFixed(1)}%`;
  } catch (error) {
    return '0.0%';
  }
}

// Format lending market information
export function formatLendingMarket(market: LendingMarket): string {
  const supplyAPY = formatAPY(market.supplyAPY);
  const borrowAPY = formatAPY(market.variableBorrowAPY);
  const utilization = formatLTV(market.utilizationRate);
  const threshold = formatLTV(market.liquidationThreshold);

  return `**${market.asset.symbol} Market (${market.protocol.toUpperCase()})**
• Supply APY: ${supplyAPY}
• Borrow APY: ${borrowAPY}
• Utilization: ${utilization}
• Liquidation Threshold: ${threshold}
• Status: ${market.isActive ? (market.isFrozen ? 'Frozen ❄️' : 'Active ✅') : 'Inactive ❌'}
• Borrowing: ${market.borrowingEnabled ? 'Enabled ✅' : 'Disabled ❌'}`;
}

// Format user position
export function formatUserPosition(position: UserPosition): string {
  const supplied = formatTokenAmount(position.supplied, position.asset.decimals);
  const borrowed = formatTokenAmount(position.borrowed, position.asset.decimals);
  const healthFactor = formatHealthFactor(position.healthFactor);
  const ltv = formatLTV(position.currentLTV);

  return `**${position.asset.symbol} Position**
• Supplied: ${supplied} ${position.asset.symbol} ${position.usedAsCollateral ? '(Collateral ✅)' : '(Not Collateral ❌)'}
• Borrowed: ${borrowed} ${position.asset.symbol}
• Health Factor: ${healthFactor}
• Current LTV: ${ltv}`;
}

// Format transaction result
export function formatTransactionResult(result: LendingTransactionResult): string {
  const amount = formatTokenAmount(result.amount, result.asset.decimals);
  const actionText = getActionDisplayText(result.action);
  
  return `**${actionText} Transaction**
• Asset: ${amount} ${result.asset.symbol}
• Protocol: ${result.protocol.toUpperCase()}
• Transaction: ${result.txHash}
• Status: ${result.success ? 'Success ✅' : 'Failed ❌'}
• Gas Used: ${result.gasUsed || 'Pending'}`;
}

// Format multiple markets comparison
export function formatMarketsComparison(markets: LendingMarket[]): string {
  if (markets.length === 0) {
    return 'No markets available';
  }

  const comparison = markets.slice(0, 5).map((market, index) => {
    const supplyAPY = formatAPY(market.supplyAPY);
    const borrowAPY = formatAPY(market.variableBorrowAPY);
    
    return `${index + 1}. **${market.asset.symbol}** (${market.protocol.toUpperCase()})
   • Supply: ${supplyAPY} | Borrow: ${borrowAPY}
   • Status: ${market.isActive ? '✅' : '❌'} | Borrowing: ${market.borrowingEnabled ? '✅' : '❌'}`;
  }).join('\n\n');

  return `**Available Markets**\n\n${comparison}`;
}

// Format user portfolio summary
export function formatPortfolioSummary(positions: UserPosition[]): string {
  if (positions.length === 0) {
    return 'No positions found';
  }

  let totalSuppliedUSD = 0;
  let totalBorrowedUSD = 0;
  
  // Note: In a real implementation, you'd fetch token prices
  const mockPrices: { [symbol: string]: number } = {
    'ETH': 2000,
    'USDC': 1,
    'USDT': 1,
    'DAI': 1,
    'WBTC': 30000,
    'WETH': 2000
  };

  const positionSummaries = positions.map(pos => {
    const suppliedAmount = parseFloat(formatTokenAmount(pos.supplied, pos.asset.decimals));
    const borrowedAmount = parseFloat(formatTokenAmount(pos.borrowed, pos.asset.decimals));
    const price = mockPrices[pos.asset.symbol] || 1;
    
    totalSuppliedUSD += suppliedAmount * price;
    totalBorrowedUSD += borrowedAmount * price;

    return `• ${pos.asset.symbol}: ${formatTokenAmount(pos.supplied, pos.asset.decimals)} supplied, ${formatTokenAmount(pos.borrowed, pos.asset.decimals)} borrowed`;
  }).join('\n');

  const overallHealthFactor = positions.length > 0 ? positions[0].healthFactor : '∞';
  const netWorth = totalSuppliedUSD - totalBorrowedUSD;

  return `**Portfolio Summary**
Total Supplied: $${totalSuppliedUSD.toFixed(2)}
Total Borrowed: $${totalBorrowedUSD.toFixed(2)}
Net Worth: $${netWorth.toFixed(2)}
Health Factor: ${formatHealthFactor(overallHealthFactor)}

**Positions:**
${positionSummaries}`;
}

// Format chain information
export function formatChainInfo(chain: ChainConfig): string {
  return `${chain.name} (${chain.id}) - ${chain.nativeCurrency.symbol}`;
}

// Format protocol comparison
export function formatProtocolComparison(protocols: LendingProtocol[]): string {
  const protocolInfo: { [key in LendingProtocol]: string } = {
    [LendingProtocol.AAVE]: 'Leading DeFi protocol with wide asset support and stable rates',
    [LendingProtocol.COMPOUND]: 'Pioneer in DeFi lending with algorithmic interest rates',
    [LendingProtocol.MORPHO]: 'Optimized lending with improved capital efficiency',
    [LendingProtocol.SPARK]: 'MakerDAO\'s native lending protocol',
    [LendingProtocol.EULER]: 'Risk-adjusted lending with advanced features'
  };

  const comparison = protocols.map(protocol => 
    `• **${protocol.toUpperCase()}**: ${protocolInfo[protocol]}`
  ).join('\n');

  return `**Supported Protocols**\n${comparison}`;
}

// Helper function to get action display text
function getActionDisplayText(action: LendingActionType): string {
  switch (action) {
    case LendingActionType.SUPPLY:
      return 'Supply';
    case LendingActionType.WITHDRAW:
      return 'Withdraw';
    case LendingActionType.BORROW:
      return 'Borrow';
    case LendingActionType.REPAY:
      return 'Repay';
    default:
      return 'Unknown';
  }
}

// Format large numbers with abbreviations
export function formatLargeNumber(value: number): string {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

// Format gas price
export function formatGasPrice(gasPrice: string): string {
  try {
    const gwei = BigInt(gasPrice) / BigInt(1e9);
    return `${gwei.toString()} Gwei`;
  } catch (error) {
    return '0 Gwei';
  }
}

// Format duration from seconds
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (seconds < 86400) {
    const hours = Math.ceil(seconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    const days = Math.ceil(seconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
}

// Format address for display
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// Format utilization rate with visual indicator
export function formatUtilization(rate: string): string {
  try {
    const rateNumber = parseFloat(rate);
    let indicator = '';
    
    if (rateNumber >= 90) {
      indicator = '🔴'; // High utilization
    } else if (rateNumber >= 70) {
      indicator = '🟡'; // Medium utilization
    } else {
      indicator = '🟢'; // Low utilization
    }
    
    return `${rateNumber.toFixed(1)}% ${indicator}`;
  } catch (error) {
    return '0.0%';
  }
}