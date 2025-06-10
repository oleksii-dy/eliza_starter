import * as fs from 'node:fs';
import * as path from 'node:path';
import { UserEnvironment } from './user-environment';
import { logger } from '@elizaos/core';

export interface DirectoryInfo {
  type:
    | 'elizaos-project'
    | 'elizaos-plugin'
    | 'elizaos-monorepo'
    | 'elizaos-subdir'
    | 'non-elizaos-dir';
  hasPackageJson: boolean;
  hasElizaOSDependencies: boolean;
  packageName?: string;
  elizaPackageCount: number;
  monorepoRoot?: string;
}

export type DirectoryTypeInfo = DirectoryInfo;

interface PackageJson {
  name?: string;
  keywords?: string[];
  main?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
  packageType?: string;
  agentConfig?: {
    pluginType?: string;
    [key: string]: any;
  };
}

/**
 * Detects the type of directory and provides comprehensive information about it
 * @param dir The directory path to analyze
 * @returns DirectoryInfo object with detection results
 */
export function detectDirectoryType(dir: string): DirectoryInfo {
  // Check if directory exists and is readable
  if (!fs.existsSync(dir)) {
    return {
      type: 'non-elizaos-dir',
      hasPackageJson: false,
      hasElizaOSDependencies: false,
      elizaPackageCount: 0,
    };
  }

  try {
    fs.readdirSync(dir);
  } catch (error) {
    return {
      type: 'non-elizaos-dir',
      hasPackageJson: false,
      hasElizaOSDependencies: false,
      elizaPackageCount: 0,
    };
  }

  // Check for monorepo root
  const monorepoRoot = UserEnvironment.getInstance().findMonorepoRoot(dir);

  // Check for package.json
  const packageJsonPath = path.join(dir, 'package.json');
  const hasPackageJson = fs.existsSync(packageJsonPath);

  if (monorepoRoot) {
    // If the current directory IS the monorepo root, classify as monorepo
    if (path.resolve(dir) === path.resolve(monorepoRoot)) {
      return {
        type: 'elizaos-monorepo',
        hasPackageJson,
        hasElizaOSDependencies: false,
        elizaPackageCount: 0,
        monorepoRoot,
      };
    }

    // If we're inside the monorepo but don't have package.json, it's a subdirectory
    if (!hasPackageJson) {
      return {
        type: 'elizaos-subdir',
        hasPackageJson: false,
        hasElizaOSDependencies: false,
        elizaPackageCount: 0,
        monorepoRoot,
      };
    }
  } else if (!hasPackageJson) {
    // Not in monorepo and no package.json
    return {
      type: 'non-elizaos-dir',
      hasPackageJson: false,
      hasElizaOSDependencies: false,
      elizaPackageCount: 0,
      monorepoRoot,
    };
  }

  // Parse package.json
  let packageJson: PackageJson;
  try {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    packageJson = JSON.parse(packageJsonContent);
  } catch (error) {
    return {
      type: 'non-elizaos-dir',
      hasPackageJson: true,
      hasElizaOSDependencies: false,
      elizaPackageCount: 0,
      monorepoRoot,
    };
  }

  // Create result object
  const result: DirectoryInfo = {
    type: 'non-elizaos-dir', // Default, will be updated below
    hasPackageJson: true,
    hasElizaOSDependencies: false,
    elizaPackageCount: 0,
    packageName: packageJson.name,
    monorepoRoot,
  };

  // Check for ElizaOS dependencies
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const elizaPackages = Object.keys(dependencies).filter((pkg) => pkg.startsWith('@elizaos/'));
  result.elizaPackageCount = elizaPackages.length;
  result.hasElizaOSDependencies = elizaPackages.length > 0;

  // Determine if this is an ElizaOS plugin
  const isPlugin = isElizaOSPlugin(packageJson);
  if (isPlugin) {
    result.type = 'elizaos-plugin';
    return result;
  }

  // Determine if this is an ElizaOS project
  const isProject = isElizaOSProject(packageJson, dir, monorepoRoot);
  if (isProject) {
    result.type = 'elizaos-project';
    return result;
  }

  // If inside monorepo and not a project or plugin → elizaos-subdir
  // If outside monorepo and not a project or plugin → non-elizaos-dir
  if (monorepoRoot) {
    result.type = 'elizaos-subdir';
  } else {
    result.type = 'non-elizaos-dir';
  }

  return result;
}

/**
 * Checks if a package.json indicates an ElizaOS plugin
 */
function isElizaOSPlugin(packageJson: PackageJson): boolean {
  // 1. EXPLICIT indicators first (most reliable)

  // Check packageType field (used in plugin templates)
  if (packageJson.packageType === 'plugin') {
    return true;
  }

  // Check keywords
  const keywords = packageJson.keywords || [];
  if (keywords.includes('plugin')) {
    return true;
  }

  // Check agentConfig.pluginType field
  if (packageJson.agentConfig?.pluginType?.includes('plugin')) {
    return true;
  }

  // 2. FALLBACK to package name patterns
  const packageName = packageJson.name || '';
  if (
    packageName.startsWith('@elizaos/plugin-') ||
    packageName.startsWith('plugin-') ||
    packageName.includes('/plugin-') ||
    (packageName.includes('plugin') && packageName.includes('eliza'))
  ) {
    return true;
  }

  // 3. OTHER heuristics (least reliable) - Only for files that actually contain "plugin" in the path
  if (packageJson.main && packageJson.main.includes('plugin')) {
    // Additional check for plugin-like dependencies
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const hasElizaCore = Object.keys(allDeps).some((dep) => dep.startsWith('@elizaos/core'));
    if (hasElizaCore && keywords.length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a package.json and directory structure indicates an ElizaOS project
 */
function isElizaOSProject(packageJson: PackageJson, dir: string, monorepoRoot?: string): boolean {
  // 1. EXPLICIT indicators first (most reliable)

  // Check packageType field (used in project templates)
  if (packageJson.packageType === 'project') {
    return true;
  }

  // Check keywords
  const keywords = packageJson.keywords || [];
  if (keywords.includes('project')) {
    return true;
  }

  // Check agentConfig for project indicators
  if (packageJson.agentConfig?.pluginType?.includes('project')) {
    return true;
  }

  // 2. FALLBACK to package name patterns
  const packageName = packageJson.name || '';
  if (
    packageName.startsWith('@elizaos/project-') ||
    packageName.startsWith('project-') ||
    packageName.includes('/project-') ||
    (packageName.includes('project') && packageName.includes('eliza'))
  ) {
    return true;
  }

  // 3. OTHER heuristics (only when outside monorepo to avoid false positives)
  if (!monorepoRoot) {
    // Check src/index.ts content
    const srcIndexPath = path.join(dir, 'src', 'index.ts');
    if (fs.existsSync(srcIndexPath)) {
      try {
        const indexContent = fs.readFileSync(srcIndexPath, 'utf8');
        if (
          indexContent.includes('export const project') ||
          indexContent.includes('Project') ||
          indexContent.includes('agents')
        ) {
          return true;
        }
      } catch {
        // Ignore read errors
      }
    }

    // Check for character files (common in ElizaOS projects)
    const characterFiles = ['character.json', 'characters.json', 'characters'];
    for (const file of characterFiles) {
      if (fs.existsSync(path.join(dir, file))) {
        return true;
      }
    }

    // Check for project-specific directories
    const projectDirs = ['characters', 'agents', '.eliza'];
    for (const dirName of projectDirs) {
      if (fs.existsSync(path.join(dir, dirName))) {
        const stat = fs.statSync(path.join(dir, dirName));
        if (stat.isDirectory()) {
          return true;
        }
      }
    }

    // Check for project dependencies pattern
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const hasElizaCore = Object.keys(allDeps).some((dep) => dep.startsWith('@elizaos/core'));
    const hasMultipleElizaPackages =
      Object.keys(allDeps).filter((dep) => dep.startsWith('@elizaos/')).length >= 2;

    if (hasElizaCore && hasMultipleElizaPackages) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if the directory is suitable for ElizaOS package updates
 */
export function isValidForUpdates(info: DirectoryInfo): boolean {
  return (
    info.type === 'elizaos-project' ||
    info.type === 'elizaos-plugin' ||
    info.type === 'elizaos-monorepo' ||
    info.type === 'elizaos-subdir'
  );
}

/**
 * Display styled monorepo warning using the same styling as update notification
 */
export function showMonorepoWarning(commandName: string) {
  const blue = '\x1b[38;5;27m'; // Blue border to match update notification
  const orange = '\x1b[38;5;208m'; // Orange for warning text
  const green = '\x1b[38;5;46m'; // Green for commands/highlights
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';

  // Use exact same width as update notification
  const width = 68;
  const border = `${blue}${'─'.repeat(width)}${reset}`;

  console.log('');
  console.log(border);
  console.log(
    `${blue}│${orange} ${bold}WARNING:${reset}${orange} Running from monorepo root is not best practice${' '.repeat(width - 2 - ` WARNING: Running from monorepo root is not best practice`.length)}${blue}│${reset}`
  );
  console.log(
    `${blue}│${orange} Create your project outside monorepo: ${green}${bold}elizaos create${reset}${orange}${' '.repeat(width - 2 - ` Create your project outside monorepo: elizaos create`.length)}${blue}│${reset}`
  );
  console.log(border);
  console.log('');

  showDocsHelpBox();
}

/**
 * Display styled error for running from wrong directory
 */
export function showDirectoryError(commandName: string) {
  const red = '\x1b[38;5;196m'; // Red for error
  const white = '\x1b[38;5;255m'; // White for error text
  const green = '\x1b[38;5;46m'; // Green for commands/highlights
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';

  // Use exact same width as update notification
  const width = 68;
  const border = `${red}${'─'.repeat(width)}${reset}`;

  console.log('');
  console.log(border);
  console.log(
    `${red}│${white} ${bold}ERROR:${reset}${white} Must run elizaos ${commandName} from project or plugin directory${' '.repeat(width - 2 - ` ERROR: Must run elizaos ${commandName} from project or plugin directory`.length)}${red}│${reset}`
  );
  console.log(
    `${red}│${white} Create a new project: ${green}${bold}elizaos create${reset}${white}${' '.repeat(width - 2 - ` Create a new project: elizaos create`.length)}${red}│${reset}`
  );
  console.log(border);
  console.log('');

  showDocsHelpBox();
}

/**
 * Display smaller docs help box
 */
function showDocsHelpBox() {
  const blue = '\x1b[38;5;27m'; // Blue border to match update notification
  const cyan = '\x1b[38;5;51m'; // Cyan for URL
  const reset = '\x1b[0m';

  // Use same width as main boxes to avoid text overflow
  const width = 68;
  const border = `${blue}${'─'.repeat(width)}${reset}`;

  console.log(border);
  console.log(
    `${blue}│${cyan} See docs for help: https://eliza.how/docs${' '.repeat(width - 2 - ` See docs for help: https://eliza.how/docs`.length)}${blue}│${reset}`
  );
  console.log(border);
  console.log('');
}

/**
 * Provides standardized error and warning messages based on the directory context.
 *
 * This function checks for common CLI usage errors, such as running commands
 * from a subdirectory, and provides helpful feedback. It also warns users
 * when running from within the monorepo, guiding them toward best practices.
 *
 * @param directoryInfo - The directory information object from `detectDirectoryType`.
 * @param commandName - The name of the CLI command being run (e.g., 'start', 'dev').
 * @returns {boolean} - Returns `true` if a warning was issued, `false` otherwise. The function will exit the process on critical errors.
 */
export function handleDirectoryContextErrors(
  directoryInfo: DirectoryTypeInfo | null,
  commandName: 'start' | 'dev'
): boolean {
  if (!directoryInfo) {
    logger.error(
      `Error: Could not determine directory type. 'elizaos ${commandName}' must be run from an ElizaOS project or plugin directory.`
    );
    process.exit(1);
  }

  // Error: Running from a subdirectory of a project/plugin
  if (directoryInfo.type === 'elizaos-subdir') {
    showDirectoryError(commandName);
    process.exit(1);
  }

  // Warning: Running from within the monorepo
  if (
    directoryInfo.monorepoRoot &&
    (directoryInfo.type === 'elizaos-project' ||
      directoryInfo.type === 'elizaos-plugin' ||
      directoryInfo.type === 'elizaos-monorepo')
  ) {
    // Store the fact that we need to show a warning later
    // We'll show this after the agent is fully initialized
    global._elizaShowMonorepoWarning = commandName;

    return true; // Indicates a warning was issued
  }

  return false; // No error or warning
}
