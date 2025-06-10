import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { execSync, spawn, ChildProcess } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { UUID } from '@elizaos/core';
import { TestContext, setupTestEnvironment, cleanupTestEnvironment } from '../commands/test-utils';

export interface APITestContext extends TestContext {
  serverUrl: string;
  httpClient: AxiosInstance;
  serverProcess?: ChildProcess;
  agentId?: UUID;
}

export interface APITestConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  startupTimeout: number;
}

const DEFAULT_CONFIG: APITestConfig = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  retryAttempts: 3,
  startupTimeout: 60000,
};

/**
 * Enhanced setup for API testing that includes server startup
 */
export async function setupAPITestEnvironment(config: Partial<APITestConfig> = {}): Promise<APITestContext> {
  const cliContext = await setupTestEnvironment();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Create a test project for the server
  await createTestProjectForAPI(cliContext.elizaosCmd, 'api-test-project');
  
  // Start the server
  const serverProcess = await startElizaServer(cliContext.elizaosCmd, finalConfig);
  
  // Wait for server to be ready
  await waitForServerReady(finalConfig.baseUrl, finalConfig.startupTimeout);
  
  // Create HTTP client
  const httpClient = createHTTPClient(finalConfig);
  
  return {
    ...cliContext,
    serverUrl: finalConfig.baseUrl,
    httpClient,
    serverProcess,
  };
}

/**
 * Enhanced cleanup for API testing that includes server shutdown
 */
export async function cleanupAPITestEnvironment(context: APITestContext): Promise<void> {
  // Stop server if running
  if (context.serverProcess) {
    try {
      context.serverProcess.kill('SIGTERM');
      // Give it time to shutdown gracefully
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (!context.serverProcess.killed) {
        context.serverProcess.kill('SIGKILL');
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  
  // Cleanup CLI environment
  await cleanupTestEnvironment(context);
}

/**
 * Create a test project specifically configured for API testing
 */
async function createTestProjectForAPI(elizaosCmd: string, projectName: string): Promise<void> {
  // Create project with non-interactive mode
  execSync(`${elizaosCmd} create ${projectName} --yes`, { 
    stdio: 'pipe',
    timeout: 60000
  });
  
  process.chdir(projectName);
  
  // Create additional test configuration files if needed
  await createAPITestConfiguration();
}

/**
 * Create API-specific test configuration
 */
async function createAPITestConfiguration(): Promise<void> {
  // Create a test environment file
  const envContent = `
# API Test Configuration
PORT=3000
NODE_ENV=test
LOG_LEVEL=debug

# Database configuration for testing
DATABASE_URL=sqlite://test.db

# Disable external services for testing
DISABLE_TELEMETRY=true
DISABLE_ANALYTICS=true
`;

  await writeFile('.env.test', envContent);
  
  // Create test agent characters
  const testAgentsDir = join('characters', 'test');
  if (!existsSync(testAgentsDir)) {
    await mkdir(testAgentsDir, { recursive: true });
  }
  
  // Create a simple test agent
  const testAgent = {
    name: 'APITestAgent',
    system: 'You are a test agent for API testing. Respond concisely to test queries.',
    bio: ['Test agent for API validation', 'Responds quickly and predictably'],
    messageExamples: [
      [
        { user: 'user', content: { text: 'Hello' } },
        { user: 'assistant', content: { text: 'Hello! I am ready for testing.' } }
      ],
      [
        { user: 'user', content: { text: 'Test message' } },
        { user: 'assistant', content: { text: 'Test response received.' } }
      ]
    ],
    style: {
      all: ['concise', 'helpful', 'consistent'],
      chat: ['responsive', 'clear'],
    },
    topics: ['testing', 'api', 'automation'],
  };
  
  await writeFile(join(testAgentsDir, 'api-test-agent.json'), JSON.stringify(testAgent, null, 2));
}

/**
 * Start the Eliza server process
 */
async function startElizaServer(elizaosCmd: string, config: APITestConfig): Promise<ChildProcess> {
  const port = new URL(config.baseUrl).port || '3000';
  
  // Use spawn instead of exec for long-running process
  const serverProcess = spawn('bun', ['run', 'start', '--port', port], {
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: port,
      LOG_LEVEL: 'error', // Reduce noise in tests
    },
    detached: false,
  });
  
  // Handle server output for debugging
  serverProcess.stdout?.on('data', (data) => {
    if (process.env.DEBUG_API_TESTS) {
      console.log(`[SERVER] ${data.toString()}`);
    }
  });
  
  serverProcess.stderr?.on('data', (data) => {
    if (process.env.DEBUG_API_TESTS) {
      console.error(`[SERVER ERROR] ${data.toString()}`);
    }
  });
  
  serverProcess.on('error', (error) => {
    console.error('Server process error:', error);
  });
  
  return serverProcess;
}

/**
 * Wait for server to be ready by polling health endpoint
 */
async function waitForServerReady(baseUrl: string, timeout: number): Promise<void> {
  const startTime = Date.now();
  const pollInterval = 1000; // 1 second
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await axios.get(`${baseUrl}/server/ping`, { timeout: 5000 });
      if (response.status === 200 && response.data.pong) {
        return; // Server is ready
      }
    } catch (error) {
      // Server not ready yet, continue polling
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error(`Server failed to start within ${timeout}ms`);
}

/**
 * Create configured HTTP client for API testing
 */
function createHTTPClient(config: APITestConfig): AxiosInstance {
  return axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
    validateStatus: () => true, // Don't throw on HTTP error status codes
  });
}

/**
 * Helper to create a test agent via API
 */
export async function createTestAgent(
  httpClient: AxiosInstance,
  agentData?: Partial<any>
): Promise<{ agentId: UUID; response: AxiosResponse }> {
  const defaultAgentData = {
    name: 'APITestAgent',
    character: 'characters/test/api-test-agent.json',
  };
  
  const payload = { ...defaultAgentData, ...agentData };
  const response = await httpClient.post('/agents', payload);
  
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Failed to create agent: ${response.status} ${response.statusText}`);
  }
  
  const agentId = response.data.id || response.data.agentId;
  if (!agentId) {
    throw new Error('No agent ID returned from create agent API');
  }
  
  return { agentId, response };
}

/**
 * Helper to start an agent via API
 */
export async function startTestAgent(
  httpClient: AxiosInstance,
  agentId: UUID
): Promise<AxiosResponse> {
  const response = await httpClient.post(`/agents/${agentId}/start`);
  
  if (response.status !== 200) {
    throw new Error(`Failed to start agent: ${response.status} ${response.statusText}`);
  }
  
  return response;
}

/**
 * Helper to stop an agent via API
 */
export async function stopTestAgent(
  httpClient: AxiosInstance,
  agentId: UUID
): Promise<AxiosResponse> {
  const response = await httpClient.post(`/agents/${agentId}/stop`);
  
  if (response.status !== 200) {
    throw new Error(`Failed to stop agent: ${response.status} ${response.statusText}`);
  }
  
  return response;
}

/**
 * Helper to delete an agent via API
 */
export async function deleteTestAgent(
  httpClient: AxiosInstance,
  agentId: UUID
): Promise<AxiosResponse> {
  const response = await httpClient.delete(`/agents/${agentId}`);
  
  if (response.status !== 200 && response.status !== 204) {
    throw new Error(`Failed to delete agent: ${response.status} ${response.statusText}`);
  }
  
  return response;
}

/**
 * Helper to send a message to an agent and wait for response
 */
export async function sendMessageToAgent(
  httpClient: AxiosInstance,
  agentId: UUID,
  message: string,
  channelId: string = 'test-channel'
): Promise<AxiosResponse> {
  const payload = {
    text: message,
    channelId,
    senderId: 'test-user',
    senderName: 'Test User',
  };
  
  const response = await httpClient.post(`/messaging/channels/${channelId}/message`, payload);
  
  if (response.status !== 200) {
    throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
  }
  
  return response;
}

/**
 * Helper to retrieve agent memories
 */
export async function getAgentMemories(
  httpClient: AxiosInstance,
  agentId: UUID,
  type?: string,
  limit?: number
): Promise<AxiosResponse> {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (limit) params.append('limit', limit.toString());
  
  const queryString = params.toString();
  const url = `/memory/agents/${agentId}${queryString ? `?${queryString}` : ''}`;
  
  const response = await httpClient.get(url);
  
  if (response.status !== 200) {
    throw new Error(`Failed to get memories: ${response.status} ${response.statusText}`);
  }
  
  return response;
}

/**
 * Helper to wait for a condition with polling
 */
export async function waitForCondition(
  conditionFn: () => Promise<boolean>,
  timeout: number = 10000,
  pollInterval: number = 500
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await conditionFn()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Helper assertions for API testing
 */
export const apiAssertions = {
  /**
   * Assert that response has expected status code
   */
  hasStatus(response: AxiosResponse, expectedStatus: number): void {
    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected status ${expectedStatus}, got ${response.status}. Response: ${JSON.stringify(response.data)}`
      );
    }
  },

  /**
   * Assert that response contains expected data structure
   */
  hasDataStructure(response: AxiosResponse, expectedKeys: string[]): void {
    const data = response.data;
    if (!data || typeof data !== 'object') {
      throw new Error(`Expected object response, got: ${typeof data}`);
    }

    for (const key of expectedKeys) {
      if (!(key in data)) {
        throw new Error(`Expected key '${key}' in response data. Got keys: ${Object.keys(data)}`);
      }
    }
  },

  /**
   * Assert that response indicates success
   */
  isSuccessful(response: AxiosResponse): void {
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Expected successful status, got ${response.status}. Response: ${JSON.stringify(response.data)}`);
    }
  },

  /**
   * Assert that response contains error
   */
  hasError(response: AxiosResponse, expectedErrorCode?: string): void {
    if (response.status >= 200 && response.status < 300) {
      throw new Error(`Expected error response, got successful status ${response.status}`);
    }

    if (expectedErrorCode && response.data?.error?.code !== expectedErrorCode) {
      throw new Error(`Expected error code '${expectedErrorCode}', got '${response.data?.error?.code}'`);
    }
  },

  /**
   * Assert that agent list contains agent
   */
  agentListContains(response: AxiosResponse, agentId: UUID): void {
    this.isSuccessful(response);
    const agents = response.data;
    
    if (!Array.isArray(agents)) {
      throw new Error(`Expected array of agents, got: ${typeof agents}`);
    }

    const agent = agents.find(a => a.id === agentId || a.agentId === agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found in agent list`);
    }
  },
};