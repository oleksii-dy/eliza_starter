import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Command } from 'commander';

// Mock all dependencies before importing
mock.module('@/src/commands/create', () => ({
  default: new Command('create').description('Mocked create command'),
  create: new Command('create').description('Mocked create command'),
}));

mock.module('@/src/commands/start', () => ({
  default: new Command('start').description('Mocked start command'),
  start: new Command('start').description('Mocked start command'),
}));

mock.module('@/src/commands/test', () => ({
  default: new Command('test').description('Mocked test command'),
  test: new Command('test').description('Mocked test command'),
}));

mock.module('@/src/commands/update', () => ({
  default: new Command('update').description('Mocked update command'),
  update: new Command('update').description('Mocked update command'),
}));

mock.module('@/src/commands/env', () => ({
  default: new Command('env').description('Mocked env command'),
  env: new Command('env').description('Mocked env command'),
}));

mock.module('@/src/commands/monorepo', () => ({
  default: new Command('monorepo').description('Mocked monorepo command'),
  monorepo: new Command('monorepo').description('Mocked monorepo command'),
}));

mock.module('@/src/commands/dev', () => ({
  default: new Command('dev').description('Mocked dev command'),
  dev: new Command('dev').description('Mocked dev command'),
}));

mock.module('@/src/commands/agent', () => ({
  default: new Command('agent').description('Mocked agent command'),
  agent: new Command('agent').description('Mocked agent command'),
}));

mock.module('@/src/commands/plugins', () => ({
  default: new Command('plugins').description('Mocked plugins command'),
  plugins: new Command('plugins').description('Mocked plugins command'),
}));

mock.module('@/src/commands/publish', () => ({
  default: new Command('publish').description('Mocked publish command'),
  publish: new Command('publish').description('Mocked publish command'),
}));

mock.module('@/src/commands/tee', () => ({
  default: new Command('tee').description('Mocked tee command'),
  teeCommand: new Command('tee').description('Mocked tee command'),
}));

// Mock utilities
const mockDisplayBanner = mock().mockResolvedValue(undefined);
const mockHandleError = mock();
const mockGetVersion = mock().mockReturnValue('1.0.0-test');
const mockCheckAndShowUpdateNotification = mock().mockResolvedValue(undefined);

mock.module('@/src/utils', () => ({
  default: {
    displayBanner: mockDisplayBanner,
    handleError: mockHandleError,
    getVersion: mockGetVersion,
    checkAndShowUpdateNotification: mockCheckAndShowUpdateNotification,
  },
  displayBanner: mockDisplayBanner,
  handleError: mockHandleError,
  getVersion: mockGetVersion,
  checkAndShowUpdateNotification: mockCheckAndShowUpdateNotification,
}));

mock.module('@/src/project', () => ({
  default: { loadProject: mock() },
  loadProject: mock(),
}));

mock.module('@/src/version', () => ({
  default: { version: '1.0.0-test' },
  version: '1.0.0-test',
}));

// Mock fs
mock.module('node:fs', async () => {
  const actual = await import('node:fs');
  return {
    ...actual,
    existsSync: mock(() => true),
    readFileSync: mock(() => JSON.stringify({ version: '1.0.0-test' })),
  };
});

// Mock logger
mock.module('@elizaos/core', () => ({
  default: {
    logger: {
      error: mock(),
      info: mock(),
      success: mock(),
    },
    VECTOR_DIMS: 1536,
    DatabaseAdapter: class MockDatabaseAdapter {},
    Service: class MockService {},
  },
  logger: {
    error: mock(),
    info: mock(),
    success: mock(),
  },
  VECTOR_DIMS: 1536,
  DatabaseAdapter: class MockDatabaseAdapter {},
  Service: class MockService {},
}));

// Mock emoji-handler
const mockConfigureEmojis = mock();
mock.module('@/src/utils/emoji-handler', () => ({
  default: { configureEmojis: mockConfigureEmojis },
  configureEmojis: mockConfigureEmojis,
}));

// Mock child_process for stop command
mock.module('node:child_process', () => ({
  default: { exec: mock((_cmd, callback) => callback?.(null)) },
  exec: mock((_cmd, callback) => callback?.(null)),
}));

describe('CLI main index', () => {
  let mockExit: any;
  let originalArgv: string[];
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    mock.restore();
    // Save original values
    originalArgv = [...process.argv];
    originalEnv = { ...process.env };
    // Mock process.exit
    mockExit = spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    // Restore original values
    process.argv = originalArgv;
    process.env = originalEnv;
    mockExit.mockRestore();
    // Clear module cache to allow re-importing
    // Reset modules - bun test doesn't need this
  });

  it('should configure emoji settings when --no-emoji flag is present', async () => {
    process.argv = ['node', 'elizaos', '--no-emoji'];

    // Import and run the CLI
    await import('../../src/index');

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockConfigureEmojis).toHaveBeenCalledWith({ forceDisable: true });
  });

  it('should set ELIZA_NO_AUTO_INSTALL when --no-auto-install flag is present', async () => {
    process.argv = ['node', 'elizaos', '--no-auto-install'];

    await import('../../src/index');

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(process.env.ELIZA_NO_AUTO_INSTALL).toBe('true');
  });

  it('should display banner when no arguments provided', async () => {
    process.argv = ['node', 'elizaos'];

    await import('../../src/index');

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockDisplayBanner).toHaveBeenCalledWith(false);
  });

  it('should handle errors and exit with code 1', async () => {
    process.argv = ['node', 'elizaos', 'invalid-command'];

    await import('../../src/index');

    // Wait for async operations and error handling
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
