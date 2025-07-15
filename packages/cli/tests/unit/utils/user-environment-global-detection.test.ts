import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';
import { UserEnvironment } from '../../../src/utils/user-environment';

describe('UserEnvironment Global Installation Detection', () => {
  let originalArgv: string[];
  let originalEnv: NodeJS.ProcessEnv;
  let userEnv: UserEnvironment;

  beforeEach(() => {
    // Save original values
    originalArgv = [...process.argv];
    originalEnv = { ...process.env };
    userEnv = UserEnvironment.getInstance();
  });

  afterEach(() => {
    // Restore original values
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  describe('Global Path Detection', () => {
    it('should detect global bun installation correctly', async () => {
      // Mock global bun installation path
      process.argv = [
        '/usr/bin/bun',
        '/Users/user/.bun/install/global/@elizaos/cli/dist/index.js',
        'update',
        '--cli'
      ];
      process.env = {};

      const info = await userEnv.getInfo();
      expect(info.packageManager.global).toBe(true);
    });

    it('should detect global npm installation correctly', async () => {
      // Mock global npm installation path
      process.argv = [
        '/usr/bin/node',
        '/usr/local/lib/node_modules/@elizaos/cli/dist/index.js',
        'update',
        '--cli'
      ];
      process.env = {};

      const info = await userEnv.getInfo();
      expect(info.packageManager.global).toBe(true);
    });

    it('should detect global npm installation in /usr/lib/node_modules correctly', async () => {
      // Mock global npm installation path in /usr/lib/node_modules
      process.argv = [
        '/usr/bin/node',
        '/usr/lib/node_modules/@elizaos/cli/dist/index.js',
        'update',
        '--cli'
      ];
      process.env = {};

      const info = await userEnv.getInfo();
      expect(info.packageManager.global).toBe(true);
    });

    it('should NOT detect local node_modules/.bin installation as global', async () => {
      // Mock local installation path (this should NOT be considered global)
      process.argv = [
        '/usr/bin/bun',
        '/path/to/project/node_modules/.bin/elizaos',
        'update',
        '--cli'
      ];
      process.env = {};

      const info = await userEnv.getInfo();
      expect(info.packageManager.global).toBe(false);
    });

    it('should NOT detect local project installation as global', async () => {
      // Mock local project installation path
      process.argv = [
        '/usr/bin/bun',
        '/path/to/project/node_modules/@elizaos/cli/dist/index.js',
        'update',
        '--cli'
      ];
      process.env = {};

      const info = await userEnv.getInfo();
      expect(info.packageManager.global).toBe(false);
    });

    it('should detect Windows global npm installation correctly', async () => {
      // Mock Windows global npm installation path
      process.argv = [
        'C:\\Program Files\\nodejs\\node.exe',
        'C:\\Users\\user\\AppData\\Roaming\\npm\\node_modules\\@elizaos\\cli\\dist\\index.js',
        'update',
        '--cli'
      ];
      process.env = {};

      const info = await userEnv.getInfo();
      expect(info.packageManager.global).toBe(true);
    });

    it('should respect NODE_ENV=global override', async () => {
      // Mock local path but with NODE_ENV=global
      process.argv = [
        '/usr/bin/bun',
        '/path/to/project/node_modules/.bin/elizaos',
        'update',
        '--cli'
      ];
      process.env = { NODE_ENV: 'global' };

      const info = await userEnv.getInfo();
      expect(info.packageManager.global).toBe(true);
    });

    it('should detect bunx execution correctly', async () => {
      // Mock bunx execution path
      process.argv = [
        '/usr/bin/bun',
        '/Users/user/.bun/install/cache/@elizaos/cli@1.2.5/dist/index.js',
        'update',
        '--cli'
      ];
      process.env = {};

      const info = await userEnv.getInfo();
      expect(info.packageManager.isBunx).toBe(true);
      // bunx should not be considered global for CLI updates
      expect(info.packageManager.global).toBe(false);
    });

    it('should detect npx execution correctly', async () => {
      // Mock npx execution path
      process.argv = [
        '/usr/bin/node',
        '/Users/user/.npm/_npx/12345/@elizaos/cli/dist/index.js',
        'update',
        '--cli'
      ];
      process.env = {
        npm_execpath: '/usr/local/lib/node_modules/npm/bin/npx-cli.js'
      };

      const info = await userEnv.getInfo();
      expect(info.packageManager.isNpx).toBe(true);
      // npx should not be considered global for CLI updates
      expect(info.packageManager.global).toBe(false);
    });
  });
});