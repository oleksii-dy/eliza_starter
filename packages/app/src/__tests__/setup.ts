/**
 * Test Setup and Configuration
 * Configures the test environment for integration and E2E tests
 */

import { beforeAll, afterAll } from 'bun:test';

// Mock Tauri APIs globally for all tests
const mockTauriAPIs = () => {
  // Mock window object for Tauri APIs
  (globalThis as any).window = {
    __TAURI_INTERNALS__: {
      invoke: async () => Promise.resolve(),
      transformCallback: () => () => {},
    },
  };

  const mockTauri = {
    os: {
      platform: () => Promise.resolve('darwin'),
    },
    shell: {
      open: () => Promise.resolve(),
    },
    event: {
      listen: () => Promise.resolve(() => {}),
      emit: () => Promise.resolve(),
    },
    invoke: () => Promise.resolve(),
    fs: {
      readTextFile: () => Promise.resolve('{}'),
      writeTextFile: () => Promise.resolve(),
      createDir: () => Promise.resolve(),
      exists: () => Promise.resolve(true),
    },
    path: {
      appDataDir: () => Promise.resolve('/tmp/test-app-data'),
      configDir: () => Promise.resolve('/tmp/test-config'),
    },
  };

  (globalThis as any).__TAURI__ = mockTauri;
  (globalThis as any).__TAURI_METADATA__ = { target: 'desktop' };
};

// Mock fetch for platform API calls
const mockFetch = () => {
  const originalFetch = globalThis.fetch;
  
  (globalThis as any).fetch = async (url: string | URL, options?: RequestInit) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    
    // Mock OAuth initiation endpoint
    if (urlString.includes('/api/auth/social/')) {
      return {
        ok: true,
        status: 302,
        headers: new Map([
          ['location', 'https://auth.workos.com/oauth/authorize?client_id=test&redirect_uri=elizaos%3A%2F%2Fauth%2Fcallback']
        ]),
        url: 'https://auth.workos.com/oauth/authorize?client_id=test',
        redirected: false,
        statusText: 'Found',
        type: 'basic',
        clone: () => Promise.resolve({}),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        blob: () => Promise.resolve(new Blob([])),
        formData: () => Promise.resolve(new FormData()),
        body: null,
        bodyUsed: false,
      } as unknown as Response;
    }

    // Mock session verification endpoint
    if (urlString.includes('/api/auth/session')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          userId: 'test-user-123',
          email: 'test@example.com',
          role: 'admin',
          organizationId: 'test-org-456',
          organizationName: 'Test Organization',
          billingPlan: 'pro',
          agentLimit: 10,
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      } as Response;
    }

    // Mock token refresh endpoint
    if (urlString.includes('/api/auth/refresh')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          accessToken: 'new-mock-access-token',
          refreshToken: 'new-mock-refresh-token',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      } as Response;
    }

    // Fall back to original fetch or mock error
    if (originalFetch) {
      return originalFetch(url, options);
    }
    
    return Promise.reject(new Error(`Unmocked fetch call to: ${urlString}`));
  };

  return originalFetch;
};

// Setup console capture for security audit log testing
const setupConsoleCapture = () => {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  // Allow tests to capture console output when needed
  (globalThis as any).__TEST_CONSOLE_CAPTURE__ = {
    enable: () => {
      const captured: { level: string; args: any[] }[] = [];
      
      console.log = (...args) => captured.push({ level: 'log', args });
      console.warn = (...args) => captured.push({ level: 'warn', args });
      console.error = (...args) => captured.push({ level: 'error', args });
      console.info = (...args) => captured.push({ level: 'info', args });
      
      return captured;
    },
    disable: () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
    },
  };

  return originalConsole;
};

// Set up test environment
beforeAll(async () => {
  // Mock Tauri APIs
  mockTauriAPIs();
  
  // Mock fetch for platform communication
  mockFetch();
  
  // Setup console capture utilities
  setupConsoleCapture();

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  
  console.log('🧪 Test environment setup complete');
});

afterAll(async () => {
  // Clean up any global test state
  console.log('🧹 Test environment cleanup complete');
});

// Export utilities for tests
export const testUtils = {
  createMockAuthContext: (overrides = {}) => ({
    userId: 'test-user-123',
    userEmail: 'test@example.com',
    userRole: 'admin',
    organizationId: 'test-org-456',
    organizationName: 'Test Organization',
    billingPlan: 'pro',
    agentLimit: 10,
    ...overrides,
  }),
  
  createMockCharacter: (overrides = {}) => ({
    name: 'TestBot',
    bio: 'A test bot for authentication integration testing',
    system: 'You are a helpful assistant for testing authentication.',
    messageExamples: [
      [
        { user: 'user', content: { text: 'Hello' } },
        { user: 'assistant', content: { text: 'Hello! How can I help you today?' } }
      ]
    ],
    knowledge: [],
    plugins: [],
    ...overrides,
  }),

  createMockMemory: (overrides = {}) => ({
    id: `test-memory-${Date.now()}`,
    entityId: 'test-user-123',
    agentId: 'test-agent-456',
    roomId: 'test-room-789',
    content: { text: 'Test memory content' },
    createdAt: new Date(),
    ...overrides,
  }),

  waitForAsync: (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Global test timeout
export const TEST_TIMEOUT = 30000; // 30 seconds