import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';
import {
  checkPluginDependencies,
  installPluginDependencies,
  validatePluginDependencies,
  readPackageLock,
} from '../../../src/utils/plugin-dependency-manager';

// Mock dependencies
const mockExistsSync = mock();
const mockReadFileSync = mock();
const mockExecuteInstallation = mock();
const mockPathResolve = mock();

const mockLogger = {
  debug: mock(),
  info: mock(),
  warn: mock(),
  error: mock(),
  success: mock(),
};

// Set up module mocks
mock.module('node:fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
}));

mock.module('node:path', () => ({
  resolve: mockPathResolve,
  join: (...segments: string[]) => segments.join('/'),
}));

mock.module('../../../src/utils/package-manager', () => ({
  executeInstallation: mockExecuteInstallation,
}));

mock.module('@elizaos/core', () => ({
  logger: mockLogger,
}));

describe('plugin-dependency-manager', () => {
  beforeEach(() => {
    // Clear all mocks
    mockExistsSync.mockClear();
    mockReadFileSync.mockClear();
    mockExecuteInstallation.mockClear();
    mockPathResolve.mockClear();
    Object.values(mockLogger).forEach((fn) => fn.mockClear());

    // Default mock implementations
    mockPathResolve.mockImplementation((cwd, ...segments) => {
      if (segments.length === 0) return cwd;
      return `${cwd}/${segments.join('/')}`;
    });
    // Mock process.cwd
    process.cwd = mock().mockReturnValue('/test/project');
  });

  afterEach(() => {
    // Reset all mocks
    mockExistsSync.mockReset();
    mockReadFileSync.mockReset();
    mockExecuteInstallation.mockReset();
    mockPathResolve.mockReset();
    Object.values(mockLogger).forEach((fn) => fn.mockReset());
  });

  describe('checkPluginDependencies', () => {
    it('should return valid result when no package.json exists', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await checkPluginDependencies('test-plugin');

      expect(result).toEqual({
        missing: [],
        optional: [],
        isValid: true,
      });
    });

    it('should detect missing regular dependencies', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: '^1.0.0',
          lodash: '^4.0.0',
          '@elizaos/core': '^1.0.0', // Should be skipped
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false) // axios not installed
        .mockReturnValueOnce(true) // lodash is installed
        .mockReturnValueOnce(true); // @elizaos/core is installed (but should be skipped)

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

      const result = await checkPluginDependencies('test-plugin');

      expect(result).toEqual({
        missing: [{ name: 'axios', version: '^1.0.0', type: 'dependency' }],
        optional: [],
        isValid: false,
      });
    });

    it('should detect missing peer dependencies', async () => {
      const packageJson = {
        name: 'test-plugin',
        peerDependencies: {
          react: '^18.0.0',
          '@elizaos/core': '^1.0.0', // Should be skipped
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false); // react not installed

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

      const result = await checkPluginDependencies('test-plugin');

      expect(result).toEqual({
        missing: [{ name: 'react', version: '^18.0.0', type: 'peerDependency' }],
        optional: [],
        isValid: false,
      });
    });

    it('should detect missing optional dependencies', async () => {
      const packageJson = {
        name: 'test-plugin',
        optionalDependencies: {
          fsevents: '^2.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false); // fsevents not installed

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

      const result = await checkPluginDependencies('test-plugin');

      expect(result).toEqual({
        missing: [],
        optional: [{ name: 'fsevents', version: '^2.0.0' }],
        isValid: true,
      });
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('JSON parse error');
      });

      const result = await checkPluginDependencies('test-plugin');

      expect(result).toEqual({
        missing: [],
        optional: [],
        isValid: true,
      });
    });

    it('should skip ElizaOS packages in all dependency types', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          '@elizaos/core': '^1.0.0',
          'external-lib': '^1.0.0',
        },
        peerDependencies: {
          '@elizaos/plugin-bootstrap': '^1.0.0',
        },
        optionalDependencies: {
          '@elizaos/plugin-optional': '^1.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false); // external-lib not installed

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

      const result = await checkPluginDependencies('test-plugin');

      expect(result).toEqual({
        missing: [{ name: 'external-lib', version: '^1.0.0', type: 'dependency' }],
        optional: [],
        isValid: false,
      });
    });
  });

  describe('installPluginDependencies', () => {
    it('should skip installation when all dependencies are satisfied', async () => {
      mockExistsSync.mockReturnValue(false); // No package.json

      const result = await installPluginDependencies('test-plugin');

      expect(result).toBe(true);
      expect(mockExecuteInstallation).not.toHaveBeenCalled();
    });

    it('should install missing dependencies successfully', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: '^1.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists (first check)
        .mockReturnValueOnce(false) // axios package dir not found (first check)
        .mockReturnValueOnce(true) // package.json exists (final check)
        .mockReturnValueOnce(true) // axios package dir found (final check)
        .mockReturnValueOnce(true); // axios package.json found (final check)

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));
      mockExecuteInstallation.mockResolvedValue({ success: true, installedIdentifier: 'axios' });

      const result = await installPluginDependencies('test-plugin');

      expect(result).toBe(true);
      expect(mockExecuteInstallation).toHaveBeenCalledWith('axios', '^1.0.0', '/test/project');
    });

    it('should fail when dependency installation fails', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: '^1.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false); // axios not installed

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));
      mockExecuteInstallation.mockResolvedValue({ success: false });

      const result = await installPluginDependencies('test-plugin');

      expect(result).toBe(false);
    });

    it('should handle installation exceptions', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: '^1.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false); // axios not installed

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));
      mockExecuteInstallation.mockRejectedValue(new Error('Installation failed'));

      const result = await installPluginDependencies('test-plugin');

      expect(result).toBe(false);
    });

    it('should install optional dependencies and continue on failure', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: '^1.0.0',
        },
        optionalDependencies: {
          fsevents: '^2.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists (first check)
        .mockReturnValueOnce(false) // axios package dir not found (first check)
        .mockReturnValueOnce(false) // fsevents package dir not found (first check)
        .mockReturnValueOnce(true) // package.json exists (final check)
        .mockReturnValueOnce(true) // axios package dir found (final check)
        .mockReturnValueOnce(true) // axios package.json found (final check)
        .mockReturnValueOnce(false); // fsevents package dir not found (final check - optional)

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));
      mockExecuteInstallation
        .mockResolvedValueOnce({ success: true, installedIdentifier: 'axios' }) // axios succeeds
        .mockResolvedValueOnce({ success: false }); // fsevents fails (non-fatal)

      const result = await installPluginDependencies('test-plugin');

      expect(result).toBe(true); // Should still succeed despite optional dependency failure
      expect(mockExecuteInstallation).toHaveBeenCalledTimes(2);
    });

    it('should use custom target directory', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: '^1.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists (first check)
        .mockReturnValueOnce(false) // axios package dir not found (first check)
        .mockReturnValueOnce(true) // package.json exists (final check)
        .mockReturnValueOnce(true) // axios package dir found (final check)
        .mockReturnValueOnce(true); // axios package.json found (final check)

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));
      mockExecuteInstallation.mockResolvedValue({ success: true, installedIdentifier: 'axios' });

      const result = await installPluginDependencies('test-plugin', '/custom/directory');

      expect(result).toBe(true);
      expect(mockExecuteInstallation).toHaveBeenCalledWith('axios', '^1.0.0', '/custom/directory');
    });
  });

  describe('isPackageInstalled error handling', () => {
    it('should return false when existsSync throws an error', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: '^1.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockImplementationOnce(() => {
          throw new Error('Permission denied');
        }); // throws on axios check

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

      const result = await checkPluginDependencies('test-plugin');

      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].name).toBe('axios');
    });
  });

  describe('security validation', () => {
    it('should reject packages with invalid names', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          '../../../etc/passwd': '^1.0.0', // Invalid package name
          'valid-package': '^1.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false); // valid-package not installed

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

      const result = await checkPluginDependencies('test-plugin');

      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].name).toBe('valid-package');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid package name format')
      );
    });

    it('should reject packages with invalid version formats', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: 'rm -rf /', // Invalid version
          lodash: '^4.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false); // lodash not installed

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

      const result = await checkPluginDependencies('test-plugin');

      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].name).toBe('lodash');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid version format')
      );
    });

    it('should reject suspicious package names', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          sudo: '^1.0.0', // Suspicious name
          'malware-keylogger': '^1.0.0', // Suspicious name
          'good-package': '^1.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false); // good-package not installed

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

      const result = await checkPluginDependencies('test-plugin');

      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].name).toBe('good-package');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Suspicious package name detected')
      );
    });

    it('should warn about potentially unsafe dependencies', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          eval: '^1.0.0', // Suspicious but still checked
        },
        peerDependencies: {
          exec: '^1.0.0', // Suspicious but still checked
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false) // eval not installed
        .mockReturnValueOnce(false); // exec not installed

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

      const result = await checkPluginDependencies('test-plugin');

      expect(result.missing).toHaveLength(0); // Should skip both
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Potentially unsafe dependency detected')
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Potentially unsafe peer dependency detected')
      );
    });

    it('should skip unsafe packages and succeed if no valid deps remain', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          backdoor: '^1.0.0', // Will be skipped by security check
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists (first check)
        .mockReturnValueOnce(false) // backdoor not installed (first check)
        .mockReturnValueOnce(true); // package.json exists (final check)

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

      const result = await installPluginDependencies('test-plugin');

      // Should succeed because suspicious packages are skipped, leaving no deps to install
      expect(result).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Suspicious package name detected')
      );
      expect(mockExecuteInstallation).not.toHaveBeenCalled();
    });
  });

  describe('installation error handling', () => {
    it('should provide EACCES error guidance', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: '^1.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false); // axios not installed

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

      const error = new Error('EACCES: permission denied');
      mockExecuteInstallation.mockRejectedValue(error);

      const result = await installPluginDependencies('test-plugin');

      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Permission denied. Try running with sudo or check npm permissions'
      );
    });

    it('should provide ENOTFOUND error guidance', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: '^1.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false); // axios not installed

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

      const error = new Error('ENOTFOUND: getaddrinfo ENOTFOUND registry.npmjs.org');
      mockExecuteInstallation.mockRejectedValue(error);

      const result = await installPluginDependencies('test-plugin');

      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Network error. Check your internet connection and npm registry settings'
      );
    });

    it('should provide peer dependency conflict guidance', async () => {
      const packageJson = {
        name: 'test-plugin',
        peerDependencies: {
          react: '^18.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false); // react not installed

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));
      mockExecuteInstallation.mockResolvedValue({ success: false });

      const result = await installPluginDependencies('test-plugin');

      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Consider installing peer dependency manually')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Or use --legacy-peer-deps flag')
      );
    });

    it('should handle peer dep error in exception', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: '^1.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false); // axios not installed

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

      const error = new Error('peer dep missing: react@^18.0.0');
      mockExecuteInstallation.mockRejectedValue(error);

      const result = await installPluginDependencies('test-plugin');

      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Peer dependency conflict')
      );
    });

    it('should log successful optional dependency installation', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: '^1.0.0', // Required dependency to trigger installation flow
        },
        optionalDependencies: {
          fsevents: '^2.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false) // axios not installed initially
        .mockReturnValueOnce(false) // fsevents not installed initially
        .mockReturnValueOnce(true) // package.json exists (final check)
        .mockReturnValueOnce(true) // axios installed after
        .mockReturnValueOnce(true) // axios package.json exists
        .mockReturnValueOnce(true) // fsevents installed after
        .mockReturnValueOnce(true); // fsevents package.json exists

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));
      mockExecuteInstallation
        .mockResolvedValueOnce({ success: true, installedIdentifier: 'axios' })
        .mockResolvedValueOnce({ success: true, installedIdentifier: 'fsevents' });

      const result = await installPluginDependencies('test-plugin');

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Successfully installed optional dependency')
      );
    });

    it('should handle optional dependency installation errors', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: '^1.0.0', // Required dependency to trigger installation flow
        },
        optionalDependencies: {
          fsevents: '^2.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false) // axios not installed initially
        .mockReturnValueOnce(false) // fsevents not installed initially
        .mockReturnValueOnce(true) // package.json exists (final check)
        .mockReturnValueOnce(true) // axios installed after
        .mockReturnValueOnce(true) // axios package.json exists
        .mockReturnValueOnce(false); // fsevents still not installed (failed)

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));
      mockExecuteInstallation
        .mockResolvedValueOnce({ success: true, installedIdentifier: 'axios' })
        .mockRejectedValueOnce(new Error('Platform not supported'));

      const result = await installPluginDependencies('test-plugin');

      expect(result).toBe(true); // Should still succeed
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error installing optional dependency'),
        expect.any(Error)
      );
    });

    it('should fail when dependencies remain missing after installation', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: '^1.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists (first check)
        .mockReturnValueOnce(false) // axios not installed initially
        .mockReturnValueOnce(true) // package.json exists (final check)
        .mockReturnValueOnce(false); // axios STILL not installed (simulating failed install)

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));
      mockExecuteInstallation.mockResolvedValue({ success: true, installedIdentifier: 'axios' });

      const result = await installPluginDependencies('test-plugin');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('still has missing dependencies after installation attempt')
      );
    });
  });

  describe('validatePluginDependencies', () => {
    it('should return valid result when all dependencies are satisfied', async () => {
      mockExistsSync.mockReturnValue(false); // No package.json

      const result = await validatePluginDependencies('test-plugin');

      expect(result).toEqual({
        isValid: true,
        missingDependencies: [],
      });
    });

    it('should return invalid result with missing dependencies list', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: '^1.0.0',
          lodash: '^4.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false) // axios not installed
        .mockReturnValueOnce(false); // lodash not installed

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

      const result = await validatePluginDependencies('test-plugin');

      expect(result).toEqual({
        isValid: false,
        missingDependencies: ['axios@^1.0.0', 'lodash@^4.0.0'],
        message: "Plugin 'test-plugin' has 2 missing dependencies: axios@^1.0.0, lodash@^4.0.0",
      });
    });

    it('should include both regular and peer dependencies in validation', async () => {
      const packageJson = {
        name: 'test-plugin',
        dependencies: {
          axios: '^1.0.0',
        },
        peerDependencies: {
          react: '^18.0.0',
        },
      };

      mockExistsSync
        .mockReturnValueOnce(true) // package.json exists
        .mockReturnValueOnce(false) // axios not installed
        .mockReturnValueOnce(false); // react not installed

      mockReadFileSync.mockReturnValue(JSON.stringify(packageJson));

      const result = await validatePluginDependencies('test-plugin');

      expect(result).toEqual({
        isValid: false,
        missingDependencies: ['axios@^1.0.0', 'react@^18.0.0'],
        message: "Plugin 'test-plugin' has 2 missing dependencies: axios@^1.0.0, react@^18.0.0",
      });
    });
  });

  describe('readPackageLock', () => {
    it('should read and parse package-lock.json when it exists', () => {
      const mockLockContent = {
        packages: {
          'node_modules/axios': { version: '1.0.0' },
          'node_modules/lodash': { version: '4.17.21' },
        },
      };

      mockPathResolve.mockReturnValue('/test/project/package-lock.json');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockLockContent));

      const result = readPackageLock();

      expect(result).toEqual(mockLockContent.packages);
    });

    it('should return dependencies property if packages not found', () => {
      const mockLockContent = {
        dependencies: {
          axios: { version: '1.0.0' },
          lodash: { version: '4.17.21' },
        },
      };

      mockPathResolve.mockReturnValue('/test/project/package-lock.json');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockLockContent));

      const result = readPackageLock();

      expect(result).toEqual(mockLockContent.dependencies);
    });

    it('should return empty object if neither packages nor dependencies found', () => {
      const mockLockContent = {
        name: 'test-project',
        version: '1.0.0',
      };

      mockPathResolve.mockReturnValue('/test/project/package-lock.json');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockLockContent));

      const result = readPackageLock();

      expect(result).toEqual({});
    });

    it('should return null when package-lock.json does not exist', () => {
      mockPathResolve.mockReturnValue('/test/project/package-lock.json');
      mockExistsSync.mockReturnValue(false);

      const result = readPackageLock();

      expect(result).toBeNull();
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });

    it('should handle JSON parse errors gracefully', () => {
      mockPathResolve.mockReturnValue('/test/project/package-lock.json');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('{ invalid json }');

      const result = readPackageLock();

      expect(result).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Failed to read package-lock.json:',
        expect.any(Error)
      );
    });

    it('should handle file read errors gracefully', () => {
      mockPathResolve.mockReturnValue('/test/project/package-lock.json');
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const result = readPackageLock();

      expect(result).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Failed to read package-lock.json:',
        expect.any(Error)
      );
    });
  });
});
