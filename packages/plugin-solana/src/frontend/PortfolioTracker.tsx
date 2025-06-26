import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { WalletPortfolio, Item } from '../types';

interface PortfolioTrackerProps {
  walletAddress: string;
  agentId?: string;
  apiBase?: string;
}

interface HistoricalData {
  timestamp: number;
  totalUsd: number;
  totalSol: number;
}

export const PortfolioTracker: React.FC<PortfolioTrackerProps> = ({
  walletAddress,
  agentId,
  apiBase = 'http://localhost:3000',
}) => {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [sortBy, setSortBy] = useState<'value' | 'change' | 'name'>('value');
  const [showChart, setShowChart] = useState(true);

  // Fetch portfolio data
  const {
    data: portfolio,
    isLoading,
    error,
    refetch,
  } = useQuery<WalletPortfolio>({
    queryKey: ['portfolio', walletAddress],
    queryFn: async () => {
      const endpoint = walletAddress
        ? `${apiBase}/api/wallet/balance/${walletAddress}`
        : `${apiBase}/api/agent/balance`;

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio');
      }

      const data = await response.json();
      return data.balance;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Mock historical data (in production, this would come from an API)
  const historicalData = useMemo<HistoricalData[]>(() => {
    if (!portfolio) {
      return [];
    }

    const currentValue = parseFloat(portfolio.totalUsd);
    const points = 30;
    const data: HistoricalData[] = [];

    for (let i = points; i >= 0; i--) {
      const variation = (Math.random() - 0.5) * 0.1; // ±10% variation
      const value = currentValue * (1 + variation * (i / points));
      data.push({
        timestamp: Date.now() - i * 24 * 60 * 60 * 1000,
        totalUsd: value,
        totalSol: value / 150, // Mock SOL price
      });
    }

    return data;
  }, [portfolio]);

  // Calculate portfolio metrics
  const metrics = useMemo(() => {
    if (!portfolio || historicalData.length < 2) {
      return null;
    }

    const currentValue = parseFloat(portfolio.totalUsd);
    const previousValue = historicalData[0].totalUsd;
    const change = currentValue - previousValue;
    const changePercent = (change / previousValue) * 100;

    return {
      totalValue: currentValue,
      change24h: change,
      changePercent24h: changePercent,
      tokenCount: portfolio.items.filter((item) => parseFloat(item.uiAmount) > 0).length,
    };
  }, [portfolio, historicalData]);

  // Sort tokens
  const sortedTokens = useMemo(() => {
    if (!portfolio) {
      return [];
    }

    const tokens = portfolio.items.filter((item) => parseFloat(item.uiAmount) > 0);

    switch (sortBy) {
      case 'value':
        return tokens.sort((a, b) => parseFloat(b.valueUsd) - parseFloat(a.valueUsd));
      case 'change':
        // In production, this would use actual price change data
        return tokens.sort((a, b) => Math.random() - 0.5);
      case 'name':
        return tokens.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return tokens;
    }
  }, [portfolio, sortBy]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg shadow-lg p-6">
        <div className="text-center text-red-600">
          Error loading portfolio: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-primary text-white rounded hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!portfolio || !metrics) {
    return null;
  }

  return (
    <div className="bg-card rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Portfolio</h2>
          <div className="text-3xl font-bold">
            $
            {metrics.totalValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div
            className={`flex items-center gap-2 text-sm ${metrics.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            <span>{metrics.change24h >= 0 ? '↑' : '↓'}</span>
            <span>${Math.abs(metrics.change24h).toFixed(2)}</span>
            <span>({metrics.changePercent24h.toFixed(2)}%)</span>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {/* Timeframe Selector */}
      <div className="flex gap-2 mb-6">
        {(['24h', '7d', '30d', 'all'] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-3 py-1 rounded text-sm ${
              timeframe === tf ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {tf === 'all' ? 'All Time' : tf.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowChart(!showChart)}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          {showChart ? 'Hide' : 'Show'} Chart
        </button>
      </div>

      {/* Simple Chart */}
      {showChart && (
        <div className="h-48 mb-6 bg-gray-50 rounded-lg p-4">
          <div className="h-full flex items-end justify-between gap-1">
            {historicalData.map((point, index) => {
              const height =
                (point.totalUsd / Math.max(...historicalData.map((p) => p.totalUsd))) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-primary hover:bg-opacity-80 transition-all"
                  style={{ height: `${height}%` }}
                  title={`$${point.totalUsd.toFixed(2)}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Token Holdings */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Holdings ({metrics.tokenCount})</h3>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="value">Sort by Value</option>
            <option value="change">Sort by Change</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        <div className="space-y-2">
          {sortedTokens.map((token) => {
            const allocation = (parseFloat(token.valueUsd) / metrics.totalValue) * 100;
            // Mock 24h change (in production, this would be real data)
            const change24h = (Math.random() - 0.5) * 20;

            return (
              <div
                key={token.address}
                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold">
                      {token.symbol.substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium">{token.name}</div>
                      <div className="text-sm text-gray-600">
                        {parseFloat(token.uiAmount).toFixed(4)} {token.symbol}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${parseFloat(token.valueUsd).toFixed(2)}</div>
                    <div
                      className={`text-sm ${change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {change24h >= 0 ? '+' : ''}
                      {change24h.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Allocation</span>
                    <span>{allocation.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${allocation}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
        <div>
          <div className="text-sm text-gray-600">Total SOL Value</div>
          <div className="text-lg font-medium">{portfolio.totalSol} SOL</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Last Updated</div>
          <div className="text-lg font-medium">
            {portfolio.lastUpdated
              ? new Date(portfolio.lastUpdated).toLocaleTimeString()
              : 'Just now'}
          </div>
        </div>
      </div>
    </div>
  );
};
