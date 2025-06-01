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

const mockChokidar = {
  watch: vi.fn(),
};

const mockMergeStreams = vi.fn();
const mockExeca = vi.fn();

const mockWatcher = {
  on: vi.fn().mockReturnThis(),
  close: vi.fn(),
};

vi.mock('@elizaos/core', () => ({
  logger: mockLogger,
}));

vi.mock('chokidar', () => mockChokidar);

vi.mock('@sindresorhus/merge-streams', () => ({
  default: mockMergeStreams,
}));

vi.mock('execa', () => ({
  execa: mockExeca,
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

describe('dev command', () => {
  let tempDir: string;
  let cwdSpy: Mock;
  let processExitSpy: Mock;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dev-test-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    processExitSpy = vi.spyOn(process, 'exit' as any).mockImplementation(() => {
      throw new Error('process.exit called');
    });
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mocks
    mockChokidar.watch.mockReturnValue(mockWatcher);
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

  afterEach(async () => {
    cwdSpy.mockRestore();
    processExitSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('development server', () => {
    it('should start dev server with file watching', async () => {
      const action = (dev as any)._actionHandler;
      
      // Create package.json
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project', scripts: { start: 'node index.js' } })
      );

      action({ port: 3000 });

      // Verify chokidar is watching correct patterns
      expect(mockChokidar.watch).toHaveBeenCalledWith(
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
          ignored: expect.arrayContaining([
            '**/node_modules/**',
            '**/dist/**',
          ]),
        })
      );

      // Verify initial start command
      expect(mockExeca).toHaveBeenCalledWith(
        'elizaos',
        ['start', '--port', '3000'],
        expect.objectContaining({
          shell: true,
          stdio: 'pipe',
        })
      );
    });

    it('should restart on file changes', async () => {
      const action = (dev as any)._actionHandler;
      
      action({ port: 3000 });

      // Get the change handler
      const changeHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'change'
      )?.[1];

      expect(changeHandler).toBeDefined();

      // Simulate file change
      changeHandler('src/index.ts');

      // Should log the change
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('File changed: src/index.ts')
      );

      // Should kill existing process
      expect(mockExeca.mock.results[0].value.kill).toHaveBeenCalled();

      // Should restart
      expect(mockExeca).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple rapid file changes (debouncing)', async () => {
      vi.useFakeTimers();
      
      const action = (dev as any)._actionHandler;
      action({ port: 3000 });

      const changeHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'change'
      )?.[1];

      // Simulate rapid file changes
      changeHandler('src/file1.ts');
      changeHandler('src/file2.ts');
      changeHandler('src/file3.ts');

      // Should only log first change immediately
      expect(mockLogger.info).toHaveBeenCalledTimes(1);

      // Fast forward past debounce delay
      vi.advanceTimersByTime(1000);

      // Should have restarted only once
      expect(mockExeca).toHaveBeenCalledTimes(2); // Initial + 1 restart

      vi.useRealTimers();
    });

    it('should pass through additional options', async () => {
      const action = (dev as any)._actionHandler;
      
      action({ 
        port: 8080,
        debug: true,
        character: 'custom.json',
      });

      expect(mockExeca).toHaveBeenCalledWith(
        'elizaos',
        expect.arrayContaining([
          'start',
          '--port', '8080',
          '--debug',
          '--character', 'custom.json',
        ]),
        expect.any(Object)
      );
    });

    it('should handle missing package.json gracefully', async () => {
      const action = (dev as any)._actionHandler;
      
      // No package.json in temp dir
      action({ port: 3000 });

      // Should still start watching
      expect(mockChokidar.watch).toHaveBeenCalled();
      expect(mockExeca).toHaveBeenCalled();
    });

    it('should ignore node_modules and dist directories', async () => {
      const action = (dev as any)._actionHandler;
      
      action({ port: 3000 });

      const watchOptions = mockChokidar.watch.mock.calls[0][1];
      expect(watchOptions.ignored).toContain('**/node_modules/**');
      expect(watchOptions.ignored).toContain('**/dist/**');
      expect(watchOptions.ignored).toContain('**/.git/**');
      expect(watchOptions.ignored).toContain('**/build/**');
    });
  });

  describe('error handling', () => {
    it('should handle server start failure', async () => {
      mockExeca.mockImplementation(() => {
        const error = new Error('Command failed');
        const proc = {
          stdout: { pipe: vi.fn() },
          stderr: { pipe: vi.fn() },
          kill: vi.fn(),
          on: vi.fn((event, cb) => {
            if (event === 'exit') {
              setTimeout(() => cb(1, null), 0);
            }
          }),
        };
        setTimeout(() => proc.on.mock.calls.find(c => c[0] === 'exit')?.[1](1, null), 0);
        return proc;
      });

      const action = (dev as any)._actionHandler;
      
      action({ port: 3000 });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Server process exited with code 1')
      );
    });

    it('should handle watcher errors', async () => {
      const action = (dev as any)._actionHandler;
      
      action({ port: 3000 });

      // Get the error handler
      const errorHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      expect(errorHandler).toBeDefined();

      // Simulate watcher error
      const watchError = new Error('Watch error');
      errorHandler(watchError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'File watcher error:',
        watchError
      );
    });

    it('should clean up on process exit', async () => {
      const action = (dev as any)._actionHandler;
      
      action({ port: 3000 });

      // Get SIGINT handler
      const sigintHandlers = process.listeners('SIGINT');
      const devSigintHandler = sigintHandlers[sigintHandlers.length - 1];

      // Trigger SIGINT
      await (devSigintHandler as Function)();

      // Should close watcher
      expect(mockWatcher.close).toHaveBeenCalled();

      // Should kill server process
      expect(mockExeca.mock.results[0].value.kill).toHaveBeenCalledWith('SIGTERM');

      expect(mockLogger.info).toHaveBeenCalledWith('Dev server stopped');
    });
  });

  describe('file watching patterns', () => {
    it('should watch TypeScript and JavaScript files', async () => {
      const action = (dev as any)._actionHandler;
      
      action({ port: 3000 });

      const watchPatterns = mockChokidar.watch.mock.calls[0][0];
      expect(watchPatterns).toContain('src/**/*');
      expect(watchPatterns).toContain('index.js');
      expect(watchPatterns).toContain('index.ts');
    });

    it('should watch agent and character directories', async () => {
      const action = (dev as any)._actionHandler;
      
      action({ port: 3000 });

      const watchPatterns = mockChokidar.watch.mock.calls[0][0];
      expect(watchPatterns).toContain('agent/**/*');
      expect(watchPatterns).toContain('agents/**/*');
      expect(watchPatterns).toContain('characters/**/*');
    });

    it('should watch configuration files', async () => {
      const action = (dev as any)._actionHandler;
      
      action({ port: 3000 });

      const watchPatterns = mockChokidar.watch.mock.calls[0][0];
      expect(watchPatterns).toContain('package.json');
      expect(watchPatterns).toContain('.env');
    });

    it('should add custom watch patterns if provided', async () => {
      const action = (dev as any)._actionHandler;
      
      action({ 
        port: 3000,
        watch: ['custom/**/*.ts', 'data/*.json'],
      });

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
        kill: vi.fn(),
        on: vi.fn(),
      });

      const action = (dev as any)._actionHandler;
      
      action({ port: 3000 });

      expect(mockMergeStreams).toHaveBeenCalledWith([mockStdout, mockStderr]);
    });
  });
});