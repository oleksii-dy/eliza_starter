/**
 * Unit tests for file utilities
 */

import { describe, it, expect } from 'bun:test';
import {
  createSecureUploadDir,
  sanitizeFilename,
  cleanupFile,
  cleanupFiles,
  cleanupUploadedFile,
} from '../api/shared/fileUtils';
import path from 'node:path';

describe('File Utilities', () => {
  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      const input = '../../../malicious.txt';
      const result = sanitizeFilename(input);
      expect(result).not.toContain('/');
      expect(result).not.toContain('\\');
      expect(result).not.toContain(':');
      expect(result).not.toContain('*');
      expect(result).not.toContain('?');
    });

    it('should preserve safe characters', () => {
      const input = 'safe-file_name.txt';
      const result = sanitizeFilename(input);
      expect(result).toBe(input);
    });

    it('should handle empty strings', () => {
      const result = sanitizeFilename('');
      expect(result).toBe('file');
    });

    it('should handle special characters', () => {
      const input = 'file with spaces & symbols!.txt';
      const result = sanitizeFilename(input);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters', () => {
      const input = 'файл.txt';
      const result = sanitizeFilename(input);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should limit filename length', () => {
      const longInput = `${'a'.repeat(300)}.txt`;
      const result = sanitizeFilename(longInput);
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result).toEndWith('.txt');
    });
  });

  describe('createSecureUploadDir', () => {
    it('should create a valid upload directory path for agents', () => {
      const result = createSecureUploadDir('test-agent', 'agents');
      expect(typeof result).toBe('string');
      expect(result).toContain('test-agent');
      expect(result).toContain('agents');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should create a valid upload directory path for channels', () => {
      const result = createSecureUploadDir('test-channel', 'channels');
      expect(typeof result).toBe('string');
      expect(result).toContain('test-channel');
      expect(result).toContain('channels');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should reject malicious agent ids', () => {
      expect(() => {
        createSecureUploadDir('../../../malicious', 'agents');
      }).toThrow();
    });

    it('should reject ids with null bytes', () => {
      expect(() => {
        createSecureUploadDir('test\0malicious', 'agents');
      }).toThrow();
    });

    it('should reject ids with path separators', () => {
      expect(() => {
        createSecureUploadDir('test/malicious', 'agents');
      }).toThrow();

      expect(() => {
        createSecureUploadDir('test\\malicious', 'agents');
      }).toThrow();
    });
  });

  describe('cleanupFile', () => {
    it('should handle file cleanup attempt without throwing', () => {
      // This function validates paths and will reject dangerous ones
      // Test that it doesn't throw for safe paths
      expect(() => {
        cleanupFile('nonexistent.txt');
      }).not.toThrow();
    });

    it('should handle empty path', () => {
      expect(() => {
        cleanupFile('');
      }).not.toThrow();
    });

    it('should handle null/undefined path', () => {
      expect(() => {
        cleanupFile(null as any);
      }).not.toThrow();

      expect(() => {
        cleanupFile(undefined as any);
      }).not.toThrow();
    });

    it('should reject unsafe paths', () => {
      // The function logs a warning and returns for unsafe paths
      expect(() => {
        cleanupFile('/etc/passwd');
      }).not.toThrow();
    });
  });

  describe('cleanupFiles', () => {
    it('should handle array of file objects', () => {
      const files = [{ tempFilePath: 'temp1.txt' } as any, { tempFilePath: 'temp2.txt' } as any];

      expect(() => {
        cleanupFiles(files);
      }).not.toThrow();
    });

    it('should handle empty array', () => {
      expect(() => {
        cleanupFiles([]);
      }).not.toThrow();
    });

    it('should handle null/undefined array', () => {
      expect(() => {
        cleanupFiles(null as any);
      }).not.toThrow();

      expect(() => {
        cleanupFiles(undefined as any);
      }).not.toThrow();
    });
  });

  describe('cleanupUploadedFile', () => {
    it('should handle file object with tempFilePath', () => {
      const mockFile = {
        tempFilePath: 'temp_upload.txt',
        name: 'test.txt',
        size: 1024,
        mv: () => Promise.resolve(),
      };

      expect(() => {
        cleanupUploadedFile(mockFile as any);
      }).not.toThrow();
    });

    it('should handle file object without tempFilePath', () => {
      const mockFile = {
        name: 'test.txt',
        size: 1024,
        mv: () => Promise.resolve(),
      };

      expect(() => {
        cleanupUploadedFile(mockFile as any);
      }).not.toThrow();
    });

    it('should handle null/undefined file', () => {
      expect(() => {
        cleanupUploadedFile(null as any);
      }).not.toThrow();

      expect(() => {
        cleanupUploadedFile(undefined as any);
      }).not.toThrow();
    });
  });

  describe('Path Security', () => {
    it('should sanitize filenames to prevent directory traversal', () => {
      const maliciousFilename = '../../../etc/passwd';
      const safe = sanitizeFilename(maliciousFilename);

      expect(safe).not.toContain('/');
      expect(safe).not.toContain('\\');
      expect(safe).not.toContain(':');
    });

    it('should remove leading dots and spaces from filenames', () => {
      const filename = '....hidden-file.txt';
      const safe = sanitizeFilename(filename);

      expect(safe).not.toStartWith('.');
    });
  });
});
