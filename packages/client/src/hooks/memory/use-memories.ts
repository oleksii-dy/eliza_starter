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
  agentId: UUID | undefined,
  params?: MemoryParams,
  options?: Omit<UseQueryOptions<{ memories: Memory[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['agent-memories', agentId, params],
    queryFn: async () => {
      if (!agentId) throw new Error('Agent ID is required');
      return elizaClient.memory.getAgentMemories(agentId, params);
    },
    enabled: !!agentId,
    staleTime: STALE_TIMES.STANDARD,
    ...options,
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
  const { showToast } = useToast();

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
      queryClient.invalidateQueries({ queryKey: ['agent-memories', variables.agentId] });
      queryClient.invalidateQueries({ queryKey: ['room-memories', variables.agentId] });
      showToast('Memory updated successfully', 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to update memory:', error);
      showToast('Failed to update memory', 'error');
    },
  });
}

/**
 * Hook to clear agent memories
 */
export function useClearAgentMemories() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (agentId: UUID) => {
      return elizaClient.memory.clearAgentMemories(agentId);
    },
    onSuccess: (data, agentId) => {
      queryClient.invalidateQueries({ queryKey: ['agent-memories', agentId] });
      showToast(`Cleared ${data.deleted} memories`, 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to clear memories:', error);
      showToast('Failed to clear memories', 'error');
    },
  });
}

/**
 * Hook to clear room memories
 */
export function useClearRoomMemories() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ agentId, roomId }: { agentId: UUID; roomId: UUID }) => {
      return elizaClient.memory.clearRoomMemories(agentId, roomId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['room-memories', variables.agentId, variables.roomId] });
      showToast(`Cleared ${data.deleted} memories`, 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to clear room memories:', error);
      showToast('Failed to clear room memories', 'error');
    },
  });
}