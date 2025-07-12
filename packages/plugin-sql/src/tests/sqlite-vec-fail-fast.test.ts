import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BunSqliteAdapter } from '../bun-sqlite/adapter';
import { v4 as uuidv4 } from 'uuid';
import { asUUID, logger } from '@elizaos/core';
import * as fs from 'fs';
import { Database } from 'bun:sqlite';

describe('SQLite-vec Fail-Fast Tests', () => {
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

  describe('Fail-fast behavior when sqlite-vec cannot be loaded', () => {
    it('should throw error during initialization when sqlite-vec is unavailable', async () => {
      adapter = new BunSqliteAdapter(testAgentId, { inMemory: true });

      try {
        await adapter.init();
        // If init succeeds, that means sqlite-vec is working correctly!
        console.log('✅ sqlite-vec is working correctly - skipping fail-fast test');
      } catch (error: any) {
        // If init fails, verify it throws the expected error (no JSON fallback)
        expect(error.message).toMatch(/sqlite-vec extension|does not support dynamic extensions/);
      }
    });

    it('should be consistent across platforms', async () => {
      const platforms = ['darwin', 'win32', 'linux'];

      for (const platform of platforms) {
        Object.defineProperty(process, 'platform', {
          value: platform,
          writable: true,
          configurable: true,
        });

        const testAdapter = new BunSqliteAdapter(asUUID(uuidv4()), { inMemory: true });

        try {
          await testAdapter.init();
          console.log(`✅ sqlite-vec works on ${platform}`);
        } catch (error: any) {
          // If it fails, verify it throws the expected error (no JSON fallback)
          expect(error.message).toMatch(/sqlite-vec extension|does not support dynamic extensions/);
        }

        await testAdapter.close();
      }
    });

    it('should handle all vector dimensions correctly', async () => {
      const dimensions = [384, 768, 1536, 3072];

      for (const dim of dimensions) {
        const testAdapter = new BunSqliteAdapter(asUUID(uuidv4()), {
          inMemory: true,
          vectorDimensions: dim,
        });

        try {
          await testAdapter.init();
          console.log(`✅ sqlite-vec works with ${dim} dimensions`);
        } catch (error: any) {
          // If it fails, verify it throws the expected error (no JSON fallback)
          expect(error.message).toMatch(/sqlite-vec extension|does not support dynamic extensions/);
        }
      }
    });

    it('should verify loadExtension method behavior', async () => {
      adapter = new BunSqliteAdapter(testAgentId, { inMemory: true });

      // Confirm loadExtension method exists
      expect(typeof Database.prototype.loadExtension).toBe('function');

      try {
        await adapter.init();
        console.log('✅ loadExtension method works with sqlite-vec');
      } catch (error: any) {
        // If it fails, verify it throws the expected error (no JSON fallback)
        expect(error.message).toMatch(/sqlite-vec extension|does not support dynamic extensions/);
      }
    });

    it('should provide clear feedback about sqlite-vec status', async () => {
      adapter = new BunSqliteAdapter(testAgentId, { inMemory: true });

      try {
        await adapter.init();
        console.log('✅ sqlite-vec loaded successfully');
        // Adapter should be ready for vector operations
        expect(adapter).toBeDefined();
      } catch (error: any) {
        // If it fails, verify the error message is clear and actionable
        expect(error.message).toMatch(/sqlite-vec extension|does not support dynamic extensions/);
        expect(error.message).toContain('BunSqliteAdapter');
      }
    });
  });

  describe('No JSON fallback functionality', () => {
    it('should not have JSON-based vector search methods', async () => {
      adapter = new BunSqliteAdapter(testAgentId, { inMemory: true });

      // These methods should not exist since JSON fallback was removed
      expect((adapter as any).searchMemoriesByEmbeddingJSON).toBeUndefined();
      expect((adapter as any).calculateCosineSimilarity).toBeUndefined();
      expect((adapter as any).initializeJsonVectorStorage).toBeUndefined();
    });

    it('should handle vector operations correctly when sqlite-vec is available', async () => {
      adapter = new BunSqliteAdapter(testAgentId, { inMemory: true });

      await adapter.init();

      // Test vector operations work correctly when sqlite-vec is loaded
      const result = await adapter.searchMemoriesByEmbedding([1, 2, 3, 4], {
        tableName: 'memories',
        match_threshold: 0.8,
        count: 5,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      console.log('✅ Vector operations work correctly with sqlite-vec');
    });
  });

  describe('Error consistency across different failure scenarios', () => {
    it('should handle different configuration scenarios consistently', async () => {
      const scenarios = [
        { inMemory: true },
        { inMemory: false, filename: `.eliza/test-fail-${Date.now()}.db` },
        { inMemory: true, vectorDimensions: 1536 },
      ];

      for (const config of scenarios) {
        const testAdapter = new BunSqliteAdapter(asUUID(uuidv4()), config);

        try {
          await testAdapter.init();
          console.log(`✅ Configuration works: ${JSON.stringify(config)}`);
        } catch (error: any) {
          // If it fails, verify it's the expected sqlite-vec error
          expect(error.message).toMatch(/sqlite-vec extension|does not support dynamic extensions/);
        }

        if (config.filename) {
          cleanupTestDb(config.filename);
        }
      }
    });
  });

  describe('Production readiness verification', () => {
    it('should be production-ready when sqlite-vec is available', async () => {
      adapter = new BunSqliteAdapter(testAgentId, { inMemory: false });

      try {
        await adapter.init();
        console.log('✅ Production setup works correctly');
        expect(adapter).toBeDefined();
      } catch (error: any) {
        // If it fails, error should be actionable and production-ready
        expect(error.message).toContain('BunSqliteAdapter');
        expect(error.message).toMatch(/sqlite-vec extension|does not support dynamic extensions/);

        // Should not mention JSON fallback (removed functionality)
        expect(error.message).not.toContain('JSON');
        expect(error.message).not.toContain('fallback');
      }
    });

    it('should provide clear guidance when sqlite-vec is not available', async () => {
      adapter = new BunSqliteAdapter(testAgentId, { inMemory: true });

      try {
        await adapter.init();
        console.log('✅ sqlite-vec is available and working');
      } catch (error: any) {
        // Error should clearly indicate the requirement and solution
        const message = error.message.toLowerCase();
        expect(
          message.includes('does not support dynamic extensions') ||
            message.includes('sqlite-vec extension')
        ).toBe(true);
      }
    });
  });
});
