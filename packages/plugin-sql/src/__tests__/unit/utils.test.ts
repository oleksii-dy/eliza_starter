import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';
import { expandTildePath, resolveEnvFile, resolvePgliteDir } from '../../utils';
import * as path from 'path';
import * as os from 'os';

describe('Utils', () => {
  describe('expandTildePath', () => {
    it('should expand paths starting with ~', () => {
      const result = expandTildePath('~/test/path');
      expect(result).toBe(path.join(process.cwd(), 'test/path'));
    });

    it('should return unchanged paths not starting with ~', () => {
      const result = expandTildePath('/absolute/path');
      expect(result).toBe('/absolute/path');
    });

    it('should handle empty strings', () => {
      const result = expandTildePath('');
      expect(result).toBe('');
    });

    it('should handle just tilde', () => {
      const result = expandTildePath('~');
      expect(result).toBe(process.cwd());
    });
  });

  describe('resolveEnvFile', () => {
    it('should find .env in current directory if it exists', () => {
      // This test will work with actual file system
      const result = resolveEnvFile();
      expect(result).toMatch(/\.env$/);
    });

    it('should return .env path even if not found', () => {
      const testDir = '/some/nonexistent/path';
      const result = resolveEnvFile(testDir);
      expect(result).toBe(path.join(testDir, '.env'));
    });
  });

  describe('resolvePgliteDir', () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.PGLITE_DATA_DIR;
      delete process.env.PGLITE_DATA_DIR;
      mock.restore();
    });

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.PGLITE_DATA_DIR;
      } else {
        process.env.PGLITE_DATA_DIR = originalEnv;
      }
    });

    it('should prioritize dir argument', () => {
      const result = resolvePgliteDir('/custom/dir');
      expect(result).toBe('/custom/dir');
    });

    it('should use PGLITE_DATA_DIR env var if no dir provided', () => {
      process.env.PGLITE_DATA_DIR = '/env/pglite/dir';
      const result = resolvePgliteDir();
      expect(result).toBe('/env/pglite/dir');
    });

    it('should handle memory directive from environment', () => {
      // Test the actual behavior in test environment with :memory:
      process.env.PGLITE_DATA_DIR = ':memory:';
      const result = resolvePgliteDir();
      expect(result).toBe(':memory:');
    });

    it('should handle absolute paths correctly', () => {
      const testPath = '/absolute/test/path';
      const result = resolvePgliteDir(testPath);
      expect(result).toBe(testPath);
    });

    it('should expand tilde paths', () => {
      const result = resolvePgliteDir('~/data/pglite');
      expect(result).toBe(path.join(process.cwd(), 'data/pglite'));
    });
  });
});
