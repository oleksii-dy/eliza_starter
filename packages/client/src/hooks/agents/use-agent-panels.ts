import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { AgentPanel, UUID } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';
import { useConnection } from '@/context/ConnectionContext';

/**
 * Hook to fetch agent panels
 */
export function useAgentPanels(
  agentId: UUID | undefined | null,
  options: Partial<UseQueryOptions<{ panels: AgentPanel[] }>> = {}
) {
  const { isAuthorized } = useConnection();

  return useQuery({
    queryKey: ['agent-panels', agentId],
    queryFn: async () => {
      if (!agentId) return { panels: [] };
      const response = await elizaClient.agents.getAgentPanels(agentId);
      return response;
    },
    enabled: !!agentId && isAuthorized,
    staleTime: STALE_TIMES.RARE,
    ...options,
  });
}