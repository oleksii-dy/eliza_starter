// Import test setup for browser environment
import '../../test/setup';

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import React from 'react';

// Note: This test demonstrates the pattern for real server integration
// In a complete implementation, you would import the actual AgentServer here:
// import { AgentServer } from '@elizaos/server';

// Mock implementation that simulates the server behavior
class MockAgentServer {
  private port: number = 0;
  private agents: any[] = [];
  private isRunning = false;

  async initialize(config: any) {
    // Mock initialization
    this.agents = [
      { id: 'server-agent-1', name: 'Server Agent 1', status: 'active' },
      { id: 'server-agent-2', name: 'Server Agent 2', status: 'inactive' },
    ];
  }

  async start(port: number = 0): Promise<number> {
    this.port = port || 3001;
    this.isRunning = true;
    return this.port;
  }

  async stop() {
    this.isRunning = false;
  }

  // Mock API endpoints
  getBaseURL() {
    return `http://localhost:${this.port}`;
  }

  // Simulate HTTP endpoints
  async handleRequest(path: string, method: string, body?: any) {
    if (!this.isRunning) {
      throw new Error('Server not running');
    }

    switch (`${method} ${path}`) {
      case 'GET /api/agents':
        return { success: true, data: this.agents };

      case 'POST /api/agents':
        const newAgent = { ...body, id: `agent-${Date.now()}`, createdAt: Date.now() };
        this.agents.push(newAgent);
        return { success: true, data: newAgent };

      case 'GET /api/health':
        return { success: true, data: { status: 'healthy', uptime: Date.now() } };

      default:
        throw new Error(`Unknown endpoint: ${method} ${path}`);
    }
  }
}

// API client that works with the mock server
class TestApiClient {
  constructor(private server: MockAgentServer) {}

  async getAgents() {
    const response = await this.server.handleRequest('/api/agents', 'GET');
    return response.data;
  }

  async createAgent(agent: any) {
    const response = await this.server.handleRequest('/api/agents', 'POST', agent);
    return response.data;
  }

  async getHealth() {
    const response = await this.server.handleRequest('/api/health', 'GET');
    return response.data;
  }
}

// React hooks that use the API client
const useServerAgents = (apiClient: TestApiClient) => {
  return useQuery({
    queryKey: ['server-agents'],
    queryFn: () => apiClient.getAgents(),
    staleTime: 30000,
  });
};

const useServerHealth = (apiClient: TestApiClient) => {
  return useQuery({
    queryKey: ['server-health'],
    queryFn: () => apiClient.getHealth(),
    staleTime: 5000,
    refetchInterval: 10000,
  });
};

describe('Real Server Integration Tests', () => {
  let testServer: MockAgentServer;
  let apiClient: TestApiClient;
  let queryClient: QueryClient;

  beforeAll(async () => {
    // Initialize and start test server
    testServer = new MockAgentServer();
    await testServer.initialize({
      dataDir: './test-data',
      // In real implementation:
      // database: new PGLiteAdapter(':memory:'),
      middlewares: [],
    });

    const port = await testServer.start(0); // Random port
    console.log(`Test server started on port ${port}`);

    apiClient = new TestApiClient(testServer);
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
      console.log('Test server stopped');
    }
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0 },
        mutations: { retry: false },
      },
    });
  });

  test('should connect to server and fetch agents', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useServerAgents(apiClient), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('Server Agent 1');
    expect(result.current.data?.[1].name).toBe('Server Agent 2');
  });

  test('should check server health', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useServerHealth(apiClient), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.status).toBe('healthy');
    expect(result.current.data?.uptime).toBeDefined();
  });

  test('should create agent through server', async () => {
    const newAgent = {
      name: 'Test Created Agent',
      username: 'testcreated',
      system: 'Test system prompt',
      enabled: true,
    };

    const createdAgent = await apiClient.createAgent(newAgent);

    expect(createdAgent.name).toBe('Test Created Agent');
    expect(createdAgent.id).toBeDefined();
    expect(createdAgent.createdAt).toBeDefined();

    // Verify it was added to server
    const allAgents = await apiClient.getAgents();
    expect(allAgents).toHaveLength(3); // Original 2 + 1 created
    expect(allAgents.some((agent: any) => agent.name === 'Test Created Agent')).toBe(true);
  });

  test('should handle server errors gracefully', async () => {
    // Stop server to simulate error
    await testServer.stop();

    try {
      await apiClient.getAgents();
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Server not running');
    }

    // Restart server for other tests
    await testServer.start(3001);
  });

  test('should handle concurrent requests', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // Start multiple queries simultaneously
    const { result: agentsResult } = renderHook(() => useServerAgents(apiClient), { wrapper });
    const { result: healthResult } = renderHook(() => useServerHealth(apiClient), { wrapper });

    // Both should eventually succeed
    await waitFor(() => {
      expect(agentsResult.current.isSuccess).toBe(true);
      expect(healthResult.current.isSuccess).toBe(true);
    });

    expect(agentsResult.current.data).toBeDefined();
    expect(healthResult.current.data).toBeDefined();
  });

  test('should maintain data consistency across queries', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // Get initial agent count
    const { result: initialResult } = renderHook(() => useServerAgents(apiClient), { wrapper });

    await waitFor(() => {
      expect(initialResult.current.isSuccess).toBe(true);
    });

    const initialCount = initialResult.current.data?.length || 0;

    // Create a new agent
    await apiClient.createAgent({
      name: 'Consistency Test Agent',
      username: 'consistency',
    });

    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['server-agents'] });

    await waitFor(() => {
      expect(initialResult.current.data?.length).toBe(initialCount + 1);
    });

    // Verify the new agent is in the list
    const hasNewAgent = initialResult.current.data?.some(
      (agent: any) => agent.name === 'Consistency Test Agent'
    );
    expect(hasNewAgent).toBe(true);
  });

  test('should handle query invalidation after mutations', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useServerAgents(apiClient), { wrapper });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const initialDataTime = result.current.dataUpdatedAt;

    // Create agent and invalidate
    await apiClient.createAgent({
      name: 'Invalidation Test Agent',
      username: 'invalidation',
    });

    queryClient.invalidateQueries({ queryKey: ['server-agents'] });

    // Wait for refetch
    await waitFor(() => {
      expect(result.current.dataUpdatedAt).toBeGreaterThan(initialDataTime);
    });

    // Should have the new agent
    const hasNewAgent = result.current.data?.some(
      (agent: any) => agent.name === 'Invalidation Test Agent'
    );
    expect(hasNewAgent).toBe(true);
  });

  test('should demonstrate real server testing pattern', async () => {
    // This test shows how you would structure tests for real server integration

    // 1. Server setup (done in beforeAll)
    expect(testServer.getBaseURL()).toMatch(/http:\/\/localhost:\d+/);

    // 2. API client initialization
    expect(apiClient).toBeInstanceOf(TestApiClient);

    // 3. Health check
    const health = await apiClient.getHealth();
    expect(health.status).toBe('healthy');

    // 4. CRUD operations
    const agents = await apiClient.getAgents();
    expect(Array.isArray(agents)).toBe(true);
    const initialCount = agents.length;

    const newAgent = await apiClient.createAgent({
      name: 'Integration Test Agent',
      system: 'Integration test system prompt',
    });
    expect(newAgent.id).toBeDefined();

    // 5. Data consistency verification
    const updatedAgents = await apiClient.getAgents();
    expect(updatedAgents.length).toBe(initialCount + 1);

    // This pattern can be extended for:
    // - Database operations
    // - WebSocket connections
    // - Authentication flows
    // - Plugin loading
    // - Memory management
    // - File uploads
    // - Real-time messaging
  });
});

/*
To use with real AgentServer, replace MockAgentServer with:

import { AgentServer } from '@elizaos/server';
import { PGLiteAdapter } from '@elizaos/plugin-sql';

class TestServerManager {
  private server: AgentServer;
  private port: number;

  async start(): Promise<string> {
    this.server = new AgentServer();

    await this.server.initialize({
      dataDir: './test-data',
      database: new PGLiteAdapter(':memory:'),
      middlewares: []
    });

    this.port = await this.server.start(0);
    return `http://localhost:${this.port}`;
  }

  async stop() {
    if (this.server) {
      await this.server.stop();
    }
  }
}
*/
