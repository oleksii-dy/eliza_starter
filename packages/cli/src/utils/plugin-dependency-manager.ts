import { logger } from '@elizaos/core';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { executeInstallation } from './package-manager';

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  overrides?: Record<string, any>;
  [key: string]: any;
}

interface PackageLockEntry {
  version: string;
  resolved?: string;
  integrity?: string;
  dependencies?: Record<string, PackageLockEntry>;
}

interface DependencyCheckResult {
  missing: Array<{ name: string; version: string; type: 'dependency' | 'peerDependency' }>;
  optional: Array<{ name: string; version: string }>;
  isValid: boolean;
}

/**
 * Get the package.json path for a plugin in node_modules
 */
function getPluginPackageJsonPath(pluginName: string): string {
  return path.resolve(process.cwd(), 'node_modules', pluginName, 'package.json');
}

/**
 * Check if a package exists in node_modules
 */
function isPackageInstalled(packageName: string): boolean {
  try {
    const packagePath = path.resolve(process.cwd(), 'node_modules', packageName);
    return existsSync(packagePath) && existsSync(path.join(packagePath, 'package.json'));
  } catch {
    return false;
  }
}

/**
 * Read package-lock.json to understand locked versions
 * @internal exported for testing
 */
export function readPackageLock(): Record<string, PackageLockEntry> | null {
  const packageLockPath = path.resolve(process.cwd(), 'package-lock.json');

  try {
    if (existsSync(packageLockPath)) {
      const content = readFileSync(packageLockPath, 'utf-8');
      const lockData = JSON.parse(content);
      return lockData.packages || lockData.dependencies || {};
    }
  } catch (error) {
    logger.debug('Failed to read package-lock.json:', error);
  }

  return null;
}

/**
 * Validate package name and version for basic security
 */
function isPackageSecure(packageName: string, version: string): boolean {
  // Validate package name follows npm naming conventions
  if (!/^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(packageName)) {
    logger.warn(`Invalid package name format: ${packageName}`);
    return false;
  }

  // Validate version string format
  if (!/^[\^~>=<\s]*[\d.]+[\w.-]*$/.test(version)) {
    logger.warn(`Invalid version format: ${version}`);
    return false;
  }

  // Check for obviously malicious package names
  const suspiciousPatterns = [
    /^(sudo|rm|del|format|mkfs|kill|exec|eval|system)/,
    /password.*steal|keylog|backdoor|malware|virus/i,
    /^[0-9]+$/, // Numeric-only names are often suspicious
    /_.*_.*_/, // Multiple underscores can indicate typosquatting
  ];

  if (suspiciousPatterns.some((pattern) => pattern.test(packageName))) {
    logger.warn(`Suspicious package name detected: ${packageName}`);
    return false;
  }

  return true;
}

/**
 * Read and parse package.json for a plugin
 */
async function readPluginPackageJson(pluginName: string): Promise<PackageJson | null> {
  const packageJsonPath = getPluginPackageJsonPath(pluginName);

  try {
    if (existsSync(packageJsonPath)) {
      const content = readFileSync(packageJsonPath, 'utf-8');
      return JSON.parse(content) as PackageJson;
    }
  } catch (error) {
    logger.debug(`Failed to read package.json for plugin '${pluginName}':`, error);
  }

  return null;
}

/**
 * Check which dependencies are missing for a plugin
 */
export async function checkPluginDependencies(pluginName: string): Promise<DependencyCheckResult> {
  const packageJson = await readPluginPackageJson(pluginName);

  if (!packageJson) {
    logger.debug(`No package.json found for plugin '${pluginName}', skipping dependency check`);
    return { missing: [], optional: [], isValid: true };
  }

  const missing: Array<{ name: string; version: string; type: 'dependency' | 'peerDependency' }> =
    [];
  const optional: Array<{ name: string; version: string }> = [];

  // Check regular dependencies
  if (packageJson.dependencies) {
    for (const [depName, version] of Object.entries(packageJson.dependencies)) {
      // Skip ElizaOS core packages as they should already be available
      if (depName.startsWith('@elizaos/')) {
        continue;
      }

      // Security check
      if (!isPackageSecure(depName, version)) {
        logger.warn(`Potentially unsafe dependency detected: ${depName}@${version}`);
        continue;
      }

      if (!isPackageInstalled(depName)) {
        missing.push({ name: depName, version, type: 'dependency' });
      }
    }
  }

  // Check peer dependencies
  if (packageJson.peerDependencies) {
    for (const [depName, version] of Object.entries(packageJson.peerDependencies)) {
      // Skip ElizaOS core packages
      if (depName.startsWith('@elizaos/')) {
        continue;
      }

      // Security check
      if (!isPackageSecure(depName, version)) {
        logger.warn(`Potentially unsafe peer dependency detected: ${depName}@${version}`);
        continue;
      }

      if (!isPackageInstalled(depName)) {
        missing.push({ name: depName, version, type: 'peerDependency' });
        // Provide additional guidance for peer dependencies
        logger.info(`Peer dependency '${depName}' should be installed in your project root`);
      }
    }
  }

  // Check optional dependencies
  if (packageJson.optionalDependencies) {
    for (const [depName, version] of Object.entries(packageJson.optionalDependencies)) {
      if (!depName.startsWith('@elizaos/') && !isPackageInstalled(depName)) {
        optional.push({ name: depName, version });
      }
    }
  }

  return {
    missing,
    optional,
    isValid: missing.length === 0,
  };
}

/**
 * Install missing dependencies for a plugin
 */
export async function installPluginDependencies(
  pluginName: string,
  targetDirectory: string = process.cwd()
): Promise<boolean> {
  const dependencyCheck = await checkPluginDependencies(pluginName);

  if (dependencyCheck.isValid) {
    logger.debug(`All dependencies satisfied for plugin '${pluginName}'`);
    return true;
  }

  logger.info(
    `Installing ${dependencyCheck.missing.length} missing dependencies for plugin '${pluginName}'`
  );

  // Install missing regular and peer dependencies
  for (const dep of dependencyCheck.missing) {
    logger.debug(`Installing ${dep.type}: ${dep.name}@${dep.version}`);

    try {
      const result = await executeInstallation(dep.name, dep.version, targetDirectory);

      if (!result.success) {
        logger.error(`Failed to install ${dep.type} '${dep.name}' for plugin '${pluginName}'`);

        // Provide helpful guidance for common issues
        if (dep.type === 'peerDependency') {
          logger.info(
            `Consider installing peer dependency manually: npm install ${dep.name}@${dep.version}`
          );
          logger.info(`Or use --legacy-peer-deps flag if using npm 7+`);
        }

        return false;
      }

      logger.debug(`Successfully installed ${dep.type}: ${dep.name}@${dep.version}`);
    } catch (error) {
      logger.error(`Error installing ${dep.type} '${dep.name}' for plugin '${pluginName}':`, error);

      // Provide context-specific error guidance
      if (error instanceof Error) {
        if (error.message.includes('EACCES')) {
          logger.info('Permission denied. Try running with sudo or check npm permissions');
        } else if (error.message.includes('ENOTFOUND')) {
          logger.info('Network error. Check your internet connection and npm registry settings');
        } else if (error.message.includes('peer dep')) {
          logger.info(
            'Peer dependency conflict. Consider using --legacy-peer-deps or resolving version conflicts'
          );
        }
      }

      return false;
    }
  }

  // Attempt to install optional dependencies (failures are non-fatal)
  for (const dep of dependencyCheck.optional) {
    logger.debug(`Installing optional dependency: ${dep.name}@${dep.version}`);

    try {
      const result = await executeInstallation(dep.name, dep.version, targetDirectory);

      if (result.success) {
        logger.debug(`Successfully installed optional dependency: ${dep.name}@${dep.version}`);
      } else {
        logger.warn(
          `Failed to install optional dependency '${dep.name}' for plugin '${pluginName}' (non-fatal)`
        );
      }
    } catch (error) {
      logger.warn(
        `Error installing optional dependency '${dep.name}' for plugin '${pluginName}' (non-fatal):`,
        error
      );
    }
  }

  // Verify all required dependencies are now installed
  const finalCheck = await checkPluginDependencies(pluginName);

  if (!finalCheck.isValid) {
    logger.error(
      `Plugin '${pluginName}' still has missing dependencies after installation attempt`
    );
    return false;
  }

  logger.success(`All dependencies successfully installed for plugin '${pluginName}'`);
  return true;
}

/**
 * Validate that a plugin's dependencies are satisfied before loading
 */
export async function validatePluginDependencies(pluginName: string): Promise<{
  isValid: boolean;
  missingDependencies: string[];
  message?: string;
}> {
  const dependencyCheck = await checkPluginDependencies(pluginName);

  if (dependencyCheck.isValid) {
    return { isValid: true, missingDependencies: [] };
  }

  const missingNames = dependencyCheck.missing.map((dep) => `${dep.name}@${dep.version}`);

  return {
    isValid: false,
    missingDependencies: missingNames,
    message: `Plugin '${pluginName}' has ${dependencyCheck.missing.length} missing dependencies: ${missingNames.join(', ')}`,
  };
}
