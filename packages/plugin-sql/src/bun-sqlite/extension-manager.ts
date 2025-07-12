import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@elizaos/core';

/**
 * SQLite-vec Extension Manager
 *
 * This module handles finding, copying, and loading sqlite-vec extensions
 * to ensure they work everywhere, regardless of workspace setup
 */

interface ExtensionInfo {
  platform: string;
  filename: string;
  packageName: string;
}

const EXTENSION_MAP: ExtensionInfo[] = [
  { platform: 'darwin', filename: 'vec0.dylib', packageName: 'sqlite-vec-darwin-arm64' },
  { platform: 'darwin', filename: 'vec0.dylib', packageName: 'sqlite-vec-darwin-x64' },
  { platform: 'win32', filename: 'vec0.dll', packageName: 'sqlite-vec-win32-x64' },
  { platform: 'linux', filename: 'vec0.so', packageName: 'sqlite-vec-linux-x64' },
];

export class SqliteVecExtensionManager {
  private static extensionCache: Map<string, string> = new Map();

  /**
   * Find the sqlite-vec extension for the current platform
   */
  static findExtension(): string | null {
    const platform = process.platform;
    const cacheKey = `${platform}-${process.arch}`;

    // Check cache first
    if (this.extensionCache.has(cacheKey)) {
      const cachedPath = this.extensionCache.get(cacheKey)!;
      if (fs.existsSync(cachedPath)) {
        return cachedPath;
      }
    }

    logger.debug(
      `[ExtensionManager] Looking for sqlite-vec extension for ${platform}-${process.arch}`
    );

    // Get potential extensions for this platform
    const platformExtensions = EXTENSION_MAP.filter((ext) => ext.platform === platform);

    for (const ext of platformExtensions) {
      const extensionPath = this.findExtensionInPackage(ext.packageName, ext.filename);
      if (extensionPath) {
        logger.info(`[ExtensionManager] Found sqlite-vec extension at: ${extensionPath}`);
        this.extensionCache.set(cacheKey, extensionPath);
        return extensionPath;
      }
    }

    logger.error(
      `[ExtensionManager] No sqlite-vec extension found for ${platform}-${process.arch}`
    );
    return null;
  }

  /**
   * Find extension in a specific package
   */
  private static findExtensionInPackage(packageName: string, filename: string): string | null {
    const searchPaths = [
      // Packaged extensions directory (distributed with plugin)
      path.resolve(__dirname, '..', '..', 'extensions', filename),
      path.resolve(__dirname, '..', '..', 'extensions', `${process.platform}-${filename}`),
      // Current package node_modules
      path.resolve(process.cwd(), 'node_modules', packageName, filename),
      // Parent directories node_modules (workspace)
      path.resolve(process.cwd(), '..', 'node_modules', packageName, filename),
      path.resolve(process.cwd(), '..', '..', 'node_modules', packageName, filename),
      path.resolve(process.cwd(), '..', '..', '..', 'node_modules', packageName, filename),
      // Global node_modules
      path.resolve(__dirname, '..', '..', '..', '..', 'node_modules', packageName, filename),
      path.resolve(__dirname, '..', '..', '..', '..', '..', 'node_modules', packageName, filename),
    ];

    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        logger.debug(`[ExtensionManager] Found extension at: ${searchPath}`);
        return searchPath;
      }
    }

    logger.debug(`[ExtensionManager] Extension ${filename} not found in package ${packageName}`);
    return null;
  }

  /**
   * Copy extension to a local cache directory for reliable access
   */
  static async ensureExtensionAvailable(): Promise<string | null> {
    const extensionPath = this.findExtension();
    if (!extensionPath) {
      return null;
    }

    // Create local cache directory
    const cacheDir = path.resolve(process.cwd(), '.eliza', 'extensions');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const filename = path.basename(extensionPath);
    const cachedPath = path.join(cacheDir, filename);

    // Copy if not exists or if source is newer
    if (!fs.existsSync(cachedPath) || this.isSourceNewer(extensionPath, cachedPath)) {
      try {
        fs.copyFileSync(extensionPath, cachedPath);
        logger.info(`[ExtensionManager] Copied sqlite-vec extension to: ${cachedPath}`);
      } catch (error) {
        logger.error(`[ExtensionManager] Failed to copy extension:`, error);
        return extensionPath; // Fallback to original path
      }
    }

    return cachedPath;
  }

  /**
   * Check if source file is newer than destination
   */
  private static isSourceNewer(sourcePath: string, destPath: string): boolean {
    try {
      const sourceStats = fs.statSync(sourcePath);
      const destStats = fs.statSync(destPath);
      return sourceStats.mtime > destStats.mtime;
    } catch {
      return true; // If can't stat, assume source is newer
    }
  }

  /**
   * Package extensions with the plugin for distribution
   */
  static async packageExtensions(): Promise<void> {
    const extensionsDir = path.resolve(__dirname, '..', '..', 'extensions');

    if (!fs.existsSync(extensionsDir)) {
      fs.mkdirSync(extensionsDir, { recursive: true });
    }

    logger.info('[ExtensionManager] Packaging sqlite-vec extensions...');

    for (const ext of EXTENSION_MAP) {
      const sourcePath = this.findExtensionInPackage(ext.packageName, ext.filename);
      if (sourcePath) {
        const destPath = path.join(extensionsDir, `${ext.platform}-${ext.filename}`);
        try {
          fs.copyFileSync(sourcePath, destPath);
          logger.info(`[ExtensionManager] Packaged ${ext.filename} for ${ext.platform}`);
        } catch (error) {
          logger.warn(`[ExtensionManager] Failed to package ${ext.filename}:`, error);
        }
      }
    }
  }

  /**
   * Get all available extensions info
   */
  static getAvailableExtensions(): { platform: string; path: string | null }[] {
    return EXTENSION_MAP.map((ext) => ({
      platform: `${ext.platform}-${ext.filename}`,
      path: this.findExtensionInPackage(ext.packageName, ext.filename),
    }));
  }
}
