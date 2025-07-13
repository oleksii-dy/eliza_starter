import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { DatabaseMigrationService } from '../../migration-service';
import { type Plugin } from '@elizaos/core';

// Mock the logger to avoid console output during tests
const mockLogger = {
  info: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
  debug: mock(() => {}),
};

// In bun:test, we'll use simpler mocking approaches
// Mock the custom migrator
const mockRunPluginMigrations = mock(() => Promise.resolve());

// For this test, we'll spy on the actual logger rather than mock the entire module

describe('DatabaseMigrationService', () => {
  let migrationService: DatabaseMigrationService;
  let mockDb: any;

  beforeEach(() => {
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockLogger.debug.mockClear();
    mockRunPluginMigrations.mockClear();

    // Create mock database
    mockDb = {
      query: {
        agentTable: { findFirst: mock(() => {}) },
        entityTable: { findFirst: mock(() => {}) },
        memoryTable: { findFirst: mock(() => {}) },
      },
      transaction: mock(() => {}),
      execute: mock(() => Promise.resolve({ rows: [] })),
      session: {
        client: {
          query: mock(() => Promise.resolve({ rows: [{ acquired: true }] })),
        },
      },
    };

    migrationService = new DatabaseMigrationService();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(migrationService).toBeDefined();
      expect(migrationService).toBeInstanceOf(DatabaseMigrationService);
    });
  });

  describe('initializeWithDatabase', () => {
    it('should initialize with database', async () => {
      await migrationService.initializeWithDatabase(mockDb);

      // In bun:test we focus on state rather than log assertions
      expect((migrationService as any).db).toBe(mockDb);
    });
  });

  describe('discoverAndRegisterPluginSchemas', () => {
    it('should register plugins with schemas', () => {
      const plugins: Plugin[] = [
        {
          name: 'plugin1',
          description: 'Test plugin 1',
          schema: { table1: {} },
        },
        {
          name: 'plugin2',
          description: 'Test plugin 2',
          schema: { table2: {} },
        },
        {
          name: 'plugin3',
          description: 'Plugin without schema',
        },
      ];

      migrationService.discoverAndRegisterPluginSchemas(plugins);
    });

    it('should handle empty plugin array', () => {
      migrationService.discoverAndRegisterPluginSchemas([]);
    });

    it('should handle plugins without schemas', () => {
      const plugins: Plugin[] = [
        {
          name: 'plugin1',
          description: 'Plugin without schema',
        },
        {
          name: 'plugin2',
          description: 'Another plugin without schema',
        },
      ];

      migrationService.discoverAndRegisterPluginSchemas(plugins);
    });
  });

  describe('runAllPluginMigrations', () => {
    it('should throw if database not initialized', async () => {
      await expect(migrationService.runAllPluginMigrations()).rejects.toThrow(
        'Database not initialized in DatabaseMigrationService'
      );
    });

    it('should run migrations for registered plugins', async () => {
      // Initialize database
      await migrationService.initializeWithDatabase(mockDb);

      // Register plugins
      const plugins: Plugin[] = [
        {
          name: 'plugin1',
          description: 'Test plugin 1',
          schema: { table1: {} },
        },
        {
          name: 'plugin2',
          description: 'Test plugin 2',
          schema: { table2: {} },
        },
      ];

      migrationService.discoverAndRegisterPluginSchemas(plugins);

      // Simply await - if it throws, the test fails automatically
      await migrationService.runAllPluginMigrations();
    });

    it('should handle migration errors', async () => {
      // Initialize database
      await migrationService.initializeWithDatabase(mockDb);

      // Register a plugin
      migrationService.discoverAndRegisterPluginSchemas([
        {
          name: 'error-plugin',
          description: 'Test plugin',
          schema: { tables: {} },
        },
      ]);

      // Simply await - if it throws, the test fails automatically
      await migrationService.runAllPluginMigrations();
    });

    it('should run migrations even with no plugins', async () => {
      // Initialize database
      await migrationService.initializeWithDatabase(mockDb);

      // Don't register any plugins

      // Run migrations
      await migrationService.runAllPluginMigrations();
    });
  });

  describe('advisory locking', () => {
    it('should track migration status during execution', async () => {
      await migrationService.initializeWithDatabase(mockDb);

      // Initially should be idle
      expect(migrationService.getMigrationStatus().status).toBe('idle');

      // Register a plugin
      migrationService.discoverAndRegisterPluginSchemas([
        {
          name: 'test-plugin',
          description: 'Test plugin',
          schema: { table: {} },
        },
      ]);

      // Run migrations
      await migrationService.runAllPluginMigrations();

      // After successful migration, should be completed
      expect(migrationService.getMigrationStatus().status).toBe('completed');
    });

    it('should prevent concurrent migrations', async () => {
      await migrationService.initializeWithDatabase(mockDb);

      // Register a plugin
      migrationService.discoverAndRegisterPluginSchemas([
        {
          name: 'test-plugin',
          description: 'Test plugin',
          schema: { table: {} },
        },
      ]);

      // Start first migration (but don't await it immediately)
      const firstMigration = migrationService.runAllPluginMigrations();

      // Check that status is running
      expect(migrationService.getMigrationStatus().status).toBe('running');

      // Try to start second migration - should skip
      await migrationService.runAllPluginMigrations();

      // Wait for first migration to complete
      await firstMigration;

      // Should be completed
      expect(migrationService.getMigrationStatus().status).toBe('completed');
    });

    it('should handle advisory lock acquisition', async () => {
      // Mock successful lock acquisition
      mockDb.session.client.query.mockResolvedValueOnce({ rows: [{ acquired: true }] });

      await migrationService.initializeWithDatabase(mockDb);

      migrationService.discoverAndRegisterPluginSchemas([
        {
          name: 'test-plugin',
          description: 'Test plugin',
          schema: { table: {} },
        },
      ]);

      await migrationService.runAllPluginMigrations();

      // Verify lock was attempted
      expect(mockDb.session.client.query).toHaveBeenCalledWith(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [7654321]
      );
    });

    it('should handle advisory lock wait when lock not immediately available', async () => {
      // Mock lock not available initially, then successful wait
      mockDb.session.client.query
        .mockResolvedValueOnce({ rows: [{ acquired: false }] }) // try lock fails
        .mockResolvedValueOnce({ rows: [] }); // wait lock succeeds

      await migrationService.initializeWithDatabase(mockDb);

      migrationService.discoverAndRegisterPluginSchemas([
        {
          name: 'test-plugin',
          description: 'Test plugin',
          schema: { table: {} },
        },
      ]);

      await migrationService.runAllPluginMigrations();

      // Verify both try and wait were called
      expect(mockDb.session.client.query).toHaveBeenCalledWith(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [7654321]
      );
      expect(mockDb.session.client.query).toHaveBeenCalledWith('SELECT pg_advisory_lock($1)', [
        7654321,
      ]);
    });

    it('should handle databases without advisory lock support', async () => {
      // Mock database without advisory lock support
      const mockDbNoLock = {
        execute: mock(() =>
          Promise.reject(new Error('Function pg_try_advisory_lock does not exist'))
        ),
      };

      await migrationService.initializeWithDatabase(mockDbNoLock);

      migrationService.discoverAndRegisterPluginSchemas([
        {
          name: 'test-plugin',
          description: 'Test plugin',
          schema: { table: {} },
        },
      ]);

      // Should proceed without error even if advisory locking is not supported
      await migrationService.runAllPluginMigrations();
      expect(migrationService.getMigrationStatus().status).toBe('completed');
    });
  });
});
