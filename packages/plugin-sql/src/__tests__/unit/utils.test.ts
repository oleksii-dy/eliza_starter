import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { expandTildePath, resolveEnvFile, resolvePgliteDir } from '../../utils';
import * as path from 'node:path';

// Mock dotenv to prevent loading actual .env file
// In bun:test, module mocking is handled differently, but this test doesn't need it

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
    let originalDotenvConfig: any;

    beforeEach(() => {
      originalEnv = process.env.PGLITE_DATA_DIR;
      delete process.env.PGLITE_DATA_DIR;

      // Mock dotenv.config to prevent it from loading the .env file
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dotenv = require('dotenv');
      originalDotenvConfig = dotenv.config;
      dotenv.config = () => ({ parsed: {} });
    });

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.PGLITE_DATA_DIR;
      } else {
        process.env.PGLITE_DATA_DIR = originalEnv;
      }

      // Restore dotenv
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dotenv = require('dotenv');
      dotenv.config = originalDotenvConfig;
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

    it('should use default .eliza/.elizadb dir if no dir or env var', () => {
      delete process.env.PGLITE_DATA_DIR;
      const result = resolvePgliteDir();
      expect(result).toBe(path.join(process.cwd(), '.eliza', '.elizadb'));
    });

    it('should use default path if no arguments or env var', () => {
      delete process.env.PGLITE_DATA_DIR;
      const result = resolvePgliteDir();
      expect(result).toBe(path.join(process.cwd(), '.eliza', '.elizadb'));
    });

    it('should expand tilde paths', () => {
      const result = resolvePgliteDir('~/data/pglite');
      expect(result).toBe(path.join(process.cwd(), 'data/pglite'));
    });
  });
});
