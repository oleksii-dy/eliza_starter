import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { dev } from '../../src/commands/dev';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock dependencies
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  log: vi.fn(),
  spinner: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    text: '',
  }),
};

const mockWatcher = {
  on: vi.fn().mockReturnThis(),
  close: vi.fn(),
};

const mockMergeStreams = vi.fn();
const mockExeca = vi.fn();

vi.mock('@elizaos/core', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    log: vi.fn(),
    spinner: () => ({
      start: vi.fn(),
      stop: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
      text: '',
    }),
  },
}));

vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn(),
  })),
}));

vi.mock('@sindresorhus/merge-streams', () => ({
  default: vi.fn(),
}));

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

vi.mock('../../src/utils', () => ({
  displayBanner: vi.fn(),
  handleError: vi.fn().mockImplementation((error) => {
    throw error instanceof Error ? error : new Error(String(error));
  }),
  UserEnvironment: {
    getInstance: vi.fn().mockReturnValue({
      getInfo: vi.fn().mockResolvedValue({
        paths: {
          elizaDir: '/mock/.eliza',
          envFilePath: '/mock/.env',
        },
      }),
    }),
  },
}));

beforeEach(async () => {
  // Get the mocked modules after mocking
  const { logger } = await import('@elizaos/core');
  const chokidar = await import('chokidar');
  const mergeStreams = await import('@sindresorhus/merge-streams');
  const { execa } = await import('execa');
  
  Object.assign(mockLogger, logger);
  Object.assign(mockMergeStreams, (mergeStreams as any).default);
  Object.assign(mockExeca, execa);
  
  // Setup default mock return values
  chokidar.watch.mockReturnValue(mockWatcher);
  mockMergeStreams.mockReturnValue({
    pipe: vi.fn(),
  });
  
  // Mock execa to return a child process-like object
  mockExeca.mockReturnValue({
    stdout: { pipe: vi.fn() },
    stderr: { pipe: vi.fn() },
    kill: vi.fn(),
    on: vi.fn(),
  });
});

describe('dev command', () => {
  let tempDir: string;
  let cwdSpy: Mock;
  let processExitSpy: Mock;
  let mockChokidar: any;
  let processOnSpy: any;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dev-test-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    processExitSpy = vi.spyOn(process, 'exit' as any).mockImplementation(() => {
      throw new Error('process.exit called');
    });
    processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Get the mocked chokidar
    mockChokidar = await import('chokidar');
    
    // Setup default mocks
    mockMergeStreams.mockReturnValue({
      pipe: vi.fn(),
    });
    
    // Mock execa to return a child process-like object
    mockExeca.mockReturnValue({
      stdout: { pipe: vi.fn() },
      stderr: { pipe: vi.fn() },
      pid: 1234,
      kill: vi.fn(),
    });
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    processExitSpy.mockRestore();
    processOnSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('development server', () => {
    it('should start dev server with file watching', async () => {
      const chokidar = await import('chokidar');
      
      // Create package.json
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project', scripts: { start: 'node index.js' } })
      );

      await dev.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      // Verify chokidar is watching correct patterns
      expect(chokidar.watch).toHaveBeenCalledWith(
        expect.arrayContaining([
          'src/**/*',
          'package.json',
          'index.js',
          'index.ts',
          '.env',
          'agent/**/*',
          'agents/**/*',
          'characters/**/*',
        ]),
        expect.objectContaining({
          ignoreInitial: true,
          ignored: expect.arrayContaining(['**/node_modules/**', '**/dist/**']),
        })
      );
    });

    it('should restart on file changes', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project', scripts: { start: 'node index.js' } })
      );
      
      await dev.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      // Get the change handler
      const changeHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'change'
      )[1];

      // Trigger a file change
      changeHandler('src/index.ts');

      // Allow debounce to complete
      await new Promise(resolve => setTimeout(resolve, 350));

      // Should have restarted
      expect(mockExeca).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('File changed: src/index.ts')
      );
    });

    it('should handle multiple rapid file changes (debouncing)', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project', scripts: { start: 'node index.js' } })
      );
      
      await dev.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      const changeHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'change'
      )[1];

      // Trigger multiple rapid changes
      changeHandler('file1.ts');
      changeHandler('file2.ts');
      changeHandler('file3.ts');

      // Wait less than debounce time
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should not have restarted yet
      expect(mockExeca).toHaveBeenCalledTimes(1);

      // Wait for debounce to complete
      await new Promise(resolve => setTimeout(resolve, 250));

      // Should have restarted only once
      expect(mockExeca).toHaveBeenCalledTimes(2);
    });

    it('should pass through additional options', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project', scripts: { start: 'node index.js' } })
      );
      
      await dev.parseAsync(['node', 'script', '--port', '8080', '--debug', '--log-level', 'verbose'], { from: 'user' });

      expect(mockExeca).toHaveBeenCalledWith(
        expect.stringContaining('elizaos start'),
        expect.objectContaining({
          env: expect.objectContaining({
            PORT: '8080',
            DEBUG: 'true',
            LOG_LEVEL: 'verbose',
          }),
        })
      );
    });

    it('should handle missing package.json gracefully', async () => {
      // No package.json in temp dir
      await dev.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      // Should still start watching
      expect(mockChokidar.watch).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No package.json found')
      );
    });

    it('should ignore node_modules and dist directories', async () => {
      await dev.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      const watchOptions = mockChokidar.watch.mock.calls[0][1];
      expect(watchOptions.ignored).toContain('**/node_modules/**');
      expect(watchOptions.ignored).toContain('**/dist/**');
    });
  });

  describe('error handling', () => {
    it('should handle server start failure', async () => {
      mockExeca.mockRejectedValueOnce(new Error('Server start failed'));
      
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project', scripts: { start: 'node index.js' } })
      );
      
      await dev.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to start server')
      );
    });

    it('should handle watcher errors', async () => {
      await dev.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      // Get the error handler
      const errorHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      // Trigger an error
      errorHandler(new Error('Watch error'));

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('File watcher error')
      );
    });

    it('should clean up on process exit', async () => {
      await dev.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      // Get SIGINT handler
      const sigintHandler = processOnSpy.mock.calls.find(
        call => call[0] === 'SIGINT'
      )?.[1];

      // Trigger SIGINT
      if (sigintHandler) {
        await sigintHandler();
      }

      expect(mockWatcher.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Shutting down')
      );
    });
  });

  describe('file watching patterns', () => {
    it('should watch TypeScript and JavaScript files', async () => {
      await dev.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      const watchPatterns = mockChokidar.watch.mock.calls[0][0];
      expect(watchPatterns).toContain('src/**/*');
      expect(watchPatterns).toContain('index.js');
      expect(watchPatterns).toContain('index.ts');
    });

    it('should watch agent and character directories', async () => {
      await dev.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      const watchPatterns = mockChokidar.watch.mock.calls[0][0];
      expect(watchPatterns).toContain('agent/**/*');
      expect(watchPatterns).toContain('agents/**/*');
      expect(watchPatterns).toContain('characters/**/*');
    });

    it('should watch configuration files', async () => {
      await dev.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      const watchPatterns = mockChokidar.watch.mock.calls[0][0];
      expect(watchPatterns).toContain('package.json');
      expect(watchPatterns).toContain('.env');
    });

    it('should add custom watch patterns if provided', async () => {
      await dev.parseAsync(['node', 'script', '--port', '3000', '--watch', 'custom/**/*.ts', '--watch', 'data/*.json'], { from: 'user' });

      const watchPatterns = mockChokidar.watch.mock.calls[0][0];
      expect(watchPatterns).toContain('custom/**/*.ts');
      expect(watchPatterns).toContain('data/*.json');
    });
  });

  describe('output handling', () => {
    it('should pipe stdout and stderr', async () => {
      const mockStdout = { pipe: vi.fn() };
      const mockStderr = { pipe: vi.fn() };
      
      mockExeca.mockReturnValue({
        stdout: mockStdout,
        stderr: mockStderr,
        pid: 1234,
        kill: vi.fn(),
      });
      
      await dev.parseAsync(['node', 'script', '--port', '3000'], { from: 'user' });

      expect(mockMergeStreams).toHaveBeenCalledWith([mockStdout, mockStderr]);
    });
  });
});