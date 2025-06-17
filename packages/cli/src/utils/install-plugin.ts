import { logger } from '@elizaos/core';
import fs from 'node:fs';
import path from 'node:path';
import { loadPluginModule } from './load-plugin';
import { executeInstallation, executeInstallationWithFallback } from './package-manager';
import { fetchPluginRegistry } from './plugin-discovery';
import { normalizePluginName } from './registry';
import { detectPluginContext } from './plugin-context';

/**
 * Get the CLI's installation directory when running globally
 * @returns {string|null} - The path to the CLI's directory or null if not found
 */
function getCliDirectory(): string | null {
  try {
    // Get the path to the running CLI script
    const cliPath = process.argv[1];

    // For global installations, this will be something like:
    // /usr/local/lib/node_modules/@elizaos/cli/dist/index.js

    if (cliPath.includes('node_modules/@elizaos/cli')) {
      // Go up to the CLI package root
      const cliDir = path.dirname(
        cliPath.split('node_modules/@elizaos/cli')[0] + 'node_modules/@elizaos/cli'
      );

      // Verify this is actually the CLI directory
      if (fs.existsSync(path.join(cliDir, 'package.json'))) {
        return cliDir;
      }
    }

    return null;
  } catch (error) {
    logger.error('Failed to determine CLI directory:', error);
    return null;
  }
}

/**
 * Check if a plugin exists in the workspace
 * @param {string} packageName - The plugin package name
 * @returns {boolean} - Whether the plugin exists in the workspace
 */
function isWorkspacePlugin(packageName: string): boolean {
  // Check if it's an @elizaos scoped package
  if (packageName.startsWith('@elizaos/')) {
    // Try to find the plugin in the workspace
    const pluginName = packageName.replace('@elizaos/', '');
    const workspacePaths = [
      path.resolve(process.cwd(), '..', pluginName),
      path.resolve(process.cwd(), '..', '..', 'packages', pluginName),
    ];

    for (const workspacePath of workspacePaths) {
      if (fs.existsSync(path.join(workspacePath, 'package.json'))) {
        logger.debug(`Found workspace plugin at: ${workspacePath}`);
        return true;
      }
    }
  }
  return false;
}

/**
 * Verifies if a plugin can be imported
 * @param {string} repository - The plugin repository/package name to import
 * @param {string} context - Description of the installation context for logging
 * @returns {boolean} - Whether the import was successful
 */
async function verifyPluginImport(repository: string, context: string): Promise<boolean> {
  // Use the new centralized loader function
  const loadedModule = await loadPluginModule(repository);

  if (loadedModule) {
    logger.debug(`Successfully verified plugin ${repository} ${context} after installation.`);
    return true;
  } else {
    // The loadPluginModule function already logs detailed errors
    logger.warn(`Plugin ${repository} installed ${context} but could not be loaded/verified.`);
    return false;
  }
}

/**
 * Attempts to install a plugin in a specific directory
 * @param {string} repository - The plugin repository to install
 * @param {string} versionString - Version string for installation
 * @param {string} directory - Directory to install in
 * @param {string} context - Description of the installation context for logging
 * @param {boolean} skipVerification - Whether to skip import verification
 * @returns {boolean} - Whether the installation and import verification was successful
 */
async function attemptInstallation(
  packageName: string,
  versionString: string,
  directory: string,
  context: string,
  skipVerification = false
): Promise<boolean> {
  logger.debug(`Attempting to install plugin ${context}...`);

  try {
    // Use centralized installation function which now returns success status and identifier
    const installResult = await executeInstallation(packageName, versionString, directory);

    // If installation failed, return false immediately
    if (!installResult.success || !installResult.installedIdentifier) {
      logger.warn(`Installation failed for plugin ${context}`);
      return false;
    }

    // If installed via direct GitHub specifier, skip import verification
    if (packageName.startsWith('github:')) {
      return true;
    }
    if (skipVerification || process.env.ELIZA_SKIP_PLUGIN_VERIFY) {
      logger.info(
        `Installation successful for ${installResult.installedIdentifier}, skipping verification`
      );
      return true;
    }
    logger.debug(
      `Installation successful for ${installResult.installedIdentifier}, verifying import...`
    );
    return await verifyPluginImport(installResult.installedIdentifier, context);
  } catch (installError) {
    // Catch any unexpected errors during the process
    logger.warn(
      `Error during installation attempt ${context}: ${installError instanceof Error ? installError.message : String(installError)}`
    );
    return false;
  }
}

/**
 * Asynchronously installs a plugin to a specified directory.
 *
 * Cascading order:
 * 1. Check if already in local node_modules (workspace)
 * 2. Check plugin registry
 * 3. Check if available in global node_modules (handled by load flow)
 * 4. Try NPM installation
 * 5. Fallback to GitHub at /elizaos-plugins/plugin-<name>
 *
 * @param {string} packageName - The repository URL of the plugin to install.
 * @param {string} cwd - The current working directory where the plugin will be installed.
 * @param {string} versionSpecifier - The specific version of the plugin to install.
 * @param {boolean} skipVerification - Whether to skip import verification.
 * @returns {Promise<boolean>} - A Promise that resolves to true if the plugin is successfully installed, or false otherwise.
 */
export async function installPlugin(
  packageName: string,
  cwd: string,
  versionSpecifier?: string,
  skipVerification = false
): Promise<boolean> {
  logger.debug(`Installing plugin: ${packageName}`);

  // 1. Check if it's already available in local node_modules or workspace
  if (isWorkspacePlugin(packageName)) {
    logger.info(`Plugin ${packageName} is available in the workspace`);

    // Try to load it to verify it's accessible
    const module = await loadPluginModule(packageName);
    if (module) {
      logger.success(`Workspace plugin ${packageName} is available and accessible`);
      return true;
    } else {
      logger.warn(
        `Workspace plugin ${packageName} exists but could not be loaded. It may need to be built.`
      );
      logger.info(`Try running 'bun run build' in the plugin directory.`);
      return false;
    }
  }

  // Check if already available in local node_modules
  const localNodeModulesPath = path.join(cwd, 'node_modules', packageName);
  if (fs.existsSync(localNodeModulesPath)) {
    logger.info(`Plugin ${packageName} already exists in local node_modules`);
    const module = await loadPluginModule(packageName);
    if (module) {
      logger.success(`Plugin ${packageName} is already installed and working`);
      return true;
    }
  }

  // Check if we're trying to install a plugin into its own directory
  const context = detectPluginContext(packageName);
  if (context.isLocalDevelopment) {
    logger.warn(`Prevented self-installation of plugin ${packageName}`);
    logger.info(
      `You're developing this plugin locally. Use 'bun run build' to build it instead of installing.`
    );
    return false;
  }

  const cliDir = getCliDirectory();

  // Direct GitHub installation (if specified explicitly)
  if (packageName.startsWith('github:')) {
    return await attemptInstallation(packageName, '', cwd, '', skipVerification);
  }

  // Handle full GitHub URLs as well
  const httpsGitHubUrlRegex =
    /^https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?(?:#([a-zA-Z0-9_.-]+))?\/?$/;
  const httpsMatch = packageName.match(httpsGitHubUrlRegex);
  if (httpsMatch) {
    const [, owner, repo, ref] = httpsMatch;
    const spec = `github:${owner}/${repo}${ref ? `#${ref}` : ''}`;
    return await attemptInstallation(spec, '', cwd, '', skipVerification);
  }

  // 2. Check plugin registry
  const cache = await fetchPluginRegistry();
  const possible = normalizePluginName(packageName);

  let key: string | null = null;
  for (const name of possible) {
    if (cache?.registry[name]) {
      key = name;
      break;
    }
  }

  if (!key && cache && cache.registry) {
    // Fuzzy search by stripped base name
    let base = packageName;
    if (base.includes('/')) {
      const parts = base.split('/');
      base = parts[parts.length - 1];
    }
    base = base.replace(/^@/, '').replace(/^(plugin|client)-/, '');
    const lower = base.toLowerCase();

    const matches = Object.keys(cache.registry).filter(
      (cand) => cand.toLowerCase().includes(lower) && !cand.includes('client-')
    );

    if (matches.length > 0) {
      const pluginMatch = matches.find((c) => c.includes('plugin-'));
      key = pluginMatch || matches[0];
    }
  }

  if (key && cache) {
    const info = cache.registry[key];

    // Extract GitHub fallback information if available
    const githubFallback = info.git?.repo;
    const githubVersion = info.git?.v1?.branch || info.git?.v1?.version || '';

    // Try registry installation with NPM
    if (info.npm?.repo) {
      const ver = versionSpecifier || info.npm.v1 || '';
      const result = await executeInstallationWithFallback(info.npm.repo, ver, cwd, githubFallback);

      if (result.success) {
        // Verify import if not a GitHub install
        if (
          !info.npm.repo.startsWith('github:') &&
          !skipVerification &&
          !process.env.ELIZA_SKIP_PLUGIN_VERIFY
        ) {
          const importSuccess = await verifyPluginImport(
            result.installedIdentifier || info.npm.repo,
            'from registry'
          );
          return importSuccess;
        }
        return true;
      }
    } else if (info.npm?.v1) {
      const result = await executeInstallationWithFallback(key, info.npm.v1, cwd, githubFallback);

      if (result.success) {
        // Verify import if not a GitHub install
        if (!skipVerification && !process.env.ELIZA_SKIP_PLUGIN_VERIFY) {
          const importSuccess = await verifyPluginImport(
            result.installedIdentifier || key,
            'from registry'
          );
          return importSuccess;
        }
        return true;
      }
    }

    // Registry install failed, try GitHub fallback from registry
    if (info.git?.repo && cliDir) {
      const spec = `github:${info.git.repo}${githubVersion ? `#${githubVersion}` : ''}`;
      return await attemptInstallation(
        spec,
        '',
        cliDir,
        'from registry GitHub fallback',
        skipVerification
      );
    }
  }

  // 4. Try direct NPM installation (if not in registry)
  logger.debug(`Plugin ${packageName} not found in registry, attempting NPM installation`);
  const npmResult = await attemptInstallation(
    packageName,
    versionSpecifier || '',
    cwd,
    'from NPM',
    skipVerification
  );

  if (npmResult) {
    return true;
  }

  // 5. Final fallback: GitHub at /elizaos-plugins/plugin-<name>
  let pluginBaseName = packageName;
  if (pluginBaseName.startsWith('@elizaos/')) {
    pluginBaseName = pluginBaseName.replace('@elizaos/', '');
  } else if (!pluginBaseName.startsWith('plugin-')) {
    pluginBaseName = `plugin-${pluginBaseName}`;
  }

  const githubFallbackSpec = `github:elizaos-plugins/${pluginBaseName}`;
  logger.debug(`Attempting final GitHub fallback: ${githubFallbackSpec}`);

  return await attemptInstallation(
    githubFallbackSpec,
    '',
    cwd,
    'from GitHub fallback',
    skipVerification
  );
}
