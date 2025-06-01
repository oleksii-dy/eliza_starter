import { vi, type Mock } from 'vitest';
import { Command } from 'commander';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { IAgentRuntime } from '@elizaos/core';

/**
 * Common mock setup for testing CLI commands
 */
export interface CommandTestMocks {
  logger: {
    info: Mock;
    debug: Mock;
    warn: Mock;
    error: Mock;
    success: Mock;
    log: Mock;
    table: Mock;
    spinner: () => {
      start: Mock;
      stop: Mock;
      succeed: Mock;
      fail: Mock;
      text: string;
    };
  };
  prompts: Mock;
  process: {
    exit: Mock;
    cwd: Mock;
  };
  fs: {
    existsSync: Mock;
    mkdirSync: Mock;
    writeFileSync: Mock;
    readFileSync: Mock;
  };
}

/**
 * Create a fresh set of mocks for command testing
 */
export function createCommandMocks(): CommandTestMocks {
  return {
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      log: vi.fn(),
      table: vi.fn(),
      spinner: () => ({
        start: vi.fn(),
        stop: vi.fn(),
        succeed: vi.fn(),
        fail: vi.fn(),
        text: '',
      }),
    },
    prompts: vi.fn(),
    process: {
      exit: vi.fn().mockImplementation(() => {
        throw new Error('process.exit called');
      }),
      cwd: vi.fn(),
    },
    fs: {
      existsSync: vi.fn(),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
      readFileSync: vi.fn(),
    },
  };
}

/**
 * Test context for command testing
 */
export interface CommandTestContext {
  tempDir: string;
  mocks: CommandTestMocks;
  cleanup: () => Promise<void>;
}

/**
 * Setup test context with temp directory and mocks
 */
export async function setupCommandTest(prefix: string): Promise<CommandTestContext> {
  const tempDir = await mkdtemp(join(tmpdir(), `${prefix}-`));
  const mocks = createCommandMocks();
  
  // Set up process.cwd mock
  mocks.process.cwd.mockReturnValue(tempDir);
  
  return {
    tempDir,
    mocks,
    cleanup: async () => {
      await rm(tempDir, { recursive: true, force: true });
    },
  };
}

/**
 * Extract action handler from a Commander command
 */
export function getCommandAction(command: Command): Function {
  const handler = (command as any)._actionHandler;
  if (!handler) {
    throw new Error('Command action handler not found');
  }
  return handler;
}

/**
 * Mock server for testing server-dependent commands
 */
export function createMockServer() {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    database: {
      init: vi.fn().mockResolvedValue(undefined),
      getConnection: vi.fn().mockResolvedValue(true),
    },
    agents: new Map<string, IAgentRuntime>(),
    startAgent: vi.fn().mockResolvedValue({
      agentId: 'mock-agent-id',
      character: { name: 'Mock Agent' },
    }),
  };
}

/**
 * Mock runtime for testing agent-related functionality
 */
export function createMockRuntime(overrides?: Partial<IAgentRuntime>): IAgentRuntime {
  return {
    agentId: 'mock-agent-id',
    character: { name: 'Mock Agent' },
    providers: [],
    actions: [],
    evaluators: [],
    services: new Map(),
    memory: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    },
    stop: vi.fn(),
    processMessage: vi.fn(),
    ...overrides,
  } as unknown as IAgentRuntime;
}

/**
 * Create a mock project structure
 */
export async function createMockProject(
  tempDir: string,
  type: 'project' | 'plugin' | 'monorepo'
) {
  const packageJson = {
    name: type === 'plugin' ? '@elizaos/plugin-test' : 'test-project',
    version: '1.0.0',
    type: 'module',
    main: 'index.js',
    dependencies: type === 'plugin' ? {} : { '@elizaos/core': '1.0.0' },
  };

  await writeFile(
    join(tempDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  if (type === 'monorepo') {
    await mkdir(join(tempDir, 'packages'), { recursive: true });
    await writeFile(
      join(tempDir, 'pnpm-workspace.yaml'),
      'packages:\n  - packages/*\n'
    );
  }

  return tempDir;
}

/**
 * Wait for a condition with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Timeout waiting for condition');
}

/**
 * Mock environment variables for testing
 */
export class MockEnvironment {
  private original: NodeJS.ProcessEnv;
  
  constructor() {
    this.original = { ...process.env };
  }
  
  set(vars: Record<string, string | undefined>) {
    Object.entries(vars).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  }
  
  restore() {
    process.env = { ...this.original };
  }
}

// Re-export fs utilities for convenience
export { writeFile, mkdir, readFile } from 'node:fs/promises';