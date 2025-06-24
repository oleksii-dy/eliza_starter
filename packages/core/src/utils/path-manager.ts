import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

/**
 * ElizaOS Centralized Path Management System
 *
 * This utility consolidates ALL temporary file management across the entire monorepo.
 * Instead of scattered .elizadb, .eliza-temp, research_logs, etc. directories,
 * everything is organized under standardized .eliza directories.
 */

// Base directories
export const ELIZA_GLOBAL_TEMP = process.env.ELIZA_TEMP_DIR || join(homedir(), '.eliza-temp');

/**
 * Standard directory structure for project-local .eliza directories
 */
export const PROJECT_ELIZA_DIRS = {
  // Core data directories
  data: 'data',
  database: 'database',
  logs: 'logs',
  cache: 'cache',
  temp: 'temp',

  // Plugin-specific directories
  plugins: 'plugins',
  research: 'research',
  training: 'training',
  verification: 'verification',

  // Development directories
  test: 'test',
  build: 'build',
  uploads: 'uploads',
  generated: 'generated',

  // API and secrets
  apiKeys: 'api-keys',
  secrets: 'secrets',
} as const;

/**
 * Global temp directory structure (in ~/.eliza-temp)
 */
export const GLOBAL_TEMP_DIRS = {
  // Cross-project shared cache
  cache: 'cache',
  downloads: 'downloads',

  // Test isolation
  test: 'test',
  integration: 'integration',

  // Build artifacts
  build: 'build',
  dist: 'dist',
} as const;

/**
 * Get the project root directory by walking up from current directory
 */
export function findProjectRoot(startPath: string = process.cwd()): string {
  let current = startPath;

  while (current !== dirname(current)) {
    // Look for package.json or .git to identify project root
    if (existsSync(join(current, 'package.json')) || existsSync(join(current, '.git'))) {
      return current;
    }
    current = dirname(current);
  }

  // Fallback to startPath if no project root found
  return startPath;
}

/**
 * Get the base .eliza directory for a project
 */
export function getProjectElizaDir(projectRoot?: string): string {
  const root = projectRoot || findProjectRoot();
  return join(root, '.eliza');
}

/**
 * Get a specific directory within the project's .eliza folder
 */
export function getProjectElizaPath(
  type: keyof typeof PROJECT_ELIZA_DIRS,
  subpath?: string,
  projectRoot?: string
): string {
  const baseDir = getProjectElizaDir(projectRoot);
  const typePath = join(baseDir, PROJECT_ELIZA_DIRS[type]);
  return subpath ? join(typePath, subpath) : typePath;
}

/**
 * Get a path in the global temp directory
 */
export function getGlobalTempPath(type: keyof typeof GLOBAL_TEMP_DIRS, subpath?: string): string {
  const basePath = join(ELIZA_GLOBAL_TEMP, GLOBAL_TEMP_DIRS[type]);
  return subpath ? join(basePath, subpath) : basePath;
}

/**
 * Ensure all standard .eliza directories exist for a project
 */
export function ensureProjectElizaDirs(projectRoot?: string): void {
  const baseDir = getProjectElizaDir(projectRoot);

  // Create base .eliza directory
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }

  // Create all subdirectories
  for (const subdir of Object.values(PROJECT_ELIZA_DIRS)) {
    const dirPath = join(baseDir, subdir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }
}

/**
 * Ensure global temp directories exist
 */
export function ensureGlobalTempDirs(): void {
  // Create base directory
  if (!existsSync(ELIZA_GLOBAL_TEMP)) {
    mkdirSync(ELIZA_GLOBAL_TEMP, { recursive: true });
  }

  // Create subdirectories
  for (const subdir of Object.values(GLOBAL_TEMP_DIRS)) {
    const dirPath = join(ELIZA_GLOBAL_TEMP, subdir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }
}

/**
 * Create a unique temporary directory
 */
export function createTempDir(
  type: keyof typeof PROJECT_ELIZA_DIRS | keyof typeof GLOBAL_TEMP_DIRS,
  prefix?: string,
  projectRoot?: string
): string {
  const uniqueId = randomBytes(8).toString('hex');
  const dirname = prefix ? `${prefix}-${uniqueId}` : uniqueId;

  let dirPath: string;

  // Determine if this is a project-local or global temp directory
  if (type in PROJECT_ELIZA_DIRS) {
    dirPath = getProjectElizaPath(type as keyof typeof PROJECT_ELIZA_DIRS, dirname, projectRoot);
    ensureProjectElizaDirs(projectRoot);
  } else {
    dirPath = getGlobalTempPath(type as keyof typeof GLOBAL_TEMP_DIRS, dirname);
    ensureGlobalTempDirs();
  }

  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }

  return dirPath;
}

/**
 * Specific path getters for common use cases
 */

// Database paths
export function getDatabasePath(name?: string, projectRoot?: string): string {
  if (!name) {
    name = `db-${Date.now()}-${randomBytes(4).toString('hex')}`;
  }
  return getProjectElizaPath('database', name, projectRoot);
}

// Research paths
export function getResearchPath(subpath?: string, projectRoot?: string): string {
  return getProjectElizaPath('research', subpath, projectRoot);
}

// Training paths
export function getTrainingPath(subpath?: string, projectRoot?: string): string {
  return getProjectElizaPath('training', subpath, projectRoot);
}

// Verification paths
export function getVerificationPath(subpath?: string, projectRoot?: string): string {
  return getProjectElizaPath('verification', subpath, projectRoot);
}

// Log paths
export function getLogPath(filename?: string, projectRoot?: string): string {
  if (!filename) {
    filename = `log-${Date.now()}.log`;
  }
  return getProjectElizaPath('logs', filename, projectRoot);
}

// Cache paths
export function getCachePath(key?: string, projectRoot?: string): string {
  return getProjectElizaPath('cache', key, projectRoot);
}

// API key test paths
export function getApiKeyTestPath(keyType?: string, projectRoot?: string): string {
  return getProjectElizaPath('apiKeys', keyType, projectRoot);
}

// Plugin data paths
export function getPluginDataPath(
  pluginName: string,
  subpath?: string,
  projectRoot?: string
): string {
  const pluginDir = join('plugins', pluginName);
  return getProjectElizaPath('data', subpath ? join(pluginDir, subpath) : pluginDir, projectRoot);
}

/**
 * Migration utilities to move existing scattered files to proper locations
 */

/**
 * Migrate legacy database directories
 */
export function migrateLegacyDatabaseDirs(projectRoot?: string): void {
  const root = projectRoot || findProjectRoot();
  const legacyPaths = [join(root, '.elizadb'), join(root, '.elizadb-test')];

  for (const legacyPath of legacyPaths) {
    if (existsSync(legacyPath)) {
      const targetPath = getDatabasePath(undefined, projectRoot);
      const parentDir = dirname(targetPath);

      try {
        // Ensure target directory exists
        if (!existsSync(parentDir)) {
          mkdirSync(parentDir, { recursive: true });
        }

        // Move legacy directory to new location
        if (existsSync(targetPath)) {
          // If target exists, merge contents
          moveDirectoryContents(legacyPath, targetPath);
        } else {
          // Simple move
          require('fs').renameSync(legacyPath, targetPath);
        }

        console.log(`✅ Migrated ${legacyPath} → ${targetPath}`);
      } catch (error) {
        console.warn(`⚠️ Failed to migrate ${legacyPath}: ${error}`);
      }
    }
  }
}

/**
 * Migrate research logs
 */
export function migrateResearchLogs(projectRoot?: string): void {
  const root = projectRoot || findProjectRoot();
  const legacyPath = join(root, 'research_logs');

  if (existsSync(legacyPath)) {
    const targetPath = getResearchPath('logs', projectRoot);

    try {
      moveDirectoryContents(legacyPath, targetPath);
      rmSync(legacyPath, { recursive: true, force: true });
      console.log(`✅ Migrated research_logs → ${targetPath}`);
    } catch (error) {
      console.warn(`⚠️ Failed to migrate research_logs: ${error}`);
    }
  }
}

/**
 * Migrate training recordings
 */
export function migrateTrainingRecordings(projectRoot?: string): void {
  const root = projectRoot || findProjectRoot();
  const legacyPaths = [join(root, 'training_recording'), join(root, 'training_recordings')];

  for (const legacyPath of legacyPaths) {
    if (existsSync(legacyPath)) {
      const targetPath = getTrainingPath('recordings', projectRoot);

      try {
        moveDirectoryContents(legacyPath, targetPath);
        rmSync(legacyPath, { recursive: true, force: true });
        console.log(`✅ Migrated ${legacyPath} → ${targetPath}`);
      } catch (error) {
        console.warn(`⚠️ Failed to migrate ${legacyPath}: ${error}`);
      }
    }
  }
}

/**
 * Migrate verification snapshots
 */
export function migrateVerificationSnapshots(projectRoot?: string): void {
  const root = projectRoot || findProjectRoot();
  const legacyPath = join(root, 'verification-snapshots');

  if (existsSync(legacyPath)) {
    const targetPath = getVerificationPath('snapshots', projectRoot);

    try {
      moveDirectoryContents(legacyPath, targetPath);
      rmSync(legacyPath, { recursive: true, force: true });
      console.log(`✅ Migrated verification-snapshots → ${targetPath}`);
    } catch (error) {
      console.warn(`⚠️ Failed to migrate verification-snapshots: ${error}`);
    }
  }
}

/**
 * Migrate API key test directories
 */
export function migrateApiKeyTestDirs(projectRoot?: string): void {
  const root = projectRoot || findProjectRoot();
  const legacyPaths = ['fallback-api-key', 'test-api-key', 'test-key'];

  for (const legacyName of legacyPaths) {
    const legacyPath = join(root, legacyName);
    if (existsSync(legacyPath)) {
      const targetPath = getApiKeyTestPath(legacyName, projectRoot);

      try {
        moveDirectoryContents(legacyPath, targetPath);
        rmSync(legacyPath, { recursive: true, force: true });
        console.log(`✅ Migrated ${legacyName} → ${targetPath}`);
      } catch (error) {
        console.warn(`⚠️ Failed to migrate ${legacyName}: ${error}`);
      }
    }
  }
}

/**
 * Migrate all legacy temporary directories
 */
export function migrateAllLegacyDirs(projectRoot?: string): void {
  console.log('🔄 Migrating legacy temporary directories...');

  migrateLegacyDatabaseDirs(projectRoot);
  migrateResearchLogs(projectRoot);
  migrateTrainingRecordings(projectRoot);
  migrateVerificationSnapshots(projectRoot);
  migrateApiKeyTestDirs(projectRoot);

  console.log('✅ Legacy directory migration complete!');
}

/**
 * Utility to move directory contents
 */
function moveDirectoryContents(sourcePath: string, targetPath: string): void {
  if (!existsSync(targetPath)) {
    mkdirSync(targetPath, { recursive: true });
  }

  const items = readdirSync(sourcePath);

  for (const item of items) {
    const sourceItem = join(sourcePath, item);
    const targetItem = join(targetPath, item);

    if (statSync(sourceItem).isDirectory()) {
      moveDirectoryContents(sourceItem, targetItem);
    } else {
      // Move file
      require('fs').renameSync(sourceItem, targetItem);
    }
  }
}

/**
 * Clean up functions
 */
export function cleanupTempPath(path: string, force = false): void {
  const resolvedPath = resolve(path);
  const projectBase = resolve(getProjectElizaDir());
  const globalBase = resolve(ELIZA_GLOBAL_TEMP);

  // Safety check: only delete paths within eliza directories unless forced
  if (!force && !resolvedPath.startsWith(projectBase) && !resolvedPath.startsWith(globalBase)) {
    throw new Error(`Refusing to delete path outside eliza directories: ${path}`);
  }

  if (existsSync(resolvedPath)) {
    rmSync(resolvedPath, { recursive: true, force: true });
  }
}

export function cleanupProjectTemp(
  type: keyof typeof PROJECT_ELIZA_DIRS,
  projectRoot?: string
): void {
  const dirPath = getProjectElizaPath(type, undefined, projectRoot);
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
    mkdirSync(dirPath, { recursive: true });
  }
}

export function cleanupGlobalTemp(type: keyof typeof GLOBAL_TEMP_DIRS): void {
  const dirPath = getGlobalTempPath(type);
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
    mkdirSync(dirPath, { recursive: true });
  }
}

// Initialize directories on module load
ensureGlobalTempDirs();
