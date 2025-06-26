import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToolExecutionService, CONTAINER_WORKSPACE_PATH, type ToolExecutionOptions } from '../tool-execution.service';
import { type IAgentRuntime, logger } from '@elizaos/core';
import { AuditorPluginConfigSchema, initializeAuditorConfig, getAuditorConfig } from '../environment';

import * as child_process from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// Mock logger
vi.mock('@elizaos/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@elizaos/core')>();
  return {
    ...original,
    logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
});

// Mock fs/promises
vi.mock('node:fs/promises', async (importOriginal) => {
  const actualFs = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actualFs,
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ isDirectory: () => true }), // Assume path exists and is a directory
  };
});

// Mock child_process
vi.mock('node:child_process');

// Mock environment config
vi.mock('../environment', async (importOriginal) => {
    const actualEnvironment = await importOriginal<typeof import('../environment')>();
    const defaultConfigValues = actualEnvironment.AuditorPluginConfigSchema.parse({});
    let currentTestConfig = defaultConfigValues;
    return {
        ...actualEnvironment,
        initializeAuditorConfig: vi.fn((config) => {
            currentTestConfig = actualEnvironment.AuditorPluginConfigSchema.parse({ ...defaultConfigValues, ...config });
            return currentTestConfig;
        }),
        getAuditorConfig: vi.fn(() => currentTestConfig),
    };
});

// Mock uuid for uniqueRunId
vi.mock('uuid', () => ({
    v4: vi.fn(() => 'mock-uuid-for-testdir'),
}));


describe('ToolExecutionService', () => {
  let mockRuntime: IAgentRuntime;
  let service: ToolExecutionService;
  let mockSpawnEventEmitter: any;

  beforeEach(() => {
    vi.resetAllMocks();
    initializeAuditorConfig({}); // Initialize with default config

    mockRuntime = { agentId: 'test-auditor' } as IAgentRuntime;
    service = new ToolExecutionService(mockRuntime);

    mockSpawnEventEmitter = {
      stdout: { on: vi.fn((event, cb) => { if(event === 'data') this.stdoutDataCb = cb; }) },
      stderr: { on: vi.fn((event, cb) => { if(event === 'data') this.stderrDataCb = cb; }) },
      on: vi.fn((event, cb) => {
        if (event === 'error') this.errorCb = cb;
        if (event === 'close') this.closeCb = cb;
      }),
      stdoutDataCb: null,
      stderrDataCb: null,
      errorCb: null,
      closeCb: null,
    };
    vi.mocked(child_process.spawn).mockReturnValue(mockSpawnEventEmitter as any);
  });

  const defaultDockerImage = AuditorPluginConfigSchema.parse({}).DEFAULT_FOUNDRY_DOCKER_IMAGE;

  it('should execute a command in Docker successfully', async () => {
    const promise = service.executeCommand('forge', ['test'], { cwd: '/host/path' });

    // Simulate Docker process output
    mockSpawnEventEmitter.stdoutDataCb?.('Test results');
    mockSpawnEventEmitter.stderrDataCb?.('');
    mockSpawnEventEmitter.closeCb?.(0); // Exit code 0

    const result = await promise;
    expect(child_process.spawn).toHaveBeenCalledWith('docker',
      expect.arrayContaining(['run', '--rm', '-v', `${path.resolve('/host/path')}:${CONTAINER_WORKSPACE_PATH}:rw`, defaultDockerImage, 'forge', 'test']),
      expect.any(Object)
    );
    expect(result.stdout).toBe('Test results');
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
    expect(fs.rm).not.toHaveBeenCalled(); // Workspace provided, not created by service
  });

  it('should create and cleanup a temporary workspace if no cwd is provided', async () => {
    const tempWsPath = path.join(os.tmpdir(), `eliza-audit-mock-uuid-for-testdir`);
    const promise = service.executeCommand('slither', ['.'], { dockerImageName: 'custom/slither' });
    mockSpawnEventEmitter.closeCb?.(0);
    await promise;

    expect(fs.mkdir).toHaveBeenCalledWith(tempWsPath, { recursive: true });
    expect(child_process.spawn).toHaveBeenCalledWith('docker',
      expect.arrayContaining(['-v', `${tempWsPath}:${CONTAINER_WORKSPACE_PATH}:rw`, 'custom/slither', 'slither', '.']),
      expect.any(Object)
    );
    expect(fs.rm).toHaveBeenCalledWith(tempWsPath, { recursive: true, force: true });
  });

  it('should handle inputStringForFile option correctly', async () => {
    const tempWsPath = path.join(os.tmpdir(), `eliza-audit-mock-uuid-for-testdir`);
    const inputFileContent = "pragma solidity ^0.8.0;";
    const inputFilename = "MyContract.sol";
    const promise = service.executeCommand('slither', [`${CONTAINER_WORKSPACE_PATH}/${inputFilename}`], {
      inputStringForFile: { content: inputFileContent, filename: inputFilename }
    });
    mockSpawnEventEmitter.closeCb?.(0);
    await promise;

    expect(fs.writeFile).toHaveBeenCalledWith(path.join(tempWsPath, inputFilename), inputFileContent);
    expect(fs.rm).toHaveBeenCalledWith(tempWsPath, { recursive: true, force: true }); // Temp workspace cleanup
  });

  it('should return error if Docker command fails to start', async () => {
    const spawnError = new Error('Docker spawn ENOTFOUND');
    vi.mocked(child_process.spawn).mockImplementationOnce(() => {
      // Simulate immediate error on spawn
      const ee = new EventEmitter() as any;
      ee.stdout = new EventEmitter();
      ee.stderr = new EventEmitter();
      setTimeout(() => ee.emit('error', spawnError), 0);
      setTimeout(() => ee.emit('close', -1), 0); // Or some error code
      return ee;
    });

    const result = await service.executeCommand('forge', ['test'], { cwd: '/host/path' });
    expect(result.error).toBe(spawnError.message);
    expect(result.exitCode).toBe(-1); // Or the code passed to close
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Failed to start Docker command for 'forge'"), spawnError);
  });

  it('should capture stderr and non-zero exit code from Docker execution', async () => {
    const promise = service.executeCommand('forge', ['test'], { cwd: '/host/path' });
    mockSpawnEventEmitter.stdoutDataCb?.('Some output');
    mockSpawnEventEmitter.stderrDataCb?.('Compilation failed');
    mockSpawnEventEmitter.closeCb?.(1); // Non-zero exit code

    const result = await promise;
    expect(result.stdout).toBe('Some output');
    expect(result.stderr).toBe('Compilation failed');
    expect(result.exitCode).toBe(1);
  });

  it('should handle timeout correctly (simulated by Docker timeout)', async () => {
    // The service's internal timeout is for the spawn call itself.
    // Docker's own timeout for the container is separate.
    // This test simulates the child_process.spawn timing out.
     vi.mocked(child_process.spawn).mockImplementationOnce(() => {
      const ee = new EventEmitter() as any;
      ee.stdout = new EventEmitter();
      ee.stderr = new EventEmitter();
      // Don't call closeCb to simulate timeout, errorCb for timeout is usually handled by Node.
      // Node's child_process.spawn with a timeout option will kill the process and emit 'error' or specific signal.
      // Let's simulate the 'error' event with a timeout-like error.
      setTimeout(() => ee.emit('error', new Error('Spawned process timed out')), 0);
      setTimeout(() => ee.emit('close', null), 0); // or a signal code
      return ee;
    });

    const result = await service.executeCommand('forge', ['test'], { cwd: '/host/path', timeout: 10 }); // Short timeout for test
    expect(result.error).toContain('Spawned process timed out');
  });

  it('should ensure temporary workspace is cleaned up even if Docker execution errors', async () => {
    const tempWsPath = path.join(os.tmpdir(), `eliza-audit-mock-uuid-for-testdir`);
    const dockerExecError = new Error('Docker execution error');
    vi.mocked(child_process.spawn).mockImplementationOnce(() => {
      const ee = new EventEmitter() as any;
      ee.stdout = new EventEmitter();
      ee.stderr = new EventEmitter();
      setTimeout(() => ee.emit('error', dockerExecError), 0); // Error after mkdir
      setTimeout(() => ee.emit('close', 1), 0);
      return ee;
    });

    await service.executeCommand('forge', ['test'], {}); // No cwd, so temp workspace is created

    expect(fs.mkdir).toHaveBeenCalledWith(tempWsPath, { recursive: true });
    expect(fs.rm).toHaveBeenCalledWith(tempWsPath, { recursive: true, force: true });
  });

  it('should fail if hostWorkspacePath (cwd) does not exist', async () => {
    vi.mocked(fs.stat).mockResolvedValueOnce({ isDirectory: () => false } as any); // Simulate path not a directory
    const result = await service.executeCommand('forge', ['test'], { cwd: '/non/existent/path' });
    expect(result.error).toContain('Host workspace path (cwd) not found');
    expect(result.exitCode).toBe(-1);
    expect(child_process.spawn).not.toHaveBeenCalled();
  });

  it('should fail if dockerImageName is not provided and cannot be inferred', async () => {
    const result = await service.executeCommand('unknown-tool', ['arg']);
    expect(result.error).toBe('Docker image missing');
    expect(result.stderr).toContain('Docker image not specified for command: unknown-tool');
    expect(child_process.spawn).not.toHaveBeenCalled();
  });

});
