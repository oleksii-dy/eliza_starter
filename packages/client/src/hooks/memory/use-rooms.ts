import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { Room, RoomCreateParams, UUID } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';
import { useToast } from '../use-toast';
import clientLogger from '@/lib/logger';

/**
 * Hook to fetch agent's rooms
 */
export function useAgentRooms(
  agentId: UUID | undefined,
  options?: Omit<UseQueryOptions<{ rooms: Room[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['agent-rooms', agentId],
    queryFn: async () => {
      if (!agentId) throw new Error('Agent ID is required');
      return elizaClient.memory.listAgentRooms(agentId);
    },
    enabled: !!agentId,
    staleTime: STALE_TIMES.STANDARD,
    ...options,
  });
}

/**
 * Hook to get room details
 */
export function useRoom(
  agentId: UUID | undefined,
  roomId: UUID | undefined,
  options?: Omit<UseQueryOptions<Room>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['room', agentId, roomId],
    queryFn: async () => {
      if (!agentId || !roomId) throw new Error('Agent ID and Room ID are required');
      return elizaClient.memory.getRoom(agentId, roomId);
    },
    enabled: !!agentId && !!roomId,
    staleTime: STALE_TIMES.STANDARD,
    ...options,
  });
}

/**
 * Hook to create a room
 */
export function useCreateRoom() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ agentId, data }: { agentId: UUID; data: RoomCreateParams }) => {
      return elizaClient.memory.createRoom(agentId, data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-rooms', variables.agentId] });
      showToast('Room created successfully', 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to create room:', error);
      showToast('Failed to create room', 'error');
    },
  });
}