import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { Agent, UUID } from '@elizaos/api-client';
import type { AgentWithStatus } from '@/types';
import { STALE_TIMES } from '../constants';
import { useNetworkStatus } from '../use-network-status';
import { useAgents } from './use-agents';

interface AgentsWithDetailsResult {
  agents: AgentWithStatus[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Hook to fetch all agents with their detailed status
 */
export function useAgentsWithDetails(): AgentsWithDetailsResult {
  const network = useNetworkStatus();
  const { data: agentsData, isLoading: isAgentsLoading } = useAgents();
  const agentIds = agentsData?.agents?.map((agent) => agent.id as UUID) || [];

  // Use useQueries for parallel fetching
  const agentQueries = useQueries<UseQueryResult<Agent, Error>[]>({
    queries: agentIds.map((id) => ({
      queryKey: ['agent', id] as const,
      queryFn: () => elizaClient.agents.getAgent(id),
      staleTime: STALE_TIMES.FREQUENT,
      enabled: Boolean(id),
      refetchInterval: !network.isOffline && Boolean(id) ? STALE_TIMES.FREQUENT : false,
      refetchIntervalInBackground: false,
      ...(!network.isOffline &&
        network.effectiveType === 'slow-2g' && {
          refetchInterval: STALE_TIMES.STANDARD,
        }),
    })),
  });

  // Combine initial agents with their detailed data
  const agentsWithDetails: AgentWithStatus[] = (agentsData?.agents || []).map((agent) => {
    const detailQuery = agentQueries.find((q) => q.data?.id === agent.id);
    const detailedAgent = detailQuery?.data;

    // If we have detailed data, use it; otherwise use the basic agent data
    const agentData = detailedAgent || agent;

    return {
      ...agentData,
      status: agentData.status || 'stopped',
      isRunning: agentData.status === 'running',
    } as AgentWithStatus;
  });

  const isLoading = isAgentsLoading || agentQueries.some((q) => q.isLoading);
  const isError = agentQueries.some((q) => q.isError);
  const error = agentQueries.find((q) => q.error)?.error;

  const refetch = () => {
    agentQueries.forEach((q) => q.refetch());
  };

  return {
    agents: agentsWithDetails,
    isLoading,
    isError,
    error,
    refetch,
  };
}