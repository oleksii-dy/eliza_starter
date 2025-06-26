/**
 * Unit tests for utility functions
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { expandTildePath, resolvePgliteDir } from '../index';
import path from 'node:path';

describe('Utility Functions', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.PGLITE_DATA_DIR;
  });

  describe('expandTildePath', () => {
    it('should expand tilde path to current working directory', () => {
      const input = '~/test/path';
      const expected = path.join(process.cwd(), 'test/path');

      const result = expandTildePath(input);

      expect(result).toBe(expected);
    });

    it('should return absolute path unchanged', () => {
      const input = '/absolute/path/test';

      const result = expandTildePath(input);

      expect(result).toBe(input);
    });

    it('should return relative path unchanged', () => {
      const input = 'relative/path/test';

      const result = expandTildePath(input);

      expect(result).toBe(input);
    });

    it('should handle empty string', () => {
      const input = '';

      const result = expandTildePath(input);

      expect(result).toBe('');
    });

    it('should handle null/undefined input', () => {
      const result1 = expandTildePath(null as any);
      const result2 = expandTildePath(undefined as any);

      expect(result1).toBeNull();
      expect(result2).toBeUndefined();
    });

    it('should handle tilde at root', () => {
      const input = '~';
      const expected = process.cwd();

      const result = expandTildePath(input);

      expect(result).toBe(expected);
    });

    it('should handle tilde with slash', () => {
      const input = '~/';
      const expected = process.cwd();

      const result = expandTildePath(input);

      expect(result).toBe(expected);
    });
  });

  describe('resolvePgliteDir', () => {
    it('should use provided directory', () => {
      const customDir = '/custom/data/dir';

      const result = resolvePgliteDir(customDir);

      expect(result).toBe(customDir);
    });

    it('should use environment variable when no dir provided', () => {
      const originalEnv = process.env.PGLITE_DATA_DIR;
      const envDir = '/env/data/dir';
      process.env.PGLITE_DATA_DIR = envDir;

      const result = resolvePgliteDir();

      expect(result).toBe(envDir);

      // Restore original env
      if (originalEnv !== undefined) {
        process.env.PGLITE_DATA_DIR = originalEnv;
      } else {
        delete process.env.PGLITE_DATA_DIR;
      }
    });

    it('should expand tilde paths', () => {
      const tildeDir = '~/custom/data';
      const expected = path.join(process.cwd(), 'custom/data');

      const result = resolvePgliteDir(tildeDir);

      expect(result).toBe(expected);
    });

    it('should migrate legacy path automatically', () => {
      const originalEnv = process.env.PGLITE_DATA_DIR;
      const legacyPath = path.join(process.cwd(), '.elizadb');
      const expectedNewPath = path.join(process.cwd(), '.eliza', '.elizadb');

      const result = resolvePgliteDir(legacyPath);

      expect(result).toBe(expectedNewPath);
      expect(process.env.PGLITE_DATA_DIR).toBe(expectedNewPath);

      // Restore original env
      if (originalEnv !== undefined) {
        process.env.PGLITE_DATA_DIR = originalEnv;
      } else {
        delete process.env.PGLITE_DATA_DIR;
      }
    });

    it('should prefer explicit dir over environment variable', () => {
      const originalEnv = process.env.PGLITE_DATA_DIR;
      const explicitDir = '/explicit/dir';
      process.env.PGLITE_DATA_DIR = '/env/dir';

      const result = resolvePgliteDir(explicitDir);

      expect(result).toBe(explicitDir);

      // Restore original env
      if (originalEnv !== undefined) {
        process.env.PGLITE_DATA_DIR = originalEnv;
      } else {
        delete process.env.PGLITE_DATA_DIR;
      }
    });

    it('should prefer environment variable over fallback', () => {
      const originalEnv = process.env.PGLITE_DATA_DIR;
      const envDir = '/env/dir';
      const fallbackDir = '/fallback/dir';
      process.env.PGLITE_DATA_DIR = envDir;

      const result = resolvePgliteDir(undefined, fallbackDir);

      expect(result).toBe(envDir);

      // Restore original env
      if (originalEnv !== undefined) {
        process.env.PGLITE_DATA_DIR = originalEnv;
      } else {
        delete process.env.PGLITE_DATA_DIR;
      }
    });

    it('should handle empty string inputs', () => {
      // When empty string is provided, resolvePgliteDir falls back to environment/default path
      // since it's not a valid directory path
      const result = resolvePgliteDir('');

      // The result should be a valid path, not empty string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should return a valid path when no options provided', () => {
      // This test just verifies the function returns a valid path
      // The exact path may vary based on environment and path-manager behavior
      const result = resolvePgliteDir();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  describe('Path Security', () => {
    it('should handle path traversal attempts in expandTildePath', () => {
      const maliciousInput = '~/../../../etc/passwd';
      const result = expandTildePath(maliciousInput);

      // Should still expand but the result shows the traversal attempt
      expect(result).toBe(path.join(process.cwd(), '../../../etc/passwd'));

      // In a real application, you'd want additional validation
      // to prevent such paths from being used
    });

    it('should handle various tilde variations', () => {
      const inputs = [
        { input: '~user/path', expected: path.join(process.cwd(), 'user/path') }, // Tilde gets expanded
        { input: '~~', expected: '~~' }, // Double tilde - not expanded since doesn't start with ~/
        { input: 'not~tilde', expected: 'not~tilde' }, // Tilde not at start
      ];

      inputs.forEach(({ input, expected }) => {
        const result = expandTildePath(input);
        expect(result).toBe(expected);
      });
    });
  });
});
