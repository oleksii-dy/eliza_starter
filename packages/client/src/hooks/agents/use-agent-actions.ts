import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { UUID } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';
import { useToast } from '../use-toast';
import clientLogger from '@/lib/logger';

/**
 * Hook to fetch agent actions/logs
 */
export function useAgentActions(
  agentId: UUID,
  roomId?: UUID,
  excludeTypes?: string[]
) {
  const queryKey = roomId 
    ? ['agents', agentId, 'rooms', roomId, 'actions', excludeTypes]
    : ['agents', agentId, 'actions', excludeTypes];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = {
        channelId: roomId,
        limit: 100,
        excludeTypes,
      };
      const result = await elizaClient.agents.getAgentLogs(agentId, params);
      return result;
    },
    enabled: !!agentId,
    staleTime: STALE_TIMES.FREQUENT,
    refetchInterval: STALE_TIMES.FREQUENT,
  });
}

/**
 * Hook to delete an agent log/action
 */
export function useDeleteLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ agentId, logId }: { agentId: UUID; logId: UUID }) => {
      return elizaClient.agents.deleteAgentLog(agentId, logId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId, 'actions'] });
      queryClient.invalidateQueries({ queryKey: ['agent-logs', variables.agentId] });
      toast({
        title: 'Log deleted',
        description: 'The log has been successfully deleted.',
      });
    },
    onError: (error) => {
      clientLogger.error('Failed to delete log:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete the log. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to fetch agent internal actions
 */
export function useAgentInternalActions(
  agentId: UUID,
  roomId?: UUID,
  excludeTypes?: string[]
) {
  const queryKey = roomId 
    ? ['agents', agentId, 'internal', 'rooms', roomId, 'actions', excludeTypes]
    : ['agents', agentId, 'internal', 'actions', excludeTypes];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = {
        channelId: roomId,
        limit: 100,
        excludeTypes,
        internal: true,
      };
      const result = await elizaClient.agents.getAgentLogs(agentId, params);
      return result;
    },
    enabled: !!agentId,
    staleTime: STALE_TIMES.FREQUENT,
    refetchInterval: STALE_TIMES.FREQUENT,
  });
}

/**
 * Hook to delete agent internal log
 */
export function useDeleteAgentInternalLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ agentId, logId }: { agentId: UUID; logId: UUID }) => {
      return elizaClient.agents.deleteAgentLog(agentId, logId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId, 'internal', 'actions'] });
      toast({
        title: 'Internal log deleted',
        description: 'The internal log has been successfully deleted.',
      });
    },
    onError: (error) => {
      clientLogger.error('Failed to delete internal log:', error);
      toast({
        title: 'Delete failed', 
        description: 'Failed to delete the internal log. Please try again.',
        variant: 'destructive',
      });
    },
  });
}