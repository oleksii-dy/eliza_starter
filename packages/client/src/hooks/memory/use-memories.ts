import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { Memory, MemoryParams, MemoryUpdateParams, UUID } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';
import { useToast } from '../use-toast';
import clientLogger from '@/lib/logger';

/**
 * Hook to fetch agent memories
 */
export function useAgentMemories(
  agentId: UUID,
  tableName?: string,
  channelId?: UUID,
  includeEmbedding = false
) {
  const queryKey = channelId
    ? ['agents', agentId, 'channels', channelId, 'memories', tableName, includeEmbedding]
    : ['agents', agentId, 'memories', tableName, includeEmbedding];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const params: MemoryParams = {
        tableName,
        channelId,
        includeEmbedding,
      };
      const result = await elizaClient.memory.getAgentMemories(agentId, params);
      console.log('Agent memories result:', {
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
 * Hook to fetch room-specific memories
 */
export function useRoomMemories(
  agentId: UUID | undefined,
  roomId: UUID | undefined,
  params?: MemoryParams,
  options?: Omit<UseQueryOptions<{ memories: Memory[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['room-memories', agentId, roomId, params],
    queryFn: async () => {
      if (!agentId || !roomId) throw new Error('Agent ID and Room ID are required');
      return elizaClient.memory.getRoomMemories(agentId, roomId, params);
    },
    enabled: !!agentId && !!roomId,
    staleTime: STALE_TIMES.STANDARD,
    ...options,
  });
}

/**
 * Hook to update a memory
 */
export function useUpdateMemory() {
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
      data: MemoryUpdateParams;
    }) => {
      return elizaClient.memory.updateMemory(agentId, memoryId, data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId, 'memories'] });
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId, 'channels'] });
      toast({
        title: 'Memory updated',
        description: 'The memory has been successfully updated.',
      });
    },
    onError: (error) => {
      clientLogger.error('Failed to update memory:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update the memory. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a memory
 */
export function useDeleteMemory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ agentId, memoryId }: { agentId: UUID; memoryId: UUID }) => {
      return elizaClient.memory.deleteMemory(agentId, memoryId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId, 'memories'] });
      toast({
        title: 'Memory deleted',
        description: 'The memory has been successfully deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete the memory. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete all memories
 */
export function useDeleteAllMemories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (agentId: UUID) => {
      return elizaClient.memory.clearAgentMemories(agentId);
    },
    onSuccess: (data, agentId) => {
      queryClient.invalidateQueries({ queryKey: ['agents', agentId, 'memories'] });
      toast({
        title: 'Memories cleared',
        description: `Cleared ${data.deleted} memories successfully.`,
      });
    },
    onError: (error) => {
      clientLogger.error('Failed to clear memories:', error);
      toast({
        title: 'Clear failed',
        description: 'Failed to clear memories. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete group memory
 */
export function useDeleteGroupMemory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ agentId, channelId, memoryId }: { agentId: UUID; channelId: UUID; memoryId: UUID }) => {
      // Delete memory from specific channel
      return elizaClient.memory.deleteMemory(agentId, memoryId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents', variables.agentId, 'channels', variables.channelId, 'memories'] });
      toast({
        title: 'Memory deleted',
        description: 'The memory has been successfully deleted from the group.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete the memory. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to clear room memories
 */
export function useClearRoomMemories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ agentId, roomId }: { agentId: UUID; roomId: UUID }) => {
      return elizaClient.memory.clearRoomMemories(agentId, roomId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['room-memories', variables.agentId, variables.roomId] });
      toast({
        title: 'Room memories cleared',
        description: `Cleared ${data.deleted} memories successfully.`,
      });
    },
    onError: (error) => {
      clientLogger.error('Failed to clear room memories:', error);
      toast({
        title: 'Clear failed',
        description: 'Failed to clear room memories. Please try again.',
        variant: 'destructive',
      });
    },
  });
}