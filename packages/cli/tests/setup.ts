/**
 * Global test setup for CLI package
 * This file runs before all tests to set up mocks and globals
 */

import { mock } from 'bun:test';

// Set test environment variables BEFORE any imports
process.env.NODE_ENV = 'test';
process.env.ELIZA_NONINTERACTIVE = 'true';
process.env.FORCE_TEST_MODE = 'true';
process.env.DISABLE_DATABASE = 'true';
process.env.USE_MEMORY_DATABASE = 'true';

// ---------------------------------------------------------------------------
// Ensure the CLI bundle is built *once* before any integration tests start.
// Individual test files attempt to build on-demand, but running in parallel
// threads means multiple tests can simultaneously see a missing `dist/` and
// try to execute the CLI before another thread finishes building, causing a
// "Module not found" failure.  By performing a single, blocking build here we
// guarantee the artifact exists for the entire suite and eliminate the race.
// ---------------------------------------------------------------------------

import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Path to CLI package root: tests/setup.ts -> tests -> .. => package root
const cliPackageDir = path.resolve(__dirname, '..');
const cliDistEntry = path.join(cliPackageDir, 'dist', 'index.js');

if (!existsSync(cliDistEntry)) {
  console.log('[TEST SETUP] CLI dist bundle not found. Building once for all tests...');
  execSync('bun run build', { cwd: cliPackageDir, stdio: 'inherit' });
  console.log('[TEST SETUP] CLI build complete.');
}

// Store original handlers
// const originalHandlers = {
//   unhandledRejection: process.listeners('unhandledRejection'),
//   uncaughtException: process.listeners('uncaughtException'),
// };

// Mock socket.io to prevent server startup issues in tests
mock.module('socket.io', () => ({
  Server: mock(() => ({
    on: mock(),
    emit: mock(),
    use: mock(),
    engine: {
      on: mock(),
    },
  })),
}));

// Mock express to prevent server startup issues
mock.module('express', () => {
  const mockApp = {
    use: mock(),
    get: mock(),
    post: mock(),
    put: mock(),
    delete: mock(),
    listen: mock(),
    set: mock(),
  };

  const mockExpress = mock(() => mockApp);
  (mockExpress as any).static = mock();
  (mockExpress as any).json = mock();
  (mockExpress as any).urlencoded = mock();
  (mockExpress as any).Router = mock(() => ({
    use: mock(),
    get: mock(),
    post: mock(),
    put: mock(),
    delete: mock(),
  }));

  return {
    default: mockExpress,
    ...mockExpress,
  };
});

// Mock body-parser to prevent server startup issues
mock.module('body-parser', () => ({
  json: mock(() => (_req: any, _res: any, next: any) => next()),
  urlencoded: mock(() => (_req: any, _res: any, next: any) => next()),
  text: mock(() => (_req: any, _res: any, next: any) => next()),
  raw: mock(() => (_req: any, _res: any, next: any) => next()),
}));

// Mock helmet for security headers
mock.module('helmet', () => {
  const helmet = mock(() => (_req: any, _res: any, next: any) => next());
  return {
    default: helmet,
    ...helmet,
  };
});

// Mock cors
mock.module('cors', () => {
  const cors = mock(() => (_req: any, _res: any, next: any) => next());
  return {
    default: cors,
    ...cors,
  };
});

// Mock scenario-runner production components to prevent database connections
mock.module('../src/scenario-runner/ProductionCostTracker.js', () => ({
  ProductionCostTracker: mock().mockImplementation(() => ({
    setBenchmarkBudget: mock(),
    trackOpenAICall: mock(),
    trackAnthropicCall: mock(),
    trackBlockchainTransaction: mock(),
    trackEcommercePurchase: mock(),
    trackAdvertisingSpend: mock(),
    trackInfrastructureCost: mock(),
    calculateTotalCost: mock().mockReturnValue(0),
    calculateCostsByAgent: mock().mockReturnValue(new Map()),
    generateCostReport: mock().mockResolvedValue({}),
    emergencyStop: mock(),
    resumeBenchmark: mock(),
    isBenchmarkStopped: mock().mockReturnValue(false),
    getBenchmarkCosts: mock().mockReturnValue([]),
    clearBenchmarkCosts: mock(),
    exportCostData: mock().mockReturnValue([]),
  })),
}));

mock.module('../src/scenario-runner/ExternalAgentApi.js', () => ({
  ExternalAgentAPI: mock().mockImplementation(() => ({
    registerAgent: mock(),
    unregisterAgent: mock(),
    sendMessage: mock(),
    getAgentStatus: mock(),
    executeAgentTask: mock(),
  })),
}));

mock.module('../src/scenario-runner/BenchmarkScoringSystem.js', () => ({
  BenchmarkScoringSystem: mock().mockImplementation(() => ({
    calculateScore: mock().mockReturnValue(0),
    updateLeaderboard: mock(),
    getLeaderboard: mock().mockResolvedValue([]),
  })),
}));

mock.module('../src/scenario-runner/integration-test.js', () => ({
  ProductionVerificationSystem: mock().mockImplementation(() => ({
    initializeSystem: mock().mockResolvedValue(undefined),
    verify: mock().mockResolvedValue([]),
    shutdown: mock().mockResolvedValue(undefined),
  })),
}));

// Mock test-utils to prevent real runtime creation
mock.module('@elizaos/core/test-utils', () => ({
  createTestRuntime: mock().mockRejectedValue(
    new Error('Test runtime creation disabled in unit tests')
  ),
  RuntimeTestHarness: mock(),
}));

// Mock the core AgentRuntime to prevent real runtime creation
mock.module('@elizaos/core', () => {
  const coreMocks = {
    AgentRuntime: mock().mockImplementation(() => ({
      agentId: 'test-agent-id',
      character: { name: 'Test Agent' },
      initialize: mock().mockResolvedValue(undefined),
      stop: mock().mockResolvedValue(undefined),
      ensureWorldExists: mock().mockResolvedValue(undefined),
      ensureRoomExists: mock().mockResolvedValue(undefined),
      createMemory: mock().mockResolvedValue(undefined),
      createEntity: mock().mockResolvedValue(true),
      createEntities: mock().mockResolvedValue(true),
      emitEvent: mock(),
      useModel: mock().mockResolvedValue('Test response'),
    })),
    logger: {
      info: console.log,
      debug: console.log,
      error: console.error,
      warn: console.warn,
      success: console.log,
    },
    createUniqueUuid: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    asUUID: (str: string) => str,
    UUID: String,
    EventType: {},
    ChannelType: {
      DM: 'dm',
      GROUP: 'group',
      PUBLIC: 'public',
    },
    type: {},
  };
  return coreMocks;
});

// Ensure logger is available globally
global.console = {
  ...console,
  debug: console.log,
  trace: console.log,
};

// ---------------------------------------------------------------------------
// Vitest occasionally detects open handles after the CLI integration tests
// finish because some spawned Bun child-processes keep internal event-loop
// references alive for a short period (e.g. libuv async I/O watchers).  These
// handles are harmless and do *not* indicate a real resource leak, but they
// cause Vitest to exit with code 1, which in turn breaks the CI pipeline even
// though every assertion passed.
//
// To avoid this false-negative we programmatically set the process exit code
// to 0 once *all* tests and global cleanup are complete.  This hook runs after
// the test context is finished, giving our individual tests ample time to
// terminate any child processes they created.
// ---------------------------------------------------------------------------

import { afterAll } from 'bun:test';

afterAll(async () => {
  // Give any pending "exit" events from child processes a brief moment to
  // propagate, then force a clean shutdown with an explicit success code.
  await new Promise((resolve) => setTimeout(resolve, 50));
  // Only override exit code if no failures were recorded
  if (process.exitCode === undefined || process.exitCode === 0) {
    // process.exit(0); // Disabled in test environment
  }
});
