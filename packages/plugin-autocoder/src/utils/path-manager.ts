import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

/**
 * Local path management utilities for the autocoder plugin
 * This is a simplified version that only includes what's needed
 */

// Base directories
const ELIZA_GLOBAL_TEMP = process.env.ELIZA_TEMP_DIR || join(homedir(), '.eliza-temp');

/**
 * Get the base .eliza directory for a project
 */
function getProjectElizaDir(projectRoot?: string): string {
  const root = projectRoot || process.cwd();
  return join(root, '.eliza');
}

/**
 * Get plugin data paths for the autocoder plugin
 */
export function getPluginDataPath(
  pluginName: string,
  subpath?: string,
  projectRoot?: string
): string {
  const baseDir = getProjectElizaDir(projectRoot);
  const pluginDir = join(baseDir, 'data', 'plugins', pluginName);
  const fullPath = subpath ? join(pluginDir, subpath) : pluginDir;

  // Ensure directory exists
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
  }

  return fullPath;
}

/**
 * Get global temp path
 */
export function getGlobalTempPath(subpath?: string): string {
  const basePath = ELIZA_GLOBAL_TEMP;
  const fullPath = subpath ? join(basePath, subpath) : basePath;

  // Ensure directory exists
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
  }

  return fullPath;
}
