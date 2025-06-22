import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { LogSubmitParams } from '@elizaos/api-client';
import { STALE_TIMES } from '../constants';
import { useToast } from '../use-toast';
import clientLogger from '@/lib/logger';

// Server logs are handled differently in the API client
// This is a placeholder for any log-related functionality
// The actual log fetching is done through agent-specific logs

/**
 * Hook to submit logs to the server
 */
export function useSubmitLogs() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (logs: LogSubmitParams[]) => {
      return elizaClient.server.submitLogs(logs);
    },
    onSuccess: (data) => {
      clientLogger.info(`Submitted ${data.received} logs`);
    },
    onError: (error) => {
      clientLogger.error('Failed to submit logs:', error);
      showToast('Failed to submit logs', 'error');
    },
  });
}

/**
 * Hook to clear server logs
 */
export function useClearServerLogs() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async () => {
      return elizaClient.server.clearLogs();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-logs'] });
      showToast(`Cleared ${data.cleared} logs`, 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to clear logs:', error);
      showToast('Failed to clear logs', 'error');
    },
  });
}