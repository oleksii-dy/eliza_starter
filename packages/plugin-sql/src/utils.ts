import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { logger } from '@elizaos/core';

/**
 * Expands a file path starting with `~` to the project directory.
 *
 * @param filepath - The path to expand.
 * @returns The expanded path.
 */
export function expandTildePath(filepath: string): string {
  if (filepath && filepath.startsWith('~')) {
    return path.normalize(path.join(process.cwd(), filepath.slice(1)));
  }
  return path.normalize(filepath);
}

/**
 * Resolves the path to the nearest `.env` file.
 *
 * If no `.env` file is found when traversing up from the starting directory,
 * a path to `.env` in the starting directory is returned.
 *
 * @param startDir - The directory to start searching from. Defaults to the
 *   current working directory.
 * @returns The resolved path to the `.env` file.
 */
export function resolveEnvFile(startDir: string = process.cwd()): string {
  let currentDir = startDir;

  while (true) {
    const candidate = path.join(currentDir, '.env');
    if (existsSync(candidate)) {
      return candidate;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return path.join(startDir, '.env');
}

/**
 * Resolves the directory used for PGlite database storage.
 *
 * Resolution order:
 * 1. The `dir` argument if provided.
 * 2. The `PGLITE_DATA_DIR` environment variable.
 * 3. The `fallbackDir` argument if provided.
 * 4. `./.eliza/.elizadb` relative to the current working directory.
 *
 * @param dir - Optional directory preference.
 * @param fallbackDir - Optional fallback directory when env var is not set.
 * @returns The resolved data directory with any tilde expanded.
 */
export function resolvePgliteDir(dir?: string, fallbackDir?: string): string {
  const envPath = resolveEnvFile();
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  logger.debug(`[resolvePgliteDir] Input - dir: ${dir}, fallbackDir: ${fallbackDir}`);
  logger.debug(`[resolvePgliteDir] Environment - PGLITE_DATA_DIR: ${process.env.PGLITE_DATA_DIR}`);
  logger.debug(`[resolvePgliteDir] Platform: ${process.platform}`);

  const base =
    dir ??
    process.env.PGLITE_DATA_DIR ??
    fallbackDir ??
    path.join(process.cwd(), '.eliza', '.elizadb');

  logger.debug(`[resolvePgliteDir] Base path before expansion: ${base}`);

  // Automatically migrate legacy path (<cwd>/.elizadb) to new location (<cwd>/.eliza/.elizadb)
  const resolved = expandTildePath(base);
  logger.debug(`[resolvePgliteDir] Resolved path after expansion: ${resolved}`);

  const legacyPath = path.normalize(path.join(process.cwd(), '.elizadb'));
  logger.debug(`[resolvePgliteDir] Legacy path check: ${legacyPath}`);

  if (resolved === legacyPath) {
    const newPath = path.normalize(path.join(process.cwd(), '.eliza', '.elizadb'));
    logger.debug(`[resolvePgliteDir] Migrating legacy path to: ${newPath}`);
    process.env.PGLITE_DATA_DIR = newPath;
    return newPath;
  }

  logger.debug(`[resolvePgliteDir] Final resolved path: ${resolved}`);
  return resolved;
}
