import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { AgentLog, AgentLogsParams, UUID } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';
import { useToast } from '../use-toast';
import clientLogger from '@/lib/logger';

/**
 * Hook to fetch agent logs
 */
export function useAgentLogs(
  agentId: UUID | undefined,
  params?: AgentLogsParams,
  options?: Omit<UseQueryOptions<{ logs: AgentLog[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['agent-logs', agentId, params],
    queryFn: async () => {
      if (!agentId) throw new Error('Agent ID is required');
      return elizaClient.agents.getAgentLogs(agentId, params);
    },
    enabled: !!agentId,
    staleTime: STALE_TIMES.FREQUENT,
    refetchInterval: STALE_TIMES.FREQUENT,
    ...options,
  });
}

/**
 * Hook to delete a specific agent log
 */
export function useDeleteAgentLog() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ agentId, logId }: { agentId: UUID; logId: UUID }) => {
      return elizaClient.agents.deleteAgentLog(agentId, logId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-logs', variables.agentId] });
      showToast('Log deleted successfully', 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to delete log:', error);
      showToast('Failed to delete log', 'error');
    },
  });
}