import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { fileOperationAction } from '../../actions/file-action';
import { createMockRuntime, createMockMemory, createMockState } from '../utils/mock-runtime';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import * as fs from 'fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'os';

// Mock fs module
mock.module('fs/promises', () => ({
  readFile: mock(),
  writeFile: mock(),
  readdir: mock(),
  stat: mock(),
  mkdir: mock(),
  rm: mock(),
  access: mock(),
  copyFile: mock(),
}));

describe('fileOperationAction', () => {
  let mockRuntime: IAgentRuntime;
  let mockMemory: Memory;
  let mockState: State;
  let mockCallback: any;
  let testDir: string;

  beforeEach(() => {
    mock.restore();
    testDir = path.join(tmpdir(), 'test-file-operations');
    mockRuntime = createMockRuntime({
      settings: {
        ALLOWED_DIRECTORIES: JSON.stringify([testDir]),
        MAX_FILE_SIZE: '1048576', // 1MB
      },
    });
    mockCallback = mock();
    mockState = createMockState();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('validate', () => {
    it('should return true for valid file operation requests', async () => {
      mockMemory = createMockMemory({
        content: {
          text: 'Read the file config.json',
          source: 'test',
        },
      });

      const result = await fileOperationAction.validate(mockRuntime, mockMemory, mockState);
      expect(result).toBe(true);
    });

    it('should return true for directory listing requests', async () => {
      mockMemory = createMockMemory({
        content: {
          text: 'List files in the current directory',
          source: 'test',
        },
      });

      const result = await fileOperationAction.validate(mockRuntime, mockMemory, mockState);
      expect(result).toBe(true);
    });

    it('should return false for non-file related requests', async () => {
      mockMemory = createMockMemory({
        content: {
          text: 'What is the weather today?',
          source: 'test',
        },
      });

      const result = await fileOperationAction.validate(mockRuntime, mockMemory, mockState);
      expect(result).toBe(false);
    });

    it('should return false for empty messages', async () => {
      mockMemory = createMockMemory({
        content: {
          text: '',
          source: 'test',
        },
      });

      const result = await fileOperationAction.validate(mockRuntime, mockMemory, mockState);
      expect(result).toBe(false);
    });
  });

  describe('handler - read operations', () => {
    it('should read file content successfully', async () => {
      const mockFileContent = 'This is test file content';
      (fs.readFile as any).mockResolvedValueOnce(mockFileContent);
      (fs.stat as any).mockResolvedValueOnce({ size: 100 } as any);

      mockMemory = createMockMemory({
        content: {
          text: `Read file ${path.join(testDir, 'test.txt')}`,
          source: 'test',
        },
      });

      await fileOperationAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(fs.readFile).toHaveBeenCalledWith(path.join(testDir, 'test.txt'), 'utf-8');
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('File content'),
          thought: expect.stringContaining('read'),
          actions: ['FILE_OPERATION'],
        })
      );
    });

    it('should list directory contents successfully', async () => {
      const mockFiles = ['file1.txt', 'file2.json', 'subdirectory'];
      (fs.readdir as any).mockResolvedValueOnce(mockFiles as any);
      (fs.stat as any)
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true } as any)
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true } as any)
        .mockResolvedValueOnce({ isDirectory: () => true, isFile: () => false } as any);

      mockMemory = createMockMemory({
        content: {
          text: `List files in ${testDir}`,
          source: 'test',
        },
      });

      await fileOperationAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(fs.readdir).toHaveBeenCalledWith(testDir);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Directory contents'),
          thought: expect.stringContaining('listed'),
          actions: ['FILE_OPERATION'],
        })
      );
    });

    it('should handle file not found errors', async () => {
      (fs.readFile as any).mockRejectedValueOnce(
        Object.assign(new Error('File not found'), { code: 'ENOENT' })
      );

      mockMemory = createMockMemory({
        content: {
          text: `Read file ${path.join(testDir, 'nonexistent.txt')}`,
          source: 'test',
        },
      });

      await fileOperationAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('not found'),
          thought: expect.stringContaining('error'),
          actions: ['FILE_OPERATION'],
        })
      );
    });

    it('should handle permission denied errors', async () => {
      (fs.readFile as any).mockRejectedValueOnce(
        Object.assign(new Error('Permission denied'), { code: 'EACCES' })
      );

      mockMemory = createMockMemory({
        content: {
          text: `Read file ${path.join(testDir, 'restricted.txt')}`,
          source: 'test',
        },
      });

      await fileOperationAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Permission denied'),
          thought: expect.stringContaining('error'),
          actions: ['FILE_OPERATION'],
        })
      );
    });
  });

  describe('handler - write operations', () => {
    it('should write file content successfully', async () => {
      (fs.writeFile as any).mockResolvedValueOnce(undefined);
      (fs.mkdir as any).mockResolvedValueOnce(undefined);

      mockMemory = createMockMemory({
        content: {
          text: `Write "Hello World" to file ${path.join(testDir, 'output.txt')}`,
          source: 'test',
        },
      });

      await fileOperationAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(testDir, 'output.txt'),
        'Hello World',
        'utf-8'
      );
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('File written'),
          thought: expect.stringContaining('wrote'),
          actions: ['FILE_OPERATION'],
        })
      );
    });

    it('should create directories if they do not exist', async () => {
      (fs.writeFile as any).mockResolvedValueOnce(undefined);
      (fs.mkdir as any).mockResolvedValueOnce(undefined);

      const nestedPath = path.join(testDir, 'nested', 'dir', 'file.txt');
      mockMemory = createMockMemory({
        content: {
          text: `Write "content" to file ${nestedPath}`,
          source: 'test',
        },
      });

      await fileOperationAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(fs.mkdir).toHaveBeenCalledWith(path.dirname(nestedPath), { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(nestedPath, 'content', 'utf-8');
    });

    it('should handle write permission errors', async () => {
      (fs.writeFile as any).mockRejectedValueOnce(
        Object.assign(new Error('Permission denied'), { code: 'EACCES' })
      );
      (fs.mkdir as any).mockResolvedValueOnce(undefined);

      mockMemory = createMockMemory({
        content: {
          text: `Write "content" to file ${path.join(testDir, 'readonly.txt')}`,
          source: 'test',
        },
      });

      await fileOperationAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Permission denied'),
          thought: expect.stringContaining('error'),
          actions: ['FILE_OPERATION'],
        })
      );
    });
  });

  describe('security validations', () => {
    it('should prevent directory traversal attacks', async () => {
      const maliciousPath = path.join(testDir, '..', '..', 'etc', 'passwd');
      mockMemory = createMockMemory({
        content: {
          text: `Read file ${maliciousPath}`,
          source: 'test',
        },
      });

      await fileOperationAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('not allowed'),
          thought: expect.stringContaining('security'),
          actions: ['FILE_OPERATION'],
        })
      );
    });

    it('should enforce file size limits', async () => {
      const largeFileSize = 2 * 1024 * 1024; // 2MB (exceeds 1MB limit)
      (fs.stat as any).mockResolvedValueOnce({ size: largeFileSize } as any);

      mockMemory = createMockMemory({
        content: {
          text: `Read file ${path.join(testDir, 'large.txt')}`,
          source: 'test',
        },
      });

      await fileOperationAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('too large'),
          thought: expect.stringContaining('size limit'),
          actions: ['FILE_OPERATION'],
        })
      );
    });

    it('should prevent access to system files', async () => {
      const systemFile = '/etc/passwd';
      mockMemory = createMockMemory({
        content: {
          text: `Read file ${systemFile}`,
          source: 'test',
        },
      });

      await fileOperationAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('not allowed'),
          thought: expect.stringContaining('security'),
          actions: ['FILE_OPERATION'],
        })
      );
    });

    it('should validate allowed directories', async () => {
      const unauthorizedDir = '/tmp/unauthorized';
      mockMemory = createMockMemory({
        content: {
          text: `Read file ${path.join(unauthorizedDir, 'test.txt')}`,
          source: 'test',
        },
      });

      await fileOperationAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('not allowed'),
          thought: expect.stringContaining('security'),
          actions: ['FILE_OPERATION'],
        })
      );
    });
  });

  describe('action structure', () => {
    it('should have correct action metadata', () => {
      expect(fileOperationAction.name).toBe('FILE_OPERATION');
      expect(fileOperationAction.similes).toContain('READ_FILE');
      expect(fileOperationAction.similes).toContain('WRITE_FILE');
      expect(fileOperationAction.description).toContain('file operations');
      expect(typeof fileOperationAction.validate).toBe('function');
      expect(typeof fileOperationAction.handler).toBe('function');
      expect(Array.isArray(fileOperationAction.examples)).toBe(true);
    });

    it('should have valid examples', () => {
      expect(fileOperationAction.examples!.length).toBeGreaterThan(0);

      fileOperationAction.examples!.forEach((example) => {
        expect(Array.isArray(example)).toBe(true);
        expect(example.length).toBeGreaterThanOrEqual(2);

        example.forEach((turn) => {
          expect(turn).toHaveProperty('name');
          expect(turn).toHaveProperty('content');
          expect(typeof turn.content).toBe('object');
        });
      });
    });
  });
});
