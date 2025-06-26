import React from 'react';
import { useQuery } from '@tanstack/react-query';
import type { WalletBalance } from '../services/WalletBalanceService';

interface WalletBalanceDisplayProps {
  walletAddress?: string;
  agentId?: string;
  apiBase?: string;
}

export const WalletBalanceDisplay: React.FC<WalletBalanceDisplayProps> = ({
  walletAddress,
  agentId,
  apiBase = 'http://localhost:3000',
}) => {
  const { data, isLoading, error, refetch } = useQuery<{
    network: string;
    address: string;
    balance: WalletBalance;
  }>({
    queryKey: ['walletBalance', walletAddress || agentId],
    queryFn: async () => {
      const endpoint = walletAddress
        ? `${apiBase}/api/wallet/balance/${walletAddress}`
        : `${apiBase}/api/agent/balance`;

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch wallet balance');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!(walletAddress || agentId),
  });

  if (!walletAddress && !agentId) {
    return <div className="p-4 text-center text-gray-500">No wallet address provided</div>;
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse">Loading wallet balance...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        Error loading wallet balance: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { network, address, balance } = data;

  return (
    <div className="p-6 bg-card rounded-lg shadow-lg space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Wallet Balance</h2>
        <button
          onClick={() => refetch()}
          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:opacity-90"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Network:</span>
          <span className="font-medium">{network}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Address:</span>
          <span className="font-mono text-xs">
            {address.slice(0, 8)}...{address.slice(-8)}
          </span>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">SOL Balance</h3>
        <div className="bg-secondary/20 p-3 rounded">
          <div className="text-2xl font-bold">{balance.sol.uiAmount.toFixed(4)} SOL</div>
          <div className="text-sm text-muted-foreground">{balance.sol.balance} lamports</div>
        </div>
      </div>

      {balance.tokens.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-3">Token Balances</h3>
          <div className="space-y-2">
            {balance.tokens.map((token) => (
              <div
                key={token.address}
                className="bg-secondary/20 p-3 rounded flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{token.symbol}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {token.address.slice(0, 8)}...
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{token.uiAmount?.toFixed(4) || '0'}</div>
                  <div className="text-xs text-muted-foreground">{token.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {balance.totalValueUSD !== undefined && balance.totalValueUSD > 0 && (
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total Value</span>
            <span className="text-2xl font-bold text-primary">
              ${balance.totalValueUSD.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
