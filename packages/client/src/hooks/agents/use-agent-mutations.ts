import { useMutation, useQueryClient } from '@tanstack/react-query';
import { elizaClient } from '@/lib/eliza-client';
import type { Agent, AgentCreateParams, AgentUpdateParams, UUID } from '@elizaos/api-client';
import { useToast } from '../use-toast';
import clientLogger from '@/lib/logger';

/**
 * Hook to create a new agent
 */
export function useCreateAgent() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: AgentCreateParams) => {
      return elizaClient.agents.createAgent(params);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      showToast('Agent created successfully', 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to create agent:', error);
      showToast('Failed to create agent', 'error');
    },
  });
}

/**
 * Hook to update an agent
 */
export function useUpdateAgent() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ agentId, data }: { agentId: UUID; data: AgentUpdateParams }) => {
      return elizaClient.agents.updateAgent(agentId, data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', variables.agentId] });
      showToast('Agent updated successfully', 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to update agent:', error);
      showToast('Failed to update agent', 'error');
    },
  });
}

/**
 * Hook to delete an agent
 */
export function useDeleteAgent() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (agentId: UUID) => {
      return elizaClient.agents.deleteAgent(agentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      showToast('Agent deleted successfully', 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to delete agent:', error);
      showToast('Failed to delete agent', 'error');
    },
  });
}

/**
 * Hook to start an agent
 */
export function useStartAgent() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (agentId: UUID) => {
      return elizaClient.agents.startAgent(agentId);
    },
    onSuccess: (data, agentId) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
      showToast('Agent started successfully', 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to start agent:', error);
      showToast('Failed to start agent', 'error');
    },
  });
}

/**
 * Hook to stop an agent
 */
export function useStopAgent() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (agentId: UUID) => {
      return elizaClient.agents.stopAgent(agentId);
    },
    onSuccess: (data, agentId) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
      showToast('Agent stopped successfully', 'success');
    },
    onError: (error) => {
      clientLogger.error('Failed to stop agent:', error);
      showToast('Failed to stop agent', 'error');
    },
  });
}