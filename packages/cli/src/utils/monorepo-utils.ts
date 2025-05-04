import { UserEnvironment } from './user-environment';

/**
 * Checks if the current execution context is likely within the Eliza monorepo
 * by searching upwards for the 'packages/core' directory.
 * It starts searching from the current working directory.
 *
 * @returns {Promise<boolean>} True if the 'packages/core' directory is found in an ancestor directory, false otherwise.
 */
export async function isElizaMonorepoContext(): Promise<boolean> {
  const envInfo = await UserEnvironment.getInstanceInfo();
  return envInfo.paths.monorepoRoot !== null;
}

/**
 * Gets the detected monorepo root path.
 * Searches upwards from the current working directory.
 *
 * @returns {Promise<string | null>} The absolute path to the monorepo root, or null if not found.
 */
export async function getMonorepoRoot(): Promise<string | null> {
  const envInfo = await UserEnvironment.getInstanceInfo();
  return envInfo.paths.monorepoRoot;
}
