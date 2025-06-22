import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { Agent } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';
import { useConnection } from '@/context/ConnectionContext';
import { useNetworkStatus } from '../use-network-status';

/**
 * Hook to fetch all agents
 */
export function useAgents(options: Partial<UseQueryOptions<{ agents: Agent[] }>> = {}) {
  const { isAuthorized } = useConnection();
  const { isOffline } = useNetworkStatus();

  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await elizaClient.agents.listAgents();
      return response;
    },
    enabled: isAuthorized && !isOffline,
    staleTime: STALE_TIMES.STANDARD,
    refetchInterval: isOffline ? false : STALE_TIMES.FREQUENT, // Poll every 30 seconds when online
    ...options,
  });
}