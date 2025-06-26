import React from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RecentAction } from '../services/WalletBalanceService';
import { cn } from './utils';

interface RecentActionsProps {
  agentId?: string;
  apiBase?: string;
}

export const RecentActions: React.FC<RecentActionsProps> = ({
  agentId,
  apiBase = 'http://localhost:3000',
}) => {
  const { data, isLoading, error, refetch } = useQuery<RecentAction[]>({
    queryKey: ['recentActions', agentId],
    queryFn: async () => {
      const response = await fetch(`${apiBase}/api/agent/recent-actions`);
      if (!response.ok) {
        throw new Error('Failed to fetch recent actions');
      }
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse">Loading recent actions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        Error loading recent actions: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6 bg-card rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Recent Actions</h2>
        <p className="text-muted-foreground text-center py-8">No recent actions</p>
      </div>
    );
  }

  const getActionIcon = (type: RecentAction['type']) => {
    switch (type) {
      case 'transfer':
        return '→';
      case 'swap':
        return '⇄';
      case 'bridge':
        return '⇌';
      case 'governance':
        return '🗳';
      default:
        return '•';
    }
  };

  const getStatusColor = (status: RecentAction['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)}h ago`;
    }
    return date.toLocaleDateString();
  };

  const formatAddress = (address?: string) => {
    if (!address) {
      return '';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="p-6 bg-card rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Recent Actions</h2>
        <button
          onClick={() => refetch()}
          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:opacity-90"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {data.map((action) => (
          <div
            key={action.id}
            className="border border-border rounded-lg p-4 hover:bg-secondary/10 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{getActionIcon(action.type)}</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold capitalize">{action.type}</span>
                    <span className={cn('text-sm', getStatusColor(action.status))}>
                      {action.status}
                    </span>
                  </div>

                  {/* Action details */}
                  <div className="text-sm text-muted-foreground mt-1">
                    {action.type === 'transfer' && action.details.to && (
                      <span>
                        To {formatAddress(action.details.to)}
                        {action.details.amount &&
                          ` • ${action.details.amount} ${action.details.token || 'ETH'}`}
                      </span>
                    )}

                    {action.type === 'swap' && action.details.amount && (
                      <span>
                        {action.details.amount} {action.details.token || 'ETH'}
                        {action.details.to && ` → ${action.details.to}`}
                      </span>
                    )}

                    {action.type === 'bridge' && (
                      <span>
                        {action.details.fromChain} → {action.details.toChain}
                        {action.details.amount &&
                          ` • ${action.details.amount} ${action.details.token || 'ETH'}`}
                      </span>
                    )}

                    {action.type === 'governance' && action.details.to && (
                      <span>{formatAddress(action.details.to)}</span>
                    )}
                  </div>

                  {/* Transaction hash */}
                  {action.details.hash && (
                    <div className="mt-1">
                      <a
                        href={`https://etherscan.io/tx/${action.details.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {formatAddress(action.details.hash)}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <span className="text-xs text-muted-foreground">
                {formatTimestamp(action.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
