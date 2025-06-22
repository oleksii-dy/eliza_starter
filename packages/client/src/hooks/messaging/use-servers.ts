import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { MessageServer, ServerCreateParams, UUID } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';
import { useToast } from '../use-toast';
import clientLogger from '@/lib/logger';

/**
 * Hook to fetch all message servers
 */
export function useServers(options: Partial<UseQueryOptions<{ servers: MessageServer[] }>> = {}) {
  return useQuery({
    queryKey: ['servers'],
    queryFn: async () => {
      const response = await elizaClient.messaging.listServers();
      return response;
    },
    staleTime: STALE_TIMES.STANDARD,
    ...options,
  });
}

/**
 * Hook to create a new server
 */
export function useCreateServer() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: ServerCreateParams) => {
      return elizaClient.messaging.createServer(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      showToast('Server created successfully', 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to create server:', error);
      showToast('Failed to create server', 'error');
    },
  });
}

/**
 * Hook to delete a server
 */
export function useDeleteServer() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (serverId: UUID) => {
      return elizaClient.messaging.deleteServer(serverId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      showToast('Server deleted successfully', 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to delete server:', error);
      showToast('Failed to delete server', 'error');
    },
  });
}