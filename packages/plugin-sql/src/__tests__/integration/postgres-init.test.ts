import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { plugin } from '../../index';
import type { AgentRuntime } from '@elizaos/core';
import { tmpdir } from 'os';
import { join } from 'path';

describe('PostgreSQL Initialization Tests', () => {
  let mockRuntime: AgentRuntime;
  let originalEnv: NodeJS.ProcessEnv;

  // Check if actual PostgreSQL is available
  const hasActualPostgres = !!process.env.POSTGRES_URL;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.POSTGRES_URL;
    delete process.env.PGLITE_PATH;
    delete process.env.DATABASE_PATH;

    // Note: Module reset not needed with bun test

    mockRuntime = {
      agentId: '00000000-0000-0000-0000-000000000000',
      character: {
        name: 'Test Agent',
        bio: ['Test bio'],
        system: 'Test system',
        messageExamples: [],
        postExamples: [],
        topics: [],
        knowledge: [],
        plugins: [],
      },
      getSetting: mock(),
      registerDatabaseAdapter: mock(),
      registerService: mock(),
      getService: mock(),
    } as any;
  });

  afterEach(() => {
    process.env = originalEnv;
    mock.restore();
  });

  it.skipIf(!hasActualPostgres)(
    'should initialize with PostgreSQL when POSTGRES_URL is provided',
    async () => {
      if (!hasActualPostgres) {
        console.log('[PostgreSQL Init Tests] Skipping - POSTGRES_URL not set');
        return;
      }

      // Re-import plugin after resetting modules
      const { plugin: freshPlugin } = await import('../../index');

      const postgresUrl = process.env.POSTGRES_URL!;
      (mockRuntime.getSetting as any).mockImplementation((key: string) => {
        if (key === 'POSTGRES_URL') {return postgresUrl;}
        return undefined;
      });

      await freshPlugin.init?.({}, mockRuntime);

      expect(mockRuntime.registerDatabaseAdapter).toHaveBeenCalled();
      const adapter = (mockRuntime.registerDatabaseAdapter as any).mock.calls[0][0];
      expect(adapter).toBeDefined();
      expect(adapter.constructor.name).toBe('PgDatabaseAdapter');
    }
  );

  it('should skip initialization if database adapter already exists', async () => {
    // Re-import plugin after resetting modules
    const { plugin: freshPlugin } = await import('../../index');

    // Simulate existing adapter
    (mockRuntime as any).adapter = {
      test: true,
      isReady: mock().mockResolvedValue(true),
      init: mock().mockResolvedValue(undefined),
      getDatabase: mock().mockReturnValue({
        execute: mock().mockResolvedValue({ rows: [{ tablename: 'agents' }] }),
      }),
      db: {
        execute: mock().mockResolvedValue({ rows: [{ tablename: 'agents' }] }),
      },
    };

    await freshPlugin.init?.({}, mockRuntime);

    expect(mockRuntime.registerDatabaseAdapter).not.toHaveBeenCalled();
  });

  it('should use PGLITE_PATH when provided', async () => {
    // Re-import plugin after resetting modules
    const { plugin: freshPlugin } = await import('../../index');

    // Use a proper temporary directory that actually exists
    const pglitePath = join(tmpdir(), `eliza-test-pglite-${Date.now()}`);
    (mockRuntime.getSetting as any).mockImplementation((key: string) => {
      if (key === 'PGLITE_PATH') {return pglitePath;}
      return undefined;
    });

    await freshPlugin.init?.({}, mockRuntime);

    expect(mockRuntime.registerDatabaseAdapter).toHaveBeenCalled();
    const adapter = (mockRuntime.registerDatabaseAdapter as any).mock.calls[0][0];
    expect(adapter).toBeDefined();
    expect(adapter.constructor.name).toBe('PgliteDatabaseAdapter');
  });

  it('should use DATABASE_PATH when PGLITE_PATH is not provided', async () => {
    // Re-import plugin after resetting modules
    const { plugin: freshPlugin } = await import('../../index');

    // Use a proper temporary directory that actually exists
    const databasePath = join(tmpdir(), `eliza-test-db-${Date.now()}`);
    (mockRuntime.getSetting as any).mockImplementation((key: string) => {
      if (key === 'DATABASE_PATH') {return databasePath;}
      return undefined;
    });

    await freshPlugin.init?.({}, mockRuntime);

    expect(mockRuntime.registerDatabaseAdapter).toHaveBeenCalled();
    const adapter = (mockRuntime.registerDatabaseAdapter as any).mock.calls[0][0];
    expect(adapter).toBeDefined();
    expect(adapter.constructor.name).toBe('PgliteDatabaseAdapter');
  });

  it('should use default path when no configuration is provided', async () => {
    // Re-import plugin after resetting modules
    const { plugin: freshPlugin } = await import('../../index');

    (mockRuntime.getSetting as any).mockReturnValue(undefined);

    await freshPlugin.init?.({}, mockRuntime);

    expect(mockRuntime.registerDatabaseAdapter).toHaveBeenCalled();
    const adapter = (mockRuntime.registerDatabaseAdapter as any).mock.calls[0][0];
    expect(adapter).toBeDefined();
    expect(adapter.constructor.name).toBe('PgliteDatabaseAdapter');
  });

  it('should handle errors gracefully during adapter check', async () => {
    // Re-import plugin after resetting modules
    const { plugin: freshPlugin } = await import('../../index');

    // Simulate no adapter by not setting the adapter property
    (mockRuntime.getSetting as any).mockReturnValue(undefined);

    await freshPlugin.init?.({}, mockRuntime);

    expect(mockRuntime.registerDatabaseAdapter).toHaveBeenCalled();
  });
});
