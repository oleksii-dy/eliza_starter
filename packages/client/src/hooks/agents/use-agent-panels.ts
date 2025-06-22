import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { AgentPanel, UUID } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';

/**
 * Hook to fetch agent panels
 */
export function useAgentPanels(
  agentId: UUID | undefined,
  options?: Omit<UseQueryOptions<{ panels: AgentPanel[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['agent-panels', agentId],
    queryFn: async () => {
      if (!agentId) throw new Error('Agent ID is required');
      return elizaClient.agents.getAgentPanels(agentId);
    },
    enabled: !!agentId,
    staleTime: STALE_TIMES.RARE,
    ...options,
  });
}