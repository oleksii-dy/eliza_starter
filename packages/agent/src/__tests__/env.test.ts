import { describe, expect, it } from 'bun:test';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

describe('Build and Runtime Environment', () => {
  it('should have a build script configured', async () => {
    try {
      // Instead of running the full build, just verify the build script exists
      const packageJson = await import('../../package.json');
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.build).toContain('typecheck');
      expect(packageJson.scripts.build).toContain('vite');
      expect(packageJson.scripts.build).toContain('tsup');
    } catch (error) {
      throw new Error(`Build configuration check failed: ${error.message}`);
    }
  });

  it('should have all required dependencies installed', async () => {
    try {
      // Check that core dependency can be imported
      const core = await import('@elizaos/core');
      expect(core).toBeDefined();
      expect(core.AgentRuntime).toBeDefined();
    } catch (error) {
      throw new Error(`Missing required dependency: ${error.message}`);
    }
  });

  it('should export the expected modules', async () => {
    try {
      const mainModule = await import('../index');
      expect(mainModule.character).toBeDefined();
      expect(mainModule.character.name).toBe('Eliza');
    } catch (error) {
      throw new Error(`Module export test failed: ${error.message}`);
    }
  });
});
