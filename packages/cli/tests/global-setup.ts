/**
 * Global setup that runs before any tests to handle module mocking
 * This runs at the very beginning to prevent dependency loading issues
 */

import { mock } from 'bun:test';

// Set up global environment variables for testing
process.env.NODE_ENV = 'test';
process.env.ELIZA_NONINTERACTIVE = 'true';

// Mock problematic Node.js modules first
mock.module('multer', () => {
  console.log('Mocking multer module...');
  const mockMulter = () => ({
    single: () => (_req: any, _res: any, next: any) => next(),
    array: () => (_req: any, _res: any, next: any) => next(),
    fields: () => (_req: any, _res: any, next: any) => next(),
    none: () => (_req: any, _res: any, next: any) => next(),
    any: () => (_req: any, _res: any, next: any) => next(),
  });

  (mockMulter as any).diskStorage = () => ({});
  (mockMulter as any).memoryStorage = () => ({});

  return {
    default: mockMulter,
    diskStorage: (mockMulter as any).diskStorage,
    memoryStorage: (mockMulter as any).memoryStorage,
  };
});

// Alternative approach: Mock the entire server module to prevent multer loading
mock.module('@elizaos/server', () => {
  console.log('Mocking @elizaos/server module...');
  return {
    AgentServer: class MockAgentServer {
      constructor() {}
      async initialize() {}
      async startAgent() {
        return {};
      }
      stopAgent() {}
      async loadCharacterTryPath() {
        return {};
      }
      async jsonToCharacter() {
        return {};
      }
    },
    expandTildePath: (path: string) => path,
    resolvePgliteDir: (dir?: string) => dir || './.elizadb',
  };
});

// Mock the start command to prevent real agent startup
mock.module('../src/commands/start/index.js', () => {
  console.log('Mocking start command module...');
  return {
    startAgent: mock().mockResolvedValue({
      agentId: 'test-agent',
      character: { name: 'Test Agent' },
      plugins: [],
    }),
    startAgents: mock().mockResolvedValue([]),
    createAgent: mock().mockResolvedValue({
      agentId: 'test-agent',
      character: { name: 'Test Agent' },
    }),
  };
});

// Mock plugin-sql to prevent database connections
mock.module('@elizaos/plugin-sql', () => {
  console.log('Mocking @elizaos/plugin-sql module...');
  return {
    default: {
      name: '@elizaos/plugin-sql',
      actions: [],
      evaluators: [],
      providers: [],
      services: [],
    },
    PgAdapter: mock().mockImplementation(() => ({
      createEntities: mock().mockResolvedValue(true),
      getEntity: mock().mockResolvedValue(null),
      updateEntity: mock().mockResolvedValue(true),
      deleteEntity: mock().mockResolvedValue(true),
    })),
    PgManager: mock().mockImplementation(() => ({
      withRetry: mock().mockImplementation((fn) => fn()),
      runMigration: mock().mockResolvedValue(undefined),
    })),
  };
});

console.log('Global setup completed - mocks are in place');
