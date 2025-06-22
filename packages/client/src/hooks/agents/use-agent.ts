import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { Agent, UUID } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';
import { useConnection } from '@/context/ConnectionContext';
import { useNetworkStatus } from '../use-network-status';

/**
 * Hook to fetch a single agent by ID
 */
export function useAgent(
  agentId: UUID | undefined | null,
  options: Partial<UseQueryOptions<Agent | null>> = {}
) {
  const { isAuthorized } = useConnection();
  const { isOffline } = useNetworkStatus();

  return useQuery({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      if (!agentId) return null;
      const response = await elizaClient.agents.getAgent(agentId);
      return response;
    },
    enabled: !!agentId && isAuthorized && !isOffline,
    staleTime: STALE_TIMES.STANDARD,
    refetchInterval: isOffline ? false : STALE_TIMES.FREQUENT,
    ...options,
  });
}