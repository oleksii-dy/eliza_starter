import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';
// import { isMonorepoContext } from '@/src/utils'; // Replaced by UserEnvironment
import { UserEnvironment } from './user-environment';
import { logger } from '@elizaos/core';

/**
 * Expands a file path starting with `~` to the project directory.
 *
 * @param filepath - The path to expand.
 * @returns The expanded path.
 */
export function expandTildePath(
  filepath: string,
  projectRootForTilde: string = process.cwd()
): string {
  if (filepath && filepath.startsWith('~')) {
    // If ~ means project root, use projectRootForTilde. If it means OS home, os.homedir() would be used.
    // Assuming ~ means project root in this context based on previous behavior with cwd.
    return path.join(projectRootForTilde, filepath.slice(1));
  }
  return filepath;
}

/**
 * Resolves the path to the `.env` file, searching only within the start directory or
 * optionally up to a boundary directory (e.g., a monorepo root).
 *
 * @param startDir - Directory to begin the lookup (default: current working directory).
 * @param boundaryDir - Optional directory at which to stop searching upward.
 * @returns The path to the found `.env` file, or a path to `.env` in startDir if none found.
 */
export function resolveEnvFile(startDir: string = process.cwd(), boundaryDir?: string): string {
  const root = path.resolve(startDir);
  const stopAt = boundaryDir ? path.resolve(boundaryDir) : undefined;
  // If no boundary provided, only consider .env in the start directory
  if (!stopAt) {
    return path.join(root, '.env');
  }
  let current = root;
  while (true) {
    const candidate = path.join(current, '.env');
    if (existsSync(candidate)) {
      return candidate;
    }
    if (stopAt && current === stopAt) {
      break;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return path.join(root, '.env');
}

/**
 * Resolves the directory used for PGlite database storage.
 *
 * Resolution order:
 * 1. The `dir` argument if provided (explicit override)
 * 2. The `PGLITE_DATA_DIR` environment variable (if `respectEnvVars` is true)
 * 3. The `fallbackDir` argument if provided
 * 4. Calculated project-relative default directory
 *
 * @param dir - Optional directory preference (highest priority)
 * @param fallbackDir - Optional fallback directory when env var is not set
 * @param respectEnvVars - Whether to respect PGLITE_DATA_DIR env var (default: false for monorepo consistency)
 * @returns The resolved data directory with any tilde expanded.
 */
export async function resolvePgliteDir(
  dir?: string,
  fallbackDir?: string,
  respectEnvVars: boolean = false
): Promise<string> {
  const userEnv = UserEnvironment.getInstance();
  const pathsInfo = await userEnv.getPathInfo();

  // Use the same directory as config (.eliza) but for database (.elizadb)
  // This ensures config and database are always in the same base directory
  const configBaseDir = path.dirname(pathsInfo.elizaDir);
  const projectRoot = configBaseDir;

  // Use the envFilePath from UserEnvironment which is already correctly resolved
  if (pathsInfo.envFilePath && existsSync(pathsInfo.envFilePath)) {
    dotenv.config({ path: pathsInfo.envFilePath });
  }

  // The fallbackDir passed from getElizaDirectories will be monorepoRoot + '.elizadb' or similar.
  // If fallbackDir is not provided (e.g. direct call to resolvePgliteDir),
  // then we construct the default path using projectRoot.
  const defaultBaseDir = path.join(projectRoot, '.elizadb');

  // Apply resolution hierarchy explicitly
  const envVarValue = respectEnvVars ? process.env.PGLITE_DATA_DIR : undefined;

  // Log when env vars are ignored to help with debugging
  if (process.env.PGLITE_DATA_DIR && !respectEnvVars) {
    logger.debug(
      'PGLITE_DATA_DIR environment variable is set but ignored for monorepo consistency. ' +
        `Using calculated path instead: ${defaultBaseDir}`
    );
  }

  const base =
    dir ?? // 1. Explicit override
    envVarValue ?? // 2. Environment variable (if allowed)
    fallbackDir ?? // 3. Fallback directory
    defaultBaseDir; // 4. Calculated default

  // Pass projectRoot for tilde expansion, assuming ~ means project root.
  return expandTildePath(base, projectRoot);
}
