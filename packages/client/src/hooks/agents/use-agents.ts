import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { Agent } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';
import { useConnection } from '@/context/ConnectionContext';

/**
 * Hook to fetch all agents
 */
export function useAgents(options?: Omit<UseQueryOptions<{ agents: Agent[] }>, 'queryKey' | 'queryFn'>) {
  const { isAuthorized } = useConnection();

  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const result = await elizaClient.agents.listAgents();
      return result;
    },
    enabled: isAuthorized,
    staleTime: STALE_TIMES.STANDARD,
    refetchInterval: STALE_TIMES.FREQUENT, // Poll every 30 seconds
    ...options,
  });
}