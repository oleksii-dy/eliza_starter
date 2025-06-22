import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { SystemEnvironment, LocalEnvironmentUpdateParams } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';
import { useToast } from '../use-toast';
import clientLogger from '@/lib/logger';

/**
 * Hook to get system environment
 */
export function useSystemEnvironment(
  options?: Omit<UseQueryOptions<SystemEnvironment>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['system-environment'],
    queryFn: async () => {
      return elizaClient.system.getEnvironment();
    },
    staleTime: STALE_TIMES.RARE,
    ...options,
  });
}

/**
 * Hook to update local environment variables
 */
export function useUpdateLocalEnvironment() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: LocalEnvironmentUpdateParams) => {
      return elizaClient.system.updateLocalEnvironment(params);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['system-environment'] });
      showToast(`Updated ${data.updated} environment variable(s)`, 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to update environment:', error);
      showToast('Failed to update environment variables', 'error');
    },
  });
}