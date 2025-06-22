import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { ServerHealth, ServerStatus } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';

/**
 * Hook to check server health
 */
export function useServerHealth(
  options?: Omit<UseQueryOptions<ServerHealth>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['server-health'],
    queryFn: async () => {
      return elizaClient.server.checkHealth();
    },
    staleTime: STALE_TIMES.FREQUENT,
    refetchInterval: STALE_TIMES.FREQUENT,
    ...options,
  });
}

/**
 * Hook to ping the server
 */
export function useServerPing(
  options?: Omit<UseQueryOptions<{ pong: boolean }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['server-ping'],
    queryFn: async () => {
      return elizaClient.server.ping();
    },
    staleTime: STALE_TIMES.FREQUENT,
    refetchInterval: STALE_TIMES.STANDARD,
    ...options,
  });
}

/**
 * Hook to get server status
 */
export function useServerStatus(
  options?: Omit<UseQueryOptions<ServerStatus>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['server-status'],
    queryFn: async () => {
      return elizaClient.server.getStatus();
    },
    staleTime: STALE_TIMES.STANDARD,
    refetchInterval: STALE_TIMES.STANDARD,
    ...options,
  });
}