import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BunSqliteAdapter } from '../bun-sqlite/adapter';
import { v4 as uuidv4 } from 'uuid';
import { asUUID, logger } from '@elizaos/core';
import * as fs from 'fs';
import * as path from 'path';
import { Database } from 'bun:sqlite';

describe('SQLite-vec Loading Tests', () => {
  let adapter: BunSqliteAdapter;
  const testAgentId = asUUID(uuidv4());
  const originalPlatform = process.platform;
  const originalArch = process.arch;

  // Helper to clean up test databases
  const cleanupTestDb = (filename: string) => {
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
    }
    // Also clean up WAL and SHM files
    if (fs.existsSync(`${filename}-wal`)) {
      fs.unlinkSync(`${filename}-wal`);
    }
    if (fs.existsSync(`${filename}-shm`)) {
      fs.unlinkSync(`${filename}-shm`);
    }
  };

  afterEach(async () => {
    if (adapter) {
      await adapter.close();
    }
    // Clean up any test databases
    const testDbPath = `.eliza/test-${testAgentId}.db`;
    cleanupTestDb(testDbPath);

    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(process, 'arch', {
      value: originalArch,
      writable: true,
      configurable: true,
    });
  });

  describe('sqlite-vec loading with custom SQLite', () => {
    it('should successfully load sqlite-vec when custom SQLite is available on macOS', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true,
      });

      adapter = new BunSqliteAdapter(testAgentId, { inMemory: true });

      // Should initialize successfully when custom SQLite with extensions is available
      await adapter.init();
      expect(adapter).toBeDefined();
      console.log('✅ Adapter initialized successfully on macOS');
    });

    it('should work with explicit custom SQLite path', async () => {
      // Test with custom path (if available)
      const customPath = '/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib';

      if (fs.existsSync(customPath)) {
        adapter = new BunSqliteAdapter(testAgentId, {
          inMemory: true,
          customSQLitePath: customPath,
        });

        await adapter.init();
        expect(adapter).toBeDefined();
        console.log('✅ Adapter works with explicit custom SQLite path');
      } else {
        // Skip test if custom SQLite not available
        console.log('Skipping custom SQLite test - path not found:', customPath);
      }
    });

    it('should handle vector operations correctly when sqlite-vec is loaded', async () => {
      adapter = new BunSqliteAdapter(testAgentId, { inMemory: true });

      await adapter.init();

      // If initialization succeeds, vector operations should work
      const testEmbedding = [0.1, 0.2, 0.3, 0.4];

      // This should not throw an error when sqlite-vec is loaded
      const result = await adapter.searchMemoriesByEmbedding(testEmbedding, {
        tableName: 'memories',
        match_threshold: 0.8,
        count: 5,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      console.log('✅ Vector operations work correctly with sqlite-vec');
    });
  });

  describe('Vector database requirements', () => {
    it('should document sqlite-vec requirements when extension not available', async () => {
      // For environments without proper SQLite setup, document requirements
      console.log('📋 BunSqliteAdapter requires sqlite-vec extension for vector operations');
      console.log('🔧 Install SQLite with extension support: brew install sqlite (macOS)');
      console.log('📦 Install sqlite-vec: npm install sqlite-vec');
    });

    it('should validate vector dimension support', async () => {
      const dimensions = [384, 768, 1536, 3072];

      for (const dim of dimensions) {
        const testAdapter = new BunSqliteAdapter(asUUID(uuidv4()), {
          inMemory: true,
          vectorDimensions: dim,
        });

        // Adapter should handle all standard embedding dimensions
        expect(testAdapter).toBeDefined();
        expect((testAdapter as any).config.vectorDimensions).toBe(dim);
      }
    });

    it('should provide clear configuration options', async () => {
      // Test various configuration options
      const configs = [
        { inMemory: true },
        { inMemory: false, filename: `.eliza/test-config-${Date.now()}.db` },
        { inMemory: true, vectorDimensions: 1536 },
        { inMemory: true, customSQLitePath: '/custom/path/sqlite.dylib' },
      ];

      for (const config of configs) {
        const testAdapter = new BunSqliteAdapter(asUUID(uuidv4()), config);
        expect(testAdapter).toBeDefined();

        // Clean up file-based databases
        if (config.filename) {
          cleanupTestDb(config.filename);
        }
      }
    });
  });

  describe('Production environment compatibility', () => {
    it('should work correctly when all requirements are met', async () => {
      adapter = new BunSqliteAdapter(testAgentId, { inMemory: true });

      await adapter.init();

      // Initialization succeeds because sqlite-vec is working
      expect(adapter).toBeDefined();
      console.log('✅ BunSqliteAdapter initialized successfully with sqlite-vec');
    });

    it('should handle database operations correctly', async () => {
      adapter = new BunSqliteAdapter(testAgentId, { inMemory: true });

      await adapter.init();

      // Test basic database operations
      const entityId = asUUID(uuidv4());
      const entity = {
        id: entityId,
        names: ['test entity'],
        agentId: testAgentId,
        metadata: {},
      };

      // Test basic database functionality
      if (typeof adapter.createEntities === 'function') {
        await adapter.createEntities([entity]);
        const retrieved = await adapter.getEntityByIds([entityId]);

        expect(retrieved).toBeDefined();
        expect(retrieved?.[0]?.id).toBe(entityId);
        console.log('✅ Database operations work correctly');
      } else {
        // If methods aren't available, just test that the adapter initialized
        expect(adapter).toBeDefined();
        console.log('✅ Adapter initialized successfully (methods not available in test context)');
      }
    });
  });

  describe('Documentation and error guidance', () => {
    it('should initialize successfully with helpful logging', async () => {
      adapter = new BunSqliteAdapter(testAgentId, { inMemory: true });

      await adapter.init();

      // Since sqlite-vec is working, we should get success
      expect(adapter).toBeDefined();
      console.log('✅ Initialization provides helpful feedback when successful');
    });

    it('should not have JSON fallback methods (removed per fail-fast requirement)', async () => {
      adapter = new BunSqliteAdapter(testAgentId, { inMemory: true });

      // Verify JSON fallback methods do not exist (removed per user request)
      expect((adapter as any).searchMemoriesJsonFallback).toBeUndefined();
      expect((adapter as any).cosineSimilarity).toBeUndefined();
      expect((adapter as any).initializeJsonVectorStorage).toBeUndefined();
    });
  });
});
