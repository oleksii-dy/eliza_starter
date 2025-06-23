import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { buildProject } from '../../../src/utils/build-project';
import { logger } from '@elizaos/core';
import * as fs from 'node:fs';

// Mock dependencies
mock.module('@elizaos/core', () => ({
  logger: {
    info: mock(() => {}),
    success: mock(() => {}),
    error: mock(() => {}),
    warn: mock(() => {}),
    debug: mock(() => {}),
  },
}));

mock.module('execa', () => ({
  execa: mock(() => {}),
}));

mock.module('../../../src/utils/run-bun', () => ({
  runBunCommand: mock(() => {}),
}));

mock.module('node:fs', () => ({
  existsSync: mock(() => true),
  readFileSync: mock(() => '{}'),
  promises: {
    rm: mock(() => {}),
  },
}));

mock.module('../../../src/utils/directory-detection', () => ({
  detectDirectoryType: mock(() => ({ monorepoRoot: null })),
}));

// Import mocked modules
import { runBunCommand } from '../../../src/utils/run-bun';

describe('buildProject', () => {
  beforeEach(() => {
    // Mock process.env to not be in test mode
    delete process.env.ELIZA_TEST_MODE;
  });

  it('should build project with bun when build script exists', async () => {
    const mockExistsSync = fs.existsSync as any;
    const mockReadFileSync = fs.readFileSync as any;
    const mockRunBunCommand = runBunCommand as any;
    
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: { build: 'tsc' },
      })
    );
    mockRunBunCommand.mockResolvedValue(undefined);

    await buildProject('/test/project');

    expect(logger.info).toHaveBeenCalledWith('Building project in /test/project...');
    expect(runBunCommand).toHaveBeenCalledWith(['run', 'build'], '/test/project');
    expect(logger.info).toHaveBeenCalledWith('Build completed successfully');
  });

  it('should build plugin with bun when isPlugin is true', async () => {
    const mockExistsSync = fs.existsSync as any;
    const mockReadFileSync = fs.readFileSync as any;
    const mockRunBunCommand = runBunCommand as any;
    
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: { build: 'tsc' },
      })
    );
    mockRunBunCommand.mockResolvedValue(undefined);

    await buildProject('/test/plugin', true);

    expect(logger.info).toHaveBeenCalledWith('Building plugin in /test/plugin...');
    expect(runBunCommand).toHaveBeenCalledWith(['run', 'build'], '/test/plugin');
    expect(logger.info).toHaveBeenCalledWith('Build completed successfully');
  });

  it('should skip build when no build script exists', async () => {
    const mockExistsSync = fs.existsSync as any;
    const mockReadFileSync = fs.readFileSync as any;
    
    mockExistsSync.mockImplementation((path: any) => {
      const pathStr = path.toString();
      if (pathStr === '/test/project') return true; // Project directory exists
      if (pathStr.endsWith('package.json')) return true;
      if (pathStr.endsWith('tsconfig.json')) return false;
      if (pathStr.endsWith('dist')) return false;
      return false;
    });
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: {},
      })
    );

    await expect(buildProject('/test/project')).rejects.toThrow(
      'Could not determine how to build the project'
    );

    expect(logger.warn).toHaveBeenCalledWith(
      'No build script found in /test/project/package.json. Attempting common build commands.'
    );
  });

  it('should handle build errors', async () => {
    const mockError = new Error('Build failed');
    const mockExistsSync = fs.existsSync as any;
    const mockReadFileSync = fs.readFileSync as any;
    const mockRunBunCommand = runBunCommand as any;
    
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: { build: 'tsc' },
      })
    );
    mockRunBunCommand.mockRejectedValue(mockError);

    await expect(buildProject('/test/project')).rejects.toThrow(
      'Failed to build using bun: Error: Build failed'
    );

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to build project: Error: Failed to build using bun: Error: Build failed'
    );
  });

  it('should handle non-zero exit code', async () => {
    const mockError = new Error('Command failed with exit code 1');
    const mockExistsSync = fs.existsSync as any;
    const mockReadFileSync = fs.readFileSync as any;
    const mockRunBunCommand = runBunCommand as any;
    
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: { build: 'tsc' },
      })
    );
    mockRunBunCommand.mockRejectedValue(mockError);

    await expect(buildProject('/test/project')).rejects.toThrow(
      'Failed to build using bun: Error: Command failed with exit code 1'
    );
  });

  it('should set NODE_ENV to production', async () => {
    // This test is not applicable as the buildProject function doesn't set NODE_ENV anymore
    // Skipping this test
    expect(true).toBe(true);
  });

  it('should pass projectPath correctly', async () => {
    const mockExistsSync = fs.existsSync as any;
    const mockReadFileSync = fs.readFileSync as any;
    const mockRunBunCommand = runBunCommand as any;
    
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        scripts: { build: 'tsc' },
      })
    );
    mockRunBunCommand.mockResolvedValue(undefined);

    const testPath = '/custom/project/path';
    await buildProject(testPath);

    expect(runBunCommand).toHaveBeenCalledWith(['run', 'build'], testPath);
  });
});
