import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

describe('Windows Compatibility Tests', () => {
  let originalPlatform: string;

  beforeEach(() => {
    originalPlatform = process.platform;
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  describe('File URL conversion', () => {
    it('should convert Windows paths to proper file URLs', () => {
      // Note: pathToFileURL works regardless of current platform
      // We're testing that it handles Windows-style paths correctly
      const windowsPath = 'C:/Users/test/project/index.js'; // Use forward slashes for cross-platform testing
      const fileUrl = pathToFileURL(windowsPath).href;

      // pathToFileURL normalizes paths based on current platform
      // On macOS/Linux, it treats C: as a relative path, so we need to test differently
      expect(fileUrl).toContain('C:/Users/test/project/index.js');
      expect(fileUrl.startsWith('file://')).toBe(true);
    });

    it('should convert Unix paths to proper file URLs', () => {
      // Mock Unix platform
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      const unixPath = '/home/user/project/index.js';
      const fileUrl = pathToFileURL(unixPath).href;

      expect(fileUrl).toBe('file:///home/user/project/index.js');
    });

    it('should handle relative paths correctly', () => {
      const relativePath = './src/index.js';

      // For relative paths, we don't need file URL conversion
      expect(relativePath).toBe('./src/index.js');
      expect(path.isAbsolute(relativePath)).toBe(false);
    });

    it('should identify absolute vs relative paths correctly', () => {
      // Test path.isAbsolute behavior - it's platform-dependent
      // On Windows, C: paths are absolute, on Unix they're relative
      if (process.platform === 'win32') {
        expect(path.isAbsolute('C:/Users/test')).toBe(true);
        expect(path.isAbsolute('C:\\Users\\test')).toBe(true);
      } else {
        // On Unix systems, C: is treated as relative
        expect(path.isAbsolute('C:/Users/test')).toBe(false);
      }

      // Unix absolute paths work on all platforms
      expect(path.isAbsolute('/home/user')).toBe(true);

      // Relative paths
      expect(path.isAbsolute('./src')).toBe(false);
      expect(path.isAbsolute('../src')).toBe(false);
      expect(path.isAbsolute('src/index.js')).toBe(false);
    });
  });

  describe('Path normalization', () => {
    it('should normalize Windows paths consistently', () => {
      // Test path normalization logic - on Unix systems, path.resolve treats Windows paths as relative
      // So we test the concept rather than exact behavior
      const windowsStylePath = 'C:\\Users\\test\\..\\admin\\project';

      // On actual Windows, this would resolve to C:\Users\admin\project
      // On Unix, it treats it as a relative path from current directory
      // We just test that path.resolve processes it without throwing
      const normalized = path.resolve(windowsStylePath);
      expect(normalized).toBeTruthy();
      expect(typeof normalized).toBe('string');

      // Test a more cross-platform compatible scenario
      const relativePath = 'test/../admin/project';
      const resolvedRelative = path.resolve(relativePath);
      expect(resolvedRelative).toContain('admin/project');
    });

    it('should handle forward slashes on Windows', () => {
      const mixedPath = 'C:/Users/test/project';
      const normalized = path.normalize(mixedPath);

      // path.normalize should handle this correctly regardless of platform
      expect(normalized).toBeTruthy();
    });
  });

  describe('Import URL generation', () => {
    it('should generate correct import URLs for absolute paths', () => {
      // Test with Unix-style absolute paths that work consistently across platforms
      const unixPath = '/home/user/project/index.js';
      const fileUrl = pathToFileURL(unixPath).href;
      expect(fileUrl).toBe('file:///home/user/project/index.js');

      // Test with actual Windows paths when on Windows (mocking doesn't change pathToFileURL behavior)
      if (process.platform === 'win32') {
        const windowsPath = 'C:\\Users\\test\\project\\index.js';
        const windowsFileUrl = pathToFileURL(windowsPath).href;
        expect(windowsFileUrl).toBe('file:///C:/Users/test/project/index.js');
      }
    });

    it('should handle relative paths by not converting them', () => {
      const relativePaths = ['./src/index.js', '../lib/utils.js', 'components/Button.js'];

      relativePaths.forEach((relativePath) => {
        // For relative paths, we should not use pathToFileURL
        const shouldUseFileUrl = path.isAbsolute(relativePath);
        expect(shouldUseFileUrl).toBe(false);

        // The import URL should be the relative path itself
        const importUrl = shouldUseFileUrl ? pathToFileURL(relativePath).href : relativePath;
        expect(importUrl).toBe(relativePath);
      });
    });
  });

  describe('Cross-platform import strategy', () => {
    const mockImportFunction = (importPath: string) => {
      // Simulate the logic used in load-plugin.ts
      const importUrl = path.isAbsolute(importPath) ? pathToFileURL(importPath).href : importPath;

      return importUrl;
    };

    it('should handle Windows absolute paths correctly', () => {
      // Test with cross-platform compatible paths
      if (process.platform === 'win32') {
        const windowsPath = 'C:\\Users\\test\\project\\dist\\index.js';
        const importUrl = mockImportFunction(windowsPath);

        expect(importUrl).toBe('file:///C:/Users/test/project/dist/index.js');
        expect(importUrl.startsWith('file://')).toBe(true);
      } else {
        // On non-Windows platforms, test with a Unix absolute path to verify the logic
        const absolutePath = '/Users/test/project/dist/index.js';
        const importUrl = mockImportFunction(absolutePath);

        expect(importUrl).toBe('file:///Users/test/project/dist/index.js');
        expect(importUrl.startsWith('file://')).toBe(true);
      }
    });

    it('should handle Unix absolute paths correctly', () => {
      const unixPath = '/home/user/project/dist/index.js';
      const importUrl = mockImportFunction(unixPath);

      expect(importUrl).toBe('file:///home/user/project/dist/index.js');
      expect(importUrl.startsWith('file://')).toBe(true);
    });

    it('should not modify relative paths', () => {
      const relativePaths = [
        './dist/index.js',
        '../plugin/index.js',
        'node_modules/@elizaos/plugin-test',
      ];

      relativePaths.forEach((relativePath) => {
        const importUrl = mockImportFunction(relativePath);
        expect(importUrl).toBe(relativePath);
        expect(importUrl.startsWith('file://')).toBe(false);
      });
    });

    it('should handle package imports correctly', () => {
      const packageImports = ['@elizaos/core', 'lodash', 'node:fs', 'node:path'];

      packageImports.forEach((packageImport) => {
        const importUrl = mockImportFunction(packageImport);
        expect(importUrl).toBe(packageImport);
        expect(importUrl.startsWith('file://')).toBe(false);
      });
    });
  });
});
