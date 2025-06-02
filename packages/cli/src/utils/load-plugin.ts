import { logger } from '@elizaos/core';
import fs from 'node:fs';
import path from 'node:path';

interface PackageJson {
  module?: string;
  main?: string;
}

interface ImportStrategy {
  name: string;
  tryImport: (repository: string) => Promise<any | null>;
}

const DEFAULT_ENTRY_POINT = 'dist/index.js';

/**
 * Get the global node_modules path based on Node.js installation
 */
function getGlobalNodeModulesPath(): string {
  // process.execPath gives us the path to the node executable
  const nodeDir = path.dirname(process.execPath);

  if (process.platform === 'win32') {
    // On Windows, node_modules is typically in the same directory as node.exe
    return path.join(nodeDir, 'node_modules');
  } else {
    // On Unix systems, we go up one level from bin directory
    return path.join(nodeDir, '..', 'lib', 'node_modules');
  }
}

/**
 * Helper function to resolve a path within node_modules
 */
function resolveNodeModulesPath(repository: string, ...segments: string[]): string {
  return path.resolve(process.cwd(), 'node_modules', repository, ...segments);
}

/**
 * Helper function to resolve a path within workspace root node_modules
 */
function resolveWorkspaceNodeModulesPath(repository: string, ...segments: string[]): string {
  // Find workspace root by looking for package.json with workspaces field
  let currentDir = process.cwd();
  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.workspaces) {
          return path.resolve(currentDir, 'node_modules', repository, ...segments);
        }
      } catch (error) {
        // Continue searching
      }
    }
    currentDir = path.dirname(currentDir);
  }
  // Fallback to current directory if no workspace root found
  return path.resolve(process.cwd(), 'node_modules', repository, ...segments);
}

/**
 * Helper function to read and parse package.json
 */
async function readPackageJson(repository: string): Promise<PackageJson | null> {
  const packageJsonPath = resolveNodeModulesPath(repository, 'package.json');
  try {
    if (fs.existsSync(packageJsonPath)) {
      return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    }
  } catch (error) {
    logger.debug(`Failed to read package.json for '${repository}':`, error);
  }
  return null;
}

/**
 * Attempts to import a module from a given path and logs the outcome.
 */
async function tryImporting(
  importPath: string,
  strategy: string,
  repository: string,
  silentFailure = false
): Promise<any | null> {
  try {
    const module = await import(importPath);
    logger.success(`Successfully loaded plugin '${repository}' using ${strategy} (${importPath})`);
    return module;
  } catch (error) {
    if (!silentFailure) {
      logger.debug(`Import failed using ${strategy} ('${importPath}'):`, error);
    }
    return null;
  }
}

/**
 * Helper function to resolve a module using Node's resolution algorithm
 */
function resolveModulePath(repository: string, entryPoint?: string): string | null {
  try {
    // Try to resolve using Node's module resolution algorithm
    // This will check all node_modules directories in the hierarchy
    const modulePath = entryPoint
      ? require.resolve(`${repository}/${entryPoint}`)
      : require.resolve(repository);
    return modulePath;
  } catch (error) {
    // Module not found in npm paths
    return null;
  }
}

/**
 * Collection of import strategies
 */
const importStrategies: ImportStrategy[] = [
  // First try direct import for @elizaos packages (works with strict exports in monorepo)
  {
    name: 'direct import',
    tryImport: async (repository: string) => {
      if (!repository.startsWith('@elizaos/')) return null;
      return tryImporting(repository, 'direct import', repository, true);
    },
  },
  // Most likely to succeed for installed packages - check package.json entry first
  {
    name: 'package.json entry',
    tryImport: async (repository: string) => {
      const packageJson = await readPackageJson(repository);
      if (!packageJson) return null;

      const entryPoint = packageJson.module || packageJson.main || DEFAULT_ENTRY_POINT;
      return tryImporting(
        resolveNodeModulesPath(repository, entryPoint),
        `package.json entry (${entryPoint})`,
        repository,
        true
      );
    },
  },
  // Second most common - standard dist/index.js pattern
  {
    name: 'common dist pattern',
    tryImport: async (repository: string) => {
      const packageJson = await readPackageJson(repository);
      if (packageJson?.main === DEFAULT_ENTRY_POINT) return null;

      return tryImporting(
        resolveNodeModulesPath(repository, DEFAULT_ENTRY_POINT),
        'common dist pattern',
        repository,
        true
      );
    },
  },
  // Try local node_modules directory import (for packages without explicit entry)
  {
    name: 'local node_modules',
    tryImport: async (repository: string) =>
      tryImporting(resolveNodeModulesPath(repository), 'local node_modules', repository, true),
  },
  // Try workspace root node_modules (for monorepo setups)
  {
    name: 'workspace node_modules',
    tryImport: async (repository: string) =>
      tryImporting(resolveWorkspaceNodeModulesPath(repository), 'workspace node_modules', repository, true),
  },
  // Direct path import (for relative/absolute paths)
  {
    name: 'direct path',
    tryImport: async (repository: string) =>
      tryImporting(repository, 'direct path', repository, true),
  },
  // Least likely - global node_modules (usually for globally installed packages)
  {
    name: 'global node_modules',
    tryImport: async (repository: string) => {
      const globalPath = path.resolve(getGlobalNodeModulesPath(), repository);
      if (!fs.existsSync(path.dirname(globalPath))) {
        return null;
      }
      return tryImporting(globalPath, 'global node_modules', repository, true);
    },
  },
];

/**
 * Determines the optimal import strategy based on what's available
 */
async function getOptimalStrategy(repository: string): Promise<ImportStrategy | null> {
  // First, try to resolve using Node's module resolution (npm paths)
  const npmResolvedPath = resolveModulePath(repository);
  if (npmResolvedPath) {
    return {
      name: 'npm resolved path',
      tryImport: async () => tryImporting(npmResolvedPath, 'npm resolved path', repository),
    };
  }

  // If not found via npm, check package.json for specific entry point
  const packageJson = await readPackageJson(repository);
  if (packageJson) {
    const entryPoint = packageJson.module || packageJson.main || DEFAULT_ENTRY_POINT;

    // Try npm resolution with specific entry point
    const npmEntryPath = resolveModulePath(repository, entryPoint);
    if (npmEntryPath) {
      return {
        name: `npm package.json entry (${entryPoint})`,
        tryImport: async () =>
          tryImporting(npmEntryPath, `npm package.json entry (${entryPoint})`, repository),
      };
    }

    // Fall back to local node_modules with entry point
    const localEntryPath = resolveNodeModulesPath(repository, entryPoint);
    if (fs.existsSync(localEntryPath)) {
      return {
        name: `local package.json entry (${entryPoint})`,
        tryImport: async () =>
          tryImporting(localEntryPath, `local package.json entry (${entryPoint})`, repository),
      };
    }
  }

  // Try npm resolution with default entry point
  const npmDefaultPath = resolveModulePath(repository, DEFAULT_ENTRY_POINT);
  if (npmDefaultPath) {
    return {
      name: 'npm common dist pattern',
      tryImport: async () => tryImporting(npmDefaultPath, 'npm common dist pattern', repository),
    };
  }

  // Fall back to local node_modules with common dist pattern
  const commonDistPath = resolveNodeModulesPath(repository, DEFAULT_ENTRY_POINT);
  if (fs.existsSync(commonDistPath)) {
    return {
      name: 'local common dist pattern',
      tryImport: async () => tryImporting(commonDistPath, 'local common dist pattern', repository),
    };
  }

  // Finally, try local node_modules root
  const localNodeModulesPath = resolveNodeModulesPath(repository);
  if (fs.existsSync(localNodeModulesPath)) {
    return {
      name: 'local node_modules',
      tryImport: async () => tryImporting(localNodeModulesPath, 'local node_modules', repository),
    };
  }

  return null;
}

/**
 * Attempts to load a plugin module using various strategies.
 * First tries to find the optimal path, then falls back to trying all strategies.
 *
 * @param repository - The plugin repository/package name to load.
 * @returns The loaded plugin module or null if loading fails after all attempts.
 */
export async function loadPluginModule(repository: string): Promise<any | null> {
  //logger.debug(`Attempting to load plugin module: ${repository}`);

  const optimalStrategy = await getOptimalStrategy(repository);
  if (optimalStrategy) {
    const result = await optimalStrategy.tryImport(repository);
    if (result) return result;
  }

  for (const strategy of importStrategies) {
    const result = await strategy.tryImport(repository);
    if (result) return result;
  }

  logger.warn(`Failed to load plugin module '${repository}' using all available strategies.`);
  return null;
}
