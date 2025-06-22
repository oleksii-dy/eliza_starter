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
  const { toast } = useToast();

  return useMutation<{ data: { id: string; name: string; pid?: number } }, Error, string>({
    mutationFn: async (agentId: string) => {
      const response = await elizaClient.agents.startAgent(agentId);
      return { data: response };
    },
    onMutate: async (_agentId) => {
      toast({
        title: 'Starting Agent',
        description: 'Initializing agent...',
      });
      return {};
    },
    onSuccess: (response, agentId) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });

      toast({
        title: 'Agent Started',
        description: `${response?.data?.name || 'Agent'} is now running`,
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start agent';
      toast({
        title: 'Error Starting Agent',
        description: `${errorMessage}. Please try again.`,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to stop an agent
 */
export function useStopAgent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<{ data: { message: string } }, Error, string>({
    mutationFn: async (agentId: string) => {
      const response = await elizaClient.agents.stopAgent(agentId);
      return { data: { message: response.message || 'Agent stopped' } };
    },
    onMutate: async (agentId) => {
      const agent = queryClient.getQueryData<Agent>(['agent', agentId]);
      if (agent) {
        toast({
          title: 'Stopping Agent',
          description: `Stopping ${agent.name}...`,
        });
      }
    },
    onSuccess: (response, agentId) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });

      toast({
        title: 'Agent Stopped',
        description: response?.data?.message || 'The agent has been successfully stopped',
      });
    },
    onError: (error, agentId) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });

      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to stop agent',
        variant: 'destructive',
      });
    },
  });
}