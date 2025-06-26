import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '@elizaos/core';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if a directory is within a workspace context and find workspace root
 */
function getWorkspaceInfo(targetDir: string): { isInWorkspace: boolean; workspaceRoot?: string } {
  try {
    let currentDir = path.resolve(targetDir);

    // Walk up the directory tree looking for a workspace root
    while (currentDir !== path.dirname(currentDir)) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf-8'));
          // Check for workspace configuration
          if (packageJson.workspaces || packageJson.bun?.workspace) {
            return { isInWorkspace: true, workspaceRoot: currentDir };
          }
        } catch {
          // Ignore invalid package.json files
        }
      }
      currentDir = path.dirname(currentDir);
    }

    return { isInWorkspace: false };
  } catch {
    return { isInWorkspace: false };
  }
}

/**
 * Check if a directory is within a workspace context
 */
// function isInWorkspace(targetDir: string): boolean {
//   return getWorkspaceInfo(targetDir).isInWorkspace;
// }

/**
 * Find the path to a workspace package
 */
function findWorkspacePackagePath(packageName: string, workspaceRoot: string): string | null {
  try {
    // Convert package name to directory name (e.g., @elizaos/plugin-message-handling -> plugin-message-handling)
    const dirName = packageName.replace('@elizaos/', '');

    // Check common workspace locations
    const possiblePaths = [
      path.join(workspaceRoot, 'packages', dirName),
      path.join(workspaceRoot, 'packages', dirName.replace('plugin-', '')),
      path.join(workspaceRoot, 'plugin-specification', dirName),
    ];

    for (const possiblePath of possiblePaths) {
      const packageJsonPath = path.join(possiblePath, 'package.json');
      if (existsSync(packageJsonPath)) {
        try {
          const pkgJson = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf-8'));
          if (pkgJson.name === packageName) {
            return possiblePath;
          }
        } catch {
          // Ignore invalid package.json files
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Copy a directory recursively
 */
/**
 * Asynchronously copies the contents of a directory from a source path to a destination path, excluding specified files and directories.
 * If the destination directory does not exist, it will be created.
 *
 * @param {string} src - The path to the source directory.
 * @param {string} dest - The path to the destination directory.
 * @param {string[]} [exclude=[]] - An array of file and directory names to exclude from the copy operation.
 * @returns {Promise<void>} A Promise that resolves when the copy operation is complete.
 */
export async function copyDir(src: string, dest: string, exclude: string[] = []) {
  // Ensure paths are properly resolved as absolute paths
  const resolvedSrc = path.resolve(src);
  const resolvedDest = path.resolve(dest);

  // Create destination directory if it doesn't exist
  await fs.mkdir(resolvedDest, { recursive: true });

  // Read source directory
  const entries = await fs.readdir(resolvedSrc, { withFileTypes: true });

  // Separate files and directories for different processing strategies
  const files: typeof entries = [];
  const directories: typeof entries = [];

  for (const entry of entries) {
    // Skip excluded directories/files
    if (exclude.includes(entry.name)) {
      continue;
    }

    // Skip node_modules, .git directories and other build artifacts
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === 'cache' ||
      entry.name === 'data' ||
      entry.name === 'generatedImages' ||
      entry.name === '.turbo'
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      directories.push(entry);
    } else {
      files.push(entry);
    }
  }

  // Process files in parallel (up to 10 concurrent operations)
  const MAX_CONCURRENT_FILES = 10;
  const filePromises: Promise<void>[] = [];

  for (let i = 0; i < files.length; i += MAX_CONCURRENT_FILES) {
    const batch = files.slice(i, i + MAX_CONCURRENT_FILES);
    const batchPromises = batch.map(async (entry) => {
      const srcPath = path.join(resolvedSrc, entry.name);
      const destPath = path.join(resolvedDest, entry.name);
      await fs.copyFile(srcPath, destPath);
    });
    filePromises.push(...batchPromises);
  }

  // Wait for all file copies to complete
  await Promise.all(filePromises);

  // Process directories sequentially to avoid too much recursion depth
  // but still get benefits from parallel file copying within each directory
  for (const entry of directories) {
    const srcPath = path.join(resolvedSrc, entry.name);
    const destPath = path.join(resolvedDest, entry.name);
    await copyDir(srcPath, destPath, exclude);
  }
}

/**
 * Map template types to actual package names
 */
function getPackageName(templateType: string): string {
  switch (templateType) {
    case 'project-tee-starter':
      return 'project-tee-starter';
    case 'plugin':
      return 'plugin-starter';
    case 'project':
    case 'project-starter':
    default:
      return 'project-starter';
  }
}

/**
 * Copy a project or plugin template to target directory
 */
export async function copyTemplate(
  templateType: 'project' | 'project-starter' | 'project-tee-starter' | 'plugin',
  targetDir: string
) {
  const packageName = getPackageName(templateType);

  // Try multiple locations to find templates, handling different runtime environments
  const possibleTemplatePaths = [
    // 1. Direct path from source directory (for tests and development)
    path.resolve(__dirname, '../../templates', packageName),
    // 2. Production: templates bundled with the CLI dist
    path.resolve(
      path.dirname(require.resolve('@elizaos/cli/package.json')),
      'dist',
      'templates',
      packageName
    ),
    // 3. Development/Test: templates in the CLI package root
    path.resolve(
      path.dirname(require.resolve('@elizaos/cli/package.json')),
      'templates',
      packageName
    ),
    // 4. Fallback: relative to current module (for built dist)
    path.resolve(__dirname, '..', 'templates', packageName),
    // 5. Additional fallback: relative to dist directory
    path.resolve(__dirname, '..', '..', 'templates', packageName),
  ];

  let templateDir: string | null = null;
  for (const possiblePath of possibleTemplatePaths) {
    if (existsSync(possiblePath)) {
      templateDir = possiblePath;
      break;
    }
  }

  if (!templateDir) {
    throw new Error(
      `Template '${packageName}' not found. Searched in:\n${possibleTemplatePaths.join('\n')}`
    );
  }

  logger.debug(`Copying ${templateType} template from ${templateDir} to ${targetDir}`);

  // Copy template files as-is
  await copyDir(templateDir, targetDir);

  // For plugin templates, replace hardcoded "plugin-starter" strings in source files
  if (templateType === 'plugin') {
    const pluginNameFromPath = path.basename(targetDir);
    await replacePluginNameInFiles(targetDir, pluginNameFromPath);
  }

  // Update package.json with dependency versions only (leave placeholders intact)
  const packageJsonPath = path.join(targetDir, 'package.json');

  try {
    // Get the CLI package version for dependency updates
    // const cliPackageJsonPath = path.resolve(
    //   path.dirname(require.resolve('@elizaos/cli/package.json')),
    //   'package.json'
    // );

    // const cliPackageJson = JSON.parse(await fs.readFile(cliPackageJsonPath, 'utf8'));
    // const _cliPackageVersion = cliPackageJson.version;

    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    // Remove private field from template package.json since templates should be usable by users
    if (packageJson.private) {
      delete packageJson.private;
      logger.debug('Removed private field from template package.json');
    }

    // Get workspace information
    const workspaceInfo = getWorkspaceInfo(targetDir);
    const isOutsideWorkspace = !workspaceInfo.isInWorkspace;

    // Only use published versions if we're truly outside the workspace OR in CI/production environments
    const isProductionEnvironment =
      process.env.CI === 'true' || process.env.NODE_ENV === 'production';

    // Additional check: if target directory is in a system tmp path (not workspace temp)
    const isSystemTempDirectory =
      targetDir.includes('/tmp/') ||
      targetDir.includes('/var/folders/') ||
      targetDir.startsWith(require('os').tmpdir());

    // For workspace dependencies that don't exist as published packages, use file: protocol when inside workspace
    const shouldUseFileProtocol =
      workspaceInfo.isInWorkspace && !isProductionEnvironment && !isSystemTempDirectory;

    // Check if we're in a test environment
    const isTestEnvironment =
      process.env.NODE_ENV === 'test' ||
      process.env.VITEST === 'true' ||
      process.env.ELIZA_TEST_MODE === 'true';

    // Define which packages are published to npm vs workspace-only
    const publishedPackages = [
      '@elizaos/cli',
      '@elizaos/plugin-discord',
      // Note: @elizaos/core, @elizaos/plugin-sql, and @elizaos/plugin-message-handling are currently workspace-only, not published to npm
    ];

    const isPublishedPackage = (packageName: string): boolean => {
      return publishedPackages.includes(packageName);
    };

    // Only update dependency versions - leave everything else unchanged
    if (packageJson.dependencies) {
      for (const depName of Object.keys(packageJson.dependencies)) {
        if (depName.startsWith('@elizaos/')) {
          // Remove plugin-sql in test environments (use in-memory database instead)
          if (isTestEnvironment && depName === '@elizaos/plugin-sql') {
            logger.info(`Removing ${depName} for test environment (using in-memory database)`);
            delete packageJson.dependencies[depName];
            continue;
          }

          if (
            isPublishedPackage(depName) ||
            (isOutsideWorkspace && !isTestEnvironment) ||
            (isProductionEnvironment && !isTestEnvironment) ||
            (isSystemTempDirectory && !isTestEnvironment)
          ) {
            logger.info(
              `Setting ${depName} to use published version: latest (outside=${isOutsideWorkspace}, production=${isProductionEnvironment}, systemTemp=${isSystemTempDirectory}, test=${isTestEnvironment})`
            );
            packageJson.dependencies[depName] = 'latest';
          } else if (
            isTestEnvironment &&
            (isOutsideWorkspace || isSystemTempDirectory) &&
            !isPublishedPackage(depName)
          ) {
            // In test environment, skip workspace-only packages that would fail resolution
            logger.info(
              `Removing workspace-only dependency ${depName} in test environment (outside workspace or system temp)`
            );
            delete packageJson.dependencies[depName];
            continue;
          } else if (shouldUseFileProtocol && workspaceInfo.workspaceRoot) {
            // Use file: protocol for workspace-only packages to avoid workspace resolution issues
            const packagePath = findWorkspacePackagePath(depName, workspaceInfo.workspaceRoot);
            if (packagePath) {
              logger.info(`Setting ${depName} to use file path: ${packagePath}`);
              packageJson.dependencies[depName] = `file:${packagePath}`;
            } else {
              logger.info(
                `Setting ${depName} to use workspace version: workspace:* (package path not found)`
              );
              packageJson.dependencies[depName] = 'workspace:*';
            }
          } else {
            logger.info(`Setting ${depName} to use workspace version: workspace:*`);
            packageJson.dependencies[depName] = 'workspace:*';
          }
        }
      }
    }

    if (packageJson.devDependencies) {
      for (const depName of Object.keys(packageJson.devDependencies)) {
        if (depName.startsWith('@elizaos/')) {
          // Remove plugin-sql in test environments (use in-memory database instead)
          if (isTestEnvironment && depName === '@elizaos/plugin-sql') {
            logger.info(
              `Removing dev dependency ${depName} for test environment (using in-memory database)`
            );
            delete packageJson.devDependencies[depName];
            continue;
          }

          if (
            isPublishedPackage(depName) ||
            (isOutsideWorkspace && !isTestEnvironment) ||
            (isProductionEnvironment && !isTestEnvironment) ||
            (isSystemTempDirectory && !isTestEnvironment)
          ) {
            logger.info(
              `Setting dev dependency ${depName} to use published version: latest (outside=${isOutsideWorkspace}, production=${isProductionEnvironment}, systemTemp=${isSystemTempDirectory}, test=${isTestEnvironment})`
            );
            packageJson.devDependencies[depName] = 'latest';
          } else if (
            isTestEnvironment &&
            (isOutsideWorkspace || isSystemTempDirectory) &&
            !isPublishedPackage(depName)
          ) {
            // In test environment, skip workspace-only packages that would fail resolution
            logger.info(
              `Removing workspace-only dev dependency ${depName} in test environment (outside workspace or system temp)`
            );
            delete packageJson.devDependencies[depName];
            continue;
          } else if (shouldUseFileProtocol && workspaceInfo.workspaceRoot) {
            // Use file: protocol for workspace-only packages to avoid workspace resolution issues
            const packagePath = findWorkspacePackagePath(depName, workspaceInfo.workspaceRoot);
            if (packagePath) {
              logger.info(`Setting dev dependency ${depName} to use file path: ${packagePath}`);
              packageJson.devDependencies[depName] = `file:${packagePath}`;
            } else {
              logger.info(
                `Setting dev dependency ${depName} to use workspace version: workspace:* (package path not found)`
              );
              packageJson.devDependencies[depName] = 'workspace:*';
            }
          } else {
            logger.info(`Setting dev dependency ${depName} to use workspace version: workspace:*`);
            packageJson.devDependencies[depName] = 'workspace:*';
          }
        }
      }
    }

    // Write the updated package.json (only dependency versions changed)
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    logger.debug('Updated package.json with latest dependency versions');
  } catch (error) {
    logger.error(`Error updating package.json: ${error}`);
  }

  logger.debug(`${templateType} template copied successfully`);
}

/**
 * Replace hardcoded "plugin-starter" strings in source files with the actual plugin name
 */
async function replacePluginNameInFiles(targetDir: string, pluginName: string): Promise<void> {
  const filesToProcess = [
    'src/index.ts',
    '__tests__/plugin.test.ts',
    'e2e/starter-plugin.test.ts',
    'README.md',
    // package.json name is handled by the publish command
  ];

  // Process files in parallel
  const promises = filesToProcess.map(async (filePath) => {
    const fullPath = path.join(targetDir, filePath);

    try {
      if (
        await fs
          .access(fullPath)
          .then(() => true)
          .catch(() => false)
      ) {
        let content = await fs.readFile(fullPath, 'utf8');

        // Replace the hardcoded plugin name in source files
        content = content.replace(/plugin-starter/g, pluginName);

        await fs.writeFile(fullPath, content, 'utf8');
        logger.debug(`Updated plugin name in ${filePath}`);
      }
    } catch (error) {
      logger.warn(
        `Could not update ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });

  await Promise.all(promises);
}

/**
 * Copy client dist files to the CLI package dist directory
 */
export async function copyClientDist() {
  logger.debug('Copying client dist files to CLI package');

  const srcClientDist = path.resolve(process.cwd(), '../client/dist');
  const destClientDist = path.resolve(process.cwd(), './dist');
  const indexSrc = path.join(srcClientDist, 'index.html');
  const indexDest = path.join(destClientDist, 'index.html');

  await fs.mkdir(destClientDist, { recursive: true });

  // Wait specifically for index.html to appear
  let retries = 0;
  const maxRetries = 10;
  const retryDelay = 1000;
  while (retries < maxRetries) {
    if (existsSync(indexSrc)) {
      break;
    }
    logger.info(`Waiting for client index.html (attempt ${retries + 1}/${maxRetries})…`);
    await new Promise((r) => setTimeout(r, retryDelay));
    retries++;
  }

  if (!existsSync(indexSrc)) {
    logger.error(`index.html not found at ${indexSrc} after ${maxRetries} attempts`);
    return;
  }

  // Copy everything
  await copyDir(srcClientDist, destClientDist);

  // Verify it made it into CLI dist
  if (!existsSync(indexDest)) {
    logger.error(`index.html missing in CLI dist at ${indexDest}`);
    return;
  }

  logger.success('Client dist files copied successfully');
}
