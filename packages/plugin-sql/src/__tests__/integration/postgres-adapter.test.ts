import { UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { PgAdapter } from '../../pg/adapter';
import { PgManager } from '../../pg/manager';

describe('PostgreSQL Adapter Integration Tests', () => {
  let adapter: PgAdapter;
  let manager: PgManager;
  let cleanup: () => Promise<void>;
  let agentId: UUID;

  beforeEach(async () => {
    // Skip test if no PostgreSQL URL is provided
    if (!process.env.POSTGRES_URL && !process.env.TEST_POSTGRES_URL) {
      throw new Error(
        'PostgreSQL connection required for tests. Please set POSTGRES_URL or TEST_POSTGRES_URL environment variable.'
      );
    }

    const postgresUrl = process.env.TEST_POSTGRES_URL || process.env.POSTGRES_URL!;

    agentId = uuidv4() as UUID;
    manager = new PgManager({
      connectionString: postgresUrl,
      ssl: false,
    });
    await manager.connect();
    adapter = new PgAdapter(agentId, manager);
    await adapter.init();

    // Migrations are handled automatically by the adapter's UnifiedMigrator

    cleanup = async () => {
      await adapter.close();
      await manager.close();
    };
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('Connection Management', () => {
    it('should initialize successfully', async () => {
      const isReady = await adapter.isReady();
      expect(isReady).toBe(true);
    });

    it('should get database connection', async () => {
      const connection = await adapter.getConnection();
      expect(connection).toBeDefined();
    });

    it('should close connection gracefully', async () => {
      await adapter.close();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle isReady when adapter is closed', async () => {
      await adapter.close();
      const isReady = await adapter.isReady();
      expect(isReady).toBe(false);
    });
  });

  describe('Database Operations', () => {
    it('should perform withDatabase operation', async () => {
      const result = await (adapter as any).withDatabase(async () => {
        // Simple operation to test
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should handle withDatabase errors', async () => {
      let errorCaught = false;
      try {
        await (adapter as any).withDatabase(async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        errorCaught = true;
        expect((error as Error).message).toBe('Test error');
      }

      expect(errorCaught).toBe(true);
    });

    it('should handle database operations', async () => {
      // Test a simple database operation
      const result = await (adapter as any).withDatabase(async () => {
        return { status: 'ok' };
      });

      expect(result).toEqual({ status: 'ok' });
    });

    it('should propagate errors from database operations', async () => {
      let errorCaught = false;

      try {
        await (adapter as any).withDatabase(async () => {
          throw new Error('Database operation failed');
        });
      } catch (error) {
        errorCaught = true;
        expect((error as Error).message).toBe('Database operation failed');
      }

      expect(errorCaught).toBe(true);
    });
  });

  describe('Manager Operations', () => {
    it('should get connection instance', () => {
      const connection = manager.getConnection();
      expect(connection).toBeDefined();
    });

    it('should check if closed', () => {
      const isClosed = manager.isClosed();
      expect(isClosed).toBe(false);
    });

    it('should handle close operation', async () => {
      await manager.close();
      const isClosed = manager.isClosed();
      expect(isClosed).toBe(true);
    });

    it('should test connection through adapter', async () => {
      const isReady = await adapter.isReady();
      expect(isReady).toBe(true);
    });

    it('should handle connection errors', async () => {
      // Close the adapter
      await adapter.close();

      // Now try to check if ready
      const isReady = await adapter.isReady();
      expect(isReady).toBe(false);
    });

    it('should handle query failures', async () => {
      // PostgreSQL adapter init establishes the connection and runs migrations
      const tempPostgresUrl = process.env.TEST_POSTGRES_URL || process.env.POSTGRES_URL!;
      const mockManager = new PgManager({ connectionString: tempPostgresUrl, ssl: false });
      await mockManager.connect();
      const mockAdapter = new PgAdapter(uuidv4() as UUID, mockManager);

      // Close the manager to simulate a connection issue
      await mockManager.close();

      // Check that adapter reports not ready
      const isReady = await mockAdapter.isReady();
      expect(isReady).toBe(false);
    });
  });

  describe('Agent Operations', () => {
    it('should create an agent', async () => {
      const result = await adapter.createAgent({
        id: agentId,
        name: 'Test Agent',
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
        bio: 'Test agent bio',
      } as any);

      expect(result).toBe(true);
    });

    it('should retrieve an agent', async () => {
      // Create agent first
      await adapter.createAgent({
        id: agentId,
        name: 'Test Agent',
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
        bio: 'Test agent bio',
      } as any);

      const agent = await adapter.getAgent(agentId);
      expect(agent).toBeDefined();
      expect(agent?.name).toBe('Test Agent');
    });

    it('should update an agent', async () => {
      // Create agent first
      await adapter.createAgent({
        id: agentId,
        name: 'Test Agent',
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
        bio: 'Test agent bio',
      } as any);

      // Update agent
      await adapter.updateAgent(agentId, {
        name: 'Updated Agent',
      });

      const agent = await adapter.getAgent(agentId);
      expect(agent?.name).toBe('Updated Agent');
    });

    it('should delete an agent', async () => {
      // Create agent first
      await adapter.createAgent({
        id: agentId,
        name: 'Test Agent',
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
        bio: 'Test agent bio',
      } as any);

      const deleted = await adapter.deleteAgent(agentId);
      expect(deleted).toBe(true);

      const agent = await adapter.getAgent(agentId);
      expect(agent).toBeNull();
    });
  });
});
