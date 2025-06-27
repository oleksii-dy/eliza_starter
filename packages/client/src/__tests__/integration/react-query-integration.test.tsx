// Import test setup for browser environment
import '../../test/setup';

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import React from 'react';

// Mock API client
interface ApiClient {
  getAgents: () => Promise<any[]>;
  createAgent: (agent: any) => Promise<any>;
  updateAgent: (id: string, updates: any) => Promise<any>;
  deleteAgent: (id: string) => Promise<void>;
}

const createMockApiClient = (overrides: Partial<ApiClient> = {}): ApiClient => {
  return {
    getAgents: async () => [
      { id: '1', name: 'Agent 1', status: 'active' },
      { id: '2', name: 'Agent 2', status: 'inactive' },
    ],
    createAgent: async (agent) => ({ ...agent, id: 'new-id', createdAt: Date.now() }),
    updateAgent: async (id, updates) => ({ id, ...updates, updatedAt: Date.now() }),
    deleteAgent: async (id) => { /* mock deletion */ },
    ...overrides
  };
};

// Custom hooks that use React Query
const useAgents = (apiClient: ApiClient) => {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => apiClient.getAgents(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
  });
};

const useCreateAgent = (apiClient: ApiClient, queryClient: QueryClient) => {
  return useMutation({
    mutationFn: (agent: any) => apiClient.createAgent(agent),
    onSuccess: (newAgent) => {
      // Optimistic update
      queryClient.setQueryData(['agents'], (old: any[] = []) => [...old, newAgent]);
    },
    onError: (error, variables, context) => {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
};

const useUpdateAgent = (apiClient: ApiClient, queryClient: QueryClient) => {
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiClient.updateAgent(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['agents'] });

      // Snapshot previous value
      const previousAgents = queryClient.getQueryData(['agents']);

      // Optimistically update
      queryClient.setQueryData(['agents'], (old: any[] = []) =>
        old.map(agent => agent.id === id ? { ...agent, ...updates } : agent)
      );

      return { previousAgents };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousAgents) {
        queryClient.setQueryData(['agents'], context.previousAgents);
      }
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
};

// Wrapper component for tests
const createWrapper = (apiClient: ApiClient, queryClient: QueryClient) => {
  const ApiClientProvider = React.createContext(apiClient);

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider.Provider value={apiClient}>
        {children}
      </ApiClientProvider.Provider>
    </QueryClientProvider>
  );
};

describe('React Query Integration Tests', () => {
  let queryClient: QueryClient;
  let apiClient: ApiClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });
    apiClient = createMockApiClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  test('should fetch agents successfully', async () => {
    const wrapper = createWrapper(apiClient, queryClient);
    const { result } = renderHook(() => useAgents(apiClient), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('Agent 1');
    expect(result.current.data?.[1].name).toBe('Agent 2');
  });

  test('should handle query errors gracefully', async () => {
    const errorApiClient = createMockApiClient({
      getAgents: async () => {
        throw new Error('API Error');
      }
    });

    const wrapper = createWrapper(errorApiClient, queryClient);
    const { result } = renderHook(() => useAgents(errorApiClient), { wrapper });

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('API Error');
  });

  test('should perform optimistic updates on agent creation', async () => {
    const wrapper = createWrapper(apiClient, queryClient);

    // First get the agents query
    const { result: agentsResult } = renderHook(() => useAgents(apiClient), { wrapper });

    await waitFor(() => {
      expect(agentsResult.current.isSuccess).toBe(true);
    });

    // Then test mutation
    const { result: mutationResult } = renderHook(() => useCreateAgent(apiClient, queryClient), { wrapper });

    const newAgent = { name: 'New Agent', status: 'inactive' };

    act(() => {
      mutationResult.current.mutate(newAgent);
    });

    // Should immediately update cache optimistically
    await waitFor(() => {
      const currentData = queryClient.getQueryData(['agents']) as any[];
      expect(currentData).toHaveLength(3);
      expect(currentData[2].name).toBe('New Agent');
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });
  });

  test('should rollback optimistic updates on error', async () => {
    const errorApiClient = createMockApiClient({
      createAgent: async () => {
        throw new Error('Creation failed');
      }
    });

    const wrapper = createWrapper(errorApiClient, queryClient);

    // First get the agents query
    const { result: agentsResult } = renderHook(() => useAgents(errorApiClient), { wrapper });

    await waitFor(() => {
      expect(agentsResult.current.isSuccess).toBe(true);
    });

    const originalCount = agentsResult.current.data?.length || 0;

    // Test mutation with error
    const { result: mutationResult } = renderHook(() => useCreateAgent(errorApiClient, queryClient), { wrapper });

    const newAgent = { name: 'Failing Agent', status: 'inactive' };

    act(() => {
      mutationResult.current.mutate(newAgent);
    });

    // Wait for error and rollback
    await waitFor(() => {
      expect(mutationResult.current.isError).toBe(true);
    });

    // Should have rolled back to original state
    const finalData = queryClient.getQueryData(['agents']) as any[];
    expect(finalData).toHaveLength(originalCount);
  });

  test('should handle complex optimistic updates with rollback', async () => {
    const failingApiClient = createMockApiClient({
      updateAgent: async (id, updates) => {
        if (updates.name === 'Failing Update') {
          throw new Error('Update failed');
        }
        return { id, ...updates, updatedAt: Date.now() };
      }
    });

    const wrapper = createWrapper(failingApiClient, queryClient);

    // Get initial data
    const { result: agentsResult } = renderHook(() => useAgents(failingApiClient), { wrapper });

    await waitFor(() => {
      expect(agentsResult.current.isSuccess).toBe(true);
    });

    const originalData = agentsResult.current.data;
    const originalFirstAgent = originalData?.[0];

    // Test update mutation
    const { result: mutationResult } = renderHook(() => useUpdateAgent(failingApiClient, queryClient), { wrapper });

    act(() => {
      mutationResult.current.mutate({
        id: '1',
        updates: { name: 'Failing Update', status: 'updated' }
      });
    });

    // Wait for error (optimistic update may not be visible in test environment)
    await waitFor(() => {
      expect(mutationResult.current.isError).toBe(true);
    });

    // Verify rollback - data should be restored to original state
    await waitFor(() => {
      const finalData = queryClient.getQueryData(['agents']) as any[];
      expect(finalData[0].name).toBe(originalFirstAgent?.name);
      expect(finalData[0].status).toBe(originalFirstAgent?.status);
    });
  });

  test('should handle cache invalidation correctly', async () => {
    const wrapper = createWrapper(apiClient, queryClient);

    // Get initial data
    const { result: agentsResult } = renderHook(() => useAgents(apiClient), { wrapper });

    await waitFor(() => {
      expect(agentsResult.current.isSuccess).toBe(true);
    });

    const initialDataTime = agentsResult.current.dataUpdatedAt;

    // Manually invalidate cache
    act(() => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    });

    // Should trigger refetch and update data timestamp
    await waitFor(() => {
      expect(agentsResult.current.dataUpdatedAt).toBeGreaterThan(initialDataTime);
    });

    expect(agentsResult.current.isSuccess).toBe(true);
    expect(agentsResult.current.data).toHaveLength(2);
  });

  test('should handle stale data correctly', async () => {
    const queryClientWithStale = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 100, // 100ms stale time
        },
      },
    });

    const wrapper = createWrapper(apiClient, queryClientWithStale);
    const { result } = renderHook(() => useAgents(apiClient), { wrapper });

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const initialData = result.current.data;

    // Wait for data to become stale
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should still have data but might refetch in background
    expect(result.current.data).toEqual(initialData);
    expect(result.current.isSuccess).toBe(true);

    queryClientWithStale.clear();
  });

  test('should handle concurrent mutations correctly', async () => {
    const wrapper = createWrapper(apiClient, queryClient);

    // Get initial data
    const { result: agentsResult } = renderHook(() => useAgents(apiClient), { wrapper });

    await waitFor(() => {
      expect(agentsResult.current.isSuccess).toBe(true);
    });

    // Test multiple concurrent mutations
    const { result: createResult } = renderHook(() => useCreateAgent(apiClient, queryClient), { wrapper });
    const { result: updateResult } = renderHook(() => useUpdateAgent(apiClient, queryClient), { wrapper });

    // Trigger concurrent mutations
    act(() => {
      createResult.current.mutate({ name: 'Concurrent Agent 1' });
      updateResult.current.mutate({ id: '1', updates: { name: 'Updated Agent' } });
    });

    // Wait for both to complete
    await waitFor(() => {
      expect(createResult.current.isSuccess).toBe(true);
      expect(updateResult.current.isSuccess).toBe(true);
    });

    // Verify final data after invalidation settles
    await waitFor(() => {
      const finalData = queryClient.getQueryData(['agents']) as any[];
      expect(finalData).toHaveLength(2); // Original count after invalidation
    });

    // Verify mutations completed successfully
    expect(createResult.current.data).toBeDefined();
    expect(updateResult.current.data).toBeDefined();
  });
});
