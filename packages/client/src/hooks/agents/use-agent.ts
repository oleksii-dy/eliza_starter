import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { Agent, UUID } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';

/**
 * Hook to fetch a single agent by ID
 */
export function useAgent(
  agentId: UUID | undefined,
  options?: Omit<UseQueryOptions<Agent>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      if (!agentId) throw new Error('Agent ID is required');
      return elizaClient.agents.getAgent(agentId);
    },
    enabled: !!agentId,
    staleTime: STALE_TIMES.STANDARD,
    ...options,
  });
}