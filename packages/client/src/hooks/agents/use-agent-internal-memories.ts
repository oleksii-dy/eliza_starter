import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { UUID } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';
import { useToast } from '../use-toast';
import clientLogger from '@/lib/logger';

/**
 * Hook to fetch agent internal memories
 */
export function useAgentInternalMemories(
  agentId: UUID,
  tableName?: string,
  channelId?: UUID,
  includeEmbedding = false
) {
  const queryKey = channelId
    ? ['agents', agentId, 'internal', 'channels', channelId, 'memories', tableName, includeEmbedding]
    : ['agents', agentId, 'internal', 'memories', tableName, includeEmbedding];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params = {
        tableName,
        channelId,
        includeEmbedding,
        internal: true,
      };
      const result = await elizaClient.memory.getAgentMemories(agentId, params);
      console.log('Agent internal memories result:', {
        agentId,
        channelId,
        tableName,
        count: result.memories?.length || 0,
      });
      return result;
    },
    enabled: !!agentId,
    staleTime: STALE_TIMES.STANDARD,
  });
}

/**
 * Hook to delete agent internal memory
 */
export function useDeleteAgentInternalMemory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ agentId, memoryId }: { agentId: UUID; memoryId: UUID }) => {
      return elizaClient.memory.deleteMemory(agentId, memoryId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId, 'internal', 'memories'] });
      toast({
        title: 'Internal memory deleted',
        description: 'The internal memory has been successfully deleted.',
      });
    },
    onError: (error) => {
      clientLogger.error('Failed to delete internal memory:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete the internal memory. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete all agent internal memories
 */
export function useDeleteAllAgentInternalMemories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (agentId: UUID) => {
      return elizaClient.memory.clearAgentMemories(agentId);
    },
    onSuccess: (data, agentId) => {
      queryClient.invalidateQueries({ queryKey: ['agents', agentId, 'internal', 'memories'] });
      toast({
        title: 'Internal memories cleared',
        description: `Cleared ${data.deleted} internal memories successfully.`,
      });
    },
    onError: (error) => {
      clientLogger.error('Failed to clear internal memories:', error);
      toast({
        title: 'Clear failed',
        description: 'Failed to clear internal memories. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update agent internal memory
 */
export function useUpdateAgentInternalMemory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      agentId, 
      memoryId, 
      data 
    }: { 
      agentId: UUID; 
      memoryId: UUID; 
      data: any;
    }) => {
      return elizaClient.memory.updateMemory(agentId, memoryId, data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId, 'internal', 'memories'] });
      toast({
        title: 'Internal memory updated',
        description: 'The internal memory has been successfully updated.',
      });
    },
    onError: (error) => {
      clientLogger.error('Failed to update internal memory:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update the internal memory. Please try again.',
        variant: 'destructive',
      });
    },
  });
}